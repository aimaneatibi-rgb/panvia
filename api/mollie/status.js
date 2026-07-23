/* ==========================================================================
   GET /api/mollie/status?ref=<uuid>
   De terugkeer-pagina (betaald.html) verifieert hiermee server-side of er
   echt betaald is, vóór de site het account als actief toont. De ref is de
   onvoorspelbare uuid uit de redirect-URL.

   Valt de webhook een paar seconden achter, dan halen we de status direct
   bij Mollie op zodat de bezoeker niet onnodig "in behandeling" ziet.
   ========================================================================== */

"use strict";

const { mollie, db, fout } = require("../_lib");

module.exports = async function (req, res) {
  const ref = String((req.query && req.query.ref) || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return fout(res, 400, "Ongeldige referentie.");

  try {
    const rijen = await db("/betalingen?ref=eq." + encodeURIComponent(ref) + "&select=soort,naam,email,status,mollie_payment_id");
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

    res.status(200).json({
      ok: true,
      status: status,
      soort: rij.soort,
      naam: rij.naam,
      email: rij.email
    });
  } catch (err) {
    fout(res, 502, "Status opvragen mislukt.", err);
  }
};
