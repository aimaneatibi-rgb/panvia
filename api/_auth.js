/* ==========================================================================
   PANVIA — gedeelde auth-helpers (wachtwoorden, sessies, cookies).
   Bestanden met een underscore worden door Vercel NIET als endpoint
   gedeployed; dit is alleen een module.

   Bewust dependency-vrij, net als de rest van api/: alles draait op de
   ingebouwde crypto-module van Node.

   Model in het kort:
   - Eén account per e-mailadres, met rollen (koper_actief / verkoper_actief).
     Een rol wordt pas actief na een geslaagde betaling (zie mollie/webhook).
   - Wachtwoorden staan als scrypt-hash in de database, nooit in klaartekst.
   - Inloggen levert een willekeurig sessietoken in een HttpOnly-cookie; in
     de database staat alleen de SHA-256 daarvan. Wie de database leest, kan
     dus niet inloggen.
   ========================================================================== */

"use strict";

const crypto = require("crypto");
const { db } = require("./_lib");

const COOKIE = "panvia_sessie";
const SESSIE_DAGEN = 30;
const RESET_MINUTEN = 60;

/* ---- Wachtwoorden ------------------------------------------------------- */

const SCRYPT = { N: 16384, r: 8, p: 1, len: 64 };

function hashWachtwoord(wachtwoord) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(wachtwoord), salt, SCRYPT.len, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p
  });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("hex"), hash.toString("hex")].join("$");
}

/* Vergelijkt in constante tijd — een verkeerd wachtwoord kost evenveel tijd
   als een goed wachtwoord, zodat er niets uit de timing te leiden valt. */
function controleerWachtwoord(wachtwoord, opgeslagen) {
  if (!opgeslagen || typeof opgeslagen !== "string") return false;
  const d = opgeslagen.split("$");
  if (d.length !== 6 || d[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(d[4], "hex");
    const verwacht = Buffer.from(d[5], "hex");
    const hash = crypto.scryptSync(String(wachtwoord), salt, verwacht.length, {
      N: Number(d[1]), r: Number(d[2]), p: Number(d[3])
    });
    return crypto.timingSafeEqual(hash, verwacht);
  } catch (e) {
    return false;
  }
}

/* Eisen aan een wachtwoord. Bewust mild: lengte doet meer dan tekentrucs.
   Geeft null terug als het goed is, anders de melding voor de bezoeker. */
function keurWachtwoord(wachtwoord) {
  const w = String(wachtwoord || "");
  if (w.length < 8) return "Kies een wachtwoord van minstens 8 tekens.";
  if (w.length > 200) return "Dat wachtwoord is te lang (maximaal 200 tekens).";
  return null;
}

function normaliseerEmail(email) {
  return String(email || "").trim().toLowerCase().slice(0, 200);
}

function geldigEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/* ---- Tokens ------------------------------------------------------------- */

function nieuwToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token: token, hash: hashToken(token) };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/* ---- Cookies ------------------------------------------------------------ */

function leesCookie(req, naam) {
  const rauw = req.headers.cookie;
  if (!rauw) return null;
  const delen = rauw.split(";");
  for (let i = 0; i < delen.length; i++) {
    const idx = delen[i].indexOf("=");
    if (idx === -1) continue;
    if (delen[i].slice(0, idx).trim() === naam) {
      return decodeURIComponent(delen[i].slice(idx + 1).trim());
    }
  }
  return null;
}

function veiligeVerbinding(req) {
  return (req.headers["x-forwarded-proto"] || "https").split(",")[0] === "https";
}

function zetCookie(req, res, waarde, maxAgeSec) {
  const delen = [
    COOKIE + "=" + encodeURIComponent(waarde),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + maxAgeSec
  ];
  /* Secure alleen over https — anders werkt `vercel dev` op http niet. */
  if (veiligeVerbinding(req)) delen.push("Secure");
  res.setHeader("Set-Cookie", delen.join("; "));
}

function wisCookie(req, res) {
  zetCookie(req, res, "", 0);
}

/* ---- Sessies ------------------------------------------------------------ */

/* Maakt een sessie voor dit account en zet de cookie. */
async function startSessie(req, res, accountId) {
  const t = nieuwToken();
  const verloopt = new Date(Date.now() + SESSIE_DAGEN * 24 * 60 * 60 * 1000);
  await db("/sessies", {
    method: "POST",
    prefer: "return=minimal",
    body: { token_hash: t.hash, account_id: accountId, verloopt_op: verloopt.toISOString() }
  });
  zetCookie(req, res, t.token, SESSIE_DAGEN * 24 * 60 * 60);
  await db("/accounts?id=eq." + accountId, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { laatst_ingelogd: new Date().toISOString() }
  }).catch(function () { /* niet belangrijk genoeg om het inloggen te laten falen */ });
}

/* Het account achter de cookie, of null. Verlopen sessies gelden als weg. */
async function huidigAccount(req) {
  const token = leesCookie(req, COOKIE);
  if (!token) return null;
  const nu = new Date().toISOString();
  const rijen = await db(
    "/sessies?token_hash=eq." + encodeURIComponent(hashToken(token)) +
    "&verloopt_op=gt." + encodeURIComponent(nu) +
    "&select=id,account_id,accounts(*)"
  );
  const rij = rijen && rijen[0];
  if (!rij || !rij.accounts) return null;
  return rij.accounts;
}

async function stopSessie(req) {
  const token = leesCookie(req, COOKIE);
  if (!token) return;
  await db("/sessies?token_hash=eq." + encodeURIComponent(hashToken(token)), {
    method: "DELETE",
    prefer: "return=minimal"
  }).catch(function () { /* al weg is ook goed */ });
}

/* Wat de frontend van een account mag weten — nooit de hash. */
function publiekAccount(a) {
  if (!a) return null;
  return {
    naam: a.naam || "",
    email: a.email,
    rollen: {
      koper: !!a.koper_actief,
      verkoper: !!a.verkoper_actief
    }
  };
}

module.exports = {
  COOKIE, SESSIE_DAGEN, RESET_MINUTEN,
  hashWachtwoord, controleerWachtwoord, keurWachtwoord,
  normaliseerEmail, geldigEmail,
  nieuwToken, hashToken,
  leesCookie, zetCookie, wisCookie,
  startSessie, huidigAccount, stopSessie,
  publiekAccount
};
