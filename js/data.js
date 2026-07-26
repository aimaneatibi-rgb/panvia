/* ==========================================================================
   PANVIA — data.js
   Verzonnen demonstratie-aanbod. Alle adressen, prijzen en gegevens zijn
   fictief en dienen alleen om het prototype te laten voelen als het echte
   platform. Prijsnotatie volgt het brandbook: € 450.000.
   ========================================================================== */

var PANVIA_PANDEN = [
  /* ------------------------------ Woningen ------------------------------ */
  {
    id: "w1",
    type: "woning",
    subtype: "Appartement",
    adres: "Jacob van Lennepstraat 46-II",
    plaats: "Amsterdam",
    prijs: 525000,
    oppervlakte: 78,
    perceel: null,
    bouwjaar: 1906,
    energielabel: "C",
    kamers: 3,
    status: "te-koop",
    views: 4218,
    kadastraal: "Amsterdam, sectie Q, nummer 8841 A-2",
    omschrijving:
      "Driekamerappartement op de tweede verdieping in Amsterdam-West. " +
      "78 m² woonoppervlak, balkon op het zuiden, houten vloer door de hele woning. " +
      "In 2021 zijn het dak en de kozijnen vervangen. De VvE is actief en gezond " +
      "(reservefonds € 48.000, maandelijkse bijdrage € 162). " +
      "De eigenaar woont hier zelf sinds 2014 en vertelt je precies wat er goed is en wat niet.",
    extra: { "Balkon": "Ja, zuid (6 m²)", "VvE-bijdrage": "€ 162 per maand", "Verwarming": "Cv-ketel (2021)" }
  },
  {
    id: "w2",
    type: "woning",
    subtype: "Tussenwoning",
    adres: "Meidoornlaan 14",
    plaats: "Utrecht",
    prijs: 450000,
    oppervlakte: 124,
    perceel: 146,
    bouwjaar: 1988,
    energielabel: "B",
    kamers: 5,
    status: "te-koop",
    views: 3412,
    kadastraal: "Utrecht, sectie M, nummer 4172",
    omschrijving:
      "Tussenwoning met vijf kamers en een tuin van 11 meter diep op het zuidwesten. " +
      "In 2019 voorzien van dakisolatie en 8 zonnepanelen. Keuken uit 2016, badkamer uit 2012. " +
      "De zolder is een volwaardige verdieping met dakkapel. " +
      "Loopafstand tot basisschool, winkelcentrum en bushalte. " +
      "De eigenaren verkopen zelf omdat ze de koper graag zelf spreken — vraag ze alles.",
    extra: { "Tuin": "Zuidwest, 11 m diep", "Zonnepanelen": "8 (2019)", "Parkeren": "Openbaar, vergunningvrij" }
  },
  {
    id: "w3",
    type: "woning",
    subtype: "Bovenwoning",
    adres: "Statensingel 88a",
    plaats: "Rotterdam",
    prijs: 385000,
    oppervlakte: 96,
    perceel: null,
    bouwjaar: 1931,
    energielabel: "D",
    kamers: 4,
    status: "onder-bod",
    views: 2894,
    kadastraal: "Rotterdam, sectie AB, nummer 2210 A-1",
    omschrijving:
      "Jaren-dertig bovenwoning aan de Statensingel met originele details: " +
      "paneeldeuren, glas-in-lood en een erker aan de voorzijde. 96 m² over twee verdiepingen, " +
      "dakterras van 14 m² aan de achterzijde. Het energielabel is D — de eigenaar heeft een " +
      "isolatie-offerte liggen die hij met je deelt. Geen mooipraterij: de badkamer is gedateerd " +
      "en dat zie je terug in de prijs.",
    extra: { "Dakterras": "14 m², oost", "Monumentstatus": "Geen", "Bijzonderheid": "Isolatie-offerte beschikbaar" }
  },
  {
    id: "w4",
    type: "woning",
    subtype: "Herenhuis",
    adres: "Van Oldenbarneveltlaan 3",
    plaats: "Den Haag",
    prijs: 895000,
    oppervlakte: 182,
    perceel: 210,
    bouwjaar: 1912,
    energielabel: "C",
    kamers: 7,
    status: "te-koop",
    views: 5106,
    kadastraal: "'s-Gravenhage, sectie V, nummer 1187",
    omschrijving:
      "Herenhuis uit 1912 in het Statenkwartier, 182 m² over vier lagen. " +
      "Hoge plafonds (3,20 m op de bel-etage), en-suite deuren, stadstuin op het westen. " +
      "In 2018 volledig herbedraad en voorzien van HR++ glas aan de achterzijde; " +
      "de voorzijde heeft nog origineel enkel glas vanwege de karakteristieke roedeverdeling. " +
      "De eigenaar heeft alle bouwkundige rapporten klaarliggen.",
    extra: { "Plafondhoogte": "3,20 m (bel-etage)", "Tuin": "West, 48 m²", "Bouwkundig rapport": "Aanwezig (2025)" }
  },
  {
    id: "w5",
    type: "woning",
    subtype: "Hoekwoning",
    adres: "Ringbaan-Oost 210",
    plaats: "Tilburg",
    prijs: 365000,
    oppervlakte: 118,
    perceel: 178,
    bouwjaar: 1972,
    energielabel: "C",
    kamers: 5,
    status: "te-koop",
    views: 1847,
    kadastraal: "Tilburg, sectie N, nummer 6634",
    omschrijving:
      "Hoekwoning met garage en oprit voor twee auto's. 118 m² woonoppervlak, " +
      "perceel van 178 m². In 2020 zijn spouwmuur en vloer geïsoleerd (label C, was E). " +
      "De tuin ligt op het oosten en grenst aan een groenstrook — geen achterburen. " +
      "De eigenaar verhuist wegens werk en kan snel schakelen bij de overdracht.",
    extra: { "Garage": "Aangebouwd, 18 m²", "Oprit": "2 auto's", "Oplevering": "In overleg, kan snel" }
  },
  {
    id: "w6",
    type: "woning",
    subtype: "Appartement",
    adres: "Oosterhamriklaan 91",
    plaats: "Groningen",
    prijs: 289000,
    oppervlakte: 72,
    perceel: null,
    bouwjaar: 1938,
    energielabel: "D",
    kamers: 3,
    status: "te-koop",
    views: 1502,
    kadastraal: "Groningen, sectie K, nummer 3319 A-4",
    omschrijving:
      "Driekamerappartement op de eerste verdieping, 72 m², met balkon aan de rustige achterzijde. " +
      "Op tien minuten fietsen van de binnenstad en het UMCG. De keuken is van 2018, " +
      "de cv-ketel van 2022. De vloer mag je overnemen, dat scheelt gedoe. " +
      "De eigenaar heeft het aardbevingsdossier van het pand compleet en deelt het bij de bezichtiging.",
    extra: { "Balkon": "Ja, achterzijde", "VvE-bijdrage": "€ 118 per maand", "Dossier": "Compleet in te zien" }
  },
  {
    id: "w7",
    type: "woning",
    subtype: "Vrijstaande woning",
    adres: "Kerkweg 19",
    plaats: "Ede",
    prijs: 749000,
    oppervlakte: 165,
    perceel: 520,
    bouwjaar: 1996,
    energielabel: "A",
    kamers: 6,
    status: "te-koop",
    views: 2733,
    kadastraal: "Ede, sectie F, nummer 9012",
    omschrijving:
      "Vrijstaande woning op 520 m² eigen grond aan de rand van Ede, tegen het bos. " +
      "165 m² woonoppervlak, zes kamers, dubbele garage. In 2023 voorzien van een warmtepomp " +
      "en 16 zonnepanelen — label A, gasloos. De eigenaren hebben het huis zelf laten bouwen " +
      "in 1996 en kennen elke leiding. Precies het soort verhaal dat je van een eigenaar hoort " +
      "en van niemand anders.",
    extra: { "Verwarming": "Warmtepomp (2023), gasloos", "Garage": "Dubbel, vrijstaand", "Zonnepanelen": "16" }
  },
  {
    id: "w8",
    type: "woning",
    subtype: "Appartement",
    adres: "Leenderweg 134",
    plaats: "Eindhoven",
    prijs: 415000,
    oppervlakte: 88,
    perceel: null,
    bouwjaar: 2019,
    energielabel: "A+",
    kamers: 3,
    status: "te-koop",
    views: 2141,
    kadastraal: "Eindhoven, sectie D, nummer 7758 A-11",
    omschrijving:
      "Appartement uit 2019 op de derde verdieping met lift, 88 m² en een loggia van 9 m². " +
      "Gasloos, vloerverwarming, label A+. Eigen parkeerplaats in de afgesloten stalling " +
      "is bij de prijs inbegrepen. Alles is zeven jaar oud; er is simpelweg weinig aan te merken, " +
      "en wat er is (een kras in het aanrechtblad) hoor je eerlijk van de eigenaar.",
    extra: { "Parkeerplaats": "Inpandig, inbegrepen", "Loggia": "9 m², zuidwest", "VvE-bijdrage": "€ 194 per maand" }
  },

  /* --------------------------- Commercieel vastgoed --------------------------- */
  {
    id: "c1",
    type: "commercieel",
    subtype: "Bedrijfshal",
    adres: "Industrieweg 24",
    plaats: "Zwolle",
    prijs: 1150000,
    oppervlakte: 1850,
    perceel: 3200,
    bouwjaar: 2005,
    energielabel: "C",
    status: "te-koop",
    views: 964,
    kadastraal: "Zwolle, sectie H, nummer 2245",
    bar: null,
    huur: null,
    vrijeHoogte: "7,2 m",
    omschrijving:
      "Bedrijfshal van 1.850 m² op een perceel van 3.200 m² op bedrijventerrein Marslanden. " +
      "Vrije hoogte 7,2 meter, twee overheaddeuren, laadkuil, en 280 m² inpandige kantoorruimte " +
      "over twee lagen. Buitenterrein volledig verhard en afsluitbaar. " +
      "Leeg te aanvaarden — de huidige eigenaar-gebruiker verhuist naar een groter pand.",
    extra: { "Vrije hoogte": "7,2 m", "Overheaddeuren": "2, elektrisch", "Kantoor inpandig": "280 m²", "Buitenterrein": "Verhard, afsluitbaar" }
  },
  {
    id: "c2",
    type: "commercieel",
    subtype: "Kantoor",
    adres: "Stationsplein 9",
    plaats: "Amersfoort",
    prijs: 780000,
    oppervlakte: 640,
    perceel: null,
    bouwjaar: 1998,
    energielabel: "A",
    status: "te-koop",
    views: 712,
    kadastraal: "Amersfoort, sectie E, nummer 5410 A-3",
    bar: null,
    huur: null,
    omschrijving:
      "Kantoorruimte van 640 m² verdeeld over twee verdiepingen, op twee minuten lopen van " +
      "station Amersfoort Centraal. In 2022 verduurzaamd naar energielabel A (verplicht sinds 2023 — " +
      "dit pand is er klaar voor). Twaalf parkeerplaatsen in de onderliggende garage. " +
      "Turn-key: vloerbedekking, pantry's en scheidingswanden blijven achter.",
    extra: { "Parkeerplaatsen": "12, inpandig", "Indeling": "2 verdiepingen, flexibel", "Oplevering": "Turn-key" }
  },
  {
    id: "c3",
    type: "commercieel",
    subtype: "Winkelunit",
    adres: "Grote Houtstraat 88",
    plaats: "Haarlem",
    prijs: 595000,
    oppervlakte: 145,
    perceel: null,
    bouwjaar: 1925,
    energielabel: "C",
    status: "te-koop",
    views: 1088,
    kadastraal: "Haarlem, sectie C, nummer 1876",
    bar: null,
    huur: null,
    frontbreedte: "6,4 m",
    omschrijving:
      "Winkelunit van 145 m² in het kernwinkelgebied van Haarlem, frontbreedte 6,4 meter. " +
      "Begane grond 98 m² winkel, kelder 47 m² opslag. Vrij van huur en gebruik — " +
      "geschikt voor eigen gebruik of verhuur. De passantenstroom op dit deel van de " +
      "Grote Houtstraat is gemeten: gemiddeld 31.000 per week. Het rapport zit bij de stukken.",
    extra: { "Frontbreedte": "6,4 m", "Kelder": "47 m² opslag", "Passanten": "31.000 per week (telrapport aanwezig)" }
  },
  {
    id: "c4",
    type: "commercieel",
    subtype: "Belegging",
    adres: "Bergselaan 210 a-c",
    plaats: "Rotterdam",
    prijs: 850000,
    oppervlakte: 265,
    perceel: null,
    bouwjaar: 1927,
    energielabel: "C",
    status: "te-koop",
    views: 1341,
    kadastraal: "Rotterdam, sectie W, nummers 4471 A-1 t/m A-3",
    bar: 6.2,
    huur: 52800,
    omschrijving:
      "Beleggingsobject: drie zelfstandige appartementen (2× 85 m², 1× 95 m²) in verhuurde staat. " +
      "Huuropbrengst € 52.800 per jaar, BAR 6,2% op de vraagprijs. Alle drie de huurcontracten " +
      "zijn onbepaalde tijd, huurprijzen marktconform per juli 2025. Fundering in 2016 hersteld, " +
      "rapport aanwezig. De verkoper is zelf belegger en levert het volledige dossier digitaal aan.",
    extra: { "Huuropbrengst": "€ 52.800 per jaar", "BAR (v.o.n.)": "6,2 %", "Verhuurd": "3 van 3 units", "Fundering": "Hersteld 2016, rapport aanwezig" }
  },
  {
    id: "c5",
    type: "commercieel",
    subtype: "Bedrijfshal",
    adres: "De Run 8330",
    plaats: "Veldhoven",
    prijs: 1395000,
    oppervlakte: 2400,
    perceel: 4100,
    bouwjaar: 2011,
    energielabel: "B",
    status: "te-koop",
    views: 802,
    kadastraal: "Veldhoven, sectie B, nummer 3308",
    bar: null,
    huur: null,
    vrijeHoogte: "8,5 m",
    omschrijving:
      "Moderne bedrijfshal van 2.400 m² met 350 m² representatief kantoor aan de voorzijde, " +
      "op zichtlocatie langs De Run in Veldhoven. Vrije hoogte 8,5 meter, drie loading docks, " +
      "vloerbelasting 2.500 kg/m². Op vijf minuten van de A2/A67. " +
      "Leeg te aanvaarden per 1 oktober 2026.",
    extra: { "Vrije hoogte": "8,5 m", "Loading docks": "3", "Vloerbelasting": "2.500 kg/m²", "Aanvaarding": "1 oktober 2026" }
  },
  {
    id: "c6",
    type: "commercieel",
    subtype: "Belegging",
    adres: "Marktstraat 3",
    plaats: "Apeldoorn",
    prijs: 435000,
    oppervlakte: 180,
    perceel: null,
    bouwjaar: 1965,
    energielabel: "C",
    status: "te-koop",
    views: 655,
    kadastraal: "Apeldoorn, sectie G, nummer 5522",
    bar: 7.1,
    huur: 30900,
    omschrijving:
      "Verhuurde winkelunit van 180 m² in het centrum van Apeldoorn. " +
      "Huurder (opticien) zit er sinds 2017, lopend contract tot 2030 met verlengingsoptie. " +
      "Huuropbrengst € 30.900 per jaar, BAR 7,1% op de vraagprijs. Indexatie CPI, " +
      "huurder draagt klein onderhoud. Een overzichtelijke belegging met één huurder en één contract.",
    extra: { "Huuropbrengst": "€ 30.900 per jaar", "BAR (v.o.n.)": "7,1 %", "Contract": "Tot 2030 + optie", "Indexatie": "CPI, jaarlijks" }
  },
  {
    id: "c7",
    type: "commercieel",
    subtype: "Kantoor",
    adres: "Hanzeweg 12",
    plaats: "Deventer",
    prijs: 520000,
    oppervlakte: 410,
    perceel: null,
    bouwjaar: 1992,
    energielabel: "B",
    status: "te-koop",
    views: 489,
    kadastraal: "Deventer, sectie L, nummer 2960",
    bar: null,
    huur: null,
    omschrijving:
      "Zelfstandig kantoorgebouw van 410 m² op bedrijvenpark Hanzepark, met acht parkeerplaatsen " +
      "op eigen terrein. In 2021 voorzien van ledverlichting en een nieuwe luchtbehandelingskast; " +
      "energielabel B. Deels casco, deels afgebouwd — de eigenaar rekent je bij de bezichtiging " +
      "eerlijk voor wat afbouw kost.",
    extra: { "Parkeerplaatsen": "8, eigen terrein", "Installaties": "LBK 2021, led", "Staat": "Deels casco" }
  },
  {
    id: "c8",
    type: "commercieel",
    subtype: "Winkelunit",
    adres: "Brink 41",
    plaats: "Zutphen",
    prijs: 349000,
    oppervlakte: 112,
    perceel: null,
    bouwjaar: 1908,
    energielabel: "D",
    status: "te-koop",
    views: 573,
    kadastraal: "Zutphen, sectie A, nummer 1130",
    bar: null,
    huur: null,
    frontbreedte: "5,1 m",
    omschrijving:
      "Karakteristieke winkelunit van 112 m² aan de Brink in Zutphen, bouwjaar 1908. " +
      "Frontbreedte 5,1 meter, originele pui. Bovenwoning is apart gesplitst en niet in de koop begrepen. " +
      "Label D — verduurzaming is bij een monumentale pui beperkt mogelijk; de eigenaar vertelt je " +
      "precies wat de gemeente wel en niet toestaat.",
    extra: { "Frontbreedte": "5,1 m", "Pui": "Origineel (1908)", "Bovenwoning": "Niet in de koop" }
  },
  {
    id: "c9",
    type: "commercieel",
    subtype: "Belegging",
    adres: "Sleedoornstraat 2 t/m 12",
    plaats: "Arnhem",
    land: "Nederland",
    prijs: 1650000,
    oppervlakte: 642,
    perceel: 940,
    bouwjaar: 1978,
    energielabel: "C",
    status: "te-koop",
    views: 887,
    kadastraal: "Arnhem, sectie P, nummers 3301 t/m 3306",
    bar: 6.8,
    huur: 112200,
    omschrijving:
      "Zes eengezinswoningen uit de portefeuille van een woningcorporatie, in één koop. " +
      "Drie woningen zijn verhuurd (huuropbrengst € 112.200 per jaar over het geheel bij volledige verhuur), " +
      "drie zijn leeg opgeleverd. De corporatie verkoopt zelf, met volledig dossier: " +
      "conditiemetingen, huurcontracten en de complexgegevens liggen digitaal klaar. " +
      "Je praat rechtstreeks met de portefeuillemanager van de eigenaar.",
    extra: { "Verkoper": "Woningcorporatie (eigenaar)", "Verhuurd": "3 van 6 woningen", "Dossier": "Compleet, digitaal" }
  },

  /* --------------------------- Vakantiewoningen --------------------------- */
  {
    id: "v1",
    type: "vakantie",
    subtype: "Vakantiehuis",
    adres: "Duinweg 8",
    plaats: "Renesse (Zeeland)",
    land: "Nederland",
    prijs: 385000,
    oppervlakte: 86,
    perceel: 240,
    bouwjaar: 2004,
    energielabel: "B",
    kamers: 4,
    status: "te-koop",
    views: 2216,
    kadastraal: "Schouwen-Duiveland, sectie D, nummer 1180",
    omschrijving:
      "Vrijstaand vakantiehuis op 240 m² eigen grond, op vijf minuten fietsen van het strand van Renesse. " +
      "Vier kamers, overdekt terras op het westen. Verhuur is toegestaan; de verhuuropbrengst was " +
      "€ 18.400 in 2025 — de afrekeningen liggen ter inzage. De eigenaren verkopen omdat ze " +
      "naar Frankrijk verhuizen, en vertellen je eerlijk wat het park wel en niet regelt.",
    extra: { "Eigen grond": "Ja, 240 m²", "Parkkosten": "€ 1.850 per jaar", "Verhuur": "Toegestaan, opbrengst 2025 ter inzage" }
  },
  {
    id: "v2",
    type: "vakantie",
    subtype: "Villa buitenland",
    adres: "Calle Miramar 12",
    plaats: "Jávea, Costa Blanca",
    land: "Spanje",
    prijs: 429000,
    oppervlakte: 145,
    perceel: 610,
    bouwjaar: 1999,
    energielabel: "E",
    kamers: 5,
    status: "te-koop",
    views: 3861,
    kadastraal: "Registro de la Propiedad de Jávea, finca 8.412",
    omschrijving:
      "Villa met zeezicht en privézwembad op 610 m² grond, tien minuten van het Arenal-strand. " +
      "Vijf kamers, buitenkeuken, airco in alle slaapkamers. De eigenaren (Nederlands) verkopen zelf " +
      "en delen het complete dossier: nota simple, energiecertificaat en de afrekeningen. " +
      "Eerlijk over het proces: de koop verloopt naar Spaans recht via een notario — reken op een " +
      "gestor voor de afhandeling. Wij wijzen je de weg, meer niet.",
    extra: { "Zwembad": "Privé, 8×4 m", "Zeezicht": "Ja", "Koopproces": "Spaans recht (notario + gestor)" }
  },
  {
    id: "v3",
    type: "vakantie",
    subtype: "Chalet",
    adres: "Alpenstrasse 4",
    plaats: "Zell am See",
    land: "Oostenrijk",
    prijs: 519000,
    oppervlakte: 98,
    perceel: null,
    bouwjaar: 2011,
    energielabel: "C",
    kamers: 4,
    status: "te-koop",
    views: 1954,
    kadastraal: "Grundbuch Zell am See, EZ 2101",
    omschrijving:
      "Chalet op 400 meter van de skilift, met toeristische verhuurvergunning — die is in deze regio " +
      "schaars en gaat mee in de koop. Vier kamers, sauna, twee parkeerplaatsen. " +
      "De verhuuradministratie van de afgelopen drie seizoenen ligt ter inzage. " +
      "Koop verloopt naar Oostenrijks recht; de eigenaar deelt zijn notaris- en belastingcontacten ter plaatse.",
    extra: { "Verhuurvergunning": "Aanwezig, gaat mee over", "Skilift": "Op 400 m", "Koopproces": "Oostenrijks recht" }
  },
  {
    id: "v4",
    type: "vakantie",
    subtype: "Appartement aan zee",
    adres: "Avenida del Mar 27, 3B",
    plaats: "Marbella, Costa del Sol",
    land: "Spanje",
    prijs: 345000,
    oppervlakte: 92,
    perceel: null,
    bouwjaar: 2008,
    energielabel: "D",
    kamers: 3,
    status: "te-koop",
    views: 2740,
    kadastraal: "Registro de la Propiedad de Marbella, finca 12.905",
    omschrijving:
      "Appartement op de derde verdieping met lift, zeezicht en een terras van 18 m² op het zuiden, " +
      "op tien minuten lopen van het strand van Marbella. Gemeenschappelijk zwembad en tuin. " +
      "De Nederlandse eigenaren verkopen zelf en leveren het volledige dossier: nota simple, " +
      "IBI-afrekeningen en de kosten van de comunidad. Koop verloopt naar Spaans recht via een notario.",
    extra: { "Zeezicht": "Ja", "Zwembad": "Gemeenschappelijk", "Comunidad": "€ 1.320 per jaar", "Koopproces": "Spaans recht (notario + gestor)" }
  },
  {
    id: "v5",
    type: "vakantie",
    subtype: "Finca",
    adres: "Caminho da Fonte 8",
    plaats: "Loulé, Algarve",
    land: "Portugal",
    prijs: 399000,
    oppervlakte: 140,
    perceel: 3200,
    bouwjaar: 1994,
    energielabel: "E",
    kamers: 5,
    status: "te-koop",
    views: 1863,
    kadastraal: "Conservatória do Registo Predial de Loulé, 4471",
    omschrijving:
      "Finca met 3.200 m² grond, olijf- en sinaasappelbomen en een eigen bron, tien minuten van Loulé. " +
      "Honderdveertig m² woonoppervlak, buitenkeuken en een plunge pool. Rustig, aan het eind van een landweg. " +
      "De eigenaar verkoopt zelf en is eerlijk over het onderhoud dat een oud landhuis vraagt. " +
      "Koop verloopt naar Portugees recht; reken op een advogado voor de afhandeling.",
    extra: { "Grond": "3.200 m², eigen bron", "Zwembad": "Plunge pool", "Bijzonderheid": "Olijf- en sinaasappelbomen", "Koopproces": "Portugees recht" }
  },
  {
    id: "v6",
    type: "vakantie",
    subtype: "Chalet",
    adres: "Chemin des Praz 15",
    plaats: "Chamonix",
    land: "Frankrijk",
    prijs: 685000,
    oppervlakte: 108,
    perceel: 320,
    bouwjaar: 2016,
    energielabel: "C",
    kamers: 4,
    status: "te-koop",
    views: 2291,
    kadastraal: "Service de la publicité foncière de Bonneville, AK-118",
    omschrijving:
      "Chalet uit 2016 met uitzicht op de Mont Blanc, op loopafstand van de skibus en het centrum van Chamonix. " +
      "Honderdacht m², vier kamers, ski-berging en een zuidterras. Verhuur is toegestaan en loopt goed in het seizoen; " +
      "de cijfers liggen ter inzage. De eigenaar verkoopt rechtstreeks en deelt zijn notaire ter plaatse. " +
      "Koop verloopt naar Frans recht.",
    extra: { "Uitzicht": "Mont Blanc", "Verhuur": "Toegestaan, cijfers ter inzage", "Ski": "Skibus op loopafstand", "Koopproces": "Frans recht (notaire)" }
  },
  {
    id: "v7",
    type: "vakantie",
    subtype: "Landhuis",
    adres: "Contrada Lamie 44",
    plaats: "Ostuni, Puglia",
    land: "Italië",
    prijs: 275000,
    oppervlakte: 120,
    perceel: 1800,
    bouwjaar: 1978,
    energielabel: "F",
    kamers: 4,
    status: "te-koop",
    views: 1497,
    kadastraal: "Agenzia delle Entrate, Ostuni, foglio 12 part. 340",
    omschrijving:
      "Traditioneel landhuis met trullo-koepel op 1.800 m² grond met oude olijfbomen, tussen Ostuni en de kust. " +
      "Honderdtwintig m², gewelfde plafonds, een hof en ruimte voor een zwembad (vergunning aanwezig). " +
      "De eigenaar verkoopt zelf en vertelt je eerlijk wat er nog moet gebeuren. " +
      "Koop verloopt naar Italiaans recht via een notaio; reken op een geometra voor de papieren.",
    extra: { "Grond": "1.800 m² met olijfbomen", "Bijzonderheid": "Trullo-koepel, gewelfde plafonds", "Zwembad": "Vergunning aanwezig", "Koopproces": "Italiaans recht (notaio)" }
  }
];

