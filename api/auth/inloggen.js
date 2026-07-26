/* ==========================================================================
   POST /api/auth/inloggen
   Body: { email, wachtwoord }

   Bij succes: HttpOnly-sessiecookie + het publieke account.
   Bij mislukking: altijd dezelfde melding, of het e-mailadres nu bestaat of
   niet. Anders is dit endpoint een gratis lijst van wie er klant is.
   ========================================================================== */

"use strict";

const { db, fout } = require("../_lib");
const {
  normaliseerEmail, geldigEmail, controleerWachtwoord,
  startSessie, publiekAccount
} = require("../_auth");

const MAX_POGINGEN = 8;
const BLOKKADE_MINUTEN = 15;

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const email = normaliseerEmail(body.email);
  const wachtwoord = String(body.wachtwoord || "");
  if (!geldigEmail(email) || !wachtwoord) {
    return fout(res, 400, "Vul je e-mailadres en wachtwoord in.");
  }

  const afgewezen = "E-mailadres of wachtwoord klopt niet.";

  try {
    const rijen = await db("/accounts?email=eq." + encodeURIComponent(email) + "&select=*");
    const account = rijen && rijen[0];

    /* Onbekend adres, of een account dat nog nooit een wachtwoord kreeg
       (oude betaling van vóór dit inlogsysteem): zelfde antwoord. */
    if (!account || !account.wachtwoord_hash) return fout(res, 401, afgewezen);

    if (account.geblokkeerd_tot && new Date(account.geblokkeerd_tot) > new Date()) {
      return fout(res, 429, "Te vaak geprobeerd. Wacht " + BLOKKADE_MINUTEN +
        " minuten, of stel een nieuw wachtwoord in via ‘Wachtwoord vergeten’.");
    }

    if (!controleerWachtwoord(wachtwoord, account.wachtwoord_hash)) {
      const pogingen = (account.mislukte_pogingen || 0) + 1;
      const blokkeer = pogingen >= MAX_POGINGEN;
      await db("/accounts?id=eq." + account.id, {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          mislukte_pogingen: blokkeer ? 0 : pogingen,
          geblokkeerd_tot: blokkeer
            ? new Date(Date.now() + BLOKKADE_MINUTEN * 60 * 1000).toISOString()
            : null
        }
      }).catch(function () { /* de telling mag het inloggen niet blokkeren */ });
      return fout(res, 401, afgewezen);
    }

    /* Geslaagd: teller terug op nul en een verse sessie. */
    await db("/accounts?id=eq." + account.id, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { mislukte_pogingen: 0, geblokkeerd_tot: null }
    }).catch(function () {});

    await startSessie(req, res, account.id);
    res.status(200).json({ ok: true, account: publiekAccount(account) });
  } catch (err) {
    fout(res, 502, "Inloggen lukt op dit moment niet. Probeer het zo nog eens.", err);
  }
};
