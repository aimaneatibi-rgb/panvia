/* ==========================================================================
   POST /api/auth/wachtwoord-vergeten
   Body: { email }

   Bestaat het account, dan mailen we een link met een eenmalig token dat een
   uur geldig is. Het antwoord is ALTIJD hetzelfde — anders kun je hiermee
   uitvinden wie er een account heeft.
   ========================================================================== */

"use strict";

const { db, baseUrl, fout } = require("../_lib");
const { normaliseerEmail, geldigEmail, nieuwToken, RESET_MINUTEN } = require("../_auth");
const { stuurMail, mailOmslag } = require("../_mail");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const email = normaliseerEmail(body.email);
  if (!geldigEmail(email)) return fout(res, 400, "Vul een geldig e-mailadres in.");

  /* Wat de bezoeker hoe dan ook te zien krijgt. */
  const antwoord = { ok: true };

  try {
    const rijen = await db("/accounts?email=eq." + encodeURIComponent(email) + "&select=id,naam,email");
    const account = rijen && rijen[0];
    if (!account) return res.status(200).json(antwoord);

    const t = nieuwToken();
    await db("/wachtwoord_resets", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        token_hash: t.hash,
        account_id: account.id,
        verloopt_op: new Date(Date.now() + RESET_MINUTEN * 60 * 1000).toISOString()
      }
    });

    const link = baseUrl(req) + "/wachtwoord-resetten?token=" + encodeURIComponent(t.token);
    const voornaam = String(account.naam || "").split(" ")[0];

    await stuurMail(
      account.email,
      "Nieuw wachtwoord instellen bij Panvia",
      (voornaam ? "Hoi " + voornaam + ",\n\n" : "Hoi,\n\n") +
      "Je vroeg een nieuw wachtwoord aan voor je Panvia-account. Open deze link " +
      "en kies er een:\n\n" + link + "\n\n" +
      "De link is " + RESET_MINUTEN + " minuten geldig en werkt één keer. " +
      "Heb je dit niet aangevraagd, dan hoef je niets te doen — je huidige " +
      "wachtwoord blijft gewoon werken.\n\nPanvia",
      mailOmslag(
        "Nieuw wachtwoord instellen",
        [
          (voornaam ? "Hoi " + voornaam + "," : "Hoi,"),
          "Je vroeg een nieuw wachtwoord aan voor je Panvia-account. Klik op de knop hieronder en kies er een.",
          "De link is " + RESET_MINUTEN + " minuten geldig en werkt één keer. Heb je dit niet aangevraagd, dan hoef je niets te doen — je huidige wachtwoord blijft gewoon werken."
        ],
        "Kies een nieuw wachtwoord",
        link
      )
    );

    res.status(200).json(antwoord);
  } catch (err) {
    /* Ook bij een storing hetzelfde antwoord: geen informatie weggeven. */
    console.error("[panvia-api] wachtwoord-vergeten", err && err.message ? err.message : err);
    res.status(200).json(antwoord);
  }
};
