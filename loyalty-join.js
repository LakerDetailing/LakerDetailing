// ══════════════════════════════════════════════════════════
//  LAKER LOYALTY — QR prijava (loyalty-join.html)
//  Google/Apple dugmad se prikazuju samo kad backend config
//  (GET /api/loyalty-join) vrati client ID — bez toga radi
//  samo ručna forma, stranica nikad nije "pokvarena".
// ══════════════════════════════════════════════════════════
(function () {
  'use strict';

  var API     = '/api/loyalty-join';
  var busy    = false;
  var carSize = '';   // 'ms' | 'vs'
  var planType = '';  // 'mes' | 'god'

  // Cenovnik
  var PRICES = {
    ms: {
      mes: { amount: '€35', unit: '/mes', note: 'Naplaćuje se mesečno · 2× mesečno', saving: null },
      god: { amount: '€299', unit: '/god', note: '≈ €24.90/mes · 2× mesečno · 24 pranja/god', saving: 'Ušteda €121/god' }
    },
    vs: {
      mes: { amount: '€40', unit: '/mes', note: 'Naplaćuje se mesečno · 2× mesečno', saving: null },
      god: { amount: '€349', unit: '/god', note: '≈ €29.10/mes · 2× mesečno · 24 pranja/god', saving: 'Ušteda €131/god' }
    }
  };

  var SAVE_CHIPS = { ms: '-29%', vs: '-27%' };

  function $(id) { return document.getElementById(id); }

  // ── Price display ──────────────────────────────────────
  function updatePrice() {
    var box     = $('priceBox');
    var saving  = $('priceSaving');
    if (!carSize || !planType) {
      box.classList.remove('show');
      return;
    }
    var p = PRICES[carSize][planType];
    $('priceAmt').innerHTML  = p.amount + '<span>' + p.unit + '</span>';
    $('priceNote').textContent = p.note;
    if (p.saving) {
      saving.textContent = p.saving;
      saving.style.display = 'inline-flex';
    } else {
      saving.style.display = 'none';
    }
    box.classList.add('show');
  }

  function updateSaveChip() {
    var chip = $('saveChip');
    if (chip) chip.textContent = carSize ? SAVE_CHIPS[carSize] : '-29%';
  }

  // ── Size pills ─────────────────────────────────────────
  [$('sizeMs'), $('sizeVs')].forEach(function (pill) {
    pill.addEventListener('click', function () {
      carSize = pill.dataset.size;
      $('sizeMs').classList.toggle('on', carSize === 'ms');
      $('sizeVs').classList.toggle('on', carSize === 'vs');
      $('sizeMs').setAttribute('aria-checked', String(carSize === 'ms'));
      $('sizeVs').setAttribute('aria-checked', String(carSize === 'vs'));
      updateSaveChip();
      updatePrice();
    });
  });

  // ── Plan pills ─────────────────────────────────────────
  [$('planMes'), $('planGod')].forEach(function (pill) {
    pill.addEventListener('click', function () {
      planType = pill.dataset.plan;
      $('planMes').classList.toggle('on', planType === 'mes');
      $('planGod').classList.toggle('on', planType === 'god');
      $('planMes').setAttribute('aria-checked', String(planType === 'mes'));
      $('planGod').setAttribute('aria-checked', String(planType === 'god'));
      updatePrice();
    });
  });

  // ── UI helpers ─────────────────────────────────────────
  function showError(msg) {
    var box = $('errBox');
    box.textContent = msg || 'Došlo je do greške. Pokušajte ponovo.';
    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function clearError() { $('errBox').classList.remove('show'); }

  function buildSuccessPlanHtml() {
    if (!carSize && !planType) return '';
    var sizeLabel = carSize === 'ms' ? 'Mali / Srednji' : (carSize === 'vs' ? 'Veliki / SUV' : '');
    var planLabel = planType === 'mes' ? 'Mesečni plan' : (planType === 'god' ? 'Godišnji plan' : '');
    var lines = [];
    if (sizeLabel) lines.push('<strong>Vozilo:</strong> ' + sizeLabel);
    if (planLabel) lines.push('<strong>Plan:</strong> ' + planLabel);
    if (carSize && planType) {
      var p = PRICES[carSize][planType];
      lines.push('<strong>Cena:</strong> ' + p.amount + p.unit
        + (p.saving ? ' <span style="color:#2ECC71;font-size:11px">(' + p.saving + ')</span>' : ''));
    }
    return lines.join('<br>');
  }

  function showSuccess(msg) {
    var ph = buildSuccessPlanHtml();
    if (ph) {
      var spb = $('successPlanBox');
      spb.innerHTML = ph;
      spb.style.display = 'block';
    }
    if (msg) $('successMsg').textContent = msg;
    $('joinView').style.display = 'none';
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

  // ── Submit to backend ──────────────────────────────────
  function submitJoin(payload) {
    if (busy) return;
    clearError();
    if (carSize)  payload.car_size  = carSize;
    if (planType) payload.plan_type = planType;
    setLoading(true);
    fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
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

  // ── Manual form ────────────────────────────────────────
  $('manualForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name  = $('fName').value.trim();
    var phone = $('fPhone').value.trim();
    var email = $('fEmail').value.trim();

    if (name.length < 2) {
      showError('Unesite ime i prezime.'); $('fName').focus(); return;
    }
    if (!/^(\+?381|0)(6[0-9])(\d{6,7})$/.test(phone.replace(/\s+/g, ''))) {
      showError('Unesite ispravan broj telefona (npr. 060 123 4567).'); $('fPhone').focus(); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showError('Unesite ispravnu email adresu.'); $('fEmail').focus(); return;
    }

    submitJoin({
      mode:    'manual',
      name:    name,
      phone:   phone,
      email:   email,
      website: $('fWebsite').value
    });
  });

  // ── Google Identity Services ───────────────────────────
  function initGoogle(clientId) {
    var s = document.createElement('script');
    s.src   = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = function () {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      google.accounts.id.initialize({
        client_id:   clientId,
        callback:    function (resp) {
          if (resp && resp.credential) {
            submitJoin({ mode: 'google', credential: resp.credential });
          } else {
            showError('Google prijava je otkazana. Popunite formu ručno.');
          }
        },
        ux_mode:     'popup',
        auto_select: false,
        itp_support: true
      });
      var holder = $('googleBtn');
      holder.style.display = 'flex';
      var w = Math.min(380, Math.max(200, holder.clientWidth || 320));
      google.accounts.id.renderButton(holder, {
        theme:          'filled_black',
        size:           'large',
        shape:          'rectangular',
        text:           'continue_with',
        logo_alignment: 'left',
        locale:         'sr',
        width:          w
      });
      $('oauthZone').classList.add('show');
    };
    s.onerror = function () { /* Google nedostupan — ostaje ručna forma */ };
    document.head.appendChild(s);
  }

  // ── Apple Sign-In ──────────────────────────────────────
  function initApple(serviceId) {
    var s = document.createElement('script');
    s.src   = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/sr_RS/appleid.auth.js';
    s.async = true;
    s.onload = function () {
      if (!window.AppleID || !AppleID.auth) return;
      try {
        AppleID.auth.init({
          clientId:    serviceId,
          scope:       'name email',
          redirectURI: window.location.origin + '/loyalty-join',
          usePopup:    true
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
            var name = '';
            if (resp.user && resp.user.name) {
              name = ((resp.user.name.firstName || '') + ' ' + (resp.user.name.lastName || '')).trim();
            }
            submitJoin({ mode: 'apple', id_token: idToken, name: name });
          })
          .catch(function () {
            // Korisnik je zatvorio popup — bez poruke o grešci
          });
      });
    };
    s.onerror = function () { /* Apple nedostupan — ostaje ručna forma */ };
    document.head.appendChild(s);
  }

  // ── Config sa backenda ─────────────────────────────────
  fetch(API)
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (cfg && cfg.google_client_id) initGoogle(cfg.google_client_id);
      if (cfg && cfg.apple_service_id) initApple(cfg.apple_service_id);
    })
    .catch(function () { /* Backend nedostupan — samo ručna forma */ });

})();
