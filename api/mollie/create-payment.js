/* ==========================================================================
   POST /api/mollie/create-payment
   Body: { soort: "koper"|"verkoper", naam, email, gegevens? }

   Maakt de Mollie-betaling aan en geeft de checkout-URL terug. Het bedrag
   staat server-side vast (TARIEVEN). Het account wordt hier NIET aangemaakt —
   dat gebeurt pas in de webhook, na een geslaagde betaling.

   Koper:    Mollie-customer + eerste betaling (sequenceType "first") zodat er
             een mandaat ontstaat; het abonnement van € 12,95/mnd wordt in de
             webhook gestart zodra de eerste betaling binnen is.
   Verkoper: eenmalige betaling van € 895; de pandgegevens gaan mee in onze
             database (niet naar Mollie — metadata daar is beperkt).
   ========================================================================== */

"use strict";

const { TARIEVEN, baseUrl, mollie, db, fout } = require("../_lib");
const crypto = require("crypto");

module.exports = async function (req, res) {
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const soort = body.soort === "verkoper" ? "verkoper" : (body.soort === "koper" ? "koper" : null);
  const naam = String(body.naam || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  if (!soort) return fout(res, 400, "Ongeldige soort.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fout(res, 400, "Ongeldig e-mailadres.");

  const tarief = TARIEVEN[soort];
  const ref = crypto.randomUUID();
  const basis = baseUrl(req);

  try {
    /* Koper: eerst een Mollie-customer, zodat de eerste betaling een mandaat
       oplevert voor het maandelijkse abonnement. */
    let customerId = null;
    if (soort === "koper") {
      const klant = await mollie("/customers", {
        method: "POST",
        body: { name: naam || email, email: email }
      });
      customerId = klant.id;
    }

    const betaling = await mollie("/payments", {
      method: "POST",
      body: Object.assign(
        {
          amount: { currency: "EUR", value: tarief.value },
          description: tarief.omschrijving,
          /* Extensieloos i.v.m. cleanUrls: /betaald.html zou een redirect
             geven die de query-string (ref) laat vallen. */
          redirectUrl: basis + "/betaald?ref=" + ref,
          webhookUrl: basis + "/api/mollie/webhook",
          metadata: { ref: ref, soort: soort, email: email }
        },
        customerId ? { customerId: customerId, sequenceType: "first" } : {}
      )
    });

    /* Alles wat we later nodig hebben, bewaren wij zelf (audit + webhook). */
    await db("/betalingen", {
      method: "POST",
      body: {
        ref: ref,
        mollie_payment_id: betaling.id,
        mollie_customer_id: customerId,
        soort: soort,
        naam: naam,
        email: email,
        bedrag: Number(tarief.value),
        status: betaling.status || "open",
        metadata: body.gegevens && typeof body.gegevens === "object" ? body.gegevens : null
      }
    });

    const checkoutUrl = betaling._links && betaling._links.checkout ? betaling._links.checkout.href : null;
    if (!checkoutUrl) return fout(res, 502, "Geen checkout-URL van Mollie ontvangen.");
    res.status(200).json({ ok: true, checkoutUrl: checkoutUrl, ref: ref });
  } catch (err) {
    fout(res, 502, "Betaling aanmaken is niet gelukt. Probeer het opnieuw.", err);
  }
};
