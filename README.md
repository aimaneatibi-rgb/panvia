# Panvia — statisch website-prototype

**Vastgoed in eigen hand.**

Statisch prototype van het Panvia-platform: vanilla HTML + CSS + JS, geen build-stap, geen frameworks, geen dependencies. Gebouwd volgens `../01 Brandbook.md` **versie 2.0 — huisstijl "Blauwdruk"** — dat document is de bron van waarheid voor kleur, typografie, toon en componentregels.

## Lokaal draaien

### Optie 1 — gewoon openen
Dubbelklik op `index.html`. Alles werkt via `file://` (er worden geen modules of fetch-calls gebruikt). Alleen de Google Fonts (Fraunces / Instrument Sans / IBM Plex Mono) vereisen een internetverbinding; zonder verbinding valt de site terug op systeemfonts.

### Optie 2 — Python
```
cd website
python -m http.server 8000
```
Open daarna http://localhost:8000

### Optie 3 — npx serve
```
cd website
npx serve .
```
Open de URL die serve toont (meestal http://localhost:3000).

## Bestanden

| Bestand | Inhoud |
|---|---|
| `index.html` | Homepage: hero, propositie, rekenmachine courtage vs Panvia, prijsblok (€ 895 per 6 maanden), 3 stappen, uitgelicht aanbod, kopersargument |
| `aanbod.html` | Aanbodoverzicht met werkende filters (type, plaats, prijs, oppervlakte) |
| `pand.html` | Detailpagina; laadt een pand via `?id=` (bv. `pand.html?id=w2`), met galerij, kenmerkentabel en contactblok met de eigenaar |
| `plaatsen.html` | Meerstaps plaatsingsflow: verkopersaccount + eigenaarsverklaring → adres → type & kenmerken → foto's → prijs → betalen |
| `spelregels.html` | De spelregels: alleen eigenaren, geen makelaars of dienstenpromotie, boete € 10.000 per overtreding |
| `over.html` | Over ons: waar we voor staan, missie & visie (eigenaarschap, onafhankelijkheid), wat we bewust niet doen (o.a. geen hypotheken) |
| `projecten.html` | Panvia Projecten: pakketten voor parken, complexen en ontwikkelaars vanaf 10 eenheden (€ 5.950 / € 9.950 / € 14.950 per 12 mnd) met aanmeldformulier |
| `project.html` | Projectdetailpagina; laadt een project via `?id=` (bv. `project.html?id=p2`), met types, kenmerken en gratis belangstellingsregistratie |
| `eigenaar.html` | Mijn Panvia (eigenaarskant): inbox met gesprekken en biedingen op het demopand |
| `zakelijk.html` | Panvia Zakelijk: commercieel aanbod met filters op type, prijs, oppervlakte en BAR |
| `css/panvia.css` | Eén stylesheet; alle merk-tokens (kleur, spacing, radius, schaduw, typografie) als CSS-variabelen |
| `js/data.js` | 20 verzonnen panden (8 woningen, 9 commercieel incl. corporatieportefeuille, 3 vakantiewoningen waarvan 2 in het buitenland) — alle adressen, prijzen en gegevens zijn fictief |
| `js/panvia.js` | Kaart-rendering, filters, detailpagina, formulierstappen, validatie, SVG-placeholderbeelden |

## Wat echt werkt

- **Filteren** op aanbod en zakelijk: type, plaats, prijs, oppervlakte en (zakelijk) BAR filteren de kaarten client-side, met resultaatteller en lege-staat.
- **Detailpagina's**: elke kaart linkt naar `pand.html?id=…`; prijs, kenmerkentabel, kadastrale info en omschrijving komen uit `data.js`. Galerij met wisselbare beelden (incl. plattegrond).
- **Plaatsingsflow**: vijf stappen met stap-indicator, per stap validatie met foutmeldingen in gewone taal (bv. postcodecheck), terugnavigeren zonder verlies van invoer, live prijs-preview met courtagevergelijking, en een overzicht vóór het betalen.
- **Fotostap**: gekozen bestanden worden echt als voorbeeld getoond (lokaal, via `URL.createObjectURL` — er wordt niets geüpload).
- **Responsive** tot 375px, toetsenbord-navigeerbaar, focus-stijlen in Inkt, `aria-live` op tellers en meldingen.

## Wat gesimuleerd is

- **Betalen**: de knop "Betaal € 895" schrijft niets af en publiceert niets — je ziet een bevestigingsscherm met een prototype-melding. Tarief verkoper: € 895 per plaatsing van 6 maanden.
- **Kopersabonnement**: praten, bieden en de volledige verkoperinformatie zien vereist een kopersabonnement van € 12,95 per maand (maandelijks opzegbaar, gesimuleerd — er wordt niets afgeschreven). Het account wordt bewaard in localStorage (`panvia-koper`). Zonder abonnement zie je alleen de advertentie (foto's, vraagprijs, beschrijving, kenmerken): de chat staat dicht en biedingen zijn onzichtbaar. De verkooppagina staat op `kopers.html`.
- **Projecten**: drie demoprojecten (appartementencomplex, vakantiepark, bedrijfsverzamelgebouw) verschijnen elk in het aanbod van hun eigen categorie — filter op woning, vakantie of commercieel en het bijbehorende project komt bovenaan. Belangstelling registreren is gratis en zonder account; dat is het product dat de ontwikkelaar afneemt.
- **Verkopersaccount**: plaatsen begint met een account (localStorage `panvia-verkoper`) plus een verplichte eigenaarsverklaring: geen makelaar, geen dienstenpromotie, akkoord met de spelregels incl. boete van € 10.000 per overtreding.
- **Chat met de eigenaar**: na je eerste bericht opent een chatgesprek (à la Marktplaats) met snelstart-vragen. De eigenaar is gesimuleerd; het gesprek wordt per pand bewaard in localStorage en overleeft een herlaad. Er wordt niets verstuurd.
- **Bieden**: in de chat (of direct bij het eerste bericht) kun je een bod doen; het verschijnt als gestructureerd bod-bericht, nadrukkelijk niet bindend. Panvia bemiddelt niet.
- **Eigenaarskant** (`eigenaar.html`, "Mijn Panvia"): inbox met alle gesprekken en biedingen op het demopand (Meidoornlaan 14), inclusief twee gezaaide voorbeeldgesprekken. De eigenaar kan zelf antwoorden; antwoorden verschijnen ook aan de koperszijde op `pand.html?id=w2`.
- **Het aanbod**: alle 16 panden zijn verzonnen. Adressen, prijzen, BAR's en kijkcijfers zijn fictief.
- **Beelden**: de exterieurfoto's (`img/*.webp`, één per pand) zijn AI-gegenereerde voorbeeldbeelden — het zijn geen bestaande panden. De overige galerijbeelden zijn getekende SVG-silhouetten en de plattegrond is een blauwdruk in Ultramarijn. Bewust géén stockfoto's van mensen, sleutels of handdrukken (brandbook §12).
- Er is geen backend, geen opslag, geen account.

## Merkregels die in de code zijn afgedwongen (huisstijl v2 "Blauwdruk")

- Ultramarijn (`#2438D8`) is merk én actie: knoppen, merkteken, actieve navigatie en maximaal één accentlijn per component — nooit decoratief vlak.
- Zegelgroen (`#0F8A5C`) alleen als bevestiging/"beschikbaar" — nooit op een knop.
- Alle prijzen, oppervlaktes en jaartallen staan in IBM Plex Mono met `tabular-nums`; prijsnotatie is `€ 450.000`.
- Op elke pandkaart staat de prijs bovenaan en het grootst; elke kaart eindigt met "Rechtstreeks van eigenaar" in mono-kapitaal Ultramarijn.
- Eén primaire knop per scherm; knoplabels zijn werkwoorden ("Plaats mijn pand", "Betaal € 895").
- Alle prijzen staan in Ultramarijn — het getal is de held en draagt de merkkleur.
- Formulieren: label boven het veld, focus = 2px Ultramarijn, foutmeldingen in gewone taal onder het veld.
- Spacing alleen uit de schaal 4/8/12/16/24/32/48/64/96px; radius 2px (4px voor kaarten); geen schaduwen — haarlijnen van 1px Krijt.
- Plattegronden zijn blauwdrukken: Ultramarijn-lijnen op wit, maatvoering in mono. Foto's blijven onbewerkt.
