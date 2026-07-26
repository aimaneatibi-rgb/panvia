/* ==========================================================================
   GET /api/auth/ik
   Wie is er ingelogd? De site vraagt dit bij het laden van elke pagina om de
   navigatie te vullen en te bepalen wat er opengaat (chatten, bieden, Mijn
   Panvia). De rollen komen uit de database — de browser kan ze niet zetten.
   ========================================================================== */

"use strict";

const { fout } = require("../_lib");
const { huidigAccount, publiekAccount } = require("../_auth");

module.exports = async function (req, res) {
  /* Nooit cachen: het antwoord verschilt per bezoeker. */
  res.setHeader("Cache-Control", "no-store, private");

  try {
    const account = await huidigAccount(req);
    if (!account) return res.status(200).json({ ok: true, ingelogd: false, account: null });
    res.status(200).json({ ok: true, ingelogd: true, account: publiekAccount(account) });
  } catch (err) {
    fout(res, 502, "Je gegevens ophalen lukt even niet.", err);
  }
};
