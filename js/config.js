/* ==========================================================================
   PANVIA — config.js
   Eén plek voor alles wat per omgeving verschilt. Vul dit in vóór livegang.
   ========================================================================== */

var PANVIA_CONFIG = {

  /* ----------------------------------------------------------------------
     1. LEAD-ENDPOINT — VERPLICHT VÓÓR JE ADVERTENTIES AANZET
     ----------------------------------------------------------------------
     Zolang dit leeg is, worden aanmeldingen NERGENS opgeslagen: je betaalt
     dan voor klikken en verliest elke lead.

     Snelste route (10 minuten, gratis tot 50 inzendingen/maand):
       1. Maak een account op https://formspree.io
       2. Nieuw formulier aanmaken → je krijgt een endpoint-URL
       3. Plak die URL hieronder, bijvoorbeeld:
          leadEndpoint: "https://formspree.io/f/xayzbwkd"
       4. Test één inzending en kijk of hij binnenkomt

     Alternatieven met dezelfde werkwijze: Formsubmit.co, Getform.io,
     Web3Forms, of een eigen /api/lead route op Vercel.
     ---------------------------------------------------------------------- */
  leadEndpoint: "",

  /* ----------------------------------------------------------------------
     2. DEMO-MODUS
     ----------------------------------------------------------------------
     true  = de 20 voorbeeldpanden staan op de site, met een duidelijke
             melding dat het voorbeelden zijn (eerlijk richting bezoekers
             en adverteerders — je mag geen fictief aanbod tonen alsof het
             echt is).
     false = alleen echt aanbod. Zet dit op false zodra de eerste echte
             panden binnen zijn, en vervang de inhoud van data.js.
     ---------------------------------------------------------------------- */
  demoModus: true,

  /* ----------------------------------------------------------------------
     3. LANCERINGSMODUS
     ----------------------------------------------------------------------
     true  = "wachtlijst"-stand voor de eerste twee weken: bezoekers melden
             hun pand kosteloos aan en betalen pas als het platform live
             gaat. Dit is dé stand voor je Instagram/Facebook-campagne —
             je verzamelt aanbod zonder al te hoeven afrekenen.
     false = normale stand: direct plaatsen en betalen.
     ---------------------------------------------------------------------- */
  lanceringsModus: false,

  /* ----------------------------------------------------------------------
     4. LANCERINGSDATUM
     ----------------------------------------------------------------------
     Eén bron voor de datum waarop Panvia opengaat. Wordt getoond in de
     hero-countdown, de demo-balk en de aanmeldbevestiging. Formaat:
     "JJJJ-MM-DD" (ISO). Laat leeg ("") om alle datum-/countdownelementen
     te verbergen en terug te vallen op "binnenkort".
     ---------------------------------------------------------------------- */
  lanceringsDatum: "2026-08-17",

  /* Menselijke weergave van diezelfde datum (voor koppen en lopende tekst) */
  lanceringsDatumTekst: "17 augustus 2026",

  /* Publieke basis-URL, gebruikt in sitemap en deelbare links */
  siteUrl: "https://panvia.nl",

  /* Contactadres dat op de site getoond wordt */
  contactEmail: "hallo@panvia.nl"
};
