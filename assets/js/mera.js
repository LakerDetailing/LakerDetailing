/* ══════════════════════════════════════════════════════════
   LAKER DETAILING — mera.js
   Sopstveno merenje poseta. Bez ijednog kolačića.

   Ne čuva NIŠTA na uređaju posetioca (jedini izuzetak je ručni
   prekidač kojim vlasnik isključi svoje uređaje: ?analitika=off).
   Zato ne traži pristanak i radi za sve posetioce, ne samo za one
   koji kliknu na baner.

   Šalje na /api/mera. Ako to padne, strana radi normalno dalje.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PUT = '/api/mera';

  // ── 1. Kada se NE meri ──────────────────────────────────
  // Isti prekidač kao za GA4/Pixel/Vercel: ?analitika=off gasi SVE,
  // uključujući ovo merenje. Ključ `laker_no_analytics` piše init.js;
  // ovde se čita i sam parametar, jer loyalty-join.html nema init.js.
  // ?nemeri=on / ?nemeri=off gasi i pali samo ovo merenje.
  try {
    var q = location.search;
    if (q.indexOf('analitika=off') > -1) localStorage.setItem('laker_no_analytics', '1');
    if (q.indexOf('analitika=on')  > -1) localStorage.removeItem('laker_no_analytics');
    if (q.indexOf('nemeri=on')     > -1) localStorage.setItem('laker_nemeri', '1');
    if (q.indexOf('nemeri=off')    > -1) localStorage.removeItem('laker_nemeri');

    if (localStorage.getItem('laker_no_analytics') === '1') return;
    if (localStorage.getItem('laker_nemeri')       === '1') return;
  } catch (e) { /* privatni režim — nastavi normalno */ }

  // init.js je već mogao da postavi ovu zastavicu pre nego što smo mi na redu.
  if (window._lakerNoAnalytics) return;

  // Lokalni razvoj se ne broji.
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '' || h.indexOf('vercel.app') > -1) return;

  if (!window.fetch) return;

  // ── 2. Stanje ───────────────────────────────────────────
  // Id sesije živi samo u memoriji ove strane — ništa se ne upisuje
  // na uređaj. Server sam spaja posete istog čoveka u jednu sesiju.
  var SESIJA = String(Date.now()).slice(-7) + Math.random().toString(36).slice(2, 8);
  var red     = [];       // događaji koji čekaju slanje
  var poslat  = false;    // da li je završni paket već otišao
  var sekundi = 0;        // aktivno vreme (samo dok je kartica vidljiva)
  var dubina  = 0;        // najdublje dokle se skrolovalo, u procentima

  var zajedno = {
    s: SESIJA,
    p: location.pathname.slice(0, 120),
    r: document.referrer || '',
    w: window.innerWidth || 0
  };

  // ── 3. Slanje ───────────────────────────────────────────
  function posalji(zavrsno) {
    if (!red.length) return;
    var telo = JSON.stringify({
      s: zajedno.s, p: zajedno.p, r: zajedno.r, w: zajedno.w, e: red
    });
    red = [];

    // Na zatvaranju strane fetch ume da bude prekinut — sendBeacon ne.
    if (zavrsno && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(PUT, new Blob([telo], { type: 'application/json' }));
        return;
      } catch (e) { /* padni na fetch */ }
    }
    try {
      fetch(PUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: telo,
        keepalive: true,
        credentials: 'omit'
      })['catch'](function () {});
    } catch (e) { /* merenje nikad ne sme da obori stranu */ }
  }

  function dodaj(dog, odmah) {
    red.push(dog);
    if (odmah) posalji(false);
    else if (red.length >= 12) posalji(false);
  }

  // ── 4. Pregled strane ───────────────────────────────────
  dodaj({ v: 'pregled' }, false);
  setTimeout(function () { posalji(false); }, 1200);

  // ── 5. Klikovi koji nešto znače ─────────────────────────
  // Poziv, WhatsApp i Instagram su ono zbog čega sajt postoji —
  // oni se broje kao rezultat, sve ostalo je usput.
  var VAZNI_DATA = {
    openLoyalty:     'loyalty-otvoren',
    openLoyaltyMenu: 'loyalty-otvoren',
    loyRegister:     'loyalty-prijava',
    loyLogin:        'loyalty-ulogovan',
    activateLoyalty: 'loyalty-aktivacija',
    openReviewModal: 'recenzija-otvorena',
    submitReview:    'recenzija-poslata'
  };

  function sekcijaOd(el) {
    var s = el && el.closest ? el.closest('section[id]') : null;
    return s ? s.id : 'ostalo';
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) t = t && t.parentElement;
    if (!t || !t.closest) return;

    var ime = null;
    var a = t.closest('a[href]');

    if (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('wa.me/') > -1 || href.indexOf('api.whatsapp.com') > -1) ime = 'whatsapp';
      else if (href.indexOf('tel:') === 0)         ime = 'telefon';
      else if (href.indexOf('mailto:') === 0)      ime = 'email';
      else if (href.indexOf('instagram.com') > -1) ime = 'instagram';
      else if (href.indexOf('tiktok.com') > -1)    ime = 'tiktok';
      else if (href.indexOf('maps.') > -1 || href.indexOf('goo.gl/maps') > -1 ||
               href.indexOf('maps.app') > -1)      ime = 'mapa';
    }

    if (!ime) {
      var d = t.closest('[data-click]');
      if (d) {
        var kod = (d.getAttribute('data-click') || '').split(':')[0];
        ime = VAZNI_DATA[kod] || null;
      }
    }

    if (!ime && t.closest('.izl-thumb, .izl-slide, .gv')) ime = 'galerija';

    if (!ime) return;
    dodaj({ v: 'klik', n: ime, sec: sekcijaOd(t) }, true);
  }, true);

  // ── 6. Dokle su stigli kroz stranu ──────────────────────
  if (window.IntersectionObserver) {
    var oko = new IntersectionObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if (!lista[i].isIntersecting) continue;
        var el = lista[i].target;
        oko.unobserve(el);
        dodaj({ v: 'sekcija', n: el.id }, false);
      }
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

    var sekcije = document.querySelectorAll('section[id]');
    for (var i = 0; i < sekcije.length; i++) oko.observe(sekcije[i]);
  }

  // ── 7. Koliko su se zadržali i dokle su skrolovali ──────
  // Broji se samo vreme dok je kartica zaista u prvom planu —
  // strana zaboravljena u pozadini ne pravi lažnih pola sata.
  setInterval(function () {
    if (document.visibilityState === 'visible') sekundi++;
  }, 1000);

  function merenjeDubine() {
    var doc = document.documentElement;
    var ukupno = (doc.scrollHeight || 1) - (window.innerHeight || 0);
    if (ukupno <= 0) { dubina = 100; return; }
    var p = Math.round(((window.pageYOffset || doc.scrollTop || 0) / ukupno) * 100);
    if (p > dubina) dubina = Math.min(100, Math.max(0, p));
  }
  merenjeDubine();
  window.addEventListener('scroll', merenjeDubine, { passive: true });

  // ── 8. Završni paket ────────────────────────────────────
  function zavrsi() {
    if (poslat) return;
    poslat = true;
    red.push({ v: 'kraj', t: sekundi, d: dubina });
    posalji(true);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') zavrsi();
    // Vratio se na karticu — merenje se nastavlja i posle će otići
    // novi „kraj" sa punijim vremenom. Izveštaj po sesiji uzima
    // NAJVEĆI poslati broj, pa se vreme ne sabira dvaput.
    else poslat = false;
  });
  window.addEventListener('pagehide', zavrsi);
})();
