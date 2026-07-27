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
  /* ------------------------------------------------------------------------
     Favorieten (v3 "Open Huis") — hartje op elke kaart, bewaard in
     localStorage. Zillow-patroon: bewaren zonder account, het hart is
     overal klikbaar zonder de kaartlink te volgen.
     ------------------------------------------------------------------------ */
  var FAV_KEY = "panvia-favorieten";
  function favLijst() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
    catch (e) { return []; }
  }
  function favHeeft(id) { return favLijst().indexOf(id) !== -1; }
  function favToggle(id) {
    var lijst = favLijst();
    var i = lijst.indexOf(id);
    if (i === -1) lijst.push(id); else lijst.splice(i, 1);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(lijst)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("panvia:favorieten"));
    return i === -1;
  }
  var HART_SVG = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M12 20.5 C7 16.5 3.5 13.4 3.5 9.6 A4.6 4.6 0 0 1 12 7.2 A4.6 4.6 0 0 1 20.5 9.6 C20.5 13.4 17 16.5 12 20.5 Z' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg>";
  function hartKnopHTML(id) {
    var aan = favHeeft(id);
    return "<button type='button' class='kaart-hart" + (aan ? " aan" : "") + "' data-fav='" + id + "' " +
      "aria-pressed='" + aan + "' aria-label='" + (aan ? "Verwijder uit bewaard" : "Bewaar dit pand") + "'>" +
      HART_SVG + "</button>";
  }
  /* Eén luisteraar voor alle harten, op elke pagina */
  document.addEventListener("click", function (e) {
    var knop = e.target.closest ? e.target.closest("[data-fav]") : null;
    if (!knop) return;
    e.preventDefault();
    e.stopPropagation();
    var aan = favToggle(knop.getAttribute("data-fav"));
    document.querySelectorAll("[data-fav='" + knop.getAttribute("data-fav") + "']").forEach(function (k) {
      k.classList.toggle("aan", aan);
      k.setAttribute("aria-pressed", aan);
      k.setAttribute("aria-label", aan ? "Verwijder uit bewaard" : "Bewaar dit pand");
    });
  }, true);

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
        "<a class='pandkaart-link' href='/pand?id=" + pand.id + "'>" +
          "<div class='pandkaart-foto'><img src='" + pandBeeld(pand, 0) + "' alt='" + alt + "' loading='lazy'>" + hartKnopHTML(pand.id) + "</div>" +
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
        "<a class='pandkaart-link' href='/project?id=" + p.id + "'>" +
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
      if (f.q) {
        var hooi = (p.naam + " " + p.plaats + " " + (p.land || "") + " " + p.type).toLowerCase();
        var past = f.q.split(/\s+/).every(function (w) { return hooi.indexOf(w) !== -1; });
        if (!past) return false;
      }
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

  /* Telefoonnummer naar E.164 (+31612345678). Dezelfde regels als op de
     server (api/_auth.js), zodat de bezoeker hier al hoort dat een nummer
     niet klopt in plaats van pas na het versturen. Geeft null bij onzin. */
  function normaliseerTelefoon(v) {
    var t = String(v || "").trim();
    if (!t) return null;
    var plus = t.charAt(0) === "+";
    t = t.replace(/[^0-9]/g, "");
    if (!t) return null;
    if (plus) t = "+" + t;
    else if (t.indexOf("00") === 0) t = "+" + t.slice(2);
    else if (t.charAt(0) === "0") t = "+31" + t.slice(1);
    else if (t.length === 9) t = "+31" + t;
    else t = "+" + t;
    var cijfers = t.slice(1);
    return (cijfers.length < 8 || cijfers.length > 15) ? null : t;
  }

  function geldigTelefoon(v) { return normaliseerTelefoon(v) !== null; }

  /* Een Nederlands KvK-nummer is acht cijfers. */
  function geldigKvk(v) { return /^[0-9]{8}$/.test(String(v || "").replace(/[^0-9]/g, "")); }

  /* Btw-identificatienummer. Nederlands (NL123456789B01) controleren we op
     vorm; voor de rest van de EU volstaat landcode + 2-12 tekens, want elk
     land heeft zijn eigen opbouw. Echt valideren doe je bij VIES. */
  function geldigBtwNummer(v) {
    var b = String(v || "").toUpperCase().replace(/[\s.-]/g, "");
    if (b.indexOf("NL") === 0) return /^NL[0-9]{9}B[0-9]{2}$/.test(b);
    return /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(b);
  }

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
     ACCOUNT & SESSIE

     Eén account per e-mailadres, met rollen: koper (€ 12,95 per maand —
     praten, bieden, de volledige verkoperinformatie zien) en verkoper
     (€ 895 per plaatsing). Wie eerst koopt en later verkoopt, houdt dezelfde
     inlog. Een rol wordt pas actief na een geslaagde betaling.

     De waarheid staat op de server: /api/auth/ik leest de HttpOnly-cookie en
     geeft de rollen terug uit de database. De browser kan die niet zetten.

     Op localhost draait geen backend — daar valt alles terug op localStorage,
     zodat het prototype lokaal te doorlopen blijft. Zelfde keuze als
     betaalModus(); instelbaar via js/config.js → betaalModus.
     ------------------------------------------------------------------------ */
  var ACCOUNT_KEY = "panvia-account";
  var KOPER_FEE = "€ 12,95";

  var Auth = {
    geladen: false,
    account: null,

    /* "server" = echte sessie via api/auth/*, "lokaal" = localStorage. */
    modus: function () {
      return betaalModus() === "simulatie" ? "lokaal" : "server";
    },

    lokaalLezen: function () {
      try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch (e) { return null; }
    },
    lokaalSchrijven: function (account) {
      try {
        if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
        else localStorage.removeItem(ACCOUNT_KEY);
      } catch (e) { /* privémodus */ }
      Auth.account = account;
    },

    /* Eén keer per pagina. Hangt de backend, dan gaan we verder als
       uitgelogd — beter een uitgelogde pagina dan een pagina die niet komt. */
    laad: function () {
      if (Auth._bezig) return Auth._bezig;
      if (Auth.modus() === "lokaal") {
        Auth.account = Auth.lokaalLezen();
        Auth.geladen = true;
        Auth._bezig = Promise.resolve(Auth.account);
        return Auth._bezig;
      }
      var afgebroken = new Promise(function (res) { setTimeout(function () { res(null); }, 6000); });
      Auth._bezig = Promise.race([
        fetch("/api/auth/ik", { credentials: "same-origin" })
          .then(function (r) { return r.json(); })
          .then(function (d) { return d && d.ok && d.ingelogd ? d.account : null; })
          .catch(function () { return null; }),
        afgebroken
      ]).then(function (account) {
        Auth.account = account;
        Auth.geladen = true;
        return account;
      });
      return Auth._bezig;
    },

    ingelogd: function () { return !!Auth.account; },
    isKoper: function () { return !!(Auth.account && Auth.account.rollen && Auth.account.rollen.koper); },
    isVerkoper: function () { return !!(Auth.account && Auth.account.rollen && Auth.account.rollen.verkoper); },
    email: function () { return Auth.account ? Auth.account.email : ""; },
    naam: function () { return (Auth.account && Auth.account.naam) || ""; },
    telefoon: function () { return (Auth.account && Auth.account.telefoon) || ""; },
    /* Is de onboarding na de betaling voor deze rol al doorlopen? */
    profielCompleet: function (rol) {
      var p = Auth.account && Auth.account.profielCompleet;
      return !!(p && p[rol]);
    },
    voornaam: function () {
      var n = Auth.naam();
      return n ? n.split(" ")[0] : (Auth.email().split("@")[0] || "je account");
    },

    uitloggen: function () {
      if (Auth.modus() === "lokaal") {
        Auth.lokaalSchrijven(null);
        return Promise.resolve();
      }
      return fetch("/api/auth/uitloggen", { method: "POST", credentials: "same-origin" })
        .catch(function () { /* de cookie verloopt vanzelf */ });
    }
  };

  /* Simulatie-hulpje: doet lokaal wat de webhook op de server doet. */
  function lokaalRolActiveren(rol, naam, email) {
    var a = Auth.lokaalLezen() || { naam: "", email: "", rollen: { koper: false, verkoper: false } };
    a.naam = naam || a.naam;
    a.email = email || a.email;
    a.rollen = a.rollen || { koper: false, verkoper: false };
    a.rollen[rol] = true;
    Auth.lokaalSchrijven(a);
    return a;
  }

  /* Compat: de chat- en biedblokken vragen "is er een betalende koper?" en
     willen daar naam en e-mailadres bij. */
  function koperAccount() {
    if (!Auth.isKoper()) return null;
    return { naam: Auth.naam() || Auth.email(), email: Auth.email(), betaald: true };
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
    if (!Auth.ingelogd()) {
      slot.innerHTML = "<a href='/inloggen'>Inloggen</a>";
      return;
    }
    /* Verkopers gaan naar hun inbox, kopers naar hun accountpagina. */
    var doel = Auth.isVerkoper() ? "/eigenaar" : "/inloggen";
    slot.innerHTML =
      "<a class='nav-account-naam' href='" + doel + "' title='Mijn Panvia'>" + escapeHTML(Auth.voornaam()) + "</a>" +
      "<button type='button' class='nav-uitlog' id='nav-uitlog'>Uitloggen</button>";
    $("#nav-uitlog").addEventListener("click", function () {
      Auth.uitloggen().then(function () { window.location.href = "/"; });
    });
  }

  /* Korte samenvatting van je rollen, in gewone taal. */
  function rollenZin() {
    if (Auth.isKoper() && Auth.isVerkoper()) {
      return "Je hebt een actief kopersabonnement én een verkopersaccount — je kunt praten, bieden en plaatsen.";
    }
    if (Auth.isKoper()) {
      return "Je kopersabonnement is actief: je praat op elk pand rechtstreeks met de eigenaar, doet biedingen en ziet de volledige verkoperinformatie.";
    }
    if (Auth.isVerkoper()) {
      return "Je verkopersaccount is actief. Je advertentie, gesprekken en biedingen staan in Mijn Panvia.";
    }
    return "Je account is actief, maar er staat nog geen rol op. Neem een kopersabonnement om te praten en bieden, of plaats je pand om te verkopen.";
  }

  /* ------------------------------------------------------------------------
     Pagina: inloggen — e-mailadres + wachtwoord tegen /api/auth/inloggen.
     Met ?terug=… keren we na het inloggen terug naar die pagina, zodat je
     midden in een aanmelding niet je plek kwijtraakt.
     ------------------------------------------------------------------------ */
  function veiligeTerugkeer() {
    var terug = new URLSearchParams(window.location.search).get("terug") || "";
    /* Alleen een pagina op deze site, nooit een adres van buiten.
       Accepteert "kopers" en (oude links) "kopers.html". */
    if (!/^[a-z0-9-]+(\.html)?$/i.test(terug)) return "";
    return "/" + terug.replace(/\.html$/i, "");
  }

  function initInloggen() {
    var blok = $("#login-blok");
    var form = $("#login-form");
    if (!blok || !form) return;

    if (Auth.ingelogd()) {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Je bent ingelogd</h2>" +
          "<p class='grijs'>Welkom terug, " + escapeHTML(Auth.voornaam()) + ". " + rollenZin() + "</p>" +
          "<p class='klein grijs tnum'>" + escapeHTML(Auth.email()) + "</p>" +
          "<p style='margin-top:24px'>" +
            (Auth.isVerkoper()
              ? "<a class='btn btn-primair' href='/eigenaar'>Naar Mijn Panvia</a> "
              : "<a class='btn btn-primair' href='/aanbod'>Naar het aanbod</a> ") +
            "<button type='button' class='btn btn-tertiair' id='login-uitlog'>Uitloggen</button>" +
          "</p>" +
        "</div>";
      $("#login-uitlog").addEventListener("click", function () {
        Auth.uitloggen().then(function () { window.location.reload(); });
      });
      return;
    }

    var melding = $("#login-melding");
    var knop = $("button[type='submit']", form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#login-email");
      var wachtwoord = $("#login-wachtwoord");
      melding.textContent = "";
      var ok = true;
      /* Inloggen mag met e-mailadres óf telefoonnummer — allebei zijn
         eenduidig, dus we laten de bezoeker kiezen wat hij zich herinnert. */
      var invoer = email.value.trim();
      if (!geldigEmail(invoer) && !geldigTelefoon(invoer)) {
        zetFout(email, "Vul je e-mailadres in (naam@voorbeeld.nl) of je telefoonnummer (06 12345678).");
        ok = false;
      }
      if (!wachtwoord.value) { zetFout(wachtwoord, "Vul je wachtwoord in."); ok = false; }
      if (!ok) return;

      /* Lokaal (localhost) is er geen backend: dan doen we alsof, op basis
         van het account dat hier in de browser staat. */
      if (Auth.modus() === "lokaal") {
        var lokaal = Auth.lokaalLezen();
        if (lokaal && lokaal.email && lokaal.email.toLowerCase() === invoer.toLowerCase()) {
          Auth.account = lokaal;
          window.location.href = veiligeTerugkeer() || "/inloggen";
        } else {
          melding.textContent = "Lokale simulatie: er staat op dit apparaat nog geen account met dit e-mailadres.";
        }
        return;
      }

      knop.disabled = true;
      knop.textContent = "Bezig met inloggen…";
      fetch("/api/auth/inloggen", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inlog: invoer, wachtwoord: wachtwoord.value })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.ok) {
          window.location.href = veiligeTerugkeer() || "/inloggen";
          return;
        }
        throw new Error((d && d.fout) || "Inloggen lukte niet.");
      }).catch(function (err) {
        melding.textContent = err.message;
        knop.disabled = false;
        knop.textContent = "Inloggen";
      });
    });
    $all("input", form).forEach(wisFoutBijInvoer);
  }

  /* ------------------------------------------------------------------------
     Pagina: wachtwoord vergeten — altijd dezelfde bevestiging, of het adres
     nu bekend is of niet. Anders is dit een gratis lijst van wie er klant is.
     ------------------------------------------------------------------------ */
  function initWachtwoordVergeten() {
    var blok = $("#vergeten-blok");
    var form = $("#vergeten-form");
    if (!blok || !form) return;

    function bevestig(email) {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Kijk in je mail</h2>" +
          "<p class='grijs'>Als er een Panvia-account op <strong>" + escapeHTML(email) + "</strong> staat, ligt er nu een link " +
          "om een nieuw wachtwoord te kiezen. De link is een uur geldig en werkt één keer.</p>" +
          "<p class='klein grijs'>Niets ontvangen? Kijk even in je spam. Blijft het uit, mail ons dan op " +
          escapeHTML(cfg("contactEmail", "hallo@panvia.nl")) + ".</p>" +
          "<p style='margin-top:24px'><a class='btn btn-secundair' href='/inloggen'>Terug naar inloggen</a></p>" +
        "</div>";
    }

    var knop = $("button[type='submit']", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#vergeten-email");
      if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); return; }
      var adres = email.value.trim();

      if (Auth.modus() === "lokaal") { bevestig(adres); return; }

      knop.disabled = true;
      knop.textContent = "Bezig…";
      fetch("/api/auth/wachtwoord-vergeten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adres })
      }).then(function () { bevestig(adres); })
        .catch(function () { bevestig(adres); });
    });
    $all("input", form).forEach(wisFoutBijInvoer);
  }

  /* ------------------------------------------------------------------------
     Pagina: nieuw wachtwoord instellen. Het token komt uit de link; we halen
     het meteen uit de adresbalk zodat het niet in de geschiedenis blijft.
     ------------------------------------------------------------------------ */
  function initWachtwoordResetten() {
    var blok = $("#resetten-blok");
    var form = $("#resetten-form");
    if (!blok || !form) return;

    var token = new URLSearchParams(window.location.search).get("token") || "";
    if (token && window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!token) {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<h2>Deze link is niet compleet</h2>" +
          "<p class='grijs'>Open de link uit de mail nog eens, of vraag een nieuwe aan.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='/wachtwoord-vergeten'>Vraag een nieuwe link aan</a></p>" +
        "</div>";
      return;
    }

    var melding = $("#reset-melding");
    var knop = $("button[type='submit']", form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ww = $("#reset-wachtwoord");
      var herhaal = $("#reset-herhaal");
      melding.textContent = "";
      var ok = true;
      if (ww.value.length < 8) { zetFout(ww, "Kies een wachtwoord van minstens 8 tekens."); ok = false; }
      if (herhaal.value !== ww.value) { zetFout(herhaal, "De twee wachtwoorden zijn niet gelijk."); ok = false; }
      if (!ok) return;

      knop.disabled = true;
      knop.textContent = "Bezig met opslaan…";
      fetch("/api/auth/wachtwoord-resetten", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, wachtwoord: ww.value })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.fout) || "Opslaan lukte niet.");
        blok.innerHTML =
          "<div class='bevestiging'>" +
            "<div class='vink' aria-hidden='true'>✓</div>" +
            "<h2>Gelukt — je bent ingelogd</h2>" +
            "<p class='grijs'>Je nieuwe wachtwoord staat klaar en je bent op dit apparaat ingelogd. Andere apparaten zijn uitgelogd.</p>" +
            "<p style='margin-top:24px'><a class='btn btn-primair' href='/aanbod'>Naar het aanbod</a> " +
            "<a class='btn btn-tertiair' href='/inloggen'>Naar mijn account</a></p>" +
          "</div>";
      }).catch(function (err) {
        melding.textContent = err.message;
        knop.disabled = false;
        knop.textContent = "Opslaan en inloggen";
      });
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
     Gidsen (v3) — kennis open en gratis, Zillow-manier
     ------------------------------------------------------------------------ */
  function gidsKaartHTML(g) {
    return (
      "<a class='gids-kaart' href='/gids/" + (g.slug || g.id) + "'>" +
        "<div class='gids-foto'><img src='" + g.foto + "' alt='' loading='lazy'>" +
          "<span class='gids-badge'>Gids · " + g.leestijd + "</span></div>" +
        "<div class='gids-body'>" +
          "<h3>" + escapeHTML(g.titel) + "</h3>" +
          "<p>" + escapeHTML(g.kort) + "</p>" +
          "<span class='gids-lees'>Lees de gids →</span>" +
        "</div>" +
      "</a>"
    );
  }

  function initGidsen() {
    var grid = $("#gidsen-grid");
    if (!grid || typeof PANVIA_GIDSEN === "undefined") return;
    grid.innerHTML = PANVIA_GIDSEN.map(gidsKaartHTML).join("");
  }

  function initGids() {
    /* De gidsen zijn statische pagina's onder /gids/<slug> geworden (SEO).
       Oude links op gids.html?g=… sturen we daarheen door. */
    var el = $("#gids-inhoud");
    if (!el || typeof PANVIA_GIDSEN === "undefined") return;
    var id = new URLSearchParams(window.location.search).get("g");
    var gids = null;
    PANVIA_GIDSEN.forEach(function (g) { if (g.id === id) gids = g; });
    window.location.replace(gids ? "/gids/" + gids.slug : "/gidsen");
  }

  /* ------------------------------------------------------------------------
     Berichten-zijpaneel (v3) — je inbox altijd aan de zijkant, op elke
     pagina. Zillow-patroon: vaste tab rechts, één klik en je gesprekken
     schuiven in beeld.

     De tab staat er ook als je niet bent ingelogd. Dat is bewust: een
     bezoeker ziet dan meteen dat er rechtstreeks contact met eigenaren
     bestaat, in plaats van dat het hele idee onzichtbaar blijft tot na de
     betaling. Uitgelogd tonen we geen gesprekken maar een uitnodiging.
     ------------------------------------------------------------------------ */
  function initBerichtenPaneel() {
    if ($("#berichten-tab")) return;

    /* Welke gesprekken zijn van deze gebruiker?
       Verkoper: de koper-threads op zijn pand (keys met #).
       Koper: zijn eigen gesprekken per pand (keys zonder #). */
    function gesprekken() {
      var out = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf("panvia-chat-") !== 0) continue;
        var chat = laadChatVan(k);
        if (!chat || !chat.berichten || !chat.berichten.length) continue;
        var eigenaarThread = k.indexOf("#") !== -1;
        if (eigenaarThread && !Auth.isVerkoper()) continue;
        if (!eigenaarThread && !Auth.isKoper()) continue;
        var pand = vindPand(k.replace("panvia-chat-", "").split("#")[0]);
        out.push({ key: k, chat: chat, pand: pand, rol: eigenaarThread ? "eigenaar" : "koper" });
      }
      return out;
    }

    var tab = document.createElement("button");
    tab.id = "berichten-tab";
    tab.type = "button";
    tab.setAttribute("aria-label", "Open je berichten");
    tab.innerHTML = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M4 6 H20 V17 A1.5 1.5 0 0 1 18.5 18.5 H9 L5.5 21.5 V18.5 H5.5 A1.5 1.5 0 0 1 4 17 Z' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg><span>Berichten</span><span class='berichten-teller tnum' id='berichten-teller'></span>";
    var paneel = document.createElement("aside");
    paneel.id = "berichten-paneel";
    paneel.setAttribute("aria-label", "Je berichten");
    paneel.innerHTML =
      "<div class='bp-kop'><h2>Berichten</h2><button type='button' id='bp-sluit' aria-label='Sluit berichten'>×</button></div>" +
      "<div class='bp-inhoud' id='bp-inhoud'></div>";
    document.body.appendChild(tab);
    document.body.appendChild(paneel);

    function badge() {
      var n = Auth.ingelogd() ? gesprekken().length : 0;
      $("#berichten-teller").textContent = n ? String(n) : "";
    }

    /* Niet ingelogd: laten zien wát hier zou staan, en de weg ernaartoe. */
    function toonUitnodiging() {
      $("#bp-inhoud").innerHTML =
        "<div class='bp-leeg'>" +
          "<p class='grijs'>Hier staan je gesprekken met eigenaren.</p>" +
          "<p class='klein grijs'>Op Panvia praat je rechtstreeks met de eigenaar van een pand — geen makelaar ertussen, geen contactformulier dat ergens belandt. Je gesprekken en biedingen staan hier, op elke pagina binnen handbereik.</p>" +
          "<p style='margin-top:var(--s-24)'>" +
            "<a class='btn btn-primair' href='/inloggen'>Inloggen</a> " +
            "<a class='btn btn-tertiair' href='/kopers'>Word lid</a>" +
          "</p>" +
          "<p class='klein grijs' style='margin-top:var(--s-16)'>Je huis verkopen? <a href='/plaatsen'>Plaats je pand</a> — dan lopen de gesprekken hier binnen.</p>" +
        "</div>";
    }

    function toonLijst() {
      if (!Auth.ingelogd()) return toonUitnodiging();
      var lijst = gesprekken();
      var el = $("#bp-inhoud");
      if (!lijst.length) {
        el.innerHTML = "<div class='bp-leeg'><p class='grijs'>Nog geen gesprekken.</p>" +
          "<p class='klein grijs'>" + (Auth.isVerkoper()
            ? "Zodra een koper je schrijft of biedt, staat het gesprek hier."
            : "Start een gesprek via de chat op een pandpagina — die vind je in het aanbod.") + "</p>" +
          "<a class='btn btn-secundair' href='/aanbod'>Bekijk het aanbod</a></div>";
        return;
      }
      el.innerHTML = lijst.map(function (g) {
        var laatste = laatsteBericht(g.chat);
        var preview = laatste.type === "bod" ? "Bod: " + fmtPrijs(laatste.bedrag)
          : laatste.type === "contactkaart" ? "Contactgegevens gedeeld" : (laatste.tekst || "");
        var titel = g.rol === "eigenaar" ? g.chat.naam : (g.pand ? g.pand.adres : "Pand");
        var sub = g.pand ? (g.rol === "eigenaar" ? "over " + g.pand.adres : g.pand.plaats) : "";
        return "<button type='button' class='inbox-rij bp-rij' data-key='" + g.key + "'>" +
          "<span class='inbox-links'>" +
            "<span class='inbox-naam'>" + escapeHTML(titel) + "</span>" +
            (sub ? "<span class='inbox-preview'>" + escapeHTML(sub) + "</span>" : "") +
            "<span class='inbox-preview'>" + escapeHTML(String(preview).slice(0, 70)) + "</span>" +
          "</span>" +
          "<span class='inbox-meta'><span class='inbox-tijd tnum'>" + (laatste.tijd || "") + "</span></span>" +
        "</button>";
      }).join("");
      $all(".bp-rij", el).forEach(function (rij) {
        rij.addEventListener("click", function () { toonGesprek(rij.getAttribute("data-key")); });
      });
    }

    function toonGesprek(key) {
      var chat = laadChatVan(key);
      if (!chat) return;
      var eigenaarThread = key.indexOf("#") !== -1;
      var rol = eigenaarThread ? "eigenaar" : "koper";
      var pand = vindPand(key.replace("panvia-chat-", "").split("#")[0]);
      var titel = eigenaarThread ? chat.naam : (pand ? pand.adres : "Gesprek");
      var el = $("#bp-inhoud");
      el.innerHTML =
        "<button type='button' class='terug-link' id='bp-terug'>← Alle gesprekken</button>" +
        "<p class='klein grijs bp-gesprek-kop'>" + escapeHTML(titel) + (pand && eigenaarThread ? " · " + escapeHTML(pand.adres) : "") + "</p>" +
        "<div class='chat-thread bp-thread' id='bp-thread'>" +
          chat.berichten.map(function (b) { return chatBerichtHTML(b, rol, eigenaarThread ? chat.naam : "eigenaar"); }).join("") +
        "</div>" +
        "<form class='chat-invoer' id='bp-invoer'>" +
          "<label class='visueel-verborgen' for='bp-tekst'>Je bericht</label>" +
          "<input type='text' id='bp-tekst' autocomplete='off'>" +
          "<button type='submit' class='btn btn-primair'>Stuur</button>" +
        "</form>" +
        (pand && !eigenaarThread ? "<p class='klein grijs' style='margin-top:8px'><a href='/pand?id=" + pand.id + "'>Bekijk het pand →</a></p>" : "");
      var thread = $("#bp-thread");
      thread.scrollTop = thread.scrollHeight;
      $("#bp-terug").addEventListener("click", function () { toonLijst(); });
      $("#bp-invoer").addEventListener("submit", function (e) {
        e.preventDefault();
        var veld = $("#bp-tekst");
        if (!veld.value.trim()) return;
        chat.berichten.push({ van: rol, tekst: veld.value.trim(), tijd: tijdNu() });
        bewaarChatIn(key, chat);
        toonGesprek(key);
      });
    }

    function open() {
      paneel.classList.add("open");
      tab.classList.add("open");
      toonLijst();
    }
    function sluit() {
      paneel.classList.remove("open");
      tab.classList.remove("open");
    }
    tab.addEventListener("click", function () {
      if (paneel.classList.contains("open")) sluit(); else open();
    });
    $("#bp-sluit").addEventListener("click", sluit);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && paneel.classList.contains("open")) sluit();
    });
    badge();
    /* Deeplink: #berichten opent het paneel meteen — handig vanuit
       "je hebt een nieuw bericht"-mails straks */
    if (window.location.hash === "#berichten") open();
  }

  /* ------------------------------------------------------------------------
     Pagina: contact (v3) — vragen aan Panvia zelf, niet over een pand.
     Prototype: berichten worden lokaal bewaard. Voor livegang: POST naar
     een endpoint (bv. /api/contact) dat doormailt via Resend — zelfde
     patroon als api/_mail.js.
     ------------------------------------------------------------------------ */
  function initContact() {
    var form = $("#contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var naam = $("#ct-naam").value.trim();
      var email = $("#ct-email").value.trim();
      var bericht = $("#ct-bericht").value.trim();
      var emailFout = $("#ct-email-fout");
      var emailOk = /.+@.+\..+/.test(email);
      emailFout.hidden = emailOk;
      if (!naam || !emailOk || !bericht) {
        if (!naam) $("#ct-naam").focus();
        else if (!emailOk) $("#ct-email").focus();
        else $("#ct-bericht").focus();
        return;
      }
      try {
        var lijst = JSON.parse(localStorage.getItem("panvia-contact") || "[]");
        lijst.push({ naam: naam, email: email, onderwerp: $("#ct-onderwerp").value, bericht: bericht, tijd: new Date().toISOString() });
        localStorage.setItem("panvia-contact", JSON.stringify(lijst));
      } catch (err) { /* privémodus */ }
      form.hidden = true;
      var klaar = $("#contact-klaar");
      klaar.hidden = false;
      klaar.setAttribute("tabindex", "-1");
      klaar.focus();
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

    /* Gidsen-teaser: de eerste drie gidsen */
    var teaser = $("#gidsen-teaser");
    if (teaser && typeof PANVIA_GIDSEN !== "undefined") {
      teaser.innerHTML = PANVIA_GIDSEN.slice(0, 3).map(gidsKaartHTML).join("");
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

  /* ------------------------------------------------------------------------
     Kaartweergave op het aanbod (v3) — Zillow-patroon: kaart links,
     lijst rechts, prijs-pillen als markers. Leaflet + OpenStreetMap.
     NB voor livegang: OSM-tiles zijn prima voor dit verkeer, maar check
     de tile-usage-policy of kies een tile-provider zodra het druk wordt.
     ------------------------------------------------------------------------ */
  function pandPositie(item) {
    var basis = (typeof PANVIA_GEO !== "undefined") && PANVIA_GEO[item.plaats];
    if (!basis) return null;
    /* Vaste kleine verschuiving per id, zodat markers in dezelfde stad
       niet stapelen — deterministisch, geen willekeur. */
    var h = 0;
    for (var i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) % 997;
    return [basis[0] + ((h % 20) - 10) * 0.0016, basis[1] + ((Math.floor(h / 20) % 20) - 10) * 0.0024];
  }
  function prijsKort(bedrag) {
    if (bedrag >= 1000000) {
      var m = Math.round(bedrag / 100000) / 10;
      return "€ " + String(m).replace(".", ",") + " mln";
    }
    return "€ " + Math.round(bedrag / 1000) + "K";
  }

  var aanbodKaart = null, kaartLaag = null;
  function kaartUpdate(panden, projecten) {
    var el = $("#aanbod-kaart");
    if (!el || typeof L === "undefined") return;
    if (!aanbodKaart) {
      aanbodKaart = L.map(el, { scrollWheelZoom: true, zoomControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
      }).addTo(aanbodKaart);
      aanbodKaart.setView([52.15, 5.3], 8); /* Nederland */
      kaartLaag = L.layerGroup().addTo(aanbodKaart);
    }
    kaartLaag.clearLayers();
    var bounds = [];
    function voegToe(item, isProject) {
      var pos = pandPositie(item);
      if (!pos) return;
      var prijs = isProject ? item.prijsVanaf : item.prijs;
      var icon = L.divIcon({
        className: "prijs-pin-wrap",
        html: "<span class='prijs-pin" + (isProject ? " pin-project" : "") + "'>" +
          (isProject ? "vanaf " : "") + prijsKort(prijs) + "</span>",
        iconSize: null
      });
      var href = isProject ? "/project?id=" + item.id : "/pand?id=" + item.id;
      var titel = isProject ? item.naam : item.adres;
      var foto = isProject ? projectBeeld(item) : pandBeeld(item, 0);
      var marker = L.marker(pos, { icon: icon, title: titel + ", " + item.plaats });
      marker.bindPopup(
        "<a class='kaart-popup' href='" + href + "'>" +
          "<img src='" + foto + "' alt=''>" +
          "<span class='kaart-popup-prijs'>" + (isProject ? "vanaf " : "") + fmtPrijs(prijs) + "</span>" +
          "<span class='kaart-popup-adres'>" + escapeHTML(titel) + "</span>" +
          "<span class='kaart-popup-plaats'>" + escapeHTML(item.plaats) + "</span>" +
        "</a>", { closeButton: false, maxWidth: 240 });
      marker.addTo(kaartLaag);
      /* Alleen Nederland telt mee voor het beginkader — anders zoomt
         een vakantiewoning in Spanje heel Europa in beeld */
      if (!item.land || item.land === "Nederland") bounds.push(pos);
    }
    (panden || []).forEach(function (p) { voegToe(p, false); });
    (projecten || []).forEach(function (p) { voegToe(p, true); });
    if (!kaartUpdate.gepast && bounds.length) {
      aanbodKaart.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
      kaartUpdate.gepast = true;
    }
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
    var fZoek = $("#filter-zoek");
    var fSort = $("#sorteer");
    var chipBewaard = $("#chip-bewaard");
    var chipAantal = $("#chip-bewaard-aantal");
    var alleenBewaard = false;

    function zoektreffer(p, term) {
      var hooi = (p.adres + " " + p.plaats + " " + (p.land || "") + " " +
        p.subtype + " " + p.type).toLowerCase();
      return term.split(/\s+/).every(function (w) { return hooi.indexOf(w) !== -1; });
    }

    function sorteer(lijst) {
      var s = fSort ? fSort.value : "";
      if (!s) return lijst;
      var kopie = lijst.slice();
      if (s === "prijs-op") kopie.sort(function (a, b) { return a.prijs - b.prijs; });
      if (s === "prijs-af") kopie.sort(function (a, b) { return b.prijs - a.prijs; });
      if (s === "opp-af") kopie.sort(function (a, b) { return b.oppervlakte - a.oppervlakte; });
      if (s === "nieuw") kopie.sort(function (a, b) { return b.bouwjaar - a.bouwjaar; });
      return kopie;
    }

    function pas() {
      var term = fZoek ? fZoek.value.trim().toLowerCase() : "";
      var favs = favLijst();
      var resultaat = PANVIA_PANDEN.filter(function (p) {
        if (alleenBewaard && favs.indexOf(p.id) === -1) return false;
        if (term && !zoektreffer(p, term)) return false;
        if (fType.value && p.type !== fType.value) return false;
        if (fPlaats.value && p.plaats !== fPlaats.value) return false;
        if (fLand && fLand.value === "Nederland" && p.land && p.land !== "Nederland") return false;
        if (fLand && fLand.value === "Buitenland" && (!p.land || p.land === "Nederland")) return false;
        if (fPrijs.value && p.prijs > Number(fPrijs.value)) return false;
        if (fOpp.value && p.oppervlakte < Number(fOpp.value)) return false;
        return true;
      });
      resultaat = sorteer(resultaat);
      if (chipAantal) chipAantal.textContent = favs.length ? "(" + favs.length + ")" : "";
      var projecten = alleenBewaard ? [] : filterProjecten({
        type: fType.value, plaats: fPlaats.value, land: fLand ? fLand.value : "",
        prijs: fPrijs.value, opp: fOpp.value, q: term
      });
      renderProjectenStrip(projecten);
      renderKaarten(grid, resultaat);
      kaartUpdate(resultaat, projecten);
      teller.innerHTML = "<strong class='tnum'>" + resultaat.length + "</strong> " +
        (resultaat.length === 1 ? "pand" : "panden") +
        (projecten.length ? " en <strong class='tnum'>" + projecten.length + "</strong> " +
          (projecten.length === 1 ? "project" : "projecten") : "") +
        " · rechtstreeks van eigenaar";
      leeg.hidden = !(resultaat.length === 0 && projecten.length === 0);
      grid.hidden = resultaat.length === 0;
    }

    [fType, fPlaats, fPrijs, fOpp, fLand, fSort].forEach(function (el) {
      if (el) el.addEventListener("change", pas);
    });
    if (fZoek) fZoek.addEventListener("input", pas);
    if (chipBewaard) {
      chipBewaard.addEventListener("click", function () {
        alleenBewaard = !alleenBewaard;
        chipBewaard.classList.toggle("aan", alleenBewaard);
        chipBewaard.setAttribute("aria-pressed", alleenBewaard);
        pas();
      });
      /* Hart aangeklikt → teller bijwerken; alleen hele lijst verversen als
         de bewaard-filter actief is (anders herlaadt het grid onnodig) */
      document.addEventListener("panvia:favorieten", function () {
        if (alleenBewaard) { pas(); return; }
        var n = favLijst().length;
        if (chipAantal) chipAantal.textContent = n ? "(" + n + ")" : "";
      });
    }
    wis.addEventListener("click", function () {
      fType.value = ""; fPlaats.value = ""; fPrijs.value = ""; fOpp.value = "";
      if (fLand) fLand.value = "";
      if (fZoek) fZoek.value = "";
      if (fSort) fSort.value = "";
      if (alleenBewaard && chipBewaard) chipBewaard.click(); else pas();
    });

    /* Kaart tonen/verbergen op mobiel */
    var toggleKaart = $("#toggle-kaart");
    var splits = $("#aanbod-splits");
    if (toggleKaart && splits) {
      toggleKaart.addEventListener("click", function () {
        var aan = splits.classList.toggle("toon-kaart");
        toggleKaart.classList.toggle("aan", aan);
        toggleKaart.setAttribute("aria-pressed", aan);
        if (aan && aanbodKaart) setTimeout(function () { aanbodKaart.invalidateSize(); }, 60);
      });
    }

    /* Vooringevuld via URL: aanbod.html?type=woning of ?q=utrecht (hero-zoekbalk) */
    var q = new URLSearchParams(window.location.search);
    if (q.get("type")) fType.value = q.get("type");
    if (fZoek && q.get("q")) fZoek.value = q.get("q");
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
     Mollie-checkout — GESIMULEERD, maar bewust zo gebouwd dat de echte
     Mollie-integratie hier 1-op-1 in past ("Mollie-ready"). Zowel de koper
     (abonnement € 12,95/mnd) als de verkoper (eenmalig € 895) lopen hier
     langs: een account/plaatsing ontstaat PAS nadat de betaling is geslaagd.

     ▸ ZO WORDT DIT ECHTE MOLLIE (een backend is nodig — een statische site
       kan het niet, want de Mollie-key moet geheim server-side blijven):
       1. Backend-route (bv. Vercel serverless): POST /api/mollie/create-payment
          - eenmalig (verkoper): mollie.payments.create({ amount, description,
            redirectUrl, webhookUrl }) met de GEHEIME live/test-key.
          - abonnement (koper): eerste betaling + mandaat, daarna
            mollie.customers.create + mollie.customerPayments/subscriptions
            voor de maandelijkse € 12,95.
          - antwoord: payment.getCheckoutUrl().
       2. Frontend: window.location = checkoutUrl  → Mollie hosted checkout.
       3. Mollie roept je webhook (/api/mollie/webhook) met de payment-id;
          de server haalt de status op en zet in de database: betaald = true.
       4. Na terugkeer (redirectUrl) verifieert de server de status server-side
          en pas DÁN wordt het account/de plaatsing echt aangemaakt.
     De twee functies hieronder simuleren stap 2–4 (methode kiezen →
     "verwerken" → betaald). Vervang ze door bovenstaande calls en de rest
     van de flow blijft ongewijzigd.
     ------------------------------------------------------------------------ */
  function mollieVerwerk(container, onBetaald) {
    container.innerHTML =
      "<div class='mollie'>" +
        "<div class='mollie-balk'><span class='mollie-slot'>🔒 Beveiligde betaling</span><span>Mollie</span></div>" +
        "<div class='mollie-verwerkt'>" +
          "<div class='mollie-spinner' aria-hidden='true'></div>" +
          "<p role='status'>Je betaling wordt verwerkt…</p>" +
        "</div>" +
      "</div>";
    /* MOLLIE-READY: hier zou je zijn teruggekeerd van de hosted checkout en
       verifieer je de status server-side vóór je onBetaald aanroept. */
    if (wilBeweging()) { setTimeout(onBetaald, 1300); } else { onBetaald(); }
  }

  function mollieCheckout(container, opts) {
    /* opts: { bedrag, periode, omschrijving, knopLabel, klein, onTerug, onBetaald } */
    var banken = ["ABN AMRO", "ASN Bank", "bunq", "ING", "Knab", "Rabobank", "Revolut", "SNS", "Triodos Bank"];
    container.innerHTML =
      "<div class='mollie'>" +
        "<div class='mollie-balk'><span class='mollie-slot'>🔒 Beveiligde betaling</span><span>Mollie</span></div>" +
        "<div class='mollie-body'>" +
          "<p class='mollie-bedrag tnum'>" + escapeHTML(opts.bedrag) + "</p>" +
          "<p class='mollie-omschrijving'>" + escapeHTML(opts.omschrijving) + (opts.periode ? " · " + escapeHTML(opts.periode) : "") + "</p>" +
          "<div class='mollie-methodes' role='radiogroup' aria-label='Betaalmethode'>" +
            "<label class='radio-optie'><input type='radio' name='mollie-methode' value='ideal' checked> iDEAL</label>" +
            "<label class='radio-optie'><input type='radio' name='mollie-methode' value='creditcard'> Creditcard</label>" +
            "<label class='radio-optie'><input type='radio' name='mollie-methode' value='bancontact'> Bancontact</label>" +
          "</div>" +
          "<div class='veld mollie-bank' id='mollie-bank-wrap'>" +
            "<label for='mollie-bank'>Je bank</label>" +
            "<select id='mollie-bank' style='max-width:240px'>" + banken.map(function (b) { return "<option>" + b + "</option>"; }).join("") + "</select>" +
          "</div>" +
          "<button type='button' class='btn btn-primair' id='mollie-betaal'>" + escapeHTML(opts.knopLabel || ("Betaal " + opts.bedrag)) + "</button>" +
          (opts.onTerug ? "<button type='button' class='btn btn-tertiair' id='mollie-terug' style='width:100%;margin-top:12px'>Ga terug</button>" : "") +
          (opts.klein ? "<p class='mollie-klein'>" + opts.klein + "</p>" : "") +
        "</div>" +
      "</div>";
    var bankWrap = $("#mollie-bank-wrap", container);
    $all("input[name='mollie-methode']", container).forEach(function (r) {
      r.addEventListener("change", function () {
        var gekozen = $("input[name='mollie-methode']:checked", container);
        bankWrap.hidden = !(gekozen && gekozen.value === "ideal");
      });
    });
    $("#mollie-betaal", container).addEventListener("click", function () {
      mollieVerwerk(container, opts.onBetaald);
    });
    var terug = $("#mollie-terug", container);
    if (terug && opts.onTerug) terug.addEventListener("click", opts.onTerug);
  }

  /* Welke betaalweg? "mollie" = echt, via de backend (api/mollie/* op Vercel
     + Mollie hosted checkout). "simulatie" = het prototype hierboven.
     "auto": op localhost simuleren (daar draait geen backend), overal
     anders echt betalen. Instelbaar in js/config.js → betaalModus. */
  function betaalModus() {
    var m = cfg("betaalModus", "auto");
    if (m === "mollie" || m === "simulatie") return m;
    var h = window.location.hostname;
    return (h === "localhost" || h === "127.0.0.1" || h === "") ? "simulatie" : "mollie";
  }

  /* Echte betaling: de server maakt de Mollie-betaling aan (bedrag staat
     server-side vast) en we sturen door naar de Mollie hosted checkout.
     Betaalmethode kiezen gebeurt dáár. Na afloop landt de bezoeker op
     betaald.html?ref=…, die de status server-side verifieert. */
  function mollieStart(container, payload) {
    container.innerHTML =
      "<div class='mollie'>" +
        "<div class='mollie-balk'><span class='mollie-slot'>🔒 Beveiligde betaling</span><span>Mollie</span></div>" +
        "<div class='mollie-verwerkt'>" +
          "<div class='mollie-spinner' aria-hidden='true'></div>" +
          "<p role='status'>Je wordt doorgestuurd naar de beveiligde betaalomgeving…</p>" +
        "</div>" +
      "</div>";
    fetch("/api/mollie/create-payment", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      /* Bekend e-mailadres: niet doorstoten naar betalen, maar even laten
         inloggen. Daarna staat alles al ingevuld. */
      if (data && data.code === "inloggen") {
        var terug = window.location.pathname.split("/").pop().replace(/.html$/i, "") || "kopers";
        container.innerHTML =
          "<div class='nb-blok'>" +
            "<p style='margin:0 0 16px'><strong>Je hebt al een Panvia-account met dit e-mailadres.</strong> " +
            "Log even in — daarna hoef je alleen nog te betalen.</p>" +
            "<p style='margin:0'><a class='btn btn-primair' href='/inloggen?terug=" + encodeURIComponent(terug) + "'>Inloggen</a> " +
            "<a class='btn btn-tertiair' href='/wachtwoord-vergeten'>Wachtwoord vergeten?</a></p>" +
          "</div>";
        return;
      }
      if (data && data.code === "al-actief") {
        container.innerHTML =
          "<div class='nb-blok'><p style='margin:0 0 16px'><strong>" + escapeHTML(data.fout) + "</strong> " +
          "Er is niets afgeschreven.</p><p style='margin:0'><a class='btn btn-primair' href='/aanbod'>Naar het aanbod</a></p></div>";
        return;
      }
      throw new Error((data && data.fout) || "onbekende fout");
    }).catch(function (e) {
      console.error("[panvia] betaling starten mislukt:", e);
      container.innerHTML =
        "<div class='nb-blok'><p style='margin:0'><strong>Betalen lukt op dit moment niet.</strong> " +
        "Er is niets afgeschreven. Probeer het over een paar minuten opnieuw; blijft het misgaan, " +
        "mail ons dan op " + escapeHTML(cfg("contactEmail", "")) + ".</p></div>";
    });
  }

  /* ------------------------------------------------------------------------
     Pagina: kopers — doorloop: (1) je gegevens → (2) betalen via Mollie →
     (3) klaar. Het kopersaccount ontstaat PAS na een geslaagde betaling.
     ------------------------------------------------------------------------ */
  function initKopers() {
    var blok = $("#kopers-aanmeld-blok");
    if (!blok) return;

    var prijsEls = $all(".js-koper-fee");
    prijsEls.forEach(function (el) { el.textContent = KOPER_FEE; });

    var indicator = $("#kopers-indicator");
    function zetStap(n) {
      if (!indicator) return;
      $all("li", indicator).forEach(function (li, i) {
        var nr = i + 1;
        li.classList.toggle("klaar", nr < n);
        if (nr === n) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
        var bol = li.querySelector(".bol");
        if (bol) bol.textContent = nr < n ? "✓" : String(nr);
      });
    }

    /* Al lid? Toon dat, in plaats van de doorloop. */
    if (Auth.isKoper()) {
      zetStap(3);
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Je bent al lid</h2>" +
          "<p class='grijs'>Je kopersabonnement staat op naam van <strong>" + escapeHTML(Auth.naam() || Auth.email()) + "</strong> (" +
          escapeHTML(Auth.email()) + "). Je kunt op elk pand rechtstreeks met de eigenaar praten, bieden en de volledige verkoperinformatie zien.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='/aanbod'>Bekijk het aanbod</a></p>" +
        "</div>";
      return;
    }

    var form = $("#kopers-form");
    var checkout = $("#kopers-checkout");
    if (!form || !checkout) return;

    /* Al ingelogd (bijvoorbeeld als verkoper): naam, e-mail en wachtwoord
       zijn al bekend, dus die velden gaan weg. Eén vinkje en betalen. */
    var accountVelden = $("#kopers-accountvelden");
    var ingelogdBlok = $("#kopers-ingelogd");
    if (Auth.ingelogd() && accountVelden && ingelogdBlok) {
      accountVelden.hidden = true;
      ingelogdBlok.hidden = false;
      ingelogdBlok.innerHTML =
        "<p class='label'>Je bent ingelogd</p>" +
        "<p class='ingelogd-naam'>" + escapeHTML(Auth.naam() || Auth.email()) + " <span class='grijs tnum'>· " + escapeHTML(Auth.email()) + "</span></p>" +
        "<p class='klein grijs'>Het abonnement komt op dit account. Niet jij? <button type='button' class='knop-als-link' id='kopers-uitlog'>Log uit</button>.</p>";
      $("#kopers-uitlog").addEventListener("click", function () {
        Auth.uitloggen().then(function () { window.location.reload(); });
      });
    }

    function toonWelkom() {
      checkout.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Betaald. Je bent nu lid.</h2>" +
          "<p class='grijs'>Je betaling is gelukt en je account is actief. Vanaf nu praat je op elk pand rechtstreeks met de eigenaar, doe je biedingen en zie je de volledige verkoperinformatie. Je betaalt " + KOPER_FEE + " per maand en zegt elke maand met één klik op.</p>" +
          "<p class='klein grijs'>Prototype: er wordt niets afgeschreven en je gegevens worden niet doorverkocht — aan niemand, ooit.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='/aanbod'>Bekijk het aanbod</a></p>" +
        "</div>";
      zetStap(3);
      window.scrollTo({ top: blok.offsetTop - 40, behavior: "smooth" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var akkoord = $("#kopers-akkoord");
      var naamW, emailW, telefoonW = "", wachtwoordW = "";
      var ok = true;

      if (Auth.ingelogd()) {
        naamW = Auth.naam();
        emailW = Auth.email();
        telefoonW = Auth.telefoon();
      } else {
        var naam = $("#kopers-naam");
        var email = $("#kopers-email");
        var telefoon = $("#kopers-telefoon");
        var wachtwoord = $("#kopers-wachtwoord");
        if (!naam.value.trim()) { zetFout(naam, "Vul je naam in, dan weten eigenaren wie er schrijft."); ok = false; }
        if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
        if (!geldigTelefoon(telefoon.value)) { zetFout(telefoon, "Vul een telefoonnummer in, bijvoorbeeld 06 12345678."); ok = false; }
        if (wachtwoord.value.length < 8) { zetFout(wachtwoord, "Kies een wachtwoord van minstens 8 tekens."); ok = false; }
        naamW = naam.value.trim();
        emailW = email.value.trim();
        telefoonW = normaliseerTelefoon(telefoon.value) || "";
        wachtwoordW = wachtwoord.value;
      }
      if (!akkoord.checked) { zetFout(akkoord, "Zet een vinkje om akkoord te gaan met de voorwaarden."); ok = false; }
      if (!ok) return;

      /* Naar de betaalstap. Het account wordt PAS na de betaling aangemaakt:
         echt (webhook → database → betaald.html) of gesimuleerd (onBetaald). */
      form.hidden = true;
      checkout.hidden = false;
      zetStap(2);
      if (betaalModus() === "mollie") {
        mollieStart(checkout, { soort: "koper", naam: naamW, email: emailW, telefoon: telefoonW, wachtwoord: wachtwoordW });
        window.scrollTo({ top: blok.offsetTop - 40, behavior: "smooth" });
        return;
      }
      mollieCheckout(checkout, {
        bedrag: KOPER_FEE,
        periode: "per maand, maandelijks opzegbaar",
        omschrijving: "Panvia kopersabonnement",
        knopLabel: "Betaal " + KOPER_FEE,
        klein: "Vandaag " + KOPER_FEE + ", daarna elke maand — opzegbaar met één klik.",
        onTerug: function () {
          checkout.hidden = true;
          checkout.innerHTML = "";
          form.hidden = false;
          zetStap(1);
          window.scrollTo({ top: blok.offsetTop - 40, behavior: "smooth" });
        },
        onBetaald: function () {
          verstuurLead("koper-abonnement", { naam: naamW, email: emailW, tarief: KOPER_FEE + " per maand" });
          lokaalRolActiveren("koper", naamW, emailW);
          initAccountNav();
          toonWelkom();
        }
      });
      window.scrollTo({ top: blok.offsetTop - 40, behavior: "smooth" });
    });
    $all("input", form).forEach(wisFoutBijInvoer);
  }

  /* ------------------------------------------------------------------------
     Onboarding ná de betaling.

     Dit is het enige moment waarop iemand echt bereid is iets in te vullen:
     er is net betaald, het account is vers en de aandacht is er nog. Vóór de
     betaling vragen we bewust niets extra's — elk veld daar kost conversie op
     de duurste plek van de flow.
     ------------------------------------------------------------------------ */

  function optiesHTML(opties, leeg) {
    return "<option value=''>" + escapeHTML(leeg) + "</option>" +
      opties.map(function (o) {
        return "<option value='" + escapeHTML(o[0]) + "'>" + escapeHTML(o[1]) + "</option>";
      }).join("");
  }

  function veldSelect(id, label, opties, leeg, hint) {
    return "<div class='veld'>" +
      "<label for='" + id + "'>" + escapeHTML(label) + "</label>" +
      "<select id='" + id + "'>" + optiesHTML(opties, leeg) + "</select>" +
      (hint ? "<span class='hint'>" + escapeHTML(hint) + "</span>" : "") +
      "<p class='fout' role='alert'></p>" +
    "</div>";
  }

  var PROFIEL_VELDEN = {
    koper: function () {
      return "" +
        "<div class='veld'>" +
          "<label for='pf-gebied'>Waar zoek je?</label>" +
          "<input type='text' id='pf-gebied' placeholder='Haarlem, Amsterdam-West, 2011'>" +
          "<span class='hint'>Plaatsen, wijken of postcodes, gescheiden door komma's. Hierop sturen we je een seintje.</span>" +
          "<p class='fout' role='alert'></p>" +
        "</div>" +
        "<div class='veld-rij'>" +
          "<div class='veld'><label for='pf-budget-min'>Budget vanaf</label>" +
            "<input type='text' id='pf-budget-min' inputmode='numeric' placeholder='250.000'></div>" +
          "<div class='veld'><label for='pf-budget-max'>Budget tot</label>" +
            "<input type='text' id='pf-budget-max' inputmode='numeric' placeholder='450.000'></div>" +
        "</div>" +
        veldSelect("pf-timing", "Wanneer wil je kopen?", [
          ["nu", "Zo snel mogelijk"],
          ["1-3", "Binnen 1 à 3 maanden"],
          ["3-6", "Binnen 3 à 6 maanden"],
          ["orienterend", "Ik oriënteer me nog"]
        ], "Maak een keuze") +
        veldSelect("pf-financiering", "Hoe staat je financiering ervoor?", [
          ["rond", "Rond — ik kan meteen bieden"],
          ["in-gesprek", "In gesprek met een adviseur"],
          ["nog-niet", "Nog niet geregeld"]
        ], "Maak een keuze", "Eigenaren nemen een bod serieuzer als dit rond is.") +
        veldSelect("pf-eigen-woning", "Heb je zelf een woning te verkopen?", [
          ["ja", "Ja"],
          ["nee", "Nee"]
        ], "Maak een keuze", "Zo ja, dan laten we je zien wat plaatsen op Panvia kost — zonder courtage.") +
        "<label class='akkoord' for='pf-alerts' style='margin-top:8px'>" +
          "<input type='checkbox' id='pf-alerts' checked>" +
          "<span>Stuur me een bericht zodra er een woning bij komt die hierop past.</span>" +
        "</label>";
    },
    verkoper: function () {
      return "" +
        veldSelect("pf-termijn", "Wanneer wil je verkocht hebben?", [
          ["zsm", "Zo snel mogelijk"],
          ["3-mnd", "Binnen 3 maanden"],
          ["6-mnd", "Binnen 6 maanden"],
          ["geen-haast", "Geen haast, de prijs moet goed zijn"]
        ], "Maak een keuze") +
        veldSelect("pf-reden", "Waarom verkoop je?", [
          ["verhuizing", "Ik ga verhuizen"],
          ["groter", "Ik wil groter wonen"],
          ["kleiner", "Ik wil kleiner wonen"],
          ["werk", "Werk of studie"],
          ["belegging", "Het is een belegging"],
          ["nalatenschap", "Nalatenschap"],
          ["anders", "Anders"]
        ], "Maak een keuze", "Dit blijft tussen ons — het staat niet op je advertentie.") +
        veldSelect("pf-eigendomsvorm", "Eigendomsvorm", [
          ["volledig", "Volledig eigendom"],
          ["mede-eigendom", "Mede-eigendom"],
          ["erfpacht", "Erfpacht"],
          ["vve", "Appartementsrecht (VvE)"]
        ], "Maak een keuze") +
        veldSelect("pf-makelaar", "Heb je het eerder via een makelaar geprobeerd?", [
          ["ja", "Ja"],
          ["nee", "Nee"]
        ], "Maak een keuze") +
        veldSelect("pf-zoekt-zelf", "Zoek je zelf ook een woning?", [
          ["ja", "Ja"],
          ["nee", "Nee"]
        ], "Maak een keuze", "Zo ja, dan zetten we het kopersabonnement voor je klaar.") +
        veldSelect("pf-bezichtiging", "Hoe wil je bezichtigingen doen?", [
          ["afspraak", "Op afspraak"],
          ["open-huis", "Open huis"],
          ["beide", "Allebei prima"]
        ], "Maak een keuze");
    }
  };

  /* Verzamelt de ingevulde waarden voor het profiel-endpoint. */
  function profielWaarden(rol) {
    function w(id) { var el = $("#" + id); return el ? el.value.trim() : ""; }
    if (rol === "koper") {
      return {
        zoekgebied: w("pf-gebied").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
        budgetMin: w("pf-budget-min"),
        budgetMax: w("pf-budget-max"),
        timing: w("pf-timing"),
        financiering: w("pf-financiering"),
        eigenWoningTeKoop: w("pf-eigen-woning"),
        toestemming: { alerts: $("#pf-alerts") && $("#pf-alerts").checked }
      };
    }
    return {
      termijn: w("pf-termijn"),
      reden: w("pf-reden"),
      eigendomsvorm: w("pf-eigendomsvorm"),
      eerderViaMakelaar: w("pf-makelaar"),
      zoektZelfWoning: w("pf-zoekt-zelf"),
      bezichtiging: w("pf-bezichtiging")
    };
  }

  /* Toont het profielformulier in `doel` en zet er ná het opslaan de
     vervolgknoppen neer. Is het profiel al ingevuld, dan slaan we de stap
     over — niemand vult twee keer hetzelfde in. */
  function profielStap(doel, rol, vervolgHTML) {
    if (!doel) return;
    if (Auth.profielCompleet(rol)) { doel.innerHTML = vervolgHTML; return; }

    var kop = rol === "koper"
      ? ["Nog één ding: wat zoek je?", "Zonder dit weten we niet welke woningen we je moeten laten zien. Het kost je een halve minuut."]
      : ["Nog één ding: hoe wil je verkopen?", "Hiermee stemmen we je advertentie en onze begeleiding af. Het staat niet op je advertentie."];

    doel.innerHTML =
      "<div class='profiel-stap'>" +
        "<h3>" + escapeHTML(kop[0]) + "</h3>" +
        "<p class='grijs'>" + escapeHTML(kop[1]) + "</p>" +
        PROFIEL_VELDEN[rol]() +
        "<div id='pf-actie' style='margin-top:24px'>" +
          "<button type='button' class='btn btn-primair' id='pf-opslaan'>Opslaan en verder</button>" +
          "<p class='fout' role='alert' id='pf-algemeen'></p>" +
        "</div>" +
      "</div>";

    $all("input, select", doel).forEach(wisFoutBijInvoer);

    $("#pf-opslaan").addEventListener("click", function () {
      var velden = profielWaarden(rol);

      /* Eén veld is echt nodig, de rest mag leeg blijven: zonder zoekgebied
         kunnen we niets matchen, zonder termijn niets plannen. */
      if (rol === "koper" && !velden.zoekgebied.length) {
        zetFout($("#pf-gebied"), "Vul in waar je zoekt — anders kunnen we je niets laten weten.");
        return;
      }
      if (rol === "verkoper" && !velden.termijn) {
        zetFout($("#pf-termijn"), "Kies wanneer je verkocht wilt hebben.");
        return;
      }

      var knop = $("#pf-opslaan");
      knop.disabled = true;
      knop.textContent = "Bezig met opslaan…";

      /* Op localhost draait geen backend; daar slaan we de stap over. */
      if (betaalModus() === "simulatie") { doel.innerHTML = vervolgHTML; return; }

      fetch("/api/auth/profiel", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: rol, velden: velden })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.fout) || "opslaan mislukt");
        if (data.account) Auth.account = data.account;
        doel.innerHTML = vervolgHTML;
      }).catch(function (e) {
        console.error("[panvia] profiel opslaan:", e);
        knop.disabled = false;
        knop.textContent = "Opslaan en verder";
        $("#pf-algemeen").textContent =
          "Opslaan lukt even niet. Je account is gewoon actief — je kunt dit later invullen in Mijn Panvia.";
        $("#pf-algemeen").innerHTML += " <a href='/eigenaar'>Ga verder</a>";
      });
    });
  }

  /* ------------------------------------------------------------------------
     Pagina: betaald — terugkeer van de Mollie hosted checkout.
     Verifieert server-side (/api/mollie/status) of er écht betaald is en
     activeert pas dan het account op dit apparaat. De webhook kan een paar
     seconden achterlopen; we proberen het daarom even opnieuw.
     ------------------------------------------------------------------------ */
  function initBetaald() {
    var blok = $("#betaald-blok");
    if (!blok) return;
    var ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) { window.location.href = "/"; return; }

    var pogingen = 0;

    /* De server logt je bij een geslaagde betaling meteen in (eenmalig per
       ref). Lukte dat niet — bijvoorbeeld omdat de link al eerder geopend is —
       dan zeggen we netjes dat je kunt inloggen met wat je zelf koos. */
    function inlogRegel(d) {
      if (d.ingelogd) {
        Auth.account = d.account;
        initAccountNav();
        return "<p class='klein grijs'>Je bent meteen ingelogd op dit apparaat. Op een ander apparaat log je in met " +
          escapeHTML(d.email || "je e-mailadres") + " en je wachtwoord.</p>";
      }
      return "<p class='klein grijs'>Log in met " + escapeHTML(d.email || "je e-mailadres") + " en het wachtwoord dat je koos — " +
        "<a href='/inloggen'>naar inloggen</a>.</p>";
    }

    function klaarKoper(d) {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Betaald. Je bent nu lid.</h2>" +
          "<p class='grijs'>Je kopersabonnement is actief" + (d.naam ? ", " + escapeHTML(String(d.naam).split(" ")[0]) : "") + ". Vanaf nu praat je op elk pand rechtstreeks met de eigenaar, doe je biedingen en zie je de volledige verkoperinformatie. Je betaalt " + KOPER_FEE + " per maand en zegt elke maand met één klik op.</p>" +
          inlogRegel(d) +
        "</div>" +
        "<div id='na-betaling'></div>";
      profielStap($("#na-betaling"), "koper",
        "<p style='margin-top:24px'><a class='btn btn-primair' href='/aanbod'>Bekijk het aanbod</a></p>");
    }

    function klaarVerkoper(d) {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Betaald. Je pand staat klaar.</h2>" +
          "<p class='grijs'>Je betaalde € 1.082,95 (€ 895 + 21% btw) voor 6 maanden. We controleren je advertentie en zetten hem daarna online — je hoort van ons op " + escapeHTML(d.email || "je e-mailadres") + ". Geen courtage erachteraan, ook niet als je pand verkoopt.</p>" +
          inlogRegel(d) +
        "</div>" +
        "<div id='na-betaling'></div>";
      profielStap($("#na-betaling"), "verkoper",
        "<p style='margin-top:24px'><a class='btn btn-primair' href='/eigenaar'>Naar Mijn Panvia</a> " +
        "<a class='btn btn-tertiair' href='/aanbod'>Bekijk het aanbod</a></p>");
    }

    var PROJECT_BEDRAG = { project_s: ["Project S", "€ 5.021,50", "€ 4.150"], project_m: ["Project M", "€ 8.409,50", "€ 6.950"], project_l: ["Project L", "€ 12.644,50", "€ 10.450"] };
    function klaarProject(d) {
      var p = PROJECT_BEDRAG[d.soort];
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<div class='vink' aria-hidden='true'>✓</div>" +
          "<h2>Betaald. Je project staat klaar.</h2>" +
          "<p class='grijs'>Je betaalde " + p[1] + " (" + p[2] + " + 21% btw) voor het eerste kwartaal van " + p[0] + ". Vanaf nu loopt het automatisch per kwartaal — per kwartaal opzegbaar. We controleren het eigendom en bouwen je projectpagina; je hoort binnen twee werkdagen van ons op " + escapeHTML(d.email || "je e-mailadres") + ".</p>" +
          inlogRegel(d) +
        "</div>" +
        "<div id='na-betaling'></div>";
      /* Een projectklant is een aanbieder: zelfde profielvragen als een
         verkoper, want daar hangt zijn rol ook aan. */
      profielStap($("#na-betaling"), "verkoper",
        "<p style='margin-top:24px'><a class='btn btn-primair' href='/eigenaar'>Naar Mijn Panvia</a> " +
        "<a class='btn btn-tertiair' href='/projecten'>Terug naar Projecten</a></p>");
    }

    function nogBezig() {
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<h2>Je betaling is nog in behandeling</h2>" +
          "<p class='grijs'>Er is nog geen bevestiging van de bank binnen. Zodra de betaling verwerkt is, wordt je account actief. Herlaad deze pagina over een minuut, of kom later terug via de link in je mail.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-secundair' href='javascript:location.reload()'>Vernieuw deze pagina</a></p>" +
        "</div>";
    }

    function mislukt(status, soort) {
      var kop = status === "canceled" ? "Betaling geannuleerd" : (status === "expired" ? "Betaling verlopen" : "Betaling niet gelukt");
      var terugLink = soort === "verkoper"
        ? "<a class='btn btn-primair' href='/plaatsen'>Probeer opnieuw</a>"
        : (String(soort).indexOf("project_") === 0
          ? "<a class='btn btn-primair' href='/projecten#aanmelden'>Probeer opnieuw</a>"
          : "<a class='btn btn-primair' href='/kopers'>Probeer opnieuw</a>");
      blok.innerHTML =
        "<div class='bevestiging'>" +
          "<h2>" + kop + "</h2>" +
          "<p class='grijs'>Er is niets afgeschreven en er is geen account aangemaakt. Je kunt het gewoon opnieuw proberen.</p>" +
          "<p style='margin-top:24px'>" + terugLink + "</p>" +
        "</div>";
    }

    function check() {
      fetch("/api/mollie/status?ref=" + encodeURIComponent(ref), { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error(d && d.fout ? d.fout : "status onbekend");
          if (d.status === "paid") return d.soort === "verkoper" ? klaarVerkoper(d) : (PROJECT_BEDRAG[d.soort] ? klaarProject(d) : klaarKoper(d));
          if (d.status === "open" || d.status === "pending" || d.status === "authorized") {
            if (pogingen++ < 10) return setTimeout(check, 2000);
            return nogBezig();
          }
          mislukt(d.status, d.soort);
        })
        .catch(function (e) {
          console.error("[panvia] statuscontrole:", e);
          if (pogingen++ < 10) return setTimeout(check, 2000);
          nogBezig();
        });
    }
    check();
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
    $("#detail-prijs").innerHTML = fmtPrijs(pand.prijs) + " <span class='kk'>kosten koper</span>" +
      hartKnopHTML(pand.id).replace("kaart-hart", "kaart-hart hart-detail");
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

    /* Stap 1 — de poort. Praten en bieden vereist een betaald kopers-
       abonnement (€ 12,95 per maand). Dit blok maakt zélf geen account: dat
       gebeurt op kopers.html, en pas nadat de betaling geslaagd is. */
    function renderAccount() {
      var ingelogdZonderRol = Auth.ingelogd();
      chatBlok.innerHTML =
        "<div class='account-box'>" +
          "<span class='label'>Kopersabonnement</span>" +
          "<p class='klein grijs'>Praten met eigenaren, bieden én de volledige verkoperinformatie zien doe je met een kopersabonnement: <strong class='tnum'>" + KOPER_FEE + "</strong> per maand, geldig voor alle panden en maandelijks opzegbaar. Zo weet elke eigenaar dat er een serieuze koper schrijft — en krijg jij antwoord in plaats van stilte.</p>" +
          (ingelogdZonderRol
            ? "<p class='klein grijs'>Je bent ingelogd als <strong>" + escapeHTML(Auth.voornaam()) + "</strong>, maar het kopersabonnement staat nog niet op je account. Eén stap en je zit erin.</p>"
            : "") +
          "<p style='margin: 20px 0 0;'>" +
            "<a class='btn btn-primair' href='/kopers'>Word lid — " + KOPER_FEE + " per maand</a>" +
            (ingelogdZonderRol ? "" : " <a class='btn btn-tertiair' href='/inloggen?terug=kopers'>Ik heb al een account</a>") +
          "</p>" +
          "<p class='klein grijs' style='margin: 16px 0 0;'>Zoeken en kijken blijft gratis; opzeggen kan elke maand met één klik.</p>" +
        "</div>";
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
          "<p class='klein grijs'>Alleen zichtbaar met een kopersabonnement. Neem er hieronder één — dan zie je of er geboden is en kun je zelf meedoen.</p>";
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
      var telefoon = $("#pa-telefoon");
      var kvk = $("#pa-kvk");
      var btw = $("#pa-btw");
      var ok = true;
      if (!org.value.trim()) { zetFout(org, "Vul de naam van je organisatie in."); ok = false; }
      if (!naam.value.trim()) { zetFout(naam, "Vul de naam van de contactpersoon in."); ok = false; }
      if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
      if (!geldigTelefoon(telefoon.value)) { zetFout(telefoon, "Vul een telefoonnummer in, bijvoorbeeld 06 12345678."); ok = false; }
      /* KvK en btw-nummer zijn niet optioneel: zonder die twee kunnen we
         geen geldige btw-factuur uitreiken voor een bedrag als dit. */
      if (!geldigKvk(kvk.value)) { zetFout(kvk, "Vul je KvK-nummer in — acht cijfers."); ok = false; }
      if (!geldigBtwNummer(btw.value)) { zetFout(btw, "Vul je btw-identificatienummer in, bijvoorbeeld NL123456789B01."); ok = false; }
      if (!proj.value.trim()) { zetFout(proj, "Vul de naam en plaats van het project in."); ok = false; }
      var n = Number(eenheden.value);
      if (!n || n < 1) { zetFout(eenheden, "Vul in om hoeveel eenheden het gaat, bijvoorbeeld 24."); ok = false; }
      if (!verklaring.checked) { zetFout(verklaring, "Zonder deze verklaring kunnen we je project niet plaatsen — Panvia is uitsluitend voor eigenaren."); ok = false; }
      if (!ok) return;

      var type = ($("input[name='pa-type']:checked") || {}).value || "woning";

      var gegevens = {
        organisatie: org.value.trim(),
        naam: naam.value.trim(),
        email: email.value.trim(),
        telefoon: normaliseerTelefoon(telefoon.value) || "",
        /* Zakelijke gegevens gaan mee naar het account (zie webhook), zodat
           we een factuur op naam van de organisatie kunnen uitreiken. */
        zakelijk: true,
        bedrijfsnaam: org.value.trim(),
        kvk: kvk.value.replace(/[^0-9]/g, ""),
        btw: btw.value.trim().toUpperCase().replace(/\s/g, ""),
        factuurEmail: $("#pa-factuur-email").value.trim(),
        poNummer: $("#pa-po").value.trim(),
        project: proj.value.trim(),
        type: type,
        eenheden: n,
        toelichting: $("#pa-toelichting").value.trim()
      };

      /* Minder dan tien eenheden: geen pakket — verwijs naar losse plaatsing. */
      if (n < 10) {
        verstuurLead("project-aanmelding", Object.assign({ passendPakket: "Losse plaatsing (< 10 eenheden)" }, gegevens));
        $("#project-aanmeld-blok").innerHTML =
          "<div class='bevestiging'>" +
            "<div class='vink' aria-hidden='true'>✓</div>" +
            "<h2>Voor minder dan tien eenheden plaats je per pand</h2>" +
            "<p class='grijs'>Projectpakketten beginnen bij tien eenheden. Met <span class='tnum'>" + n + "</span> " +
            (n === 1 ? "eenheid" : "eenheden") + " ben je voordeliger uit met losse plaatsingen van <span class='tnum'>€ 895</span> per pand (excl. btw, 6 maanden).</p>" +
            "<p style='margin-top:24px'><a class='btn btn-primair' href='/plaatsen'>Plaats je pand</a></p>" +
          "</div>";
        window.scrollTo({ top: $("#aanmelden").offsetTop - 40, behavior: "smooth" });
        return;
      }

      var pakketSoort = n >= 76 ? "project_l" : (n >= 26 ? "project_m" : "project_s");
      var PAKKETTEN = {
        project_s: { label: "Project S", bereik: "10 – 25 eenheden", excl: "€ 4.150", incl: "€ 5.021,50" },
        project_m: { label: "Project M", bereik: "26 – 75 eenheden", excl: "€ 6.950", incl: "€ 8.409,50" },
        project_l: { label: "Project L", bereik: "76+ eenheden",     excl: "€ 10.450", incl: "€ 12.644,50" }
      };
      var pk = PAKKETTEN[pakketSoort];

      /* De projectgegevens gaan hoe dan ook naar de inbox — ook als de
         betaling daarna strandt, weet Panvia wie er interesse had. */
      verstuurLead("project-aanmelding", Object.assign({ passendPakket: pk.label + " (" + pk.excl + " per kwartaal)" }, gegevens));

      /* Betaalstap: eerste kwartaal nu, mandaat voor de kwartalen erna. */
      var blok = $("#project-aanmeld-blok");
      var alIngelogd = Auth.ingelogd();
      blok.innerHTML =
        "<div class='betaal-overzicht'>" +
          "<span class='kop-label'>Stap 2 van 2 · Start je project</span>" +
          "<h2>" + escapeHTML(pk.label) + " voor " + escapeHTML(gegevens.project) + "</h2>" +
          "<table class='overzicht-tabel'><tbody>" +
            "<tr><th scope='row'>Pakket</th><td>" + pk.label + " · " + pk.bereik + " (jij: <span class='tnum'>" + n + "</span>)</td></tr>" +
            "<tr><th scope='row'>Prijs</th><td><span class='tnum'>" + pk.excl + "</span> per kwartaal, excl. btw · afrekening <span class='tnum'>" + pk.incl + "</span> incl. 21% btw</td></tr>" +
            "<tr><th scope='row'>Hoe het loopt</th><td>Je betaalt nu het eerste kwartaal. Daarna wordt hetzelfde bedrag automatisch elk kwartaal afgeschreven — <strong>per kwartaal opzegbaar</strong>, dus uitverkocht is klaar.</td></tr>" +
            "<tr><th scope='row'>Daarna</th><td>We controleren het eigendom en bouwen samen je projectpagina — die staat binnen twee werkdagen klaar.</td></tr>" +
          "</tbody></table>" +
          (alIngelogd
            ? "<p class='klein grijs'>Je bent ingelogd als " + escapeHTML(Auth.email()) + " — het project komt op dit account.</p>"
            : "<div class='veld' style='max-width:360px'><label for='pa-wachtwoord'>Kies een wachtwoord</label>" +
              "<input type='password' id='pa-wachtwoord' autocomplete='new-password'>" +
              "<span class='hint'>Minstens 8 tekens. Hiermee log je straks in op Mijn Panvia.</span>" +
              "<p class='fout' role='alert'></p></div>") +
          "<div id='project-betaal-paneel' style='margin-top:24px'>" +
            "<button type='button' class='btn btn-primair' id='project-betaal'>Betaal " + pk.incl + " en start</button> " +
            "<button type='button' class='btn btn-tertiair' id='project-terug'>← Terug</button>" +
            "<p class='klein grijs' style='margin-top:12px'>Beveiligde betaling via Mollie. Geen courtage, geen jaarcontract — je zit nooit langer vast dan het lopende kwartaal.</p>" +
          "</div>" +
        "</div>";
      window.scrollTo({ top: $("#aanmelden").offsetTop - 40, behavior: "smooth" });

      $("#project-terug").addEventListener("click", function () { window.location.reload(); });
      $("#project-betaal").addEventListener("click", function () {
        var wachtwoord = "";
        if (!alIngelogd) {
          var wwVeld = $("#pa-wachtwoord");
          wachtwoord = wwVeld.value;
          if (!wachtwoord || wachtwoord.length < 8) { zetFout(wwVeld, "Kies een wachtwoord van minstens 8 tekens."); return; }
        }
        var paneel = $("#project-betaal-paneel");
        if (betaalModus() === "simulatie") {
          /* Prototype op localhost: doorloop nabootsen */
          mollieCheckout(paneel, {
            bedrag: pk.incl,
            periode: "per kwartaal (3 maanden) — " + pk.excl + " + 21% btw",
            omschrijving: "Panvia " + pk.label,
            knopLabel: "Betaal " + pk.incl,
            klein: "Per kwartaal opzegbaar. Volgende kwartalen automatisch.",
            onTerug: function () { window.location.reload(); },
            onBetaald: function () {
              blok.innerHTML =
                "<div class='bevestiging'><div class='vink' aria-hidden='true'>✓</div>" +
                "<h2>Betaald. Je project staat klaar.</h2>" +
                "<p class='grijs'>" + pk.label + " is actief voor " + escapeHTML(gegevens.project) + ". We controleren het eigendom en bouwen je projectpagina — je hoort binnen twee werkdagen van ons.</p></div>";
            }
          });
        } else {
          mollieStart(paneel, {
            soort: pakketSoort,
            naam: gegevens.naam,
            email: gegevens.email,
            telefoon: gegevens.telefoon,
            wachtwoord: wachtwoord || undefined,
            gegevens: gegevens
          });
        }
      });
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

    /* Mijn Panvia is de inbox van de verkoper: alleen open met een actieve
       verkopersrol. De rol komt van de server, niet uit deze browser. */
    if (!Auth.isVerkoper()) {
      var paneel = document.createElement("div");
      paneel.className = "formulier-paneel";
      paneel.style.maxWidth = "640px";
      paneel.innerHTML = Auth.ingelogd()
        ? "<h2>Hier staat straks jouw advertentie</h2>" +
          "<p class='grijs'>Je bent ingelogd als " + escapeHTML(Auth.voornaam()) + ", maar er staat nog geen plaatsing op je account. " +
          "Zodra je je pand plaatst, vind je hier je advertentie, je gesprekken en je biedingen.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='/plaatsen'>Plaats je pand</a></p>"
        : "<h2>Log in om Mijn Panvia te zien</h2>" +
          "<p class='grijs'>Je advertentie, gesprekken en biedingen staan achter je account. Log in met je e-mailadres en wachtwoord.</p>" +
          "<p style='margin-top:24px'><a class='btn btn-primair' href='/inloggen?terug=eigenaar'>Inloggen</a> " +
          "<a class='btn btn-tertiair' href='/plaatsen'>Nog geen pand geplaatst?</a></p>";
      lijst.parentNode.insertBefore(paneel, lijst);
      /* De demo-inbox eronder blijft weg zolang er geen verkopersrol is. */
      $all(".eigenaar-pand, #inbox-lijst, #inbox-gesprek, main .nb-blok").forEach(function (el) { el.hidden = true; });
      var kop = $("main h2");
      if (kop && kop !== $("h2", paneel)) kop.hidden = true;
      var kopUitleg = kop && kop.nextElementSibling;
      if (kopUitleg && kopUitleg.tagName === "P") kopUitleg.hidden = true;
      return;
    }

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

    /* Zillow-patroon (v3): op desktop staan lijst en gesprek naast elkaar —
       de lijst links, het actieve gesprek rechts. Op mobiel wissel je. */
    var inboxDesktop = window.matchMedia("(min-width: 900px)").matches;
    var actieveKey = null;

    function renderLijst() {
      var chats = alleChats();
      lijst.hidden = false;
      if (!inboxDesktop || !chats.length) $("#inbox-gesprek").hidden = true;
      if (!chats.length) {
        lijst.innerHTML = "<div class='leeg-melding'><h2>Nog geen gesprekken</h2><p>Zodra een koper je schrijft of biedt, staat het gesprek hier. Je krijgt ook een seintje per mail.</p></div>";
        return;
      }
      lijst.innerHTML = chats.map(function (c) {
        var laatste = laatsteBericht(c.chat);
        var preview = laatste.type === "bod" ? "Bod: " + fmtPrijs(laatste.bedrag) : laatste.tekst;
        var bod = hoogsteBod(c.chat);
        return "<button type='button' class='inbox-rij" + (c.key === actieveKey ? " actief" : "") + "' data-key='" + c.key + "'>" +
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
      actieveKey = key;
      var paneel = $("#inbox-gesprek");
      if (inboxDesktop) renderLijst(); /* lijst blijft staan, met actieve rij */
      else lijst.hidden = true;
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
      $("#inbox-terug").addEventListener("click", function () { actieveKey = null; renderLijst(); renderStats(); });
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
    /* Desktop: open meteen het bovenste gesprek — de inbox is nooit leeg in beeld */
    if (inboxDesktop) {
      var eerste = alleChats();
      if (eerste.length) openGesprek(eerste[0].key);
    }
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

    /* --- Stap 1: account + eigenaarsverklaring (spelregels) ---------------
       Ben je al ingelogd — als koper of omdat je eerder plaatste — dan slaan
       we naam, e-mail en wachtwoord over. Dat scheelt drie velden. */
    var alIngelogd = Auth.ingelogd();
    (function vulAccountIn() {
      var ingelogdBlok = $("#plaatsen-ingelogd");
      var accountVelden = $("#plaatsen-accountvelden");
      if (!ingelogdBlok || !accountVelden) return;

      if (alIngelogd) {
        accountVelden.hidden = true;
        ingelogdBlok.hidden = false;
        ingelogdBlok.innerHTML =
          "<p class='label'>Je bent ingelogd</p>" +
          "<p class='ingelogd-naam'>" + escapeHTML(Auth.naam() || Auth.email()) + " <span class='grijs tnum'>· " + escapeHTML(Auth.email()) + "</span></p>" +
          "<p class='klein grijs'>De plaatsing komt op dit account. Niet jij? <button type='button' class='knop-als-link' id='plaatsen-uitlog'>Log uit</button>.</p>";
        $("#plaatsen-uitlog").addEventListener("click", function () {
          Auth.uitloggen().then(function () { window.location.reload(); });
        });
      }
    })();

    /* De zakelijke velden staan er alleen voor wie vanuit een bedrijf
       verkoopt; een particulier hoeft er niet langs. */
    $all("input[name='vk-hoedanigheid']").forEach(function (radio) {
      radio.addEventListener("change", function () {
        var gekozen = $("input[name='vk-hoedanigheid']:checked");
        var blokZakelijk = $("#vk-zakelijk");
        if (blokZakelijk) blokZakelijk.hidden = !gekozen || gekozen.value !== "zakelijk";
      });
    });

    function valideerAccount() {
      var verklaring = $("#veld-verklaring");
      var telefoon = $("#veld-vk-telefoon");
      var ok = true;
      var naamW = Auth.naam(), emailW = Auth.email(), wachtwoordW = "";

      /* Telefoon is verplicht: het is tegelijk je tweede inlognaam. Wie al
         ingelogd is en een nummer op het account heeft, hoeft niets. */
      var telefoonW = normaliseerTelefoon(telefoon.value) || "";
      if (!telefoonW && alIngelogd) telefoonW = Auth.telefoon();
      if (!telefoonW) {
        zetFout(telefoon, "Vul een telefoonnummer in, bijvoorbeeld 06 12345678. Hiermee kun je ook inloggen.");
        ok = false;
      }

      if (!alIngelogd) {
        var naam = $("#veld-vk-naam");
        var email = $("#veld-vk-email");
        var wachtwoord = $("#veld-vk-wachtwoord");
        if (!naam.value.trim()) { zetFout(naam, "Vul je naam in. Die komt niet op de advertentie."); ok = false; }
        if (!geldigEmail(email.value)) { zetFout(email, "Vul een e-mailadres in, bijvoorbeeld naam@voorbeeld.nl"); ok = false; }
        if (wachtwoord.value.length < 8) { zetFout(wachtwoord, "Kies een wachtwoord van minstens 8 tekens — daarmee kom je later bij je advertentie."); ok = false; }
        naamW = naam.value.trim();
        emailW = email.value.trim();
        wachtwoordW = wachtwoord.value;
      }
      if (!verklaring.checked) { zetFout(verklaring, "Zonder deze verklaring kun je niet plaatsen — Panvia is uitsluitend voor eigenaren."); ok = false; }

      /* Vanuit een bedrijf: dan moet de factuur op de organisatie staan, en
         daar horen KvK en btw-nummer verplicht bij. */
      var zakelijk = ($("input[name='vk-hoedanigheid']:checked") || {}).value === "zakelijk";
      var bedrijf = null;
      if (zakelijk) {
        var bedrijfsnaam = $("#veld-vk-bedrijf");
        var kvk = $("#veld-vk-kvk");
        var btw = $("#veld-vk-btw");
        if (!bedrijfsnaam.value.trim()) { zetFout(bedrijfsnaam, "Vul de naam van het bedrijf in."); ok = false; }
        if (!geldigKvk(kvk.value)) { zetFout(kvk, "Vul je KvK-nummer in — acht cijfers."); ok = false; }
        if (!geldigBtwNummer(btw.value)) { zetFout(btw, "Vul je btw-identificatienummer in, bijvoorbeeld NL123456789B01."); ok = false; }
        bedrijf = {
          zakelijk: true,
          bedrijfsnaam: bedrijfsnaam.value.trim(),
          kvk: kvk.value.replace(/[^0-9]/g, ""),
          btw: btw.value.trim().toUpperCase().replace(/\s/g, ""),
          factuurEmail: $("#veld-vk-factuur-email").value.trim()
        };
      }

      if (ok) {
        gegevens.verkoper = {
          naam: naamW,
          email: emailW,
          telefoon: telefoonW,
          wachtwoord: wachtwoordW
        };
        gegevens.bedrijf = bedrijf;
      }
      return ok;
    }

    /* --- Stap 2, deel 1: adres --- */
    function valideerAdres() {
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

    /* --- Stap 2, deel 2: type & kenmerken --- */
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

    function valideerKenmerken() {
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

    /* --- Stap 2, deel 4: foto's (echte preview via createObjectURL) --- */
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

    /* --- Stap 2, deel 3: prijs --- */
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
    function valideerPrijs() {
      var n = Number(String(prijsInput.value).replace(/[^\d]/g, ""));
      if (!n || n < 10000) {
        zetFout(prijsInput, "Vul je vraagprijs in euro’s in, bijvoorbeeld 450000");
        return false;
      }
      gegevens.vraagprijs = n;
      gegevens.kk = $("#veld-kk").value;
      return true;
    }

    /* Stap 2 in zijn geheel. Alle onderdelen worden nagelopen — niet stoppen
       bij de eerste fout, zodat je in één keer ziet wat er nog mist. */
    function valideerPand() {
      var a = valideerAdres();
      var b = valideerKenmerken();
      var c = valideerPrijs();
      if (a && b && c) return true;
      /* Naar het eerste veld met een melding, anders zoek je je scheel. */
      var eerste = $(".stap[data-stap='2'] .veld.heeft-fout input, .stap[data-stap='2'] .veld.heeft-fout select");
      if (eerste) eerste.focus();
      return false;
    }

    /* --- Stap 3: overzicht & betalen --- */
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
        ["Plaatsingsfee", fmtPrijs(PANVIA_FEE) + " excl. btw · afrekening € 1.082,95 incl. 21% btw, voor 6 maanden"]
      ];
      $("#overzicht-body").innerHTML = rijen.map(function (r) {
        return "<tr><th scope='row'>" + r[0] + "</th><td class='tnum'>" + r[1] + "</td></tr>";
      }).join("");
    }

    /* --- Navigatie tussen stappen: 1 jij → 2 je pand → 3 betalen --- */
    var validators = { 1: valideerAccount, 2: valideerPand };

    $all(".volgende").forEach(function (knop) {
      knop.addEventListener("click", function () {
        var validator = validators[huidige] || function () { return true; };
        if (!validator()) return;
        if (huidige === 2) vulOverzicht();
        if (huidige < totaal) toonStap(huidige + 1);
      });
    });
    $all(".terug").forEach(function (knop) {
      knop.addEventListener("click", function () {
        if (huidige > 1) toonStap(huidige - 1);
      });
    });

    /* Betalen — in de normale stand loopt dit via Mollie (gesimuleerd, zie
       mollieVerwerk); de plaatsing/het verkoperaccount wordt PAS afgerond
       nadat de betaling is geslaagd. In lanceringsmodus (wachtlijst) betaalt
       de verkoper nog niets. */
    var betaalKnop = $("#betaal-knop");
    if (betaalKnop) {
      betaalKnop.addEventListener("click", function () {
        var paneel = $("#formulier-paneel");
        var indicator = $("#stap-indicator");
        var lancering = cfg("lanceringsModus", false);

        function rondAf() {
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

          /* Simulatie (localhost): doe lokaal wat de webhook op de server
             doet — de verkopersrol pas activeren ná betaling. In de
             wachtlijst-stand is er nog niet betaald, dus dan niet. */
          if (!lancering) {
            var vk = gegevens.verkoper || {};
            lokaalRolActiveren("verkoper", vk.naam, vk.email);
            initAccountNav();
          }

          indicator.hidden = true;
          renderBevestiging();
        }

        function renderBevestiging() {
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
              "<p style='margin-top:24px'><a class='btn btn-secundair' href='/aanbod'>Bekijk het aanbod</a></p>" +
            "</div>"
          : "<div class='bevestiging'>" +
              "<div class='vink' aria-hidden='true'>✓</div>" +
              "<h2>Betaald. Je pand staat klaar.</h2>" +
              "<p class='grijs'>Je betaalde € 1.082,95 (€ 895 + 21% btw) voor 6 maanden. Geen courtage erachteraan — " +
              "ook niet als je pand verkoopt. " + (gegevens.adres || "Je pand") + " gaat na een korte controle online " +
              "en staat 6 maanden op Panvia. Kopers nemen rechtstreeks contact met je op.</p>" +
              "<p class='grijs'>Wat wij nu doen: je advertentie controleren en publiceren. " +
              "Wat jij doet: praten met kopers en verkopen. Zo is het verdeeld.</p>" +
              "<p style='margin-top:24px'><a class='btn btn-secundair' href='/aanbod'>Bekijk het aanbod</a></p>" +
            "</div>";
          var kop = $("h2", paneel);
          if (kop) { kop.setAttribute("tabindex", "-1"); kop.focus(); }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }

        if (lancering) {
          /* Wachtlijst: geen betaling, meteen aanmelden. */
          rondAf();
        } else if (betaalModus() === "mollie") {
          /* Echt betalen: pandgegevens gaan mee naar de database (zonder
             foto-bestanden); de bevestiging volgt op betaald.html nadat de
             webhook de betaling heeft bevestigd. */
          indicator.hidden = true;
          mollieStart(paneel, {
            soort: "verkoper",
            naam: gegevens.verkoper ? gegevens.verkoper.naam : "",
            email: gegevens.verkoper ? gegevens.verkoper.email : "",
            telefoon: gegevens.verkoper ? gegevens.verkoper.telefoon : "",
            wachtwoord: gegevens.verkoper ? gegevens.verkoper.wachtwoord : "",
            /* De zakelijke gegevens gaan mee in dezelfde blob; de webhook
               tilt ze daarna op het account, zodat de factuur klopt. */
            gegevens: Object.assign({}, gegevens.bedrijf || {}, {
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
            })
          });
        } else {
          /* Simulatie (localhost): het prototype-betaalscherm, daarna afronden. */
          indicator.hidden = true;
          mollieCheckout(paneel, {
            bedrag: "€ 1.082,95",
            periode: "6 maanden online — € 895 + 21% btw",
            omschrijving: "Panvia plaatsing",
            knopLabel: "Betaal € 1.082,95",
            klein: "Eenmalig — geen courtage, geen succesfee.",
            onTerug: function () {
              indicator.hidden = false;
              window.location.reload();
            },
            onBetaald: rondAf
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
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
      "<a href='/plaatsen'>Meld je eigen pand aan</a> — dat is wel echt.</div>";
    var header = $(".site-header");
    if (header && header.parentNode) header.parentNode.insertBefore(balk, header.nextSibling);
  }

  /* Lanceringsmodus: betaalstap wordt aanmeldstap. Zo verzamel je in de
     eerste weken aanbod zonder dat mensen meteen moeten afrekenen. */
  function initLancering() {
    if (!cfg("lanceringsModus", false)) return;
    var knop = $("#betaal-knop");
    if (knop) knop.textContent = "Meld mijn pand aan";
    var betaalStap = $(".stap[data-stap='3']");
    if (betaalStap) {
      var kop = $("h2", betaalStap);
      if (kop) kop.textContent = "Controleer en meld aan";
      var intro = $(".stap-intro", betaalStap);
      if (intro) intro.textContent = "Je betaalt nu niets. We controleren je gegevens en nemen contact op vóór je pand online gaat.";
      var slot = $(".klein.grijs", betaalStap);
      if (slot) {
        slot.innerHTML = "<strong>Je betaalt vandaag niets.</strong> Plaatsen kost straks <span class='tnum'>" +
          fmtPrijs(PANVIA_FEE) + "</span> excl. btw voor 6 maanden (afrekening € 1.082,95 incl. 21% btw) — pas nadat je akkoord geeft. Geen courtage, geen succesfee.";
      }
    }
    /* Indicatorlabel meeveranderen */
    var laatsteStap = $("#stap-indicator li:last-child");
    if (laatsteStap) {
      laatsteStap.lastChild.textContent = "Aanmelden";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var pagina = document.body.getAttribute("data-page");

    /* Eerst alles wat niets met inloggen te maken heeft. Zo staat de pagina
       er meteen, ook als de sessiecontrole even duurt. */
    initHeroIntro();
    initHeaderScroll();
    initNav();
    initSchermbescherming();
    if (pagina === "home") initHome();
    if (pagina === "aanbod") initAanbod();
    if (pagina === "buitenland") initBuitenland();
    if (pagina === "zakelijk") initZakelijk();
    if (pagina === "project") initProject();
    if (pagina === "projecten") initProjecten();
    if (pagina === "gidsen") initGidsen();
    if (pagina === "gids") initGids();
    if (pagina === "contact") initContact();
    initDemoMelding();
    initCountdown();
    initTelAnimatie();
    initReveal();

    /* Daarna alles wat van je account afhangt: wie ben je, en wat gaat er
       daardoor open? Auth.laad() vraagt dat één keer aan de server. */
    Auth.laad().then(function () {
      initAccountNav();
      initBerichtenPaneel();
      if (pagina === "inloggen") initInloggen();
      if (pagina === "wachtwoord-vergeten") initWachtwoordVergeten();
      if (pagina === "wachtwoord-resetten") initWachtwoordResetten();
      if (pagina === "betaald") initBetaald();
      if (pagina === "kopers") initKopers();
      if (pagina === "pand") initPand();
      if (pagina === "plaatsen") { initPlaatsen(); initLancering(); }
      if (pagina === "eigenaar") initEigenaar();
    });
  });
})();
