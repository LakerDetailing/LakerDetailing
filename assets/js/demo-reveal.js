/* ══════════════════════════════════════════════════════════════
   Animacija pojavljivanja za DEMO stranice.

   Zašto zaseban fajl: na živoj početnoj ovo radi inline skripta
   (#scroll-reveal-init) sa 21 hardkodovanim selektorom vezanim za
   sekcije te strane. Ta skripta ima svoj CSP hash — kopiranje na
   svaku demo stranicu tražilo bi nov hash po stranici.

   Ovako je eksterni <script src>, pa CSP ne traži nijedan nov hash.

   VAŽNO: `html.js-ready` mora da se doda TEK ovde. U laker-base.css
   pravila `html.js-ready .rv{opacity:0}` sakriju sadržaj — ako se
   klasa doda a observer ne postoji, pola strane ostane nevidljivo.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var meta = document.querySelectorAll('.rv, .rl, .rr');
  if (!meta.length) return;

  // Bez podrške ili uz „smanji animacije" — sve odmah vidljivo, bez trika.
  var smanji = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || smanji) {
    document.documentElement.classList.add('js-ready');
    for (var i = 0; i < meta.length; i++) meta[i].classList.add('in');
    return;
  }

  document.documentElement.classList.add('js-ready');

  var ioRadi = false;

  var io = new IntersectionObserver(function (unosi) {
    ioRadi = true;
    for (var i = 0; i < unosi.length; i++) {
      if (unosi[i].isIntersecting) {
        unosi[i].target.classList.add('in');
        io.unobserve(unosi[i].target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  for (var j = 0; j < meta.length; j++) io.observe(meta[j]);

  function otkrijSve() {
    var jos = document.querySelectorAll('.rv:not(.in), .rl:not(.in), .rr:not(.in)');
    for (var k = 0; k < jos.length; k++) jos[k].classList.add('in');
  }

  // ── SIGURNOSNA MREŽA ──
  // Sadržaj NIKAD ne sme da ostane nevidljiv zbog JS-a. `html.js-ready .rv`
  // ima opacity:0, pa ako observer iz bilo kog razloga ne proradi, posetilac
  // gleda praznu stranu. IntersectionObserver uvek javi bar jednom čim počne
  // da posmatra — ako se to ne desi za 2.5s, nešto ne valja i sve se otkriva
  // odjednom. Animacija se izgubi, sadržaj ne.
  setTimeout(function () {
    if (!ioRadi) { io.disconnect(); otkrijSve(); }
  }, 2500);
})();