/* ==========================================================================
   PROJECTEN — parken, complexen en ontwikkelingen vanaf 10 eenheden.
   Een project is één advertentie met meerdere eenheden, en verschijnt in
   het aanbod van zijn eigen categorie: woning, commercieel of vakantie.
   ========================================================================== */
var PANVIA_PROJECTEN = [
  {
    id: "p1",
    naam: "Het Spoorkwartier",
    type: "woning",
    subtype: "Appartementencomplex",
    plaats: "Utrecht",
    land: "Nederland",
    verkoper: "Bouwgroep Merwede (ontwikkelaar-eigenaar)",
    eenheden: 48,
    beschikbaar: 31,
    prijsVanaf: 245000,
    prijsTot: 489000,
    oppVanaf: 54,
    oppTot: 118,
    bouwjaar: 2027,
    energielabel: "A++",
    oplevering: "Fase 1 in Q3 2027, fase 2 in Q1 2028",
    fase: "In verkoop",
    views: 8421,
    omschrijving:
      "Achtenveertig appartementen in twee bouwlagen boven een half verdiepte parkeergarage, " +
      "op tien minuten fietsen van Utrecht Centraal. Gasloos, warmtepomp, label A++. " +
      "Drie types: tweekamer (54 m²), driekamer (78 m²) en penthouse (118 m²) met dakterras. " +
      "Je koopt rechtstreeks bij de ontwikkelaar — geen makelaarscourtage, en vragen over " +
      "meerwerk en oplevering beantwoordt degene die het bouwt.",
    types: [
      { naam: "Tweekamer", opp: 54, prijs: 245000, aantal: 12 },
      { naam: "Driekamer", opp: 78, prijs: 329000, aantal: 14 },
      { naam: "Penthouse", opp: 118, prijs: 489000, aantal: 5 }
    ],
    kenmerken: {
      "Parkeren": "Inpandig, 1 plaats per woning",
      "Verwarming": "Warmtepomp, gasloos",
      "Buitenruimte": "Balkon of dakterras",
      "VvE": "In oprichting, begroting beschikbaar"
    }
  },
  {
    id: "p2",
    naam: "Resort De Duinhoeve",
    type: "vakantie",
    subtype: "Vakantiepark",
    plaats: "Renesse (Zeeland)",
    land: "Nederland",
    verkoper: "Duinhoeve Vastgoed (parkeigenaar)",
    eenheden: 24,
    beschikbaar: 18,
    prijsVanaf: 289000,
    prijsTot: 445000,
    oppVanaf: 68,
    oppTot: 104,
    bouwjaar: 2026,
    energielabel: "A",
    oplevering: "Opgeleverd, direct te aanvaarden",
    fase: "In verkoop",
    views: 6115,
    omschrijving:
      "Vierentwintig vrijstaande recreatiewoningen op eigen grond, op zeven minuten fietsen " +
      "van het strand. Verhuur is toegestaan en het park regelt de exploitatie desgewenst — " +
      "de verhuurcijfers van de eerste achttien woningen liggen ter inzage. " +
      "Je koopt rechtstreeks van de parkeigenaar: dezelfde partij die het onderhoud doet en " +
      "die je precies kan vertellen wat de parkbijdrage dekt.",
    types: [
      { naam: "Duintype 4 pers.", opp: 68, prijs: 289000, aantal: 10 },
      { naam: "Zeetype 6 pers.", opp: 86, prijs: 359000, aantal: 6 },
      { naam: "Duinvilla 8 pers.", opp: 104, prijs: 445000, aantal: 2 }
    ],
    kenmerken: {
      "Grond": "Eigen grond, geen erfpacht",
      "Verhuur": "Toegestaan, exploitatie optioneel via park",
      "Parkbijdrage": "€ 1.980 per jaar",
      "Rendement": "Indicatie 4,8% bruto bij parkexploitatie"
    }
  },
  {
    id: "p3",
    naam: "Werkhaven Zuid",
    type: "commercieel",
    subtype: "Bedrijfsverzamelgebouw",
    plaats: "Amersfoort",
    land: "Nederland",
    verkoper: "Werkhaven Ontwikkeling (eigenaar)",
    eenheden: 18,
    beschikbaar: 11,
    prijsVanaf: 165000,
    prijsTot: 620000,
    oppVanaf: 62,
    oppTot: 310,
    bouwjaar: 2027,
    energielabel: "A",
    oplevering: "Q2 2027, casco of turn-key",
    fase: "In verkoop",
    views: 3204,
    omschrijving:
      "Achttien kantoor- en bedrijfsunits van 62 tot 310 m², op vijf minuten van de A28. " +
      "Units zijn samen te voegen. Casco opgeleverd, turn-key afbouw optioneel — " +
      "de prijslijst daarvoor krijg je gewoon op papier. Label A, gasloos, " +
      "eigen parkeerplaatsen per unit. Koop rechtstreeks bij de ontwikkelaar, " +
      "zonder bedrijfsmakelaar ertussen.",
    types: [
      { naam: "Starterunit", opp: 62, prijs: 165000, aantal: 6 },
      { naam: "Kantoorunit", opp: 145, prijs: 340000, aantal: 4 },
      { naam: "Bedrijfsunit XL", opp: 310, prijs: 620000, aantal: 1 }
    ],
    kenmerken: {
      "Oplevering": "Casco, turn-key optioneel",
      "Parkeren": "2 tot 6 plaatsen per unit",
      "Samenvoegen": "Units koppelbaar",
      "Bereikbaarheid": "A28 op 5 minuten"
    }
  }
];

/* Panden uitgelicht op de homepage: woningen, commercieel én een vakantiewoning */
var PANVIA_UITGELICHT = ["w2", "w1", "v2", "c4", "w7", "c3"];

/* Plaatsingsfee verkoper: € 895 per plaatsing van 6 maanden, excl. btw */
var PANVIA_FEE = 895;
