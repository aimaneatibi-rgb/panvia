/* ==========================================================================
   PANVIA — v3-data.js (huisstijl "Open Huis")
   Geo-posities voor de kaartweergave + de gidsen. Laden ná data.js.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Geo-posities per plaats — stadsniveau is genoeg voor het prototype.
   Per pand komt er in de kaartcode een kleine vaste verschuiving bij,
   zodat markers in dezelfde stad elkaar niet overlappen.
   -------------------------------------------------------------------------- */
var PANVIA_GEO = {
  "Amersfoort":              [52.156, 5.387],
  "Amsterdam":               [52.372, 4.894],
  "Apeldoorn":               [52.211, 5.970],
  "Arnhem":                  [51.985, 5.899],
  "Chamonix":                [45.924, 6.869],
  "Den Haag":                [52.078, 4.312],
  "Deventer":                [52.255, 6.164],
  "Ede":                     [52.045, 5.664],
  "Eindhoven":               [51.441, 5.470],
  "Groningen":               [53.219, 6.567],
  "Haarlem":                 [52.387, 4.646],
  "Jávea, Costa Blanca":     [38.789, 0.166],
  "Loulé, Algarve":          [37.138, -8.023],
  "Marbella, Costa del Sol": [36.510, -4.886],
  "Ostuni, Puglia":          [40.729, 17.578],
  "Renesse (Zeeland)":       [51.734, 3.775],
  "Rotterdam":               [51.923, 4.479],
  "Tilburg":                 [51.560, 5.083],
  "Utrecht":                 [52.091, 5.121],
  "Veldhoven":               [51.418, 5.404],
  "Zell am See":             [47.323, 12.795],
  "Zutphen":                 [52.140, 6.196],
  "Zwolle":                  [52.513, 6.093]
};

/* --------------------------------------------------------------------------
   Gidsen — kennis, geen advies. Toon volgt het brandbook: tutoyeren,
   bedragen noemen, eerlijk over wat Panvia niet doet.
   -------------------------------------------------------------------------- */
