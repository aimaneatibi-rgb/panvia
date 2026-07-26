/* ==========================================================================
   PANVIA — cookietoestemming via Cookiebot (Usercentrics), gratis plan.

   ZO ZET JE HET AAN (5 minuten):
     1. Maak een gratis account op https://www.cookiebot.com
     2. Voeg je domein toe (panvia.nl) → je krijgt een Domain Group ID,
        een reeks als "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
     3. Plak dat ID hieronder tussen de aanhalingstekens
     4. Deploy. Cookiebot scant je site en toont de banner in het Nederlands.

   Zolang het ID leeg is, gebeurt er niets — geen banner, geen fouten. De
   noodzakelijke opslag van de site zelf (sessiecookie voor inloggen,
   localStorage voor het prototype) is "strikt noodzakelijk" en mag zonder
   toestemming; de banner is er voor alles wat je later toevoegt (Meta Pixel,
   analytics, embedded media).

   Dit bestand staat bewust als EERSTE script in de <head> van elke pagina:
   zo kan de blokkeermodus (data-blockingmode="auto") scripts die cookies
   zetten tegenhouden tót de bezoeker toestemming geeft.
   ========================================================================== */

var PANVIA_COOKIEBOT_ID = "";

if (PANVIA_COOKIEBOT_ID) {
  /* document.write tijdens het parsen van de head is hier bewust: het plaatst
     het script synchroon op precies deze plek — gelijkwaardig aan de statische
     tag die Cookiebot voorschrijft, maar met het ID op één centrale plek. */
  document.write(
    '<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js"' +
    ' data-cbid="' + PANVIA_COOKIEBOT_ID + '"' +
    ' data-blockingmode="auto"' +
    ' data-culture="nl"' +
    ' type="text/javascript"><\/script>'
  );
}
