/* ==========================================================================
   PANVIA — panvia.js
   Interactie: pandkaarten, filters, detailpagina, plaatsingsflow.
   Vanilla JS, geen modules — werkt via file:// en via een lokale server.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     Hulpfuncties
     ------------------------------------------------------------------------ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Duizendtallen met punt: 450000 -> "450.000" */
  function fmtDuizend(n) {
    var s = String(Math.round(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /* Prijsnotatie brandbook: "€ 450.000" — euroteken, spatie, punt als duizendtal */
  function fmtPrijs(n) {
    return "€ " + fmtDuizend(n);
  }

  function fmtM2(n) {
    return fmtDuizend(n) + " m²";
  }

  /* Nederlandse decimale komma voor BAR e.d.: 6.2 -> "6,2" */
  function fmtKomma(n) {
    return String(n).replace(".", ",");
  }

  function vindPand(id) {
    for (var i = 0; i < PANVIA_PANDEN.length; i++) {
      if (PANVIA_PANDEN[i].id === id) return PANVIA_PANDEN[i];
    }
    return null;
  }

  /* Deterministische pseudo-random generator per pand (voor de SVG-beelden) */
  function hashCode(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function maakRng(seedStr) {
    var a = hashCode(seedStr) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------------
     SVG-placeholders — alleen panden, geen mensen (brandbook §12).
     Huisstijl v2 "Blauwdruk": silhouetten in Papier / Krijt / tinten van
     Nacht; alleen de plattegrond mag Ultramarijn (het is een tekening,
     geen foto). De sleutelnamen hieronder zijn historisch (v1):
     zand=Papier, mist=Krijt, grijs=Staal, inkt=Nacht.
     ------------------------------------------------------------------------ */
  var KLEUR = {
    zand: "#F2F0E9",
    wit: "#FFFFFF",
    mist: "#E3E0D5",
    lijn: "rgba(14,18,48,.14)",
    donker: "rgba(14,18,48,.20)",
    raam: "rgba(14,18,48,.10)",
    grijs: "#575E7B",
    inkt: "#0E1230",
    blauw: "#2438D8"
  };

  function svgDataURI(inner, w, h) {
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + " " + h + "' role='img'>" + inner + "</svg>";
    /* encodeURIComponent laat apostrofs staan; die breken de single-quoted
       src-attributen in onze HTML-strings — dus expliciet coderen. */
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg).replace(/'/g, "%27");
  }

  /* Rijtje woonhuizen met puntdaken */
  function tekenWoningScene(rng) {
    var s = "<rect width='800' height='600' fill='" + KLEUR.zand + "'/>";
    s += "<rect y='470' width='800' height='130' fill='" + KLEUR.mist + "'/>";
    var x = -30 + Math.floor(rng() * 40);
    var aantal = 3 + Math.floor(rng() * 2);
    for (var i = 0; i < aantal && x < 820; i++) {
      var bw = 170 + Math.floor(rng() * 90);
      var bh = 210 + Math.floor(rng() * 130);
      var top = 470 - bh;
      var fill = (i % 2 === 0) ? KLEUR.wit : KLEUR.mist;
      var raam = (i % 2 === 0) ? KLEUR.mist : KLEUR.zand;
      /* gevel */
      s += "<rect x='" + x + "' y='" + top + "' width='" + bw + "' height='" + bh + "' fill='" + fill + "' stroke='" + KLEUR.lijn + "'/>";
      /* puntdak */
      var nok = top - 50 - Math.floor(rng() * 40);
      s += "<polygon points='" + (x - 8) + "," + top + " " + (x + bw / 2) + "," + nok + " " + (x + bw + 8) + "," + top + "' fill='" + KLEUR.donker + "'/>";
      /* ramen: 2 kolommen, 2-3 rijen */
      var rijen = 2 + Math.floor(rng() * 2);
      for (var r = 0; r < rijen; r++) {
        for (var k = 0; k < 2; k++) {
          var rw = bw * 0.24, rh = 52;
          var rx = x + bw * (0.14 + k * 0.48);
          var ry = top + 36 + r * (bh - 100) / rijen;
          s += "<rect x='" + rx.toFixed(0) + "' y='" + ry.toFixed(0) + "' width='" + rw.toFixed(0) + "' height='" + rh + "' fill='" + raam + "' stroke='" + KLEUR.lijn + "'/>";
        }
      }
      /* deur */
      s += "<rect x='" + (x + bw * 0.4).toFixed(0) + "' y='" + (470 - 70) + "' width='" + (bw * 0.2).toFixed(0) + "' height='70' fill='" + KLEUR.donker + "'/>";
      x += bw + 14;
    }
    return s;
  }

  /* Commercieel: hal of kantoor met plat dak en raamstroken */
  function tekenCommercieelScene(rng) {
    var s = "<rect width='800' height='600' fill='" + KLEUR.zand + "'/>";
    s += "<rect y='470' width='800' height='130' fill='" + KLEUR.mist + "'/>";
    /* grote hal */
    var hw = 430 + Math.floor(rng() * 120);
    var hh = 220 + Math.floor(rng() * 80);
    var hx = 40 + Math.floor(rng() * 60);
    var ht = 470 - hh;
    s += "<rect x='" + hx + "' y='" + ht + "' width='" + hw + "' height='" + hh + "' fill='" + KLEUR.wit + "' stroke='" + KLEUR.lijn + "'/>";
    s += "<rect x='" + hx + "' y='" + (ht - 14) + "' width='" + hw + "' height='14' fill='" + KLEUR.donker + "'/>";
    /* raamstrook bovenin de hal */
    var stroken = 5 + Math.floor(rng() * 3);
    for (var i = 0; i < stroken; i++) {
      var sw = (hw - 60) / stroken - 10;
      s += "<rect x='" + (hx + 30 + i * ((hw - 60) / stroken)).toFixed(0) + "' y='" + (ht + 24) + "' width='" + sw.toFixed(0) + "' height='36' fill='" + KLEUR.mist + "' stroke='" + KLEUR.lijn + "'/>";
    }
    /* overheaddeuren */
    var deuren = 2 + Math.floor(rng() * 2);
    for (var d = 0; d < deuren; d++) {
      var dw = 84;
      s += "<rect x='" + (hx + 40 + d * (dw + 40)) + "' y='" + (470 - 110) + "' width='" + dw + "' height='110' fill='" + KLEUR.mist + "' stroke='" + KLEUR.lijn + "'/>";
      for (var l = 1; l < 5; l++) {
        s += "<line x1='" + (hx + 40 + d * (dw + 40)) + "' y1='" + (470 - 110 + l * 22) + "' x2='" + (hx + 40 + d * (dw + 40) + dw) + "' y2='" + (470 - 110 + l * 22) + "' stroke='" + KLEUR.lijn + "'/>";
      }
    }
    /* kantoordeel ernaast */
    var kw = 150 + Math.floor(rng() * 60);
    var kh = hh + 60 + Math.floor(rng() * 50);
    var kx = hx + hw + 20;
    var kt = 470 - kh;
    s += "<rect x='" + kx + "' y='" + kt + "' width='" + kw + "' height='" + kh + "' fill='" + KLEUR.mist + "' stroke='" + KLEUR.lijn + "'/>";
    var rijen = 4 + Math.floor(rng() * 2);
    for (var r = 0; r < rijen; r++) {
      s += "<rect x='" + (kx + 18) + "' y='" + (kt + 20 + r * (kh - 40) / rijen).toFixed(0) + "' width='" + (kw - 36) + "' height='26' fill='" + KLEUR.zand + "' stroke='" + KLEUR.lijn + "'/>";
    }
    return s;
  }

  /* Interieur: lege ruimte, eerlijk licht — raampartij en vloer */
  function tekenInterieurScene(rng) {
    var s = "<rect width='800' height='600' fill='" + KLEUR.wit + "'/>";
    /* vloer */
    s += "<polygon points='0,600 800,600 800,430 0,470' fill='" + KLEUR.zand + "'/>";
    s += "<line x1='0' y1='470' x2='800' y2='430' stroke='" + KLEUR.lijn + "'/>";
    /* vloerdelen */
    for (var i = 1; i < 7; i++) {
      s += "<line x1='" + (i * 115) + "' y1='600' x2='" + (i * 115 + 30) + "' y2='" + (470 - i * 5) + "' stroke='" + KLEUR.lijn + "'/>";
    }
    /* raampartij */
    var ramen = 2 + Math.floor(rng() * 2);
    var rx = 90 + Math.floor(rng() * 60);
    for (var w = 0; w < ramen; w++) {
      var wx = rx + w * 220;
      s += "<rect x='" + wx + "' y='90' width='170' height='300' fill='" + KLEUR.zand + "' stroke='" + KLEUR.mist + "' stroke-width='10'/>";
      s += "<line x1='" + (wx + 85) + "' y1='90' x2='" + (wx + 85) + "' y2='390' stroke='" + KLEUR.mist + "' stroke-width='8'/>";
      s += "<line x1='" + wx + "' y1='240' x2='" + (wx + 170) + "' y2='240' stroke='" + KLEUR.mist + "' stroke-width='8'/>";
    }
    /* plint */
    s += "<line x1='0' y1='470' x2='800' y2='430' stroke='" + KLEUR.donker + "' stroke-width='2'/>";
    return s;
  }

  /* Plattegrond: blauwdruk — Ultramarijn-lijnen op wit, maatvoering in mono */
  function tekenPlattegrond(rng, oppervlakte) {
    var s = "<rect width='800' height='600' fill='" + KLEUR.wit + "'/>";
    s += "<rect x='100' y='70' width='600' height='430' fill='none' stroke='" + KLEUR.blauw + "' stroke-width='4'/>";
    /* binnenwanden, deterministisch */
    var vx = 100 + 180 + Math.floor(rng() * 200);
    var vy = 70 + 150 + Math.floor(rng() * 160);
    s += "<line x1='" + vx + "' y1='70' x2='" + vx + "' y2='" + (vy - 40) + "' stroke='" + KLEUR.blauw + "' stroke-width='3'/>";
    s += "<line x1='" + vx + "' y1='" + (vy + 20) + "' x2='" + vx + "' y2='500' stroke='" + KLEUR.blauw + "' stroke-width='3'/>";
    s += "<line x1='100' y1='" + vy + "' x2='" + (vx - 50) + "' y2='" + vy + "' stroke='" + KLEUR.blauw + "' stroke-width='3'/>";
    s += "<line x1='" + (vx + 10) + "' y1='" + vy + "' x2='700' y2='" + vy + "' stroke='" + KLEUR.blauw + "' stroke-width='3'/>";
    /* deurboog */
    s += "<path d='M " + (vx - 50) + " " + vy + " a 50 50 0 0 1 50 -50' fill='none' stroke='" + KLEUR.grijs + "' stroke-width='2'/>";
    /* maatvoering */
    s += "<text x='670' y='540' text-anchor='end' font-family='IBM Plex Mono, monospace' font-size='26' fill='" + KLEUR.grijs + "'>" + fmtDuizend(oppervlakte) + " m²</text>";
    return s;
  }

  /* Panden met een echte voorbeeldfoto (AI-gegenereerd) in img/{id}.webp.
     Het exterieur (variant 0) gebruikt de foto; overige varianten blijven
     getekende beelden, en de plattegrond blijft een blauwdruk. */
  var PAND_FOTOS = {
    w1: true, w2: true, w3: true, w4: true, w5: true, w6: true, w7: true, w8: true,
    c1: true, c2: true, c3: true, c4: true, c5: true, c6: true, c7: true, c8: true
  };

  /* Publieke beeldfunctie: variant 0 = exterieur, 1 = alternatief, 2 = interieur, "plattegrond" */
  function pandBeeld(pand, variant) {
    if (variant === 0 && PAND_FOTOS[pand.id]) {
      return "img/" + pand.id + ".webp";
    }
    var rng = maakRng(pand.id + "-" + variant);
    var inner;
    if (variant === "plattegrond") {
      inner = tekenPlattegrond(rng, pand.oppervlakte);
    } else if (variant === 2) {
      inner = tekenInterieurScene(rng);
    } else if (pand.type === "commercieel") {
      inner = tekenCommercieelScene(rng);
    } else {
      inner = tekenWoningScene(rng);
    }
    return svgDataURI(inner, 800, 600);
  }

  /* ------------------------------------------------------------------------
     Pandkaart (brandbook §13): prijs bovenaan en het grootst,
     kaart eindigt met "Rechtstreeks van eigenaar".
     ------------------------------------------------------------------------ */
  function statusTag(pand) {
    if (pand.status === "onder-bod") {
      return "<span class='tag tag-onderbod'><span class='dot' aria-hidden='true'></span>Onder bod</span>";
    }
    return "<span class='tag tag-tekoop'><span class='dot' aria-hidden='true'></span>Te koop</span>";
  }

  function kaartHTML(pand, opties) {
    opties = opties || {};
    var meta = fmtM2(pand.oppervlakte) + " · " + pand.bouwjaar + " · Label " + pand.energielabel;
    var barRegel = "";
    if (opties.toonBar && pand.bar) {
      barRegel = "<p class='pandkaart-meta tnum'>BAR " + fmtKomma(pand.bar) + " % · huur " + fmtPrijs(pand.huur) + " p/j</p>";
    }
    var plaatsRegel = pand.plaats + (pand.land && pand.land !== "Nederland" ? " · " + pand.land : "");
    var alt = "Voorbeeldfoto van het pand aan " + pand.adres + " in " + pand.plaats;
    return (
      "<article class='pandkaart'>" +
        "<a class='pandkaart-link' href='pand.html?id=" + pand.id + "'>" +
          "<div class='pandkaart-foto'><img src='" + pandBeeld(pand, 0) + "' alt='" + alt + "' loading='lazy'></div>" +
          "<div class='pandkaart-body'>" +
            "<div class='pandkaart-top'>" +
              "<span class='pandkaart-prijs tnum'>" + fmtPrijs(pand.prijs) + " <span class='kk'>k.k.</span></span>" +
              statusTag(pand) +
            "</div>" +
            "<p class='pandkaart-adres'>" + pand.adres + "</p>" +
            "<p class='pandkaart-plaats'>" + plaatsRegel + "</p>" +
            "<p class='pandkaart-meta tnum'>" + meta + "</p>" +
            barRegel +
            "<div class='pandkaart-footer'>Rechtstreeks van eigenaar</div>" +
          "</div>" +
        "</a>" +
      "</article>"
    );
  }

  function renderKaarten(container, panden, opties) {
    container.innerHTML = panden.map(function (p) { return kaartHTML(p, opties); }).join("");
  }

  /* ------------------------------------------------------------------------
     Projectkaart — parken, complexen en ontwikkelingen vanaf 10 eenheden.
     Bewust anders dan een pandkaart: hier koop je uit een reeks, dus het
     aantal beschikbare eenheden is net zo belangrijk als de vanaf-prijs.
     ------------------------------------------------------------------------ */
  function projectBeeld(project) {
    var rng = maakRng(project.id);
    var inner;
    if (project.type === "commercieel") inner = tekenCommercieelScene(rng);
    else inner = tekenWoningScene(rng);
    return svgDataURI(inner, 800, 600);
  }

  function projectKaartHTML(p) {
    var plaatsRegel = p.plaats + (p.land && p.land !== "Nederland" ? " · " + p.land : "");
    return (
      "<article class='pandkaart projectkaart'>" +
        "<a class='pandkaart-link' href='project.html?id=" + p.id + "'>" +
          "<div class='pandkaart-foto'>" +
            "<img src='" + projectBeeld(p) + "' alt='Voorbeeldbeeld van project " + escapeHTML(p.naam) + "' loading='lazy'>" +
            "<span class='project-badge tnum'>" + p.beschikbaar + " van " + p.eenheden + " beschikbaar</span>" +
          "</div>" +
          "<div class='pandkaart-body'>" +
            "<div class='pandkaart-top'>" +
              "<span class='pandkaart-prijs tnum'>vanaf " + fmtPrijs(p.prijsVanaf) + "</span>" +
              "<span class='tag tag-project'>Project</span>" +
            "</div>" +
            "<p class='pandkaart-adres'>" + escapeHTML(p.naam) + "</p>" +
            "<p class='pandkaart-plaats'>" + escapeHTML(plaatsRegel) + "</p>" +
            "<p class='pandkaart-meta tnum'>" + escapeHTML(p.subtype) + " · " + fmtM2(p.oppVanaf) + "–" + fmtM2(p.oppTot) + " · oplevering " + p.bouwjaar + "</p>" +
            "<div class='pandkaart-footer'>Rechtstreeks van eigenaar</div>" +
          "</div>" +
        "</a>" +
      "</article>"
    );
  }

  /* Projecten die binnen de actieve filters vallen, boven het losse aanbod. */
  function filterProjecten(f) {
    if (typeof PANVIA_PROJECTEN === "undefined") return [];
    return PANVIA_PROJECTEN.filter(function (p) {
      if (f.type && p.type !== f.type) return false;
      if (f.plaats && p.plaats !== f.plaats) return false;
      if (f.land === "Nederland" && p.land && p.land !== "Nederland") return false;
      if (f.land === "Buitenland" && (!p.land || p.land === "Nederland")) return false;
      if (f.prijs && p.prijsVanaf > Number(f.prijs)) return false;
      if (f.opp && p.oppTot < Number(f.opp)) return false;
      if (f.subtype) return false; /* subtypefilter geldt alleen voor losse panden */
      if (f.bar) return false;     /* projecten hebben geen BAR */
      return true;
    });
  }

  function renderProjectenStrip(projecten) {
    var strip = $("#projecten-strip");
    if (!strip) return;
    if (!projecten.length) {
      strip.hidden = true;
      strip.innerHTML = "";
      return;
    }
    strip.hidden = false;
    strip.innerHTML =
      "<div class='projecten-kop'>" +
        "<span class='kop-label'>Projecten</span>" +
        "<p class='klein grijs'>Parken, complexen en ontwikkelingen — meerdere eenheden, rechtstreeks van de eigenaar of ontwikkelaar.</p>" +
      "</div>" +
      "<div class='kaarten-grid'>" + projecten.map(projectKaartHTML).join("") + "</div>";
  }

  /* ------------------------------------------------------------------------
     Formuliervalidatie — foutmelding onder het veld, in gewone taal
     ------------------------------------------------------------------------ */
  function veldVan(input) {
    var el = input;
    while (el && !el.classList.contains("veld")) el = el.parentElement;
    return el;
  }
  function zetFout(input, melding) {
    var veld = veldVan(input);
    if (!veld) return;
    var fout = veld.querySelector(".fout");
    if (melding) {
      veld.classList.add("heeft-fout");
      if (fout) fout.textContent = melding;
      input.setAttribute("aria-invalid", "true");
    } else {
      veld.classList.remove("heeft-fout");
      input.removeAttribute("aria-invalid");
    }
  }
  function wisFoutBijInvoer(input) {
    input.addEventListener("input", function () { zetFout(input, null); });
    input.addEventListener("change", function () { zetFout(input, null); });
  }

  function geldigePostcode(v) { return /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(v.trim()); }
  function geldigEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  /* ------------------------------------------------------------------------
     Leads versturen naar het endpoint uit config.js.
     Zonder endpoint blijft de lead alleen lokaal staan — dan waarschuwen we
     in de console, want dan verlies je aanmeldingen uit je advertenties.
     ------------------------------------------------------------------------ */
  function cfg(sleutel, standaard) {
    return (typeof PANVIA_CONFIG !== "undefined" && PANVIA_CONFIG[sleutel] !== undefined)
      ? PANVIA_CONFIG[sleutel] : standaard;
  }

  function bewaarLeadLokaal(gegevens) {
    try {
      var lijst = JSON.parse(localStorage.getItem("panvia-leads") || "[]");
      lijst.push(gegevens);
      localStorage.setItem("panvia-leads", JSON.stringify(lijst));
    } catch (e) { /* privémodus */ }
  }

  function verstuurLead(soort, gegevens, klaar) {
    var payload = {};
    Object.keys(gegevens).forEach(function (k) { payload[k] = gegevens[k]; });
    payload.aanmelding = soort;
    payload.pagina = window.location.pathname;
    payload._subject = "Panvia — nieuwe aanmelding: " + soort;
    payload.tijdstip = new Date().toISOString();

    bewaarLeadLokaal(payload);

    var endpoint = cfg("leadEndpoint", "");
    if (!endpoint) {
      if (window.console && console.warn) {
        console.warn("[Panvia] Geen leadEndpoint in js/config.js — deze aanmelding is NIET verstuurd:", payload);
      }
      if (klaar) klaar(false);
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (klaar) klaar(r.ok);
    }).catch(function () {
      if (klaar) klaar(false);
    });
  }

  /* ------------------------------------------------------------------------
     Kopersaccount & gesprekken (gesimuleerd, localStorage)
     Koper betaalt € 12,95 per maand om te praten, te bieden en de volledige
     verkoperinformatie te zien — de drempel die spam weert. Panvia leest
     niet mee; de opslag is hier lokaal.
     ------------------------------------------------------------------------ */
  var KOPER_KEY = "panvia-koper";
  var KOPER_FEE = "€ 12,95";

  function koperAccount() {
    try { return JSON.parse(localStorage.getItem(KOPER_KEY)); } catch (e) { return null; }
  }
  function bewaarKoper(k) {
    try { localStorage.setItem(KOPER_KEY, JSON.stringify(k)); } catch (e) { /* privémodus */ }
  }
  function laadChatVan(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function bewaarChatIn(key, chat) {
    try { localStorage.setItem(key, JSON.stringify(chat)); } catch (e) { /* privémodus */ }
  }
  function tijdNu() {
    var d = new Date();
    return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  }
  function escapeHTML(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function laatsteBericht(chat) {
    return chat.berichten[chat.berichten.length - 1];
  }
  function hoogsteBod(chat) {
    var max = 0;
    chat.berichten.forEach(function (b) {
      if (b.type === "bod" && b.van === "koper" && b.bedrag > max) max = b.bedrag;
    });
    return max;
  }

  /* Verkopergegevens zijn beschermd: ze bestaan niet in de pagina tot de
     eigenaar ze zelf in de chat deelt. Hier deterministisch verzonnen per
     pand — in het echte platform komen ze uit het account van de eigenaar. */
  function verkoperVan(pand) {
    var vn = ["Mark", "Sanne", "Peter", "Anne", "Jeroen", "Fatima", "Youssef", "Lisa", "Dirk", "Ingrid", "Ruben", "Nadia"];
    var an = ["de Vries", "Jansen", "Bakker", "El Amrani", "Visser", "Smit", "De Boer", "Meijer", "Van Dijk", "Koster"];
    var rng = maakRng(pand.id + "-verkoper");
    var voornaam = vn[Math.floor(rng() * vn.length)];
    var achternaam = an[Math.floor(rng() * an.length)];
    var nummer = "06 " + String(10000000 + Math.floor(rng() * 89999999));
    var email = (voornaam + "." + achternaam.replace(/\s/g, "").toLowerCase() + "@voorbeeld.nl")
      .toLowerCase().replace(/[^a-z0-9.@]/g, "");
    return { naam: voornaam + " " + achternaam, telefoon: nummer, email: email };
  }

  /* Eén chatbubbel. ikBen = "koper" (pandpagina) of "eigenaar" (Mijn Panvia). */
  function chatBerichtHTML(b, ikBen, koperNaam) {
    var eigen = b.van === ikBen;
    var wie = eigen ? "jij" : (b.van === "koper" ? (koperNaam || "koper").split(" ")[0] : "eigenaar");

    /* Beveiligde contactkaart: alleen zichtbaar in de chat, met watermerk
       dat de ontvanger benoemt (afschrikking tegen doorsturen/screenshotten). */
    if (b.type === "contactkaart") {
      var c = b.contact || {};
      var merk = (koperNaam || "deze koper");
      return "<div class='chat-bericht " + (eigen ? "chat-eigen" : "chat-ander") + " contactkaart' " +
        "oncontextmenu='return false' ondragstart='return false'>" +
        "<span class='chat-bod-label'>Contactgegevens · vertrouwelijk</span>" +
        "<div class='contactkaart-data'>" +
          "<p class='ck-naam'>" + escapeHTML(c.naam || "") + "</p>" +
          "<p class='ck-regel tnum'>" + escapeHTML(c.telefoon || "") + "</p>" +
          "<p class='ck-regel'>" + escapeHTML(c.email || "") + "</p>" +
          "<span class='contactkaart-merk' aria-hidden='true'>" + escapeHTML(merk) + " · alleen voor jou</span>" +
        "</div>" +
        "<span class='chat-bod-note'>De eigenaar deelt dit vertrouwelijk met jou. Niet doorsturen of screenshotten — dit is aan jouw account herleidbaar.</span>" +
        "<span class='chat-tijd tnum'>" + escapeHTML(wie) + " · " + b.tijd + "</span>" +
        "</div>";
    }

    var inhoud;
    if (b.type === "bod") {
      inhoud =
        "<span class='chat-bod-label'>Bod</span>" +
        "<span class='chat-bod-bedrag tnum'>" + fmtPrijs(b.bedrag) + "</span>" +
        (b.tekst ? "<span>" + escapeHTML(b.tekst) + "</span>" : "") +
        "<span class='chat-bod-note'>Niet bindend — de koop regelen jullie samen bij de notaris.</span>";
    } else {
      inhoud = escapeHTML(b.tekst);
    }
    return "<div class='chat-bericht " + (eigen ? "chat-eigen" : "chat-ander") + (b.type === "bod" ? " chat-bod" : "") + "'>" +
      inhoud +
      "<span class='chat-tijd tnum'>" + escapeHTML(wie) + " · " + b.tijd + "</span>" +
      "</div>";
  }

  /* Schermbescherming: vervaag beveiligde kaarten zodra het venster de focus
     verliest of de tab verborgen wordt — een afschrikking tegen screenshots.
     Echte preventie kan niet op het web; dit maakt vastleggen alleen lastiger. */
  function initSchermbescherming() {
    function zet(verberg) {
      document.body.classList.toggle("scherm-verborgen", verberg);
      $all(".contactkaart-data").forEach(function (el) { el.classList.toggle("is-verborgen", verberg); });
    }
    document.addEventListener("visibilitychange", function () { zet(document.hidden); });
    window.addEventListener("blur", function () { zet(true); });
    window.addEventListener("focus", function () { zet(false); });
    /* Kopiëren van beveiligde kaarten blokkeren */
    document.addEventListener("copy", function (e) {
      var sel = window.getSelection();
      if (sel && sel.anchorNode) {
        var el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
        if (el && el.closest && el.closest(".contactkaart")) {
          e.preventDefault();
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     Account-blok rechtsboven — inloggen / account maken, of ingelogd
     ------------------------------------------------------------------------ */
  function initAccountNav() {
    var slot = $("#nav-account");
    if (!slot) return;
    var k = koperAccount();
    if (k && k.betaald) {
      slot.innerHTML =
        "<a class='nav-account-naam' href='inloggen.html' title='Mijn account'>" + escapeHTML(k.naam.split(" ")[0]) + "</a>" +
        "<button type='button' class='nav-uitlog' id='nav-uitlog'>Uitloggen</button>";
      var uit = $("#nav-uitlog");
      if (uit) uit.addEventListener("click", function () {
        try { localStorage.removeItem("panvia-koper"); } catch (e) {}
        window.location.reload();
      });
    } else {
      slot.innerHTML =
        "<a href='inloggen.html'>Inloggen</a>" +
        "<a class='nav-account-maak' href='inloggen.html#maken'>Account maken</a>";
    }
  }

  /* ------------------------------------------------------------------------
     Pagina: inloggen — mock-login op basis van het lokale kopersaccount
     ------------------------------------------------------------------------ */
  function initInloggen() {
    var form = $("#login-form");
    if (!form) return;
    var k = koperAccount();
    if (k && k.betaald) {
      $("#login-blok").innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Je bent ingelogd</h2>" +
          "<p class='grijs'>Welkom terug, " + escapeHTML(k.naam.split(" ")[0]) + ". Je kopersabonnement is actief — je kunt op elk pand praten, bieden en gedeelde contactgegevens ontvangen.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='aanbod.html'>Naar het aanbod</a> <button type='button' class='btn btn-tertiair' id='login-uitlog'>Uitloggen</button></p>" +
        "</div>";
      var uit = $("#login-uitlog");
      if (uit) uit.addEventListener("click", function () {
        try { localStorage.removeItem("panvia-koper"); } catch (e) {}
        window.location.reload();
      });
      return;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#login-email");
      if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); return; }
      /* Prototype: we hebben geen wachtwoorden. Kennen we dit e-mailadres als
         kopersaccount, dan 'loggen we in'; anders wijzen we naar aanmelden. */
      var bestaand = koperAccount();
      if (bestaand && bestaand.email && bestaand.email.toLowerCase() === email.value.trim().toLowerCase()) {
        bewaarKoper({ naam: bestaand.naam, email: bestaand.email, betaald: true });
        window.location.reload();
      } else {
        zetFout(email, "We kennen dit e-mailadres nog niet. Maak hieronder een account aan.");
      }
    });
    $all("input", form).forEach(wisFoutBijInvoer);
  }

  /* ------------------------------------------------------------------------
     Navigatie (mobiel)
     ------------------------------------------------------------------------ */
  function initNav() {
    var knop = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!knop || !nav) return;
    knop.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      knop.setAttribute("aria-expanded", open ? "true" : "false");
      knop.textContent = open ? "Sluit menu" : "Menu";
    });
  }

  /* ------------------------------------------------------------------------
     Pagina: homepage
     ------------------------------------------------------------------------ */
  function initHome() {
    var heroKaart = $("#hero-kaart");
    if (heroKaart) {
      renderKaarten(heroKaart, [vindPand("w2")]);
    }
    var grid = $("#uitgelicht-grid");
    if (grid) {
      var panden = PANVIA_UITGELICHT.map(vindPand).filter(Boolean);
      renderKaarten(grid, panden);
    }

    /* Statsstrip — cijfers komen live uit data.js, we verzinnen niets extra's */
    var statPanden = $("#stat-panden");
    if (statPanden) {
      var kijkers = 0;
      var plaatsen = [];
      PANVIA_PANDEN.forEach(function (p) {
        kijkers += p.views || 0;
        if (plaatsen.indexOf(p.plaats) === -1) plaatsen.push(p.plaats);
      });
      zetTelDoel(statPanden, PANVIA_PANDEN.length);
      zetTelDoel($("#stat-kijkers"), kijkers);
      zetTelDoel($("#stat-plaatsen"), plaatsen.length);
    }

    /* Rekenmachine — jouw som, live. Courtage vul je zelf in (komma of punt). */
    var rekenPrijs = $("#reken-prijs");
    var rekenCourtage = $("#reken-courtage");
    if (rekenPrijs && rekenCourtage) {
      var leesPct = function () {
        var pct = parseFloat(String(rekenCourtage.value).replace(",", ".").replace(/[^\d.]/g, ""));
        if (isNaN(pct) || pct < 0) pct = 0;
        if (pct > 10) pct = 10; /* boven de 10% is het geen courtage meer maar een fout */
        return pct;
      };
      var rekenen = function () {
        var n = Number(String(rekenPrijs.value).replace(/[^\d]/g, "")) || 0;
        var pct = leesPct();
        var makelaar = Math.round(n * (pct / 100) * 1.21);
        $("#reken-pct").textContent = fmtKomma(pct);
        $("#reken-makelaar").textContent = fmtPrijs(makelaar);
        $("#reken-verschil").textContent = fmtPrijs(Math.max(0, makelaar - PANVIA_FEE));
      };
      rekenPrijs.addEventListener("input", rekenen);
      rekenPrijs.addEventListener("blur", function () {
        var n = Number(String(rekenPrijs.value).replace(/[^\d]/g, "")) || 0;
        rekenPrijs.value = n > 0 ? fmtDuizend(n) : "";
      });
      rekenCourtage.addEventListener("input", rekenen);
      rekenCourtage.addEventListener("blur", function () {
        rekenCourtage.value = fmtKomma(leesPct());
      });
      rekenen();
    }

    /* Aanbodalert (kopers) — gesimuleerd, zoals alles hier */
    var alertForm = $("#alert-form");
    if (alertForm) {
      alertForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = $("#alert-email");
        if (!geldigEmail(email.value)) {
          zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl");
          return;
        }
        verstuurLead("koper-alert", { email: email.value.trim() });
        var blok = $("#alert-blok");
        blok.innerHTML =
          "<span class='label'>Nieuw aanbod in je mail</span>" +
          "<p class='alert-bevestiging'><strong>Je staat op de lijst.</strong> Zodra er een pand bij komt, " +
          "krijg je één mail op " + email.value.trim() + ". Meer niet.</p>" +
          "<p class='klein alert-sub'>Uitschrijven kan met één klik. We verkopen je adres niet door — aan niemand, ooit.</p>";
      });
      $all("input", alertForm).forEach(wisFoutBijInvoer);
    }
  }

  /* ------------------------------------------------------------------------
     Pagina: aanbod — werkende client-side filtering
     ------------------------------------------------------------------------ */
  function vulPlaatsen(select, panden) {
    var plaatsen = [];
    panden.forEach(function (p) { if (plaatsen.indexOf(p.plaats) === -1) plaatsen.push(p.plaats); });
    plaatsen.sort();
    plaatsen.forEach(function (pl) {
      var opt = document.createElement("option");
      opt.value = pl; opt.textContent = pl;
      select.appendChild(opt);
    });
  }

  function initAanbod() {
    var grid = $("#aanbod-grid");
    var teller = $("#resultaat-teller");
    var leeg = $("#leeg-melding");
    var fType = $("#filter-type");
    var fPlaats = $("#filter-plaats");
    var fPrijs = $("#filter-prijs");
    var fOpp = $("#filter-opp");
    var wis = $("#wis-filters");
    if (!grid) return;

    vulPlaatsen(fPlaats, PANVIA_PANDEN);

    var fLand = $("#filter-land");

    function pas() {
      var resultaat = PANVIA_PANDEN.filter(function (p) {
        if (fType.value && p.type !== fType.value) return false;
        if (fPlaats.value && p.plaats !== fPlaats.value) return false;
        if (fLand && fLand.value === "Nederland" && p.land && p.land !== "Nederland") return false;
        if (fLand && fLand.value === "Buitenland" && (!p.land || p.land === "Nederland")) return false;
        if (fPrijs.value && p.prijs > Number(fPrijs.value)) return false;
        if (fOpp.value && p.oppervlakte < Number(fOpp.value)) return false;
        return true;
      });
      var projecten = filterProjecten({
        type: fType.value, plaats: fPlaats.value, land: fLand ? fLand.value : "",
        prijs: fPrijs.value, opp: fOpp.value
      });
      renderProjectenStrip(projecten);
      renderKaarten(grid, resultaat);
      teller.innerHTML = "<strong class='tnum'>" + resultaat.length + "</strong> " +
        (resultaat.length === 1 ? "pand" : "panden") +
        (projecten.length ? " en <strong class='tnum'>" + projecten.length + "</strong> " +
          (projecten.length === 1 ? "project" : "projecten") : "") +
        " · rechtstreeks van eigenaar";
      leeg.hidden = !(resultaat.length === 0 && projecten.length === 0);
      grid.hidden = resultaat.length === 0;
    }

    [fType, fPlaats, fPrijs, fOpp, fLand].forEach(function (el) {
      if (el) el.addEventListener("change", pas);
    });
    wis.addEventListener("click", function () {
      fType.value = ""; fPlaats.value = ""; fPrijs.value = ""; fOpp.value = "";
      if (fLand) fLand.value = "";
      pas();
    });

    /* Vooringevulde filter via URL, bv. aanbod.html?type=woning */
    var q = new URLSearchParams(window.location.search);
    if (q.get("type")) fType.value = q.get("type");
    pas();
  }

  /* ------------------------------------------------------------------------
     Pagina: buitenland — al het vastgoed buiten Nederland, per land
     ------------------------------------------------------------------------ */
  function initBuitenland() {
    var grid = $("#buitenland-grid");
    var teller = $("#resultaat-teller");
    var leeg = $("#leeg-melding");
    var fLand = $("#filter-land");
    var fType = $("#filter-type");
    var fPrijs = $("#filter-prijs");
    var wis = $("#wis-filters");
    if (!grid) return;

    var buitenland = PANVIA_PANDEN.filter(function (p) { return p.land && p.land !== "Nederland"; });

    /* Landen-dropdown vullen uit het buitenlandse aanbod */
    var landen = [];
    buitenland.forEach(function (p) { if (landen.indexOf(p.land) === -1) landen.push(p.land); });
    landen.sort();
    landen.forEach(function (l) {
      var opt = document.createElement("option");
      opt.value = l; opt.textContent = l;
      fLand.appendChild(opt);
    });

    function pas() {
      var resultaat = buitenland.filter(function (p) {
        if (fLand.value && p.land !== fLand.value) return false;
        if (fType.value && p.type !== fType.value) return false;
        if (fPrijs.value && p.prijs > Number(fPrijs.value)) return false;
        return true;
      });
      renderKaarten(grid, resultaat);
      teller.innerHTML = "<strong class='tnum'>" + resultaat.length + "</strong> " +
        (resultaat.length === 1 ? "pand in het buitenland" : "panden in het buitenland") +
        " · rechtstreeks van eigenaar";
      leeg.hidden = resultaat.length !== 0;
      grid.hidden = resultaat.length === 0;
    }

    [fLand, fType, fPrijs].forEach(function (el) {
      if (el) el.addEventListener("change", pas);
    });
    wis.addEventListener("click", function () {
      fLand.value = ""; fType.value = ""; fPrijs.value = "";
      pas();
    });

    /* Snelkoppeling per land via URL, bv. buitenland.html?land=Spanje */
    var q = new URLSearchParams(window.location.search);
    if (q.get("land") && landen.indexOf(q.get("land")) !== -1) fLand.value = q.get("land");
    pas();
  }

  /* ------------------------------------------------------------------------
     Pagina: kopers — het kopersabonnement afsluiten (€ 12,95 p/m)
     ------------------------------------------------------------------------ */
  function initKopers() {
    var blok = $("#kopers-aanmeld-blok");
    if (!blok) return;

    var prijsEls = $all(".js-koper-fee");
    prijsEls.forEach(function (el) { el.textContent = KOPER_FEE; });

    /* Al lid? Toon dat, in plaats van het formulier. */
    var bestaand = koperAccount();
    if (bestaand && bestaand.betaald) {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Je bent al lid</h2>" +
          "<p class='grijs'>Je kopersabonnement staat op naam van <strong>" + escapeHTML(bestaand.naam) + "</strong> (" +
          escapeHTML(bestaand.email) + "). Je kunt op elk pand rechtstreeks met de eigenaar praten, bieden en de volledige verkoperinformatie zien.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='aanbod.html'>Bekijk het aanbod</a></p>" +
        "</div>";
      return;
    }

    var form = $("#kopers-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var naam = $("#kopers-naam");
      var email = $("#kopers-email");
      var akkoord = $("#kopers-akkoord");
      var ok = true;
      if (!naam.value.trim()) { zetFout(naam, "Vul je naam in, dan weten eigenaren wie er schrijft."); ok = false; }
      if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
      if (!akkoord.checked) { zetFout(akkoord, "Zet een vinkje om akkoord te gaan met de voorwaarden."); ok = false; }
      if (!ok) return;

      verstuurLead("koper-abonnement", { naam: naam.value.trim(), email: email.value.trim(), tarief: KOPER_FEE + " per maand" });
      bewaarKoper({ naam: naam.value.trim(), email: email.value.trim(), betaald: true });

      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Welkom. Je bent nu lid.</h2>" +
          "<p class='grijs'>Vanaf nu praat je op elk pand rechtstreeks met de eigenaar, doe je biedingen en zie je de volledige verkoperinformatie. Je betaalt " + KOPER_FEE + " per maand en zegt elke maand met één klik op.</p>" +
          "<p class='klein grijs'>Prototype: er wordt niets afgeschreven en je gegevens worden niet doorverkocht — aan niemand, ooit.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='aanbod.html'>Bekijk het aanbod</a></p>" +
        "</div>";
      window.scrollTo({ top: blok.offsetTop - 40, behavior: "smooth" });
    });
    $all("input", form).forEach(wisFoutBijInvoer);
  }

  /* ------------------------------------------------------------------------
     Pagina: zakelijk — alleen commercieel, met BAR-filter
     ------------------------------------------------------------------------ */
  function initZakelijk() {
    var grid = $("#zakelijk-grid");
    var teller = $("#resultaat-teller");
    var leeg = $("#leeg-melding");
    var fSub = $("#filter-subtype");
    var fPlaats = $("#filter-plaats");
    var fPrijs = $("#filter-prijs");
    var fOpp = $("#filter-opp");
    var fBar = $("#filter-bar");
    var wis = $("#wis-filters");
    if (!grid) return;

    var commercieel = PANVIA_PANDEN.filter(function (p) { return p.type === "commercieel"; });
    vulPlaatsen(fPlaats, commercieel);

    function pas() {
      var resultaat = commercieel.filter(function (p) {
        if (fSub.value && p.subtype !== fSub.value) return false;
        if (fPlaats.value && p.plaats !== fPlaats.value) return false;
        if (fPrijs.value && p.prijs > Number(fPrijs.value)) return false;
        if (fOpp.value && p.oppervlakte < Number(fOpp.value)) return false;
        if (fBar.value && (!p.bar || p.bar < Number(fBar.value))) return false;
        return true;
      });
      var projecten = filterProjecten({
        type: "commercieel", plaats: fPlaats.value, prijs: fPrijs.value,
        opp: fOpp.value, subtype: fSub.value, bar: fBar.value
      });
      renderProjectenStrip(projecten);
      renderKaarten(grid, resultaat, { toonBar: true });
      teller.innerHTML = "<strong class='tnum'>" + resultaat.length + "</strong> " +
        (resultaat.length === 1 ? "object" : "objecten") +
        (projecten.length ? " en <strong class='tnum'>" + projecten.length + "</strong> " +
          (projecten.length === 1 ? "project" : "projecten") : "") +
        " · rechtstreeks van eigenaar";
      leeg.hidden = !(resultaat.length === 0 && projecten.length === 0);
      grid.hidden = resultaat.length === 0;
    }

    [fSub, fPlaats, fPrijs, fOpp, fBar].forEach(function (el) {
      el.addEventListener("change", pas);
    });
    wis.addEventListener("click", function () {
      fSub.value = ""; fPlaats.value = ""; fPrijs.value = ""; fOpp.value = ""; fBar.value = "";
      pas();
    });
    pas();
  }

  /* ------------------------------------------------------------------------
     Pagina: pand (detail)
     ------------------------------------------------------------------------ */
  function initPand() {
    var q = new URLSearchParams(window.location.search);
    var pand = vindPand(q.get("id")) || vindPand("w2");

    document.title = pand.adres + ", " + pand.plaats + " — " + fmtPrijs(pand.prijs) + " | Panvia";

    /* Galerij */
    var hoofd = $("#galerij-hoofd-img");
    var thumbs = $("#galerij-thumbs");
    var beelden = [
      { src: pandBeeld(pand, 0), naam: "Vooraanzicht" },
      { src: pandBeeld(pand, 1), naam: "Achterzijde" },
      { src: pandBeeld(pand, 2), naam: "Interieur" },
      { src: pandBeeld(pand, "plattegrond"), naam: "Plattegrond" }
    ];
    hoofd.src = beelden[0].src;
    hoofd.alt = "Voorbeeldbeeld: " + beelden[0].naam.toLowerCase() + " van " + pand.adres;
    thumbs.innerHTML = beelden.map(function (b, i) {
      return "<button type='button' data-index='" + i + "' aria-pressed='" + (i === 0 ? "true" : "false") + "'>" +
        "<img src='" + b.src + "' alt='" + b.naam + " (voorbeeldbeeld)'>" +
        "</button>";
    }).join("");
    $all("button", thumbs).forEach(function (knop) {
      knop.addEventListener("click", function () {
        var i = Number(knop.getAttribute("data-index"));
        hoofd.src = beelden[i].src;
        hoofd.alt = "Voorbeeldbeeld: " + beelden[i].naam.toLowerCase() + " van " + pand.adres;
        $all("button", thumbs).forEach(function (k) { k.setAttribute("aria-pressed", "false"); });
        knop.setAttribute("aria-pressed", "true");
      });
    });

    /* Kopgegevens */
    $("#detail-prijs").innerHTML = fmtPrijs(pand.prijs) + " <span class='kk'>kosten koper</span>";
    $("#detail-adres").textContent = pand.adres;
    $("#detail-plaats").textContent = pand.plaats + (pand.land && pand.land !== "Nederland" ? " · " + pand.land : "");
    $("#detail-status").innerHTML = statusTag(pand);
    $("#detail-meta").textContent =
      pand.subtype + " · " + fmtM2(pand.oppervlakte) + " · bouwjaar " + pand.bouwjaar + " · energielabel " + pand.energielabel;
    $("#detail-views").textContent =
      fmtDuizend(pand.views) + " mensen bekeken dit pand in de afgelopen 30 dagen.";

    /* Omschrijving */
    $("#detail-omschrijving").textContent = pand.omschrijving;

    /* Kenmerkentabel */
    var rijen = [
      ["Vraagprijs", fmtPrijs(pand.prijs) + " kosten koper"],
      ["Type", pand.subtype + (pand.type === "commercieel" ? " (commercieel)" : "")],
      ["Woon-/gebruiksoppervlakte", fmtM2(pand.oppervlakte)],
      ["Perceel", pand.perceel ? fmtM2(pand.perceel) : "n.v.t. (appartementsrecht)"],
      ["Bouwjaar", String(pand.bouwjaar)],
      ["Energielabel", pand.energielabel],
      ["Kadastrale aanduiding", pand.kadastraal]
    ];
    if (pand.land && pand.land !== "Nederland") {
      rijen.splice(1, 0, ["Land", pand.land + " — koop naar lokaal recht"]);
    }
    if (pand.kamers) rijen.splice(3, 0, ["Kamers", String(pand.kamers)]);
    if (pand.bar) {
      rijen.push(["Bruto aanvangsrendement (BAR)", fmtKomma(pand.bar) + " %"]);
      rijen.push(["Huuropbrengst", fmtPrijs(pand.huur) + " per jaar"]);
    }
    Object.keys(pand.extra || {}).forEach(function (k) {
      rijen.push([k, pand.extra[k]]);
    });
    $("#kenmerken-body").innerHTML = rijen.map(function (r) {
      return "<tr><th scope='row'>" + r[0] + "</th><td class='tnum'>" + r[1] + "</td></tr>";
    }).join("");

    /* --------------------------------------------------------------------
       Chat & bieden met de eigenaar (gesimuleerd). Rechtstreeks, Panvia
       zit er niet tussen. Vereist een kopersabonnement van € 12,95 per maand
       (de drempel die spam weert). Gesprek wordt per pand lokaal bewaard.
       -------------------------------------------------------------------- */
    var chatKey = "panvia-chat-" + pand.id;
    var chatBlok = $("#contact-blok-inhoud");
    var CHAT_SNELVRAGEN = ["Kan ik komen kijken?", "Waarom verkoop je?", "Zijn er rapporten in te zien?", "Mag ik je contactgegevens?"];

    function eigenaarAntwoord(chat) {
      var laatste = laatsteBericht(chat);
      /* Verzoek om contactgegevens — alleen delen bij aangetoonde interesse */
      var vraagtContact = laatste && laatste.type !== "bod" && laatste.tekst &&
        /contactgegeven|telefoon|nummer|bellen|bereiken|appen|mailadres/i.test(laatste.tekst);
      if (vraagtContact) {
        var alGedeeld = chat.berichten.some(function (b) { return b.type === "contactkaart"; });
        if (alGedeeld) {
          return [{ tekst: "Mijn gegevens heb ik hierboven al met je gedeeld — bel of app gerust." }];
        }
        var koperTekst = chat.berichten.filter(function (b) { return b.van === "koper" && b.type !== "bod"; }).length;
        var interesse = hoogsteBod(chat) > 0 || koperTekst >= 3;
        if (interesse) {
          return [
            { tekst: "Je meent het duidelijk, " + chat.naam.split(" ")[0] + ". Hier zijn mijn gegevens — bel of app gerust. Ik hou ze graag tussen ons." },
            { type: "contactkaart", contact: verkoperVan(pand) }
          ];
        }
        return [{ tekst: "Mijn nummer deel ik graag zodra ik merk dat het serieus is — kom eerst even kijken, of doe een bod. Dan hoor je meteen van me." }];
      }
      if (laatste && laatste.type === "bod") {
        return [{ tekst: "Dank voor je bod van " + fmtPrijs(laatste.bedrag) + ", " + chat.naam.split(" ")[0] +
          ". Ik laat het even bezinken en kom er binnen twee dagen op terug." }];
      }
      var nEigenaar = chat.berichten.filter(function (b) { return b.van === "eigenaar" && b.type !== "contactkaart"; }).length;
      if (nEigenaar === 0) {
        return [{ tekst: "Dag " + chat.naam.split(" ")[0] + ", dank voor je bericht — leuk dat je interesse hebt in " +
          pand.adres + ". Vraag gerust door, of stel een moment voor om te komen kijken." }];
      }
      var vervolg = [
        "Goede vraag. Ik ken dit pand door en door, dus ik vertel je het eerlijke verhaal — ook wat er minder aan is. Bij een bezichtiging liggen alle stukken ter inzage.",
        "Deze week kan ik doordeweeks na 17:00, of zaterdagochtend. Wat past jou? Neem gerust iemand mee.",
        "Prima, dan houden we dat aan. Tot dan — en als er tussendoor iets is, stuur je maar een bericht."
      ];
      return [{ tekst: vervolg[Math.min(nEigenaar - 1, vervolg.length - 1)] }];
    }

    function simuleerAntwoord(chat) {
      var thread = $("#chat-thread");
      var typt = document.createElement("p");
      typt.className = "chat-typt";
      typt.textContent = "De eigenaar typt…";
      thread.appendChild(typt);
      thread.scrollTop = thread.scrollHeight;
      setTimeout(function () {
        eigenaarAntwoord(chat).forEach(function (m) {
          m.van = "eigenaar"; m.tijd = tijdNu();
          chat.berichten.push(m);
        });
        bewaarChatIn(chatKey, chat);
        renderChat(chat);
        var veld = $("#chat-tekst");
        if (veld) veld.focus();
      }, 1400);
    }

    /* berichten: array van {tekst} en/of {type:'bod', bedrag} */
    function stuurBerichten(chat, berichten) {
      berichten.forEach(function (b) {
        b.van = "koper";
        b.tijd = tijdNu();
        chat.berichten.push(b);
      });
      bewaarChatIn(chatKey, chat);
      renderChat(chat);
      simuleerAntwoord(chat);
    }

    function renderChat(chat) {
      chatBlok.innerHTML =
        "<div class='chat'>" +
          "<p class='klein grijs chat-kop'>Gesprek over " + escapeHTML(pand.adres) + " · prototype: de eigenaar is gesimuleerd</p>" +
          "<div class='chat-thread' id='chat-thread' aria-live='polite'>" +
            chat.berichten.map(function (b) { return chatBerichtHTML(b, "koper", chat.naam); }).join("") +
          "</div>" +
          "<div class='chat-chips'>" +
            CHAT_SNELVRAGEN.map(function (v) {
              return "<button type='button' class='chip'>" + v + "</button>";
            }).join("") +
            "<button type='button' class='chip chip-bod' id='chip-bod'>Doe een bod</button>" +
          "</div>" +
          "<div class='bod-invoer' id='bod-invoer' hidden>" +
            "<div class='veld'>" +
              "<label for='bod-bedrag'>Je bod in euro's</label>" +
              "<div class='bod-invoer-rij'>" +
                "<input type='text' id='bod-bedrag' inputmode='numeric' class='tnum' autocomplete='off'>" +
                "<button type='button' class='btn btn-secundair' id='bod-verstuur'>Verstuur bod</button>" +
              "</div>" +
              "<p class='fout' role='alert'></p>" +
            "</div>" +
          "</div>" +
          "<form class='chat-invoer' id='chat-invoer'>" +
            "<label class='visueel-verborgen' for='chat-tekst'>Je bericht</label>" +
            "<input type='text' id='chat-tekst' autocomplete='off'>" +
            "<button type='submit' class='btn btn-primair'>Stuur</button>" +
          "</form>" +
        "</div>";

      var thread = $("#chat-thread");
      thread.scrollTop = thread.scrollHeight;

      $("#chat-invoer").addEventListener("submit", function (e) {
        e.preventDefault();
        var veld = $("#chat-tekst");
        if (veld.value.trim()) stuurBerichten(chat, [{ tekst: veld.value.trim() }]);
      });
      $all(".chip:not(.chip-bod)", chatBlok).forEach(function (chip) {
        chip.addEventListener("click", function () { stuurBerichten(chat, [{ tekst: chip.textContent }]); });
      });
      $("#chip-bod").addEventListener("click", function () {
        var bod = $("#bod-invoer");
        bod.hidden = !bod.hidden;
        if (!bod.hidden) $("#bod-bedrag").focus();
      });
      var bodBedrag = $("#bod-bedrag");
      $("#bod-verstuur").addEventListener("click", function () {
        var n = Number(String(bodBedrag.value).replace(/[^\d]/g, ""));
        if (!n || n < 10000) {
          zetFout(bodBedrag, "Vul je bod in euro's in, bijvoorbeeld 435000");
          return;
        }
        stuurBerichten(chat, [{ type: "bod", bedrag: n }]);
      });
      wisFoutBijInvoer(bodBedrag);
    }

    /* Stap 1 — kopersabonnement: € 12,95 per maand, daarna praat, bied en
       zie je de volledige verkoperinformatie overal */
    function renderAccount() {
      chatBlok.innerHTML =
        "<div class='account-box'>" +
          "<span class='label'>Kopersabonnement</span>" +
          "<p class='klein grijs'>Praten met eigenaren, bieden én de volledige verkoperinformatie zien doe je met een kopersabonnement: <strong class='tnum'>" + KOPER_FEE + "</strong> per maand, geldig voor alle panden en maandelijks opzegbaar. Zo weet elke eigenaar dat er een serieuze koper schrijft — en krijg jij antwoord in plaats van stilte. <a href='kopers.html'>Meer over het abonnement</a>.</p>" +
          "<div class='veld'>" +
            "<label for='account-naam'>Je naam</label>" +
            "<input type='text' id='account-naam' autocomplete='name'>" +
            "<p class='fout' role='alert'></p>" +
          "</div>" +
          "<div class='veld'>" +
            "<label for='account-email'>Je e-mailadres</label>" +
            "<input type='email' id='account-email' autocomplete='email'>" +
            "<p class='fout' role='alert'></p>" +
          "</div>" +
          "<button type='button' id='account-knop' class='btn btn-primair'>Maak account — " + KOPER_FEE + " per maand</button>" +
          "<p class='klein grijs' style='margin: 12px 0 0;'>Zoeken en kijken blijft gratis; opzeggen kan elke maand met één klik. Prototype: er wordt niets afgeschreven.</p>" +
        "</div>";
      var naam = $("#account-naam");
      var email = $("#account-email");
      $("#account-knop").addEventListener("click", function () {
        var ok = true;
        if (!naam.value.trim()) { zetFout(naam, "Vul je naam in, dan weet de eigenaar wie er schrijft."); ok = false; }
        if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
        if (!ok) return;
        verstuurLead("koper-account", {
          naam: naam.value.trim(),
          email: email.value.trim(),
          pand: pand.adres + ", " + pand.plaats
        });
        bewaarKoper({ naam: naam.value.trim(), email: email.value.trim(), betaald: true });
        renderEersteBericht(koperAccount());
      });
      [naam, email].forEach(wisFoutBijInvoer);
    }

    /* Stap 2 — eerste bericht, met optioneel direct een bod */
    function renderEersteBericht(koper) {
      chatBlok.innerHTML =
        "<form id='eerste-form' novalidate>" +
          "<p class='klein grijs'>Je schrijft als <strong>" + escapeHTML(koper.naam) + "</strong>. De eigenaar krijgt je bericht direct — Panvia leest niet mee.</p>" +
          "<div class='veld'>" +
            "<label for='eerste-bericht'>Je eerste bericht aan de eigenaar</label>" +
            "<textarea id='eerste-bericht'></textarea>" +
            "<span class='hint'>Bijvoorbeeld: een vraag over het pand, of een voorstel voor een bezichtiging.</span>" +
            "<p class='fout' role='alert'></p>" +
          "</div>" +
          "<div class='veld'>" +
            "<label for='eerste-bod'>Bod meesturen, in euro's <span class='optioneel'>(optioneel)</span></label>" +
            "<input type='text' id='eerste-bod' inputmode='numeric' class='tnum' autocomplete='off' style='max-width: 240px;'>" +
            "<p class='fout' role='alert'></p>" +
          "</div>" +
          "<button type='submit' class='btn btn-primair'>Start het gesprek</button>" +
        "</form>";
      var bericht = $("#eerste-bericht");
      var bod = $("#eerste-bod");
      $("#eerste-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var tekst = bericht.value.trim();
        var n = Number(String(bod.value).replace(/[^\d]/g, ""));
        if (bod.value.trim() && (!n || n < 10000)) {
          zetFout(bod, "Vul je bod in euro's in, bijvoorbeeld 435000 — of laat het veld leeg.");
          return;
        }
        if (!tekst && !n) {
          zetFout(bericht, "Schrijf een kort bericht, of doe een bod.");
          return;
        }
        var chat = { naam: koper.naam, email: koper.email, berichten: [] };
        var berichten = [];
        if (tekst) berichten.push({ tekst: tekst });
        if (n) berichten.push({ type: "bod", bedrag: n });
        stuurBerichten(chat, berichten);
        chatBlok.focus();
      });
      [bericht, bod].forEach(wisFoutBijInvoer);
    }

    var bestaandeChat = laadChatVan(chatKey);
    if (bestaandeChat && bestaandeChat.berichten && bestaandeChat.berichten.length) {
      renderChat(bestaandeChat);
    } else if (koperAccount()) {
      renderEersteBericht(koperAccount());
    } else {
      renderAccount();
    }

    /* --------------------------------------------------------------------
       Biedingen-blok: zonder kopersaccount op slot. Zonder account zie je
       alleen de advertentie zelf — foto's, vraagprijs en beschrijving.
       -------------------------------------------------------------------- */
    var biedInfo = $("#bied-info");
    if (biedInfo) {
      var biedingen = [];
      try {
        for (var bi = 0; bi < localStorage.length; bi++) {
          var sleutel = localStorage.key(bi);
          if (sleutel && sleutel.indexOf("panvia-chat-" + pand.id) === 0) {
            var c = laadChatVan(sleutel);
            if (c && c.berichten) {
              c.berichten.forEach(function (b) {
                if (b.type === "bod" && b.van === "koper") biedingen.push(b.bedrag);
              });
            }
          }
        }
      } catch (e) { /* privémodus */ }
      if (!koperAccount()) {
        biedInfo.innerHTML =
          "<span class='label'>Biedingen</span>" +
          "<p class='klein grijs'>Alleen zichtbaar met een kopersaccount. Maak er hieronder één — dan zie je of er geboden is en kun je zelf meedoen.</p>";
      } else if (!biedingen.length) {
        biedInfo.innerHTML =
          "<span class='label'>Biedingen</span>" +
          "<p class='klein grijs'>Nog geen biedingen op dit pand. Wie het eerst schrijft, praat het eerst.</p>";
      } else {
        biedInfo.innerHTML =
          "<span class='label'>Biedingen</span>" +
          "<p class='bied-hoogste tnum'>" + fmtPrijs(Math.max.apply(null, biedingen)) + "</p>" +
          "<p class='klein grijs tnum'>" + biedingen.length + (biedingen.length === 1 ? " bod" : " biedingen") +
          " · hoogste bod, niet bindend</p>";
      }
    }
  }

  /* ------------------------------------------------------------------------
     Pagina: projecten — aanmelding door parken en ontwikkelaars
     ------------------------------------------------------------------------ */
  function initProjecten() {
    var form = $("#project-aanmeld-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var org = $("#pa-organisatie");
      var naam = $("#pa-naam");
      var email = $("#pa-email");
      var proj = $("#pa-project");
      var eenheden = $("#pa-eenheden");
      var verklaring = $("#pa-verklaring");
      var ok = true;
      if (!org.value.trim()) { zetFout(org, "Vul de naam van je organisatie in."); ok = false; }
      if (!naam.value.trim()) { zetFout(naam, "Vul de naam van de contactpersoon in."); ok = false; }
      if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
      if (!proj.value.trim()) { zetFout(proj, "Vul de naam en plaats van het project in."); ok = false; }
      var n = Number(eenheden.value);
      if (!n || n < 1) { zetFout(eenheden, "Vul in om hoeveel eenheden het gaat, bijvoorbeeld 24."); ok = false; }
      if (!verklaring.checked) { zetFout(verklaring, "Zonder deze verklaring kunnen we je project niet plaatsen — Panvia is uitsluitend voor eigenaren."); ok = false; }
      if (!ok) return;

      var type = ($("input[name='pa-type']:checked") || {}).value || "woning";
      var pakket = n >= 76 ? "Project L (€ 14.950)" : (n >= 26 ? "Project M (€ 9.950)" : (n >= 10 ? "Project S (€ 5.950)" : "Losse plaatsing (< 10 eenheden)"));

      verstuurLead("project-aanmelding", {
        organisatie: org.value.trim(),
        naam: naam.value.trim(),
        email: email.value.trim(),
        telefoon: $("#pa-telefoon").value.trim(),
        project: proj.value.trim(),
        type: type,
        eenheden: n,
        passendPakket: pakket,
        toelichting: $("#pa-toelichting").value.trim()
      });

      $("#project-aanmeld-blok").innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Aangemeld. We nemen contact op.</h2>" +
          "<p class='grijs'><strong>Je betaalt nu niets.</strong> We kijken naar " + escapeHTML(proj.value.trim()) +
          ", controleren het eigendom en nemen binnen twee werkdagen contact op via " + escapeHTML(email.value.trim()) + ".</p>" +
          "<p class='grijs'>Op basis van <span class='tnum'>" + n + "</span> eenheden past <strong>" + escapeHTML(pakket) + "</strong>. " +
          "Behoor je tot de eerste tien projecten, dan geldt de introkorting van 50% — twee jaar vastgezet.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-secundair' href='aanbod.html'>Bekijk het aanbod</a></p>" +
        "</div>";
      window.scrollTo({ top: $("#aanmelden").offsetTop - 40, behavior: "smooth" });
    });
    $all("input, textarea", form).forEach(wisFoutBijInvoer);
  }

  /* ------------------------------------------------------------------------
     Pagina: project — parken, complexen en ontwikkelingen.
     Belangstelling registreren is hier GRATIS: dat is precies het product
     dat de ontwikkelaar afneemt. Pas bij een concrete unit geldt het
     kopersaccount.
     ------------------------------------------------------------------------ */
  function initProject() {
    if (typeof PANVIA_PROJECTEN === "undefined") return;
    var q = new URLSearchParams(window.location.search);
    var id = q.get("id");
    var project = null;
    PANVIA_PROJECTEN.forEach(function (p) { if (p.id === id) project = p; });
    if (!project) project = PANVIA_PROJECTEN[0];

    document.title = project.naam + ", " + project.plaats + " — vanaf " + fmtPrijs(project.prijsVanaf) + " | Panvia";

    $("#project-naam").textContent = project.naam;
    $("#project-plaats").textContent = project.plaats + (project.land && project.land !== "Nederland" ? " · " + project.land : "");
    $("#project-verkoper").textContent = project.verkoper;
    $("#project-fase").textContent = project.fase;
    $("#project-omschrijving").textContent = project.omschrijving;
    $("#project-beeld").src = projectBeeld(project);
    $("#project-beeld").alt = "Voorbeeldbeeld van project " + project.naam;

    $("#project-vanaf").innerHTML = "vanaf " + fmtPrijs(project.prijsVanaf);
    $("#project-eenheden").textContent = project.beschikbaar + " van " + project.eenheden;
    $("#project-opp").textContent = fmtM2(project.oppVanaf) + " – " + fmtM2(project.oppTot);
    $("#project-oplevering").textContent = project.oplevering;

    /* Woningtypes in het project */
    $("#types-body").innerHTML = project.types.map(function (t) {
      return "<tr>" +
        "<th scope='row'>" + escapeHTML(t.naam) + "</th>" +
        "<td class='tnum'>" + fmtM2(t.opp) + "</td>" +
        "<td class='tnum'>" + fmtPrijs(t.prijs) + "</td>" +
        "<td class='tnum'>" + t.aantal + " beschikbaar</td>" +
      "</tr>";
    }).join("");

    /* Kenmerken */
    $("#project-kenmerken").innerHTML = Object.keys(project.kenmerken).map(function (k) {
      return "<tr><th scope='row'>" + escapeHTML(k) + "</th><td>" + escapeHTML(project.kenmerken[k]) + "</td></tr>";
    }).join("");

    $("#project-views").textContent = fmtDuizend(project.views) + " mensen bekeken dit project in de afgelopen 30 dagen.";

    /* Belangstelling registreren — gratis, gaat rechtstreeks naar de eigenaar */
    var form = $("#belangstelling-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var naam = $("#bel-naam");
        var email = $("#bel-email");
        var ok = true;
        if (!naam.value.trim()) { zetFout(naam, "Vul je naam in, dan weet de ontwikkelaar wie er belangstelling heeft."); ok = false; }
        if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
        if (!ok) return;
        verstuurLead("project-belangstelling", {
          naam: naam.value.trim(),
          email: email.value.trim(),
          telefoon: $("#bel-telefoon").value.trim(),
          project: project.naam,
          plaats: project.plaats,
          voorkeur: $("#bel-type").value
        });
        $("#belangstelling-blok").innerHTML =
          "<div class='bevestiging'>" +
            "<div class='vink' aria-hidden='true'>✓</div>" +
            "<h3>Je staat op de lijst</h3>" +
            "<p class='grijs'>" + escapeHTML(project.verkoper.split(" (")[0]) + " ziet je belangstelling en neemt contact op via " +
            escapeHTML(email.value.trim()) + " zodra er nieuws is over " + escapeHTML(project.naam) + ".</p>" +
            "<p class='klein grijs'>Belangstelling tonen is gratis en verplicht je tot niets. Panvia leest niet mee en verkoopt je gegevens niet door.</p>" +
          "</div>";
      });
      $all("input, select", form).forEach(wisFoutBijInvoer);
    }
  }

  /* ------------------------------------------------------------------------
     Pagina: Mijn Panvia (eigenaarskant) — inbox, gesprekken en biedingen.
     Demopand: w2. Eigen gesprekken uit deze browser + gezaaide voorbeelden.
     ------------------------------------------------------------------------ */
  function initEigenaar() {
    var lijst = $("#inbox-lijst");
    if (!lijst) return;
    var pand = vindPand("w2");
    var basisKey = "panvia-chat-w2";

    /* Demo-gesprekken zaaien, zodat de inbox toont hoe het werkt */
    if (!laadChatVan(basisKey + "#thomas")) {
      bewaarChatIn(basisKey + "#thomas", {
        naam: "Thomas van Dijk", email: "thomas@voorbeeld.nl", demo: true, berichten: [
          { van: "koper", tekst: "Goedemiddag, mooie woning. Is de dakkapel vergund, en hoe oud zijn de zonnepanelen precies?", tijd: "di 14:02" },
          { van: "eigenaar", tekst: "Dag Thomas — ja, vergunning uit 2015, en de panelen zijn van 2019. De stukken liggen klaar bij de bezichtiging.", tijd: "di 15:40" },
          { van: "koper", type: "bod", bedrag: 442000, tekst: "Na de bezichtiging van zaterdag doe ik graag dit openingsbod, onder voorbehoud van financiering.", tijd: "wo 09:12" }
        ]
      });
    }
    if (!laadChatVan(basisKey + "#yara")) {
      bewaarChatIn(basisKey + "#yara", {
        naam: "Yara Sultan", email: "yara@voorbeeld.nl", demo: true, berichten: [
          { van: "koper", tekst: "Hoi! Zou ik deze week kunnen komen kijken, het liefst na 18:00?", tijd: "ma 19:45" },
          { van: "eigenaar", tekst: "Dag Yara, dat kan — donderdag 18:30? Dan is het nog licht in de tuin.", tijd: "ma 20:10" },
          { van: "koper", tekst: "Donderdag 18:30 is top. Tot dan!", tijd: "ma 20:14" }
        ]
      });
    }

    var keys = [basisKey, basisKey + "#thomas", basisKey + "#yara"];

    function alleChats() {
      var chats = [];
      keys.forEach(function (k) {
        var c = laadChatVan(k);
        if (c && c.berichten && c.berichten.length) chats.push({ key: k, chat: c });
      });
      return chats;
    }

    function renderStats() {
      var chats = alleChats();
      var topBod = 0;
      chats.forEach(function (c) { topBod = Math.max(topBod, hoogsteBod(c.chat)); });
      $("#eig-views").textContent = fmtDuizend(pand.views);
      $("#eig-gesprekken").textContent = String(chats.length);
      $("#eig-bod").textContent = topBod ? fmtPrijs(topBod) : "—";
    }

    function renderLijst() {
      var chats = alleChats();
      $("#inbox-gesprek").hidden = true;
      lijst.hidden = false;
      if (!chats.length) {
        lijst.innerHTML = "<div class='leeg-melding'><h2>Nog geen gesprekken</h2><p>Zodra een koper je schrijft of biedt, staat het gesprek hier. Je krijgt ook een seintje per mail.</p></div>";
        return;
      }
      lijst.innerHTML = chats.map(function (c) {
        var laatste = laatsteBericht(c.chat);
        var preview = laatste.type === "bod" ? "Bod: " + fmtPrijs(laatste.bedrag) : laatste.tekst;
        var bod = hoogsteBod(c.chat);
        return "<button type='button' class='inbox-rij' data-key='" + c.key + "'>" +
          "<span class='inbox-links'>" +
            "<span class='inbox-naam'>" + escapeHTML(c.chat.naam) + "</span>" +
            "<span class='inbox-preview'>" + escapeHTML(String(preview).slice(0, 90)) + "</span>" +
          "</span>" +
          "<span class='inbox-meta'>" +
            (bod ? "<span class='bod-badge tnum'>bod " + fmtPrijs(bod) + "</span>" : "") +
            "<span class='inbox-tijd tnum'>" + laatste.tijd + "</span>" +
          "</span>" +
        "</button>";
      }).join("");
      $all(".inbox-rij", lijst).forEach(function (rij) {
        rij.addEventListener("click", function () { openGesprek(rij.getAttribute("data-key")); });
      });
    }

    function openGesprek(key) {
      var chat = laadChatVan(key);
      if (!chat) return;
      var paneel = $("#inbox-gesprek");
      lijst.hidden = true;
      paneel.hidden = false;
      var alGedeeld = chat.berichten.some(function (b) { return b.type === "contactkaart"; });
      paneel.innerHTML =
        "<button type='button' class='terug-link' id='inbox-terug'>← Alle gesprekken</button>" +
        "<div class='chat'>" +
          "<p class='klein grijs chat-kop'>Gesprek met " + escapeHTML(chat.naam) + " over " + escapeHTML(pand.adres) + "</p>" +
          "<div class='chat-thread' id='eig-thread'>" +
            chat.berichten.map(function (b) { return chatBerichtHTML(b, "eigenaar", chat.naam); }).join("") +
          "</div>" +
          "<div class='chat-chips'>" +
            (alGedeeld
              ? "<span class='klein grijs'>Je hebt je contactgegevens met " + escapeHTML(chat.naam.split(" ")[0]) + " gedeeld.</span>"
              : "<button type='button' class='chip chip-deel' id='eig-deel'>Deel mijn contactgegevens</button>") +
          "</div>" +
          "<form class='chat-invoer' id='eig-invoer'>" +
            "<label class='visueel-verborgen' for='eig-tekst'>Je antwoord</label>" +
            "<input type='text' id='eig-tekst' autocomplete='off'>" +
            "<button type='submit' class='btn btn-primair'>Stuur</button>" +
          "</form>" +
          "<p class='klein grijs'>Deel je contactgegevens pas als je merkt dat het serieus is — ze zijn alleen in dit gesprek zichtbaar en van een watermerk voorzien. " + escapeHTML(chat.naam.split(" ")[0]) + " krijgt een seintje per mail. Prototype: er wordt niets verstuurd.</p>" +
        "</div>";
      var thread = $("#eig-thread");
      thread.scrollTop = thread.scrollHeight;
      $("#inbox-terug").addEventListener("click", function () { renderLijst(); renderStats(); });
      $("#eig-invoer").addEventListener("submit", function (e) {
        e.preventDefault();
        var veld = $("#eig-tekst");
        if (!veld.value.trim()) return;
        chat.berichten.push({ van: "eigenaar", tekst: veld.value.trim(), tijd: tijdNu() });
        bewaarChatIn(key, chat);
        openGesprek(key);
      });
      var deelKnop = $("#eig-deel");
      if (deelKnop) {
        deelKnop.addEventListener("click", function () {
          chat.berichten.push({ van: "eigenaar", type: "contactkaart", contact: verkoperVan(pand), tijd: tijdNu() });
          bewaarChatIn(key, chat);
          openGesprek(key);
        });
      }
    }

    renderStats();
    renderLijst();
  }

  /* ------------------------------------------------------------------------
     Pagina: plaatsen — meerstapsformulier met stap-indicator en validatie
     ------------------------------------------------------------------------ */
  function initPlaatsen() {
    var stappen = $all(".stap");
    var indicatorItems = $all("#stap-indicator li");
    if (!stappen.length) return;

    var huidige = 1;
    var totaal = stappen.length;
    var gegevens = {};

    function toonStap(n) {
      huidige = n;
      stappen.forEach(function (s) {
        s.hidden = Number(s.getAttribute("data-stap")) !== n;
      });
      indicatorItems.forEach(function (li, i) {
        var stapNr = i + 1;
        li.classList.toggle("klaar", stapNr < n);
        if (stapNr === n) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
        var bol = li.querySelector(".bol");
        bol.textContent = stapNr < n ? "✓" : String(stapNr);
      });
      var kop = $("h2", stappen[n - 1]);
      if (kop) { kop.setAttribute("tabindex", "-1"); kop.focus(); }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /* --- Stap 1: verkopersaccount + eigenaarsverklaring (spelregels) --- */
    var VERKOPER_KEY = "panvia-verkoper";
    (function vulVerkoperIn() {
      var opgeslagen = null;
      try { opgeslagen = JSON.parse(localStorage.getItem(VERKOPER_KEY)); } catch (e) {}
      if (opgeslagen) {
        $("#veld-vk-naam").value = opgeslagen.naam || "";
        $("#veld-vk-email").value = opgeslagen.email || "";
        $("#veld-vk-telefoon").value = opgeslagen.telefoon || "";
      }
    })();

    function valideerAccount() {
      var naam = $("#veld-vk-naam");
      var email = $("#veld-vk-email");
      var verklaring = $("#veld-verklaring");
      var ok = true;
      if (!naam.value.trim()) { zetFout(naam, "Vul je naam in. Die komt niet op de advertentie."); ok = false; }
      if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
      if (!verklaring.checked) { zetFout(verklaring, "Zonder deze verklaring kun je niet plaatsen — Panvia is uitsluitend voor eigenaren."); ok = false; }
      if (ok) {
        gegevens.verkoper = {
          naam: naam.value.trim(),
          email: email.value.trim(),
          telefoon: $("#veld-vk-telefoon").value.trim()
        };
        try { localStorage.setItem(VERKOPER_KEY, JSON.stringify(gegevens.verkoper)); } catch (e) {}
      }
      return ok;
    }

    /* --- Stap 2: adres --- */
    function valideerStap1() {
      var ok = true;
      var postcode = $("#veld-postcode");
      var nummer = $("#veld-huisnummer");
      var straat = $("#veld-straat");
      var plaats = $("#veld-plaats");
      var landVeld = $("#veld-land");
      var land = (landVeld && landVeld.value.trim()) || "Nederland";
      var inNL = land.toLowerCase() === "nederland";
      if (inNL) {
        if (!geldigePostcode(postcode.value)) { zetFout(postcode, "Vul een postcode in, bijvoorbeeld 1015 CJ"); ok = false; }
      } else {
        if (!postcode.value.trim()) { zetFout(postcode, "Vul de postcode in zoals die in " + land + " geldt."); ok = false; }
      }
      if (!nummer.value.trim()) { zetFout(nummer, "Vul een huisnummer in, bijvoorbeeld 112 of 46-II"); ok = false; }
      if (!straat.value.trim()) { zetFout(straat, "Vul de straatnaam in."); ok = false; }
      if (!plaats.value.trim()) { zetFout(plaats, "Vul de plaatsnaam in."); ok = false; }
      if (ok) {
        gegevens.adres = straat.value.trim() + " " + nummer.value.trim();
        gegevens.postcode = inNL ? postcode.value.trim().toUpperCase() : postcode.value.trim();
        gegevens.plaats = plaats.value.trim();
        gegevens.land = land;
      }
      return ok;
    }

    /* --- Stap 2: type & kenmerken --- */
    var subtypes = {
      woning: ["Appartement", "Tussenwoning", "Hoekwoning", "Twee-onder-een-kap", "Vrijstaande woning", "Herenhuis"],
      commercieel: ["Bedrijfshal", "Kantoor", "Winkelunit", "Belegging", "Portefeuille (meerdere panden)", "Horeca", "Overig"],
      vakantie: ["Vakantiehuis", "Chalet", "Appartement aan zee", "Villa buitenland", "Chalet of stacaravan op park", "Overig"]
    };
    function vulSubtypes() {
      var type = ($("input[name='pandtype']:checked") || {}).value || "woning";
      var select = $("#veld-subtype");
      select.innerHTML = subtypes[type].map(function (s) {
        return "<option value='" + s + "'>" + s + "</option>";
      }).join("");
    }
    $all("input[name='pandtype']").forEach(function (r) {
      r.addEventListener("change", vulSubtypes);
    });
    vulSubtypes();

    function valideerStap2() {
      var ok = true;
      var opp = $("#veld-oppervlakte");
      var bouwjaar = $("#veld-bouwjaar");
      var label = $("#veld-energielabel");
      var oppN = Number(opp.value);
      var bjN = Number(bouwjaar.value);
      if (!opp.value || oppN <= 0) { zetFout(opp, "Vul de oppervlakte in vierkante meters in, bijvoorbeeld 124"); ok = false; }
      if (!bouwjaar.value || bjN < 1500 || bjN > 2026) { zetFout(bouwjaar, "Vul een bouwjaar in, bijvoorbeeld 1988"); ok = false; }
      if (!label.value) { zetFout(label, "Kies een energielabel. Staat het er niet? Kies dan ‘Geen / onbekend’."); ok = false; }
      if (ok) {
        gegevens.type = ($("input[name='pandtype']:checked") || {}).value;
        gegevens.subtype = $("#veld-subtype").value;
        gegevens.oppervlakte = oppN;
        gegevens.bouwjaar = bjN;
        gegevens.energielabel = label.value;
      }
      return ok;
    }

    /* --- Stap 3: foto's (gesimuleerd, echte preview via createObjectURL) --- */
    var fotoInput = $("#veld-fotos");
    var fotoLijst = $("#foto-lijst");
    var fotoStatus = $("#foto-status");
    gegevens.fotos = [];
    if (fotoInput) {
      fotoInput.addEventListener("change", function () {
        gegevens.fotos = Array.prototype.slice.call(fotoInput.files);
        fotoLijst.innerHTML = gegevens.fotos.map(function (f) {
          var url = URL.createObjectURL(f);
          return "<li><img src='" + url + "' alt='Voorbeeld van gekozen foto " + f.name.replace(/'/g, "") + "'>" +
            "<span class='foto-naam'>" + f.name + "</span></li>";
        }).join("");
        fotoStatus.textContent = gegevens.fotos.length === 0
          ? "Nog geen foto’s gekozen."
          : gegevens.fotos.length + (gegevens.fotos.length === 1 ? " foto" : " foto’s") + " gekozen.";
      });
    }

    /* --- Stap 4: prijs --- */
    var prijsInput = $("#veld-vraagprijs");
    var prijsPreview = $("#prijs-preview");
    function toonPrijsPreview() {
      var n = Number(String(prijsInput.value).replace(/[^\d]/g, ""));
      if (n > 0) {
        var courtage = Math.round(n * 0.015 * 1.21);
        prijsPreview.innerHTML =
          fmtPrijs(n) + " <span class='grijs'>" + $("#veld-kk").value + "</span>" +
          "<span class='grijs' style='display:block'>Ter vergelijking: 1,5% courtage zou hier " +
          fmtPrijs(courtage) + " incl. btw kosten. Op Panvia betaal je " + fmtPrijs(PANVIA_FEE) + " voor 6 maanden.</span>";
      } else {
        prijsPreview.textContent = "";
      }
    }
    if (prijsInput) {
      prijsInput.addEventListener("input", toonPrijsPreview);
      $("#veld-kk").addEventListener("change", toonPrijsPreview);
    }
    function valideerStap4() {
      var n = Number(String(prijsInput.value).replace(/[^\d]/g, ""));
      if (!n || n < 10000) {
        zetFout(prijsInput, "Vul je vraagprijs in euro’s in, bijvoorbeeld 450000");
        return false;
      }
      gegevens.vraagprijs = n;
      gegevens.kk = $("#veld-kk").value;
      return true;
    }

    /* --- Stap 6: overzicht & betalen --- */
    function vulOverzicht() {
      var verkoopAls = ($("input[name='verkoop-als']:checked") || {}).value || "particulier";
      var verkoopAlsTekst = { particulier: "Particulier eigenaar", onderneming: "Onderneming (eigenaar)", institutioneel: "Corporatie / beheerder met verkoopmandaat" }[verkoopAls];
      var rijen = [
        ["Verkoper", gegevens.verkoper.naam + " · " + gegevens.verkoper.email],
        ["Verkoopt als", verkoopAlsTekst],
        ["Verklaring", "Eigenaar (of gemandateerd namens de eigenaar), geen makelaar of dienstverlener — akkoord met de spelregels"],
        ["Adres", gegevens.adres + ", " + gegevens.postcode + " " + gegevens.plaats + (gegevens.land && gegevens.land.toLowerCase() !== "nederland" ? ", " + gegevens.land : "")],
        ["Type", gegevens.subtype + " (" + ({ woning: "woning", commercieel: "commercieel", vakantie: "vakantiewoning" }[gegevens.type] || gegevens.type) + ")"],
        ["Oppervlakte", fmtM2(gegevens.oppervlakte)],
        ["Bouwjaar", String(gegevens.bouwjaar)],
        ["Energielabel", gegevens.energielabel],
        ["Foto’s", gegevens.fotos.length ? gegevens.fotos.length + " gekozen" : "Nog geen — kan later"],
        ["Vraagprijs", fmtPrijs(gegevens.vraagprijs) + " " + gegevens.kk],
        ["Plaatsingsfee", fmtPrijs(PANVIA_FEE) + " voor 6 maanden, incl. btw"]
      ];
      $("#overzicht-body").innerHTML = rijen.map(function (r) {
        return "<tr><th scope='row'>" + r[0] + "</th><td class='tnum'>" + r[1] + "</td></tr>";
      }).join("");
    }

    var bankVeld = $("#veld-bank-wrap");
    $all("input[name='betaalwijze']").forEach(function (r) {
      r.addEventListener("change", function () {
        bankVeld.hidden = r.value !== "ideal" || !r.checked;
        if (r.value === "ideal" && r.checked) bankVeld.hidden = false;
      });
    });

    /* --- Navigatie tussen stappen --- */
    var validators = { 1: valideerAccount, 2: valideerStap1, 3: valideerStap2, 4: function () { return true; }, 5: valideerStap4 };

    $all(".volgende").forEach(function (knop) {
      knop.addEventListener("click", function () {
        var validator = validators[huidige] || function () { return true; };
        if (!validator()) return;
        if (huidige === 5) vulOverzicht();
        if (huidige < totaal) toonStap(huidige + 1);
      });
    });
    $all(".terug").forEach(function (knop) {
      knop.addEventListener("click", function () {
        if (huidige > 1) toonStap(huidige - 1);
      });
    });

    /* Betalen (gesimuleerd) */
    var betaalKnop = $("#betaal-knop");
    if (betaalKnop) {
      betaalKnop.addEventListener("click", function () {
        var paneel = $("#formulier-paneel");
        var indicator = $("#stap-indicator");

        verstuurLead("verkoper-aanmelding", {
          naam: gegevens.verkoper ? gegevens.verkoper.naam : "",
          email: gegevens.verkoper ? gegevens.verkoper.email : "",
          telefoon: gegevens.verkoper ? gegevens.verkoper.telefoon : "",
          adres: gegevens.adres,
          postcode: gegevens.postcode,
          plaats: gegevens.plaats,
          land: gegevens.land || "Nederland",
          type: gegevens.type,
          pandsoort: gegevens.subtype,
          oppervlakte: gegevens.oppervlakte,
          bouwjaar: gegevens.bouwjaar,
          energielabel: gegevens.energielabel,
          vraagprijs: gegevens.vraagprijs,
          kk: gegevens.kk,
          aantalFotos: gegevens.fotos ? gegevens.fotos.length : 0
        });

        indicator.hidden = true;
        var lancering = cfg("lanceringsModus", false);
        paneel.innerHTML = lancering
          ? "<div class='bevestiging'>" +
              "<div class='vink' aria-hidden='true'>✓</div>" +
              "<h2>Aangemeld. We nemen contact met je op.</h2>" +
              "<p class='grijs'><strong>Je betaalt nu niets.</strong> " + (gegevens.adres || "Je pand") + " staat genoteerd " +
              "voor de lancering. We controleren je gegevens, nemen binnen twee werkdagen contact op via " +
              (gegevens.verkoper ? gegevens.verkoper.email : "je e-mailadres") + ", en zetten je pand online " +
              (cfg("lanceringsDatumTekst", "") ? "zodra Panvia opengaat op " + cfg("lanceringsDatumTekst", "") : "zodra het platform opengaat") + ".</p>" +
              "<p class='grijs'>Als eerste aanmelder plaats je je pand voor " + fmtPrijs(PANVIA_FEE) + " voor 6 maanden — " +
              "en pas nadat je akkoord hebt gegeven. Geen courtage, geen succesfee.</p>" +
              "<p style='margin-top:24px'><a class='btn btn-secundair' href='aanbod.html'>Bekijk het aanbod</a></p>" +
            "</div>"
          : "<div class='bevestiging'>" +
              "<div class='vink' aria-hidden='true'>✓</div>" +
              "<h2>Betaald. Je pand staat klaar.</h2>" +
              "<p class='grijs'>Je betaalde " + fmtPrijs(PANVIA_FEE) + " voor 6 maanden, inclusief btw. Geen courtage erachteraan — " +
              "ook niet als je pand verkoopt. " + (gegevens.adres || "Je pand") + " gaat na een korte controle online " +
              "en staat 6 maanden op Panvia. Kopers nemen rechtstreeks contact met je op.</p>" +
              "<p class='grijs'>Wat wij nu doen: je advertentie controleren en publiceren. " +
              "Wat jij doet: praten met kopers en verkopen. Zo is het verdeeld.</p>" +
              "<p style='margin-top:24px'><a class='btn btn-secundair' href='aanbod.html'>Bekijk het aanbod</a></p>" +
            "</div>";
        var kop = $("h2", paneel);
        if (kop) { kop.setAttribute("tabindex", "-1"); kop.focus(); }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    /* Fouten wissen zodra er getypt wordt */
    $all("#formulier-paneel input, #formulier-paneel select, #formulier-paneel textarea").forEach(wisFoutBijInvoer);

    toonStap(1);
  }

  /* ------------------------------------------------------------------------
     Beweging — hulpstukken. Alles hieronder respecteert prefers-reduced-
     motion: bij "reduce" wordt de eindtoestand meteen gezet, zonder animatie.
     Brandbook §11: functioneel en kort, geen decoratie om de decoratie.
     ------------------------------------------------------------------------ */
  function wilBeweging() {
    return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* Markeer een cijfer voor de tel-animatie. De eindwaarde staat meteen als
     tekst (fallback zonder JS/observer); de animatie telt er straks naartoe. */
  function zetTelDoel(el, waarde) {
    if (!el) return;
    el.setAttribute("data-tel", String(waarde));
    el.textContent = fmtDuizend(waarde);
  }

  /* Tel-animatie — het getal is de held van dit merk, dus laten we het
     opbouwen. Van 0 naar de eindwaarde in ~1s met een rustige ease-out,
     één keer, zodra het cijfer in beeld komt. */
  function initTelAnimatie() {
    var doelen = $all("[data-tel]");
    if (!doelen.length) return;
    if (!wilBeweging() || !("IntersectionObserver" in window) || !window.requestAnimationFrame) {
      return; /* eindwaarde staat al als tekst */
    }
    var animeer = function (el) {
      var eind = parseInt(el.getAttribute("data-tel"), 10) || 0;
      if (eind <= 0) return;
      var duur = 1000, start = null;
      el.textContent = "0";
      var stap = function (t) {
        if (start === null) start = t;
        var p = Math.min((t - start) / duur, 1);
        var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
        el.textContent = fmtDuizend(Math.round(eased * eind));
        if (p < 1) window.requestAnimationFrame(stap);
        else el.textContent = fmtDuizend(eind);
      };
      window.requestAnimationFrame(stap);
    };
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animeer(e.target); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -20px 0px" });
    doelen.forEach(function (el) { obs.observe(el); });
  }

  /* Hero-intro — de bovenste elementen komen bij het laden rustig omhoog,
     gestaffeld. Gebeurt via CSS zodra <html> de klasse 'js-intro' krijgt;
     zonder JS of bij 'reduce' staat alles gewoon meteen goed. */
  function initHeroIntro() {
    if (!wilBeweging()) return;
    if (document.body.getAttribute("data-page") !== "home") return;
    document.documentElement.classList.add("js-intro");
  }

  /* Header krijgt een haarlijn en verdicht zodra je van de hero afscrolt —
     een stille statusverandering, geen show. */
  function initHeaderScroll() {
    var header = $(".site-header");
    if (!header) return;
    var drempel = 24, staat = false;
    var check = function () {
      var nu = (window.pageYOffset || document.documentElement.scrollTop) > drempel;
      if (nu !== staat) { staat = nu; header.classList.toggle("gescrolld", nu); }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
  }

  /* Lanceringsdatum — één bron in config.js. Vult de hero-countdown en levert
     de datumtekst voor de demo-balk. Zonder datum: alles blijft leeg. */
  function parseLanceringsDatum() {
    var iso = cfg("lanceringsDatum", "");
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  }

  function initCountdown() {
    var houder = $("#lancering-countdown");
    if (!houder) return;
    var doel = parseLanceringsDatum();
    if (!doel) { houder.hidden = true; return; }
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var blok = function (getal, label) {
      return "<span class='cd-blok'><span class='cd-getal tnum'>" + getal +
        "</span><span class='cd-label'>" + label + "</span></span>";
    };
    var tekst = cfg("lanceringsDatumTekst", "");
    var tick = function () {
      var diff = doel.getTime() - Date.now();
      if (diff <= 0) {
        houder.innerHTML = "<span class='cd-live'>Panvia is live" +
          (tekst ? " sinds " + tekst : "") + "</span>";
        if (timer) { window.clearInterval(timer); timer = null; }
        return;
      }
      var d = Math.floor(diff / 86400000);
      var u = Math.floor((diff % 86400000) / 3600000);
      var min = Math.floor((diff % 3600000) / 60000);
      var sec = Math.floor((diff % 60000) / 1000);
      houder.innerHTML = blok(d, d === 1 ? "dag" : "dagen") +
        blok(pad(u), "uur") + blok(pad(min), "min") + blok(pad(sec), "sec");
    };
    var timer = window.setInterval(tick, 1000);
    tick();
  }

  /* ------------------------------------------------------------------------
     Reveal — één rustig systeem: elementen schuiven 14px omhoog bij het
     binnenkomen van het beeld. Respecteert prefers-reduced-motion (CSS).
     ------------------------------------------------------------------------ */
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var doelen = $all(".sectie-kop, .pandkaart, .reken-kaart, .stap-kaart, .prijsblok, .regel, .faq details, .stat, .eigenaar-pand");
    if (!doelen.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("zichtbaar");
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -40px 0px" });
    doelen.forEach(function (el) {
      el.classList.add("reveal");
      /* Stagger: kaarten die samen in beeld komen, cascaderen zacht na elkaar.
         De index binnen de eigen groep buurelementen bepaalt de vertraging,
         gemaximeerd zodat een lange lijst nooit traag aanvoelt. */
      var groep = el.parentNode ? $all(".reveal, .pandkaart, .reken-kaart, .stap-kaart, .stat, .regel", el.parentNode) : [];
      var i = groep.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 60 + "ms";
      obs.observe(el);
    });
    /* Vangnet: vuurt de observer om wat voor reden dan ook niet, dan wordt
       alles na 3 seconden alsnog getoond. Inhoud mag nooit verborgen blijven. */
    setTimeout(function () {
      doelen.forEach(function (el) { el.classList.add("zichtbaar"); });
    }, 3000);
  }

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  /* Demo-melding: zolang het getoonde aanbod voorbeelden zijn, zeggen we dat
     eerlijk bovenaan de pagina. Fictief aanbod tonen alsof het echt is, is
     misleidend richting bezoekers én in strijd met advertentiebeleid. */
  function initDemoMelding() {
    if (!cfg("demoModus", false)) return;
    var pagina = document.body.getAttribute("data-page");
    if (["aanbod", "zakelijk", "pand", "home"].indexOf(pagina) === -1) return;
    var balk = document.createElement("div");
    balk.className = "demo-balk";
    var datumTekst = cfg("lanceringsDatumTekst", "");
    var opent = datumTekst ? "Panvia opent " + datumTekst : "Panvia opent binnenkort";
    balk.innerHTML = "<div class='container'><strong>Voorbeeldaanbod.</strong> " + opent + "; " +
      "de panden die je nu ziet zijn voorbeelden om te laten zien hoe het platform werkt. " +
      "<a href='plaatsen.html'>Meld je eigen pand aan</a> — dat is wel echt.</div>";
    var header = $(".site-header");
    if (header && header.parentNode) header.parentNode.insertBefore(balk, header.nextSibling);
  }

  /* Lanceringsmodus: betaalstap wordt aanmeldstap. Zo verzamel je in de
     eerste weken aanbod zonder dat mensen meteen moeten afrekenen. */
  function initLancering() {
    if (!cfg("lanceringsModus", false)) return;
    var knop = $("#betaal-knop");
    if (knop) knop.textContent = "Meld mijn pand aan";
    var betaalStap = $(".stap[data-stap='6']");
    if (betaalStap) {
      var kop = $("h2", betaalStap);
      if (kop) kop.textContent = "Controleer en meld aan";
      var intro = $(".stap-intro", betaalStap);
      if (intro) intro.textContent = "Je betaalt nu niets. We controleren je gegevens en nemen contact op vóór je pand online gaat.";
      $all("fieldset, #veld-bank-wrap", betaalStap).forEach(function (el) { el.hidden = true; });
      var slot = $(".klein.grijs", betaalStap);
      if (slot) {
        slot.innerHTML = "<strong>Je betaalt vandaag niets.</strong> Plaatsen kost straks <span class='tnum'>" +
          fmtPrijs(PANVIA_FEE) + "</span> voor 6 maanden, inclusief btw — pas nadat je akkoord geeft. Geen courtage, geen succesfee.";
      }
    }
    /* Indicatorlabel meeveranderen */
    var laatsteStap = $("#stap-indicator li:last-child");
    if (laatsteStap) {
      laatsteStap.lastChild.textContent = "Aanmelden";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeroIntro();
    initHeaderScroll();
    initNav();
    initAccountNav();
    initSchermbescherming();
    var pagina = document.body.getAttribute("data-page");
    if (pagina === "inloggen") initInloggen();
    if (pagina === "home") initHome();
    if (pagina === "aanbod") initAanbod();
    if (pagina === "buitenland") initBuitenland();
    if (pagina === "kopers") initKopers();
    if (pagina === "zakelijk") initZakelijk();
    if (pagina === "pand") initPand();
    if (pagina === "project") initProject();
    if (pagina === "projecten") initProjecten();
    if (pagina === "plaatsen") { initPlaatsen(); initLancering(); }
    if (pagina === "eigenaar") initEigenaar();
    initDemoMelding();
    initCountdown();
    initTelAnimatie();
    initReveal();
  });
})();
