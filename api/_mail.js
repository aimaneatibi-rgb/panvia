/* ==========================================================================
   PANVIA — mail versturen (Resend), dependency-vrij via fetch.

   Environment variables (Vercel → Settings → Environment Variables):
     RESEND_API_KEY   re_...            (https://resend.com → API Keys)
     MAIL_VAN         "Panvia <hallo@panvia.nl>"   — afzender; het domein
                      moet in Resend geverifieerd zijn, anders weigert Resend.

   Ontbreekt de sleutel, dan versturen we niets en geven we `false` terug.
   De aanroeper hoort dat stil af te handelen: een bezoeker mag nooit uit het
   antwoord kunnen afleiden of een e-mailadres bij ons bekend is.
   ========================================================================== */

"use strict";

async function stuurMail(naar, onderwerp, tekst, html) {
  const sleutel = process.env.RESEND_API_KEY;
  const van = process.env.MAIL_VAN || "Panvia <hallo@panvia.nl>";
  if (!sleutel) {
    console.warn("[panvia-mail] Geen RESEND_API_KEY — mail naar", naar, "is NIET verstuurd:", onderwerp);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + sleutel,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: van,
        to: [naar],
        subject: onderwerp,
        text: tekst,
        html: html || undefined
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(function () { return String(res.status); });
      console.error("[panvia-mail] Resend weigerde de mail:", detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[panvia-mail] versturen mislukt:", err && err.message ? err.message : err);
    return false;
  }
}

/* Sobere huisstijl-mail: één kolom, geen plaatjes, leesbaar in elke client. */
function mailOmslag(kop, alineas, knopTekst, knopUrl) {
  const body = alineas.map(function (p) {
    return "<p style=\"margin:0 0 16px;font:16px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0E1230\">" + p + "</p>";
  }).join("");
  return "" +
    "<div style=\"background:#F2F0E9;padding:32px 16px\">" +
      "<div style=\"max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #0E1230;padding:32px\">" +
        "<p style=\"margin:0 0 24px;font:600 20px/1 Georgia,serif;letter-spacing:-0.01em;color:#2438D8\">Panvia</p>" +
        "<h1 style=\"margin:0 0 16px;font:600 24px/1.25 Georgia,serif;color:#0E1230\">" + kop + "</h1>" +
        body +
        (knopUrl
          ? "<p style=\"margin:24px 0 0\"><a href=\"" + knopUrl + "\" style=\"display:inline-block;background:#2438D8;color:#FFFFFF;text-decoration:none;padding:14px 24px;font:600 16px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif\">" + knopTekst + "</a></p>"
          : "") +
        "<p style=\"margin:32px 0 0;font:13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#5A5F72\">Panvia — vastgoed in eigen hand. Wij zijn geen makelaar en verkopen je gegevens niet door.</p>" +
      "</div>" +
    "</div>";
}

module.exports = { stuurMail, mailOmslag };
