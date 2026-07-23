/* ==========================================================================
   PANVIA — gedeelde helpers voor de Mollie/Supabase API-routes.
   Bestanden met een underscore worden door Vercel NIET als endpoint
   gedeployed; dit is alleen een module.

   Vereiste environment variables (Vercel → Settings → Environment Variables):
     MOLLIE_API_KEY              test_... of live_...
     SUPABASE_URL                https://xxxx.supabase.co
     SUPABASE_SERVICE_ROLE_KEY   service-role key (Settings → API)
   ========================================================================== */

"use strict";

/* Tarieven — server-side vastgelegd; het bedrag komt NOOIT uit de client. */
const TARIEVEN = {
  koper:    { value: "12.95",  omschrijving: "Panvia kopersabonnement — eerste maand" },
  verkoper: { value: "895.00", omschrijving: "Panvia plaatsing — 6 maanden online" }
};

function env(naam) {
  const w = process.env[naam];
  if (!w) throw new Error("Ontbrekende environment variable: " + naam);
  return w;
}

/* Basis-URL van deze deploy (werkt op previews, productie en custom domein). */
function baseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return proto + "://" + host;
}

/* ---- Mollie REST ------------------------------------------------------- */
async function mollie(pad, opties) {
  const res = await fetch("https://api.mollie.com/v2" + pad, {
    method: (opties && opties.method) || "GET",
    headers: {
      "Authorization": "Bearer " + env("MOLLIE_API_KEY"),
      "Content-Type": "application/json"
    },
    body: opties && opties.body ? JSON.stringify(opties.body) : undefined
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    const detail = data && data.detail ? data.detail : res.status;
    throw new Error("Mollie " + pad + ": " + detail);
  }
  return data;
}

/* ---- Supabase REST (PostgREST, service-role) --------------------------- */
async function db(pad, opties) {
  const kop = {
    "apikey": env("SUPABASE_SERVICE_ROLE_KEY"),
    "Authorization": "Bearer " + env("SUPABASE_SERVICE_ROLE_KEY"),
    "Content-Type": "application/json",
    "Prefer": (opties && opties.prefer) || "return=representation"
  };
  const res = await fetch(env("SUPABASE_URL") + "/rest/v1" + pad, {
    method: (opties && opties.method) || "GET",
    headers: kop,
    body: opties && opties.body ? JSON.stringify(opties.body) : undefined
  });
  const tekst = await res.text();
  const data = tekst ? JSON.parse(tekst) : null;
  if (!res.ok) {
    const detail = data && data.message ? data.message : res.status;
    throw new Error("Supabase " + pad + ": " + detail);
  }
  return data;
}

/* Nette JSON-fout terug naar de client, zonder interne details te lekken. */
function fout(res, status, melding, err) {
  if (err) console.error("[panvia-api]", melding, err && err.message ? err.message : err);
  res.status(status).json({ ok: false, fout: melding });
}

module.exports = { TARIEVEN, env, baseUrl, mollie, db, fout };
