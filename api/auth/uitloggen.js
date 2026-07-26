/* ==========================================================================
   POST /api/auth/uitloggen
   Sessie uit de database halen én de cookie wissen. Uitloggen op één apparaat
   raakt de sessies op andere apparaten niet.
   ========================================================================== */

"use strict";

const { fout } = require("../_lib");
const { stopSessie, wisCookie } = require("../_auth");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");
  try {
    await stopSessie(req);
  } catch (err) {
    console.error("[panvia-api] uitloggen", err && err.message ? err.message : err);
  }
  /* De cookie gaat er hoe dan ook af — ook als de database even hapert. */
  wisCookie(req, res);
  res.status(200).json({ ok: true });
};
