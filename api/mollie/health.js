/* ==========================================================================
   GET /api/mollie/health
   Zelf-diagnose van de betaal-stack. Toont ALLEEN booleans/labels — nooit
   waarden van keys. Handig bij inrichten; kan daarna blijven staan.
   ========================================================================== */

"use strict";

const { db, fout } = require("../_lib");

module.exports = async function (req, res) {
  const uitkomst = {
    env: {
      MOLLIE_API_KEY: !!process.env.MOLLIE_API_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    mollieModus: process.env.MOLLIE_API_KEY
      ? (process.env.MOLLIE_API_KEY.indexOf("live_") === 0 ? "live"
        : (process.env.MOLLIE_API_KEY.indexOf("test_") === 0 ? "test" : "onbekend-formaat"))
      : null,
    database: { ok: false, fout: null },
    mollie: { ok: false, fout: null }
  };

  /* Database-rondje: telt alleen, leest geen data. */
  try {
    await db("/betalingen?select=id&limit=1");
    uitkomst.database.ok = true;
  } catch (e) {
    uitkomst.database.fout = String(e.message || e).slice(0, 200);
  }

  /* Mollie-rondje: methods opvragen is gratis en zonder bijwerkingen. */
  try {
    const r = await fetch("https://api.mollie.com/v2/methods", {
      headers: { "Authorization": "Bearer " + (process.env.MOLLIE_API_KEY || "") }
    });
    if (r.ok) { uitkomst.mollie.ok = true; }
    else {
      const d = await r.json().catch(function () { return {}; });
      uitkomst.mollie.fout = (d && d.detail ? d.detail : "HTTP " + r.status).slice(0, 200);
    }
  } catch (e) {
    uitkomst.mollie.fout = String(e.message || e).slice(0, 200);
  }

  res.status(200).json(uitkomst);
};
