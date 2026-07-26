/* ==========================================================================
   POST /api/auth/wachtwoord-resetten
   Body: { token, wachtwoord }

   Zet het nieuwe wachtwoord, verbruikt het token en gooit alle bestaande
   sessies weg — wie het oude wachtwoord had, is overal uitgelogd. Daarna
   loggen we dit apparaat meteen in, zodat de bezoeker doorkan.
   ========================================================================== */

"use strict";

const { db, fout } = require("../_lib");
const {
  hashToken, hashWachtwoord, keurWachtwoord, startSessie, publiekAccount
} = require("../_auth");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const token = String(body.token || "").trim();
  const wachtwoord = String(body.wachtwoord || "");
  if (!token) return fout(res, 400, "Deze link is niet compleet. Vraag een nieuwe aan.");

  const bezwaar = keurWachtwoord(wachtwoord);
  if (bezwaar) return fout(res, 400, bezwaar);

  const verlopen = "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.";

  try {
    const nu = new Date().toISOString();
    const rijen = await db(
      "/wachtwoord_resets?token_hash=eq." + encodeURIComponent(hashToken(token)) +
      "&gebruikt=is.false&verloopt_op=gt." + encodeURIComponent(nu) +
      "&select=id,account_id,accounts(*)"
    );
    const rij = rijen && rijen[0];
    if (!rij || !rij.accounts) return fout(res, 400, verlopen);

    /* 1. Token verbruiken — als eerste, zodat twee gelijktijdige verzoeken
          niet allebei kunnen slagen. */
    await db("/wachtwoord_resets?id=eq." + rij.id + "&gebruikt=is.false", {
      method: "PATCH",
      prefer: "return=representation",
      body: { gebruikt: true }
    }).then(function (r) {
      if (!r || !r.length) throw new Error("token was al verbruikt");
    });

    /* 2. Nieuw wachtwoord, blokkade eraf. */
    await db("/accounts?id=eq." + rij.account_id, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        wachtwoord_hash: hashWachtwoord(wachtwoord),
        mislukte_pogingen: 0,
        geblokkeerd_tot: null
      }
    });

    /* 3. Alle oude sessies eruit, daarna dit apparaat inloggen. */
    await db("/sessies?account_id=eq." + rij.account_id, {
      method: "DELETE",
      prefer: "return=minimal"
    }).catch(function () {});

    await startSessie(req, res, rij.account_id);
    res.status(200).json({ ok: true, account: publiekAccount(rij.accounts) });
  } catch (err) {
    if (err && /al verbruikt/.test(err.message || "")) return fout(res, 400, verlopen);
    fout(res, 502, "Het wachtwoord opslaan lukte niet. Probeer het zo nog eens.", err);
  }
};
