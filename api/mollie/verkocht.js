/* ==========================================================================
   POST /api/mollie/verkocht
   Body: { actie: "verkocht" | "stoppen" }

   Voor verkopers die in termijnen betalen (verkoper_week / verkoper_4weken).
   De plaatsing is één product — 24 weken voor € 895 excl. btw — betaald in
   delen; de termijnvorm is spreiding, geen korting.

   "verkocht": het pand is verkocht vóór het einde van de looptijd. We rekenen
   het restant tot € 895 excl. btw in één keer af via het Mollie-mandaat dat
   bij de eerste betaling is gevestigd, en stoppen het termijnabonnement.
   "stoppen": de verkoper stopt zonder verkoop. Het abonnement stopt, er wordt
   niets nagerekend, en de advertentie gaat offline.

   Wie ineens betaalde (soort "verkoper") kan ook "verkocht" melden: er valt
   dan niets af te rekenen, we markeren alleen de plaatsing.

   Alleen voor de ingelogde eigenaar van de betaling. Het te innen bedrag
   wordt server-side berekend uit wat er bij Mollie daadwerkelijk betaald is.
   ========================================================================== */

"use strict";

const { mollie, db, fout, baseUrl } = require("../_lib");
const { huidigAccount } = require("../_auth");
const crypto = require("crypto");

/* Termijnvormen: bedrag per termijn excl. btw en het totale aantal termijnen.
   Moet gelijk lopen met TARIEVEN (_lib.js) en ABON (webhook.js). */
const TERMIJNEN = {
  verkoper_week:   { excl: 37.5, totaal: 24 },
  verkoper_4weken: { excl: 150,  totaal: 6 }
};
const PLAATSING_EXCL = 895;
const BTW = 1.21;

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const actie = body.actie === "stoppen" ? "stoppen" : (body.actie === "verkocht" ? "verkocht" : null);
  if (!actie) return fout(res, 400, "Ongeldige actie.");

  try {
    const account = await huidigAccount(req);
    if (!account) return fout(res, 401, "Log eerst in.");

    /* De meest recente betaalde plaatsing van dit account. */
    const rijen = await db(
      "/betalingen?email=eq." + encodeURIComponent(account.email) +
      "&soort=in.(verkoper,verkoper_week,verkoper_4weken)&status=eq.paid" +
      "&order=created_at.desc&limit=1&select=*"
    );
    const rij = rijen && rijen[0];
    if (!rij) return fout(res, 404, "Geen actieve plaatsing gevonden op dit account.");

    const meta = rij.metadata && typeof rij.metadata === "object" ? rij.metadata : {};
    if (meta.plaatsing_status === "verkocht" || meta.plaatsing_status === "gestopt") {
      return res.status(409).json({ ok: false, fout: "Deze plaatsing is al afgerond." });
    }

    const spec = TERMIJNEN[rij.soort];
    let restantExcl = 0;
    let aanvullingPaymentId = null;

    if (spec && actie === "verkocht") {
      /* Hoeveel termijnen zijn er echt betaald? Eerste betaling + alle
         betaalde abonnementstermijnen, geteld bij Mollie zelf. */
      let betaaldeTermijnen = 1;
      if (rij.mollie_customer_id && rij.mollie_subscription_id) {
        const lijst = await mollie("/customers/" + rij.mollie_customer_id + "/payments?limit=250");
        const payments = (lijst._embedded && lijst._embedded.payments) || [];
        betaaldeTermijnen += payments.filter(function (p) {
          return p.subscriptionId === rij.mollie_subscription_id && p.status === "paid";
        }).length;
      }
      restantExcl = Math.max(0, PLAATSING_EXCL - betaaldeTermijnen * spec.excl);

      if (restantExcl > 0) {
        if (!rij.mollie_customer_id) return fout(res, 409, "Geen betaalmandaat gevonden — mail ons op hallo@panvia.nl.");
        const bedragIncl = (Math.round(restantExcl * BTW * 100) / 100).toFixed(2);
        const ref = crypto.randomUUID();
        const aanvulling = await mollie("/payments", {
          method: "POST",
          body: {
            amount: { currency: "EUR", value: bedragIncl },
            description: "Panvia plaatsing — restant bij verkoop (tot € 895 + 21% btw)",
            customerId: rij.mollie_customer_id,
            sequenceType: "recurring",
            webhookUrl: baseUrl(req) + "/api/mollie/webhook",
            metadata: { ref: ref, soort: "verkoper_aanvulling", email: rij.email }
          }
        });
        aanvullingPaymentId = aanvulling.id;
        await db("/betalingen", {
          method: "POST",
          prefer: "return=minimal",
          body: {
            ref: ref,
            mollie_payment_id: aanvulling.id,
            mollie_customer_id: rij.mollie_customer_id,
            soort: "verkoper_aanvulling",
            naam: rij.naam,
            email: rij.email,
            telefoon: rij.telefoon,
            bedrag: Number(bedragIncl),
            status: aanvulling.status || "open"
          }
        });
      }
    }

    /* Termijnabonnement stoppen — bij verkoop én bij stoppen. */
    if (spec && rij.mollie_customer_id && rij.mollie_subscription_id) {
      await mollie("/customers/" + rij.mollie_customer_id + "/subscriptions/" + rij.mollie_subscription_id, {
        method: "DELETE"
      }).catch(function () { /* al gestopt (times bereikt) is ook goed */ });
    }

    await db("/betalingen?id=eq." + rij.id, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        metadata: Object.assign({}, meta, {
          plaatsing_status: actie === "verkocht" ? "verkocht" : "gestopt",
          plaatsing_afgerond_op: new Date().toISOString(),
          aanvulling_payment_id: aanvullingPaymentId
        }),
        updated_at: new Date().toISOString()
      }
    });

    res.status(200).json({
      ok: true,
      actie: actie,
      restantExcl: restantExcl,
      restantIncl: restantExcl > 0 ? Math.round(restantExcl * BTW * 100) / 100 : 0
    });
  } catch (err) {
    fout(res, 502, "Afronden is niet gelukt. Probeer het opnieuw of mail hallo@panvia.nl.", err);
  }
};
