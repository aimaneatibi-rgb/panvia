/* ==========================================================================
   POST /api/mollie/webhook
   Mollie stuurt alleen een payment-id (id=tr_xxx); wij halen de status
   ALTIJD zelf bij Mollie op — daardoor is de webhook niet te vervalsen.

   Bij status "paid":
   1. betalingen-rij bijwerken
   2. account aanmaken of de rol erop activeren  ← DE betaal-gate
      Eén account per e-mailadres: wie koper wás en nu ook verkoopt, krijgt
      er een rol bij en houdt dezelfde inlog.
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
      const nu = new Date().toISOString();
      /* Rol op het account. Een projectklant is een aanbieder en krijgt dus
         de verkopersrol — daarmee komt hij in Mijn Panvia bij zijn plaatsing. */
      const isKoper = rij.soort === "koper";
      const rolVeld = isKoper ? "koper_actief" : "verkoper_actief";
      const sindsVeld = isKoper ? "koper_sinds" : "verkoper_sinds";

      /* 2. Account: bestaat het al, dan komt de rol erbij. Bestaande naam en
            wachtwoord blijven staan — een nieuwe betaling mag nooit iemands
            wachtwoord overschrijven. */
      const gevonden = await db("/accounts?email=eq." + encodeURIComponent(rij.email) + "&select=*");
      const account = gevonden && gevonden[0];

      if (!account) {
        await db("/accounts", {
          method: "POST",
          prefer: "return=minimal",
          body: Object.assign({
            email: rij.email,
            naam: rij.naam,
            wachtwoord_hash: rij.wachtwoord_hash,
            soort: rij.soort,          /* legacy-kolom, voor oude rapportages */
            betaald: true,             /* legacy-kolom */
            mollie_customer_id: rij.mollie_customer_id
          }, { [rolVeld]: true, [sindsVeld]: nu })
        });
      } else {
        const wijziging = Object.assign({ betaald: true }, { [rolVeld]: true });
        if (!account[sindsVeld]) wijziging[sindsVeld] = nu;
        if (!account.naam && rij.naam) wijziging.naam = rij.naam;
        if (!account.wachtwoord_hash && rij.wachtwoord_hash) wijziging.wachtwoord_hash = rij.wachtwoord_hash;
        if (!account.mollie_customer_id && rij.mollie_customer_id) wijziging.mollie_customer_id = rij.mollie_customer_id;
        await db("/accounts?id=eq." + account.id, {
          method: "PATCH",
          prefer: "return=minimal",
          body: wijziging
        });
      }

      /* 3. Abonnement starten (één keer, idempotent).
         Koper: € 12,95 per maand, ingang volgende maand.
         Project (S/M/L): kwartaalbedrag, ingang volgend kwartaal — de
         eerste betaling dekt kwartaal 1. Opzeggen = subscription cancelen. */
      const ABON = {
        koper:     { value: "12.95",    interval: "1 month",  maanden: 1, oms: "Panvia kopersabonnement" },
        project_s: { value: "5021.50",  interval: "3 months", maanden: 3, oms: "Panvia Project S — per kwartaal (€ 4.150 + 21% btw)" },
        project_m: { value: "8409.50",  interval: "3 months", maanden: 3, oms: "Panvia Project M — per kwartaal (€ 6.950 + 21% btw)" },
        project_l: { value: "12644.50", interval: "3 months", maanden: 3, oms: "Panvia Project L — per kwartaal (€ 10.450 + 21% btw)" }
      };
      const abonSpec = ABON[rij.soort];
      if (abonSpec && rij.mollie_customer_id && !rij.mollie_subscription_id) {
        const start = new Date();
        start.setMonth(start.getMonth() + abonSpec.maanden);
        const startDatum = start.toISOString().slice(0, 10);
        const abo = await mollie("/customers/" + rij.mollie_customer_id + "/subscriptions", {
          method: "POST",
          body: {
            amount: { currency: "EUR", value: abonSpec.value },
            interval: abonSpec.interval,
            startDate: startDatum,
            description: abonSpec.oms,
            webhookUrl: baseUrl(req) + "/api/mollie/webhook"
          }
        });
        await db("/betalingen?id=eq." + rij.id, {
          method: "PATCH",
          prefer: "return=minimal",
          body: { mollie_subscription_id: abo.id }
        });
        /* Op het account bewaren we alleen het kopersabonnement — een
           projectabonnement mag dat veld niet overschrijven (iemand kan
           koper én projectklant zijn). Projectabo's staan per betaling
           in de betalingen-tabel. */
        if (rij.soort === "koper") {
          await db("/accounts?email=eq." + encodeURIComponent(rij.email), {
            method: "PATCH",
            prefer: "return=minimal",
            body: { mollie_subscription_id: abo.id }
          });
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    /* 500 → Mollie probeert het later opnieuw (retry-schema). */
    fout(res, 500, "Webhook verwerken mislukt.", err);
  }
};
