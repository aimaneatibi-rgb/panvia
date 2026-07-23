/* ==========================================================================
   POST /api/mollie/webhook
   Mollie stuurt alleen een payment-id (id=tr_xxx); wij halen de status
   ALTIJD zelf bij Mollie op — daardoor is de webhook niet te vervalsen.

   Bij status "paid":
   1. betalingen-rij bijwerken
   2. account aanmaken/activeren (betaald = true)  ← DE betaal-gate
   3. koper: abonnement van € 12,95/mnd starten (ingang volgende maand,
      de eerste betaling dekt maand 1) — eenmalig, idempotent.
   ========================================================================== */

"use strict";

const { mollie, db, fout, baseUrl } = require("../_lib");

module.exports = async function (req, res) {
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  /* Mollie post application/x-www-form-urlencoded: id=tr_xxx */
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = Object.fromEntries(new URLSearchParams(body)); } catch (e) { body = {}; }
  }
  const paymentId = String(body.id || "").trim();
  if (!paymentId) return fout(res, 400, "Geen id.");

  try {
    const betaling = await mollie("/payments/" + paymentId);
    const status = betaling.status; /* open/paid/failed/canceled/expired */

    /* Rij opzoeken; abonnementsbetalingen van latere maanden kennen we niet —
       die loggen we alleen. */
    const rijen = await db("/betalingen?mollie_payment_id=eq." + encodeURIComponent(paymentId) + "&select=*");
    const rij = rijen && rijen[0];
    if (!rij) {
      console.log("[panvia-webhook] onbekende betaling (vervolgtermijn abonnement?):", paymentId, status);
      return res.status(200).json({ ok: true });
    }

    await db("/betalingen?id=eq." + rij.id, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { status: status, updated_at: new Date().toISOString() }
    });

    if (status === "paid") {
      /* 2. Account pas nu — na de betaling. Upsert op (email, soort). */
      await db("/accounts?on_conflict=email,soort", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: {
          email: rij.email,
          naam: rij.naam,
          soort: rij.soort,
          betaald: true,
          mollie_customer_id: rij.mollie_customer_id
        }
      });

      /* 3. Koper: abonnement starten (één keer). */
      if (rij.soort === "koper" && rij.mollie_customer_id && !rij.mollie_subscription_id) {
        const start = new Date();
        start.setMonth(start.getMonth() + 1);
        const startDatum = start.toISOString().slice(0, 10);
        const abo = await mollie("/customers/" + rij.mollie_customer_id + "/subscriptions", {
          method: "POST",
          body: {
            amount: { currency: "EUR", value: "12.95" },
            interval: "1 month",
            startDate: startDatum,
            description: "Panvia kopersabonnement",
            webhookUrl: baseUrl(req) + "/api/mollie/webhook"
          }
        });
        await db("/betalingen?id=eq." + rij.id, {
          method: "PATCH",
          prefer: "return=minimal",
          body: { mollie_subscription_id: abo.id }
        });
        await db("/accounts?email=eq." + encodeURIComponent(rij.email) + "&soort=eq.koper", {
          method: "PATCH",
          prefer: "return=minimal",
          body: { mollie_subscription_id: abo.id }
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    /* 500 → Mollie probeert het later opnieuw (retry-schema). */
    fout(res, 500, "Webhook verwerken mislukt.", err);
  }
};
