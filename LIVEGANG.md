# Panvia — livegang & campagne

Checklist om van dit prototype naar een werkende campagnesite te gaan. Werk hem
van boven naar beneden af; de eerste drie punten zijn **blokkerend** — zonder
die drie verlies je geld aan advertenties.

---

## 1. Leads laten binnenkomen — BLOKKEREND

Nu worden aanmeldingen alleen in de browser van de bezoeker bewaard. Zet je
advertenties aan zonder dit te regelen, dan **verlies je elke aanmelding**.

1. Maak een gratis account op [Formspree](https://formspree.io) (50 inzendingen
   per maand gratis; ~€ 10/maand voor meer).
2. Maak een nieuw formulier aan; je krijgt een endpoint als
   `https://formspree.io/f/xayzbwkd`.
3. Zet die URL in `js/config.js` bij `leadEndpoint`.
4. **Test het**: doorloop zelf "Plaats je pand" en kijk of de mail binnenkomt.

Alternatieven: Formsubmit.co, Getform.io, Web3Forms, of een eigen
`/api/lead`-route op Vercel (dan kun je meteen in een database schrijven).

Wat er verstuurd wordt: verkoper-aanmeldingen (met alle panddetails),
kopersaccounts en aanmeldingen voor de aanbod-alert.

## 2. Domein & basisgegevens

- [ ] `panvia.nl` registreren en in Vercel koppelen
- [ ] In `js/config.js`: `siteUrl` en `contactEmail` invullen
- [ ] Als je een ander domein gebruikt: zoek en vervang `https://panvia.nl` in
      alle `.html`-bestanden, `sitemap.xml` en `robots.txt`

## 3. Juridisch — vóór de eerste euro advertentiebudget

- [ ] Algemene voorwaarden en privacyverklaring (AVG) laten opstellen
- [ ] Cookie-/analyticsmelding als je een analysetool gebruikt
- [ ] Het boetebeding van € 10.000 in `spelregels.html` laten toetsen door een
      advocaat (art. 6:91 BW) — nu is het een concepttekst
- [ ] Laten toetsen of de propositie onder bemiddelingsregels of de Wft valt
      (zie `../02 Strategie & concurrentieanalyse.md`, §7)
- [ ] KvK-nummer en btw-nummer in de footer

## 4. Campagnestand (eerste twee weken)

In `js/config.js` staan twee schakelaars:

| Instelling | Nu | Betekenis |
|---|---|---|
| `lanceringsModus` | `true` | Bezoekers **melden hun pand kosteloos aan**; betalen komt later. Ideaal om in twee weken aanbod te verzamelen. |
| `demoModus` | `true` | Toont een eerlijke balk: het getoonde aanbod zijn voorbeelden. |

Zodra er echt aanbod is: vervang de inhoud van `js/data.js` door de echte
panden en zet **beide** op `false`.

> **Belangrijk:** laat `demoModus` op `true` zolang de 20 voorbeeldpanden er
> staan. Fictief aanbod tonen alsof het echt is, is misleidend richting
> bezoekers en in strijd met het advertentiebeleid van Meta.

## 5. Naar GitHub en Vercel

```bash
cd "C:/Users/aiman/Desktop/Panvia/website"
git init
git add .
git commit -m "Panvia — eerste versie"
git branch -M main
git remote add origin https://github.com/<jouw-account>/panvia.git
git push -u origin main
```

Daarna op [vercel.com](https://vercel.com): **Add New → Project** → repo
kiezen → framework **Other** → Deploy. Er is geen build-stap nodig; `vercel.json`
regelt cache-headers en nette URL's (`/aanbod` in plaats van `/aanbod.html`).

## 6. Meten wat je advertenties opleveren

Zonder meting weet je niet welke advertentie panden oplevert.

- **Vercel Analytics**: in het Vercel-dashboard aanzetten, geen code nodig,
  cookieloos.
- **Meta Pixel**: nodig als je op conversie wilt optimaliseren. Plak de
  pixelcode vlak vóór `</head>` in alle pagina's, en vuur een `Lead`-event af
  op de bevestigingsschermen. Let op: dit vereist een cookiemelding.

## 7. Deelbeeld voor social

`img/og-panvia.png` (1200×630) is het beeld dat verschijnt als je een
Panvia-link deelt op Instagram, Facebook of WhatsApp. Bron: `og-panvia.svg`.
Aanpassen? Wijzig de SVG en converteer opnieuw:

```bash
cd img && npx sharp-cli -i og-panvia.svg -o . -f png resize 1200 630
```

Controleer het resultaat met de
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).

---

## Wat nog niet echt werkt

Wees hier eerlijk over richting bezoekers — het staat ook in de demo-balk:

| Onderdeel | Status |
|---|---|
| Aanmeldingen (verkoper, koper, alert) | **Werkt** zodra `leadEndpoint` is ingevuld |
| Betalingen | Gesimuleerd — er wordt niets afgeschreven. Voor echt betalen: Mollie of Stripe + een backend |
| Chat en biedingen | Alleen in de browser van de bezoeker; de eigenaar ziet ze niet echt. Vereist database + accounts |
| Inloggen | Bestaat niet; "Mijn Panvia" toont demonstratiedata |
| Foto-upload | Toont een voorbeeld lokaal, uploadt niets |
| Het aanbod | 20 verzonnen panden met AI-beelden |

**De logische volgende stap** is Next.js op Vercel met een database (Supabase of
Vercel Postgres), echte accounts, Mollie voor iDEAL en e-mailnotificaties. Dan
werkt het platform echt end-to-end. Voor de campagne van de komende twee weken
is de huidige opzet met een lead-endpoint voldoende: je verzamelt aanbod en
kopers, en bouwt ondertussen door.