var PANVIA_GIDSEN = [
  {
    id: "verkopen",
    slug: "zelf-je-huis-verkopen",
    titel: "Zelf je huis verkopen, van foto tot notaris",
    kort: "De complete route in zeven stappen — wat je zelf doet, wat je laat doen, en waar de valkuilen zitten.",
    leestijd: "8 min",
    foto: "/img/gids-verkopen.webp",
    secties: [
      { kop: "1 · Bepaal je vraagprijs met echte cijfers",
        tekst: "Kijk niet naar wat de buurman vraagt maar naar wat er vergelijkbaars <em>verkocht</em> is. Koopsommen van verkochte woningen vraag je per adres op bij het Kadaster, voor een paar euro. Pak drie tot vijf echt vergelijkbare verkopen van het afgelopen jaar en reken terug naar prijs per vierkante meter. Een te hoge vraagprijs kost je juist geld: de eerste twee weken zijn je etalage, daarna zakt de aandacht hard." },
      { kop: "2 · Maak je huis fotoklaar",
        tekst: "Opruimen is gratis en levert meer op dan een nieuwe keuken. Fotografeer overdag met de gordijnen open, sta in de hoek van de kamer voor breedte, en toon elke ruimte een keer. De eerste foto bepaalt of iemand doorklikt — dat is bijna altijd de voorgevel of de woonkamer met licht." },
      { kop: "3 · Schrijf een eerlijke tekst",
        tekst: "Jij kent dit huis beter dan welke makelaar ook. Schrijf wat een koper wil weten: wat er vernieuwd is (met jaartal), de maandlasten, hoe de buurt is om acht uur in de ochtend. Noem ook wat minder is — wie een gebrek zelf meldt, wint vertrouwen en voorkomt gedoe bij de overdracht. Je meldplicht als verkoper bestaat echt; verzwijgen komt terug via de notaris of de rechter." },
      { kop: "4 · Plaats je pand",
        tekst: "Op Panvia betaal je <strong>€ 895</strong> voor 24 weken, exclusief btw. Je advertentie staat binnen een dag online. Kopers die je berichten of een bod doen hebben een kopersabonnement — dus wie schrijft, is serieus." },
      { kop: "5 · Bezichtigen doe je zelf — en dat is een voordeel",
        tekst: "Niemand beantwoordt vragen over dit huis beter dan jij. Plan bezichtigingen achter elkaar (dat scheelt avonden en het geeft vaart), loop een vaste route, en laat mensen even alleen in een ruimte — dat is het moment waarop ze zich er iets bij voorstellen." },
      { kop: "6 · Onderhandelen zonder toneelstuk",
        tekst: "Bepaal vooraf je ondergrens en je ideale opleverdatum, dan onderhandel je rustig. Reageer op elk bod binnen een dag, ook als het laag is. Voorbehoud van financiering is normaal — vier tot zes weken. Een bod zonder voorbehouden is meer waard dan een iets hoger bod met voorbehouden." },
      { kop: "7 · De notaris maakt het rond",
        tekst: "Zijn jullie het eens, dan stelt een notaris de koopovereenkomst en de leveringsakte op. De koper kiest doorgaans de notaris, maar het mag anders. Na het tekenen heeft de koper drie dagen wettelijke bedenktijd. Panvia wijst je de weg — de akte zelf is aan de notaris, zo hoort het." }
    ],
    nietdoen: "Panvia taxeert niet, onderhandelt niet en bemiddelt niet. Deze gids is informatie, geen advies — bij twijfel over jouw situatie is een uur met een bouwkundig keurder of notaris zijn geld dubbel waard.",
    cta: { label: "Plaats je pand voor € 895", href: "/plaatsen" }
  },
  {
    id: "kopen",
    slug: "huis-kopen-zonder-makelaar",
    titel: "Kopen zonder makelaar — rechtstreeks van de eigenaar",
    kort: "Van zoeken tot sleutel: hoe je zelf koopt, waar je op let bij een bezichtiging en wat een bod sterk maakt.",
    leestijd: "7 min",
    foto: "/img/gids-kopen.webp",
    secties: [
      { kop: "1 · Weet wat je kunt besteden voor je verliefd wordt",
        tekst: "Laat je maximale hypotheek doorrekenen door je bank of een onafhankelijk adviseur voordat je gaat kijken. Reken naast de koopsom op zo'n 4 tot 6% kosten koper: overdrachtsbelasting (2% voor een woning die je zelf gaat bewonen), notaris, taxatie voor de hypotheek en eventueel een keuring." },
      { kop: "2 · Zoeken op Panvia is gratis",
        tekst: "Elk pand hier staat er omdat de eigenaar het zelf plaatste. Rondkijken kost niets. Wil je berichten sturen, bieden of de volledige verkopersinformatie zien, dan neem je een kopersabonnement van <strong>€ 12,95</strong> per maand — maandelijks opzegbaar, dus je betaalt alleen in de maanden dat je echt zoekt." },
      { kop: "3 · De bezichtiging: praat met de bron",
        tekst: "Je krijgt de eigenaar zelf aan tafel — gebruik dat. Vraag naar de leeftijd van dak, ketel en kozijnen, de maandlasten, de buren, en waarom ze verkopen. Kijk zelf naar vocht (plinten, kelder, achter kasten), scheuren boven deuren en de meterkast. Twijfel je over de staat? Een bouwkundige keuring kost een paar honderd euro en voorkomt tienduizenden aan verrassingen." },
      { kop: "4 · Een sterk bod is meer dan een bedrag",
        tekst: "Een bod bestaat uit prijs, voorbehouden en datum. Zonder financieringsvoorbehoud bieden is riskant — doe het alleen als je zeker weet dat je rondkomt. Motiveer je bod kort met je vergelijkingsmateriaal; op Panvia komt het rechtstreeks bij de eigenaar aan, zonder ruis." },
      { kop: "5 · Van akkoord naar sleutel",
        tekst: "De notaris legt de afspraken vast in de koopovereenkomst. Na het tekenen heb jij drie dagen bedenktijd. Daarna regel je de hypotheek definitief, laat je taxeren, en op de afgesproken datum passeer je de leveringsakte. Loop vlak voor de overdracht nog een keer door het huis: staat alles er zoals afgesproken?" }
    ],
    nietdoen: "Panvia is geen hypotheek- of financieringsbemiddelaar en geeft geen koopadvies. Financiering regel je met je bank of een onafhankelijk adviseur.",
    cta: { label: "Bekijk het aanbod", href: "/aanbod" }
  },
  {
    id: "bieden",
    slug: "bieden-en-onderhandelen",
    titel: "Bieden, onderhandelen en de notaris",
    kort: "Hoe een bod werkt, welke voorbehouden normaal zijn en wat er bij de notaris gebeurt — voor koper en verkoper.",
    leestijd: "6 min",
    foto: "/img/gids-bieden.webp",
    secties: [
      { kop: "Het bod: drie knoppen, niet een",
        tekst: "Prijs, voorbehouden en opleverdatum — aan alle drie kun je draaien. Een verkoper met haast geeft korting voor een snelle overdracht; een koper zonder financieringsvoorbehoud mag best iets lager bieden. Wie alleen naar de prijs kijkt, onderhandelt met een hand op de rug." },
      { kop: "Voorbehouden die normaal zijn",
        tekst: "<strong>Financiering</strong> (vier tot zes weken) en <strong>bouwkundige keuring</strong> zijn gangbaar en geen teken van zwakte. Verkopers: schrik er niet van, reken er gewoon mee. Kopers: onder voorbehoud van financiering hoort standaard in je bod, tenzij je heel bewust anders kiest." },
      { kop: "Onderhandelen in de praktijk",
        tekst: "Reageer binnen een dag, ook op een bod dat je laag vindt — stilte kost momentum. Doe een tegenbod met een reden (de keuken is van 2016, daarom zit ik op dit bedrag), niet alleen een getal. Twee of drie rondes is normaal; wordt het meer, dan zit er meestal iets anders dwars dan de prijs." },
      { kop: "Op Panvia: rechtstreeks en gezien",
        tekst: "Biedingen lopen via het platform rechtstreeks tussen koper en eigenaar. Niet bindend — de koop regelen jullie bij de notaris — maar wel zichtbaar voor degene die verkoopt, inclusief je toelichting." },
      { kop: "Bij de notaris",
        tekst: "De notaris stelt de koopovereenkomst op, controleert eigendom en hypotheken, en verzorgt de leveringsakte en de geldstromen. De koper heeft na het tekenen drie dagen wettelijke bedenktijd. De kosten voor de leveringsakte betaalt gebruikelijk de koper (kosten koper). Panvia wijst beide kanten de weg naar een notaris — daar stopt onze rol, bewust." }
    ],
    nietdoen: "Panvia onderhandelt niet mee en is geen partij bij de koop. Wat jullie afspreken, leggen jullie samen bij de notaris vast.",
    cta: { label: "Zo werkt bieden op een pand", href: "/kopers" }
  },
  {
    id: "zakelijk",
    slug: "zakelijk-vastgoed-verkopen",
    titel: "Zakelijk vastgoed en projecten verkopen",
    kort: "Voor eigenaren van units, hallen en portefeuilles — en voor ontwikkelaars met tien of meer eenheden.",
    leestijd: "5 min",
    foto: "/img/gids-zakelijk.webp",
    secties: [
      { kop: "Jij kent je koper vaak al",
        tekst: "De meeste zakelijke transacties beginnen in het eigen netwerk: de huurder die wil kopen, de belegger uit een eerdere deal, de buurman die wil uitbreiden. Een bedrijfsmakelaar inhuren om zichtbaar te zijn terwijl je de koper al kent — dat is precies de kostenpost die je hier overslaat. Een vaste prijs: <strong>€ 895</strong> per pand, 24 weken." },
      { kop: "Zet de cijfers voorop",
        tekst: "Zakelijke kopers rekenen: huurstroom, resterende looptijd, BAR, servicekosten, energielabel (let op de label-C-plicht voor kantoren). Zet die cijfers gewoon in je advertentie. Een zakelijke koper die moet mailen voor een huuroverzicht, is al half afgehaakt." },
      { kop: "Tien eenheden of meer? Dat is een project",
        tekst: "Voor parken, complexen en ontwikkelingen betaal je per project, niet per woning: <strong>€ 4.150</strong> (10–25 eenheden), <strong>€ 6.950</strong> (26–75) of <strong>€ 10.450</strong> (76+) per kwartaal, exclusief btw — per kwartaal opzegbaar, dus je betaalt zolang de verkoop loopt. Je krijgt een eigen projectpagina met je eigen merk en renders, en belangstelling tonen is voor kopers gratis — een betaalmuur voor je wachtlijst zou je eigen funnel slopen." },
      { kop: "Wat ook hier geldt",
        tekst: "Alleen eigenaren (of beheerders met schriftelijk verkoopmandaat) verkopen op Panvia. Makelaars en dienstverleners mogen er niet verkopen of promoten — dat houdt het aanbod echt en rechtstreeks. Je eigen project promoten mag vanzelfsprekend wel; diensten aanbieden aan andere gebruikers niet." }
    ],
    nietdoen: "Panvia taxeert niet en bemiddelt niet — ook zakelijk niet. Voor fiscale of juridische structuren (bv, btw-optie, huurgarantie) zit je bij je eigen adviseur beter.",
    cta: { label: "Bekijk Panvia Zakelijk", href: "/zakelijk" }
  }
];
