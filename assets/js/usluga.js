/* ══════════════════════════════════════════════════════════════
   Stranice usluga — samo ono što im treba.

   Namerno NE učitava main.min.js: on očekuje elemente sa početne
   (loyalty modal, galerija, recenzije) kojih ovde nema i pukao bi
   na prvom nedostajućem elementu.

   Ponašanje mora biti IDENTIČNO početnoj, pa su tema, mobilni meni
   i kursor prepisani 1:1 iz main.js. Ako se tamo nešto promeni,
   promeni i ovde.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── TEMA ──
  // colorScheme na <html> mora da prati temu, inače Chrome/Edge „force dark
  // mode" auto-zatamni stranicu na desktopu. Isto kao main.js.
  var themeBtn = document.getElementById('themeBtn');
  var theme = document.body.classList.contains('light') ? 'light' : 'dark';
  document.documentElement.style.colorScheme = theme;
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      document.body.classList.toggle('light');
      theme = document.body.classList.contains('light') ? 'light' : 'dark';
      document.documentElement.style.colorScheme = theme;
      try { localStorage.setItem('laker-theme', theme); } catch (e) {}
    });
  }

  // ── MOBILNI MENI ──
  var hbg = document.getElementById('hbg');
  var overlay = document.getElementById('mobileOverlay');
  var closeBtn = document.getElementById('mobileOverlay-close');
  var menuScrollY = 0;
  var menuOpen = false;

  function burgerToX(on) {
    if (!hbg) return;
    var s = hbg.querySelectorAll('span');
    if (s.length < 3) return;
    if (on) {
      s[0].style.transform = 'rotate(45deg) translate(4px,5px)';
      s[1].style.opacity = '0';
      s[2].style.transform = 'rotate(-45deg) translate(4px,-5px)';
    } else {
      s[0].style.transform = '';
      s[1].style.opacity = '';
      s[2].style.transform = '';
    }
  }

  function openMenu() {
    if (menuOpen || !overlay) return;
    menuScrollY = window.scrollY || window.pageYOffset || 0;
    menuOpen = true;
    overlay.classList.add('open');
    document.body.classList.add('menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + menuScrollY + 'px';
    document.body.style.width = '100%';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    burgerToX(true);
  }

  function closeMenu() {
    if (!menuOpen || !overlay) return;
    menuOpen = false;
    overlay.classList.remove('open');
    document.body.classList.remove('menu-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflowY = '';
    document.documentElement.style.overflowX = '';
    burgerToX(false);
    // Meni je držao body na position:fixed → dokument je na scrollY 0.
    // Restore MORA biti sinhron i bez animacije: html{scroll-behavior:smooth}
    // bi pretvorio ovo u glatku animaciju koja otima skrol linku na koji se
    // upravo kliknulo. Isto rešenje kao u main.js.
    var html = document.documentElement;
    var prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, menuScrollY);
    html.style.scrollBehavior = prev;
  }

  if (hbg) hbg.addEventListener('click', function () {
    overlay && overlay.classList.contains('open') ? closeMenu() : openMenu();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) {
    overlay.addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
    overlay.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  // ── CUSTOM KURSOR ──
  // Elementi su #cur i #cur-r (ne #cur-d) — tako ih zove laker-base.css.
  // Na touch uređajima CSS ih gasi (@media hover:none), ali i ovde se
  // petlja uopšte ne pokreće.
  var cur = document.getElementById('cur');
  var cr = document.getElementById('cur-r');
  if (cur && cr && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var mx = 0, my = 0, rx = 0, ry = 0, raf = null;

    function tick() {
      raf = null;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (Math.abs(mx - rx) > 0.4 || Math.abs(my - ry) > 0.4) {
        cr.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
        raf = requestAnimationFrame(tick);
      } else {
        rx = mx; ry = my;
        cr.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      }
    }

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cur.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    document.querySelectorAll('a,button,.us-why-c,.us-step,.us-get-i,.us-o,.us-hub-c').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cr.style.width = '54px'; cr.style.height = '54px'; }, { passive: true });
      el.addEventListener('mouseleave', function () { cr.style.width = '32px'; cr.style.height = '32px'; }, { passive: true });
    });
  }
})();
