/* ==========================================================================
   GET /api/mollie/status?ref=<uuid>
   De terugkeer-pagina (betaald.html) verifieert hiermee server-side of er
   echt betaald is, vóór de site het account als actief toont. De ref is de
   onvoorspelbare uuid uit de redirect-URL.

   Valt de webhook een paar seconden achter, dan halen we de status direct
   bij Mollie op zodat de bezoeker niet onnodig "in behandeling" ziet.

   Is er betaald, dan loggen we deze bezoeker meteen in — geen "je account is
   klaar, log nu in" als extra hindernis. Dat kan één keer per ref: de kolom
   sessie_uitgegeven zorgt dat een gedeelde of hergebruikte link daarna niets
   meer opent.
   ========================================================================== */

"use strict";

const { mollie, db, fout } = require("../_lib");
const { startSessie, huidigAccount, publiekAccount } = require("../_auth");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");

  const ref = String((req.query && req.query.ref) || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return fout(res, 400, "Ongeldige referentie.");

  try {
    const rijen = await db("/betalingen?ref=eq." + encodeURIComponent(ref) +
      "&select=id,soort,naam,email,status,mollie_payment_id,sessie_uitgegeven");
    const rij = rijen && rijen[0];
    if (!rij) return fout(res, 404, "Betaling niet gevonden.");

    let status = rij.status;
    if (status === "open" && rij.mollie_payment_id) {
      /* Webhook nog niet binnen? Direct bij Mollie kijken. */
      try {
        const betaling = await mollie("/payments/" + rij.mollie_payment_id);
        status = betaling.status;
      } catch (e) { /* laat 'open' staan */ }
    }

    const antwoord = {
      ok: true,
      status: status,
      soort: rij.soort,
      naam: rij.naam,
      email: rij.email,
      ingelogd: false,
      account: null
    };

    if (status === "paid") {
      /* Al ingelogd op dit apparaat (bv. een bestaande koper die nu plaatst)?
         Dan hoeft er niets te gebeuren. */
      const alIngelogd = await huidigAccount(req).catch(function () { return null; });
      const account = alIngelogd || await (async function () {
        if (rij.sessie_uitgegeven) return null;

        /* Eerst kijken of de webhook het account al heeft gemaakt. Zo niet,
           dan de ref níét verbruiken — de pagina vraagt over twee seconden
           opnieuw en moet het dan alsnog kunnen. */
        const gevonden = await db("/accounts?email=eq." + encodeURIComponent(rij.email) + "&select=*");
        const a = gevonden && gevonden[0];
        if (!a) return null;

        /* Ref eenmalig verzilveren: alleen de eerste PATCH krijgt een rij
           terug, een tweede aanroep vindt niets meer. */
        const verzilverd = await db(
          "/betalingen?id=eq." + rij.id + "&sessie_uitgegeven=is.false",
          { method: "PATCH", prefer: "return=representation", body: { sessie_uitgegeven: true } }
        );
        if (!verzilverd || !verzilverd.length) return null;

        await startSessie(req, res, a.id);
        return a;
      })();

      if (account) {
        antwoord.ingelogd = true;
        antwoord.account = publiekAccount(account);
      }
    }

    res.status(200).json(antwoord);
  } catch (err) {
    fout(res, 502, "Status opvragen mislukt.", err);
  }
};
