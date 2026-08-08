/* ==========================================================================
   PANVIA — Vercel Web Analytics
   
   Dit script laadt Vercel Web Analytics voor het bijhouden van paginaweergaven
   en bezoekersstatistieken. Analytics wordt automatisch geactiveerd wanneer
   de site op Vercel wordt gehost.
   
   Vercel Web Analytics is privacy-vriendelijk en voldoet aan de GDPR:
   - Geen cookies
   - Geen persoonlijke gegevens verzameld
   - Geen IP-adressen opgeslagen
   - Volledig anonieme statistieken
   
   Meer informatie: https://vercel.com/docs/analytics
   ========================================================================== */

(function() {
  // Initialiseer Vercel Analytics window object
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
  
  // Laad het Vercel Analytics script
  // Het pad /_vercel/insights/script.js wordt automatisch door Vercel
  // aangemaakt wanneer Web Analytics is ingeschakeld in het dashboard
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  
  // Voeg het script toe aan de head
  var firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
})();
