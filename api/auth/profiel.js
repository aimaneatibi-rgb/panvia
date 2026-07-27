/* ==========================================================================
   POST /api/auth/profiel
   Body: { rol: "koper"|"verkoper", velden: {...} }

   De onboardingstap ná de betaling. Je moet ingelogd zijn en de rol moet
   actief zijn — anders vult iemand een profiel voor een rol waar niet voor
   betaald is.

   Wat we vragen staat hier vast: de client bepaalt niet welke kolommen er
   geschreven worden. Alles wat niet in de lijst staat, gaat naar de
   jsonb-kolom en niets gaat rechtstreeks van body naar database.
   ========================================================================== */

"use strict";

const { db, fout } = require("../_lib");
const { huidigAccount, publiekAccount } = require("../_auth");

/* Toegestane waarden per keuzeveld. Wat er niet in staat, wordt genegeerd —
   zo kan een aangepaste request geen rommel in de kolommen zetten. */
const KEUZES = {
  koop_timing:     ["nu", "1-3", "3-6", "orienterend"],
  financiering:    ["rond", "in-gesprek", "nog-niet"],
  verkoop_termijn: ["zsm", "3-mnd", "6-mnd", "geen-haast"],
  verkoop_reden:   ["verhuizing", "groter", "kleiner", "werk", "belegging", "nalatenschap", "anders"],
  eigendomsvorm:   ["volledig", "mede-eigendom", "erfpacht", "vve"]
};

function keuze(veld, waarde) {
  const w = String(waarde || "").trim();
  return KEUZES[veld].indexOf(w) !== -1 ? w : null;
}

function getal(waarde) {
  const n = Number(String(waarde || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function jaNee(waarde) {
  if (waarde === true || waarde === "ja") return true;
  if (waarde === false || waarde === "nee") return false;
  return null;
}

/* Lijstjes (zoekgebied, woningtype): hooguit 20 items van 60 tekens. */
function lijst(waarde) {
  if (!Array.isArray(waarde)) return null;
  const uit = waarde
    .map(function (v) { return String(v || "").trim().slice(0, 60); })
    .filter(Boolean)
    .slice(0, 20);
  return uit.length ? uit : null;
}

/* De vrije tekstvelden die we bewaren zonder er een kolom voor te maken. */
const VRIJE_VELDEN = {
  koper: ["minM2", "kamers", "buitenruimte", "parkeren", "verbouwen", "energielabelMin",
          "erfpachtOk", "koopSamen", "huidigeSituatie", "eersteWoning", "adviseur"],
  verkoper: ["bezichtiging", "dagdelen", "bewoond", "opleverdatum", "vveBijdrage",
             "erfpachtEinde", "perceel", "kamers", "hulpNodig"]
};

function vrijeVelden(rol, velden) {
  const uit = {};
  VRIJE_VELDEN[rol].forEach(function (naam) {
    const w = velden[naam];
    if (w === undefined || w === null || w === "") return;
    uit[naam] = typeof w === "boolean" ? w : String(w).slice(0, 300);
  });
  return Object.keys(uit).length ? uit : null;
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "POST") return fout(res, 405, "Alleen POST.");

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const rol = body.rol === "koper" || body.rol === "verkoper" ? body.rol : null;
  if (!rol) return fout(res, 400, "Ongeldige rol.");
  const velden = body.velden && typeof body.velden === "object" ? body.velden : {};

  try {
    const account = await huidigAccount(req);
    if (!account) return fout(res, 401, "Log eerst in.");

    const actief = rol === "koper" ? account.koper_actief : account.verkoper_actief;
    if (!actief) return fout(res, 403, "Deze rol is nog niet actief op je account.");

    const wijziging = {};

    if (rol === "koper") {
      const gebied = lijst(velden.zoekgebied);
      if (gebied) wijziging.zoekgebied = gebied;
      const types = lijst(velden.woningtype);
      if (types) wijziging.woningtype = types;

      const min = getal(velden.budgetMin);
      const max = getal(velden.budgetMax);
      if (min) wijziging.budget_min = min;
      if (max) wijziging.budget_max = max;
      /* Andersom ingevuld is een typfout, geen reden om te weigeren. */
      if (min && max && min > max) { wijziging.budget_min = max; wijziging.budget_max = min; }

      const timing = keuze("koop_timing", velden.timing);
      if (timing) wijziging.koop_timing = timing;
      const fin = keuze("financiering", velden.financiering);
      if (fin) wijziging.financiering = fin;

      const teKoop = jaNee(velden.eigenWoningTeKoop);
      if (teKoop !== null) wijziging.eigen_woning_te_koop = teKoop;

      const rest = vrijeVelden("koper", velden);
      if (rest) wijziging.koper_profiel = rest;

      /* Zonder zoekgebied kunnen we niets matchen; dat is het enige veld
         waar de onboarding echt op staat te wachten. */
      if (!wijziging.zoekgebied && !(account.zoekgebied && account.zoekgebied.length)) {
        return fout(res, 400, "Vul in waar je zoekt — anders kunnen we je niets laten weten.");
      }
      wijziging.koper_profiel_compleet = true;
    } else {
      const reden = keuze("verkoop_reden", velden.reden);
      if (reden) wijziging.verkoop_reden = reden;
      const termijn = keuze("verkoop_termijn", velden.termijn);
      if (termijn) wijziging.verkoop_termijn = termijn;
      const vorm = keuze("eigendomsvorm", velden.eigendomsvorm);
      if (vorm) wijziging.eigendomsvorm = vorm;

      const makelaar = jaNee(velden.eerderViaMakelaar);
      if (makelaar !== null) wijziging.eerder_via_makelaar = makelaar;
      const zoektZelf = jaNee(velden.zoektZelfWoning);
      if (zoektZelf !== null) wijziging.zoekt_zelf_woning = zoektZelf;

      const rest = vrijeVelden("verkoper", velden);
      if (rest) wijziging.verkoper_profiel = rest;

      if (!wijziging.verkoop_termijn && !account.verkoop_termijn) {
        return fout(res, 400, "Vul in wanneer je wilt verkopen.");
      }
      wijziging.verkoper_profiel_compleet = true;
    }

    /* Toestemmingen per doel — samenvoegen met wat er al staat, zodat het
       intrekken van het één het ander niet wist. */
    if (velden.toestemming && typeof velden.toestemming === "object") {
      const bestaand = account.toestemming && typeof account.toestemming === "object" ? account.toestemming : {};
      const nieuw = {};
      ["alerts", "nieuwsbrief", "partners", "onderzoek"].forEach(function (doel) {
        const w = jaNee(velden.toestemming[doel]);
        if (w !== null) nieuw[doel] = w;
      });
      wijziging.toestemming = Object.assign({}, bestaand, nieuw);
    }

    const bijgewerkt = await db("/accounts?id=eq." + account.id, {
      method: "PATCH",
      prefer: "return=representation",
      body: wijziging
    });

    res.status(200).json({ ok: true, account: publiekAccount((bijgewerkt && bijgewerkt[0]) || account) });
  } catch (err) {
    fout(res, 502, "Je profiel opslaan lukt op dit moment niet. Probeer het zo nog eens.", err);
  }
};
