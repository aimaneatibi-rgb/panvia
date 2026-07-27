/* ==========================================================================
   POST /api/mollie/create-payment
   Body: { soort: "koper"|"verkoper", naam, email, wachtwoord?, gegevens? }

   Maakt de Mollie-betaling aan en geeft de checkout-URL terug. Het bedrag
   staat server-side vast (TARIEVEN). Het account wordt hier NIET aangemaakt —
   dat gebeurt pas in de webhook, na een geslaagde betaling.

   Drie situaties, en dat is precies wat de flow kort houdt:
   1. Al ingelogd  → naam, e-mail en wachtwoord komen uit het account. De
                     bezoeker vult niets van dat alles opnieuw in.
   2. Bekend adres → er is al een account met een wachtwoord: we vragen om
                     even in te loggen (antwoord met code "inloggen").
   3. Nieuw adres  → wachtwoord verplicht; we hashen het hier meteen en
                     bewaren alleen de hash bij de betaling.

   Koper:    Mollie-customer + eerste betaling (sequenceType "first") zodat er
             een mandaat ontstaat; het abonnement van € 12,95/mnd wordt in de
             webhook gestart zodra de eerste betaling binnen is.
   Verkoper: eenmalige betaling van € 895; de pandgegevens gaan mee in onze
             database (niet naar Mollie — metadata daar is beperkt).
   ========================================================================== */

"use strict";

const { TARIEVEN, baseUrl, mollie, db, fout } = require("../_lib");
const {
  huidigAccount, normaliseerEmail, geldigEmail, keurWachtwoord, hashWachtwoord
} = require("../_auth");
const crypto = require("crypto");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const GELDIGE_SOORTEN = ["verkoper", "koper", "project_s", "project_m", "project_l"];
  const soort = GELDIGE_SOORTEN.indexOf(body.soort) !== -1 ? body.soort : null;
  if (!soort) return fout(res, 400, "Ongeldige soort.");
  /* Koper én projecten zijn terugkerend: eerste betaling vestigt een
     Mollie-mandaat, de webhook start daarna het abonnement. */
  const terugkerend = soort === "koper" || soort.indexOf("project_") === 0;

  try {
    /* ---- 1. Wie is dit? ------------------------------------------------- */
    const ingelogd = await huidigAccount(req);

    let naam, email, wachtwoordHash = null;

    if (ingelogd) {
      email = ingelogd.email;
      naam = String(body.naam || ingelogd.naam || "").trim().slice(0, 120);

      /* Heeft deze rol al? Dan hoeft er niet nóg een keer betaald te worden. */
      if (soort === "koper" && ingelogd.koper_actief) {
        return res.status(409).json({ ok: false, code: "al-actief", fout: "Je kopersabonnement is al actief." });
      }
    } else {
      naam = String(body.naam || "").trim().slice(0, 120);
      email = normaliseerEmail(body.email);
      if (!geldigEmail(email)) return fout(res, 400, "Vul een geldig e-mailadres in.");

      const bestaand = await db("/accounts?email=eq." + encodeURIComponent(email) + "&select=id,wachtwoord_hash");
      if (bestaand && bestaand[0] && bestaand[0].wachtwoord_hash) {
        return res.status(409).json({
          ok: false,
          code: "inloggen",
          fout: "Je hebt al een Panvia-account met dit e-mailadres. Log even in, dan gaat de rest vanzelf."
        });
      }

      const bezwaar = keurWachtwoord(body.wachtwoord);
      if (bezwaar) return fout(res, 400, bezwaar);
      wachtwoordHash = hashWachtwoord(body.wachtwoord);
    }

    /* ---- 2. Betaling bij Mollie ----------------------------------------- */
    const tarief = TARIEVEN[soort];
    const ref = crypto.randomUUID();
    const basis = baseUrl(req);

    /* Terugkerend (koper + projecten): eerst een Mollie-customer, zodat de
       eerste betaling een mandaat oplevert voor het abonnement. */
    let customerId = null;
    if (terugkerend) {
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

    /* ---- 3. Alles wat we later nodig hebben, bewaren wij zelf ------------ */
    await db("/betalingen", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        ref: ref,
        mollie_payment_id: betaling.id,
        mollie_customer_id: customerId,
        soort: soort,
        naam: naam,
        email: email,
        bedrag: Number(tarief.value),
        status: betaling.status || "open",
        wachtwoord_hash: wachtwoordHash,
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
