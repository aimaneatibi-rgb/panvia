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
    mollie: { ok: false, fout: null },
    /* Is supabase-schema.sql (met accounts-rollen, sessies en resets) al
       uitgevoerd? Zonder dit werkt inloggen niet. */
    auth: { schema: false, fout: null, mailKlaar: !!process.env.RESEND_API_KEY }
  };

  /* Database-rondje: échte schrijf-test (insert + delete van een healthrij).
     Alleen de sb_secret/service-role key mag door RLS heen schrijven — met de
     publishable key faalt dit, en dat is precies wat we willen weten. */
  try {
    const rij = await db("/betalingen", {
      method: "POST",
      body: { ref: require("crypto").randomUUID(), soort: "koper", email: "health@check.local", bedrag: 0, status: "health" }
    });
    await db("/betalingen?id=eq." + rij[0].id, { method: "DELETE", prefer: "return=minimal" });
    uitkomst.database.ok = true;
  } catch (e) {
    uitkomst.database.fout = String(e.message || e).slice(0, 200);
  }

  /* Auth-schema: bestaan de nieuwe kolommen en tabellen? Lezen is genoeg —
     PostgREST geeft een duidelijke fout als een kolom of tabel ontbreekt. */
  try {
    await db("/accounts?select=koper_actief,verkoper_actief,wachtwoord_hash&limit=1");
    await db("/sessies?select=id&limit=1");
    await db("/wachtwoord_resets?select=id&limit=1");
    await db("/betalingen?select=wachtwoord_hash,sessie_uitgegeven&limit=1");
    uitkomst.auth.schema = true;
  } catch (e) {
    uitkomst.auth.fout = String(e.message || e).slice(0, 200);
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
