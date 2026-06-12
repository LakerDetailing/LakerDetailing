// ══════════════════════════════════════════════════════════
//  LAKER LOYALTY — QR prijava (loyalty-join.html)
//  Google/Apple dugmad se aktiviraju tek kad backend config
//  (GET /api/loyalty-join) vrati client ID — bez toga radi
//  samo ručna forma, stranica nikad nije "pokvarena".
// ══════════════════════════════════════════════════════════
(function () {
  'use strict';

  var API = '/api/loyalty-join';
  var busy = false;
  var carSize = '';

  function $(id) { return document.getElementById(id); }

  // ── UI helpers ──────────────────────────────────────────
  function showError(msg) {
    var box = $('errBox');
    box.textContent = msg || 'Došlo je do greške. Pokušajte ponovo.';
    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearError() { $('errBox').classList.remove('show'); }

  function showSuccess(msg) {
    $('joinView').style.display = 'none';
    if (msg) $('successMsg').textContent = msg;
    $('successView').classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setLoading(on) {
    busy = on;
    var btn = $('submitBtn');
    btn.disabled = on;
    btn.classList.toggle('loading', on);
    $('submitTxt').textContent = on ? 'Šaljem...' : 'Pošalji zahtev';
    var apple = $('appleBtn');
    if (apple) apple.disabled = on;
  }

  // ── Slanje prijave na backend ───────────────────────────
  function submitJoin(payload) {
    if (busy) return;
    clearError();
    setLoading(true);
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        setLoading(false);
        if (r.ok && r.data && r.data.success) {
          showSuccess(r.data.message || '');
        } else {
          showError((r.data && r.data.error) || 'Slanje nije uspelo. Pokušajte ponovo.');
        }
      })
      .catch(function () {
        setLoading(false);
        showError('Nema internet konekcije. Proverite mrežu pa pokušajte ponovo.');
      });
  }

  // ── Ručna forma ─────────────────────────────────────────
  $('manualToggle').addEventListener('click', function () {
    openManualForm();
  });

  function openManualForm() {
    $('manualForm').classList.add('show');
    $('manualToggle').style.display = 'none';
    var n = $('fName');
    if (n) setTimeout(function () { n.focus({ preventScroll: false }); }, 150);
  }

  [$('sizeMs'), $('sizeVs')].forEach(function (pill) {
    pill.addEventListener('click', function () {
      carSize = pill.dataset.size;
      $('sizeMs').classList.toggle('on', carSize === 'ms');
      $('sizeVs').classList.toggle('on', carSize === 'vs');
      $('sizeMs').setAttribute('aria-checked', carSize === 'ms');
      $('sizeVs').setAttribute('aria-checked', carSize === 'vs');
    });
  });

  $('manualForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name  = $('fName').value.trim();
    var phone = $('fPhone').value.trim();
    var email = $('fEmail').value.trim();

    if (name.length < 2)                       { showError('Unesite ime i prezime.'); $('fName').focus(); return; }
    if (!/^(\+?381|0)(6[0-9])(\d{6,7})$/.test(phone.replace(/\s+/g, ''))) {
      showError('Unesite ispravan broj telefona (npr. 060 123 4567).'); $('fPhone').focus(); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showError('Unesite ispravnu email adresu.'); $('fEmail').focus(); return; }
    if (!carSize)                              { showError('Odaberite veličinu vozila.'); return; }

    submitJoin({
      mode: 'manual',
      name: name,
      phone: phone,
      email: email,
      car_size: carSize,
      website: $('fWebsite').value
    });
  });

  // ── Google Identity Services ────────────────────────────
  function initGoogle(clientId) {
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = function () {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: function (resp) {
          if (resp && resp.credential) {
            submitJoin({ mode: 'google', credential: resp.credential });
          } else {
            showError('Google prijava je otkazana. Pokušajte ponovo ili popunite formu ručno.');
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true
      });
      var holder = $('googleBtn');
      holder.style.display = 'flex';
      var w = Math.min(380, Math.max(200, holder.clientWidth || 320));
      google.accounts.id.renderButton(holder, {
        theme: 'filled_black',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        locale: 'sr',
        width: w
      });
      $('oauthZone').classList.add('show');
    };
    s.onerror = function () { /* Google nedostupan — ostaje ručna forma */ };
    document.head.appendChild(s);
  }

  // ── Apple Sign-In ───────────────────────────────────────
  function initApple(serviceId) {
    var s = document.createElement('script');
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/sr_RS/appleid.auth.js';
    s.async = true;
    s.onload = function () {
      if (!window.AppleID || !AppleID.auth) return;
      try {
        AppleID.auth.init({
          clientId: serviceId,
          scope: 'name email',
          redirectURI: window.location.origin + '/loyalty-join',
          usePopup: true
        });
      } catch (e) { return; }
      var btn = $('appleBtn');
      btn.style.display = 'flex';
      $('oauthZone').classList.add('show');
      btn.addEventListener('click', function () {
        if (busy) return;
        clearError();
        AppleID.auth.signIn()
          .then(function (resp) {
            var idToken = resp && resp.authorization && resp.authorization.id_token;
            if (!idToken) { showError('Apple prijava nije uspela. Pokušajte ponovo.'); return; }
            // VAŽNO: Apple šalje ime SAMO pri prvoj prijavi — odmah ga prosleđujemo
            var name = '';
            if (resp.user && resp.user.name) {
              name = ((resp.user.name.firstName || '') + ' ' + (resp.user.name.lastName || '')).trim();
            }
            submitJoin({ mode: 'apple', id_token: idToken, name: name });
          })
          .catch(function () {
            // korisnik zatvorio popup — bez poruke o grešci
          });
      });
    };
    s.onerror = function () { /* Apple nedostupan — ostaje ručna forma */ };
    document.head.appendChild(s);
  }

  // ── Config sa backenda → koja dugmad postoje ────────────
  fetch(API)
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      var hasOauth = false;
      if (cfg && cfg.google_client_id) { hasOauth = true; initGoogle(cfg.google_client_id); }
      if (cfg && cfg.apple_service_id) { hasOauth = true; initApple(cfg.apple_service_id); }
      if (!hasOauth) openManualForm();
    })
    .catch(function () { openManualForm(); });
})();
