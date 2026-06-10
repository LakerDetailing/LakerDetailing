// ── SENTRY ──
(function(){function loadSentry(){var s=document.createElement('script');s.src='https://browser.sentry-cdn.com/8.47.0/bundle.min.js';s.crossOrigin='anonymous';s.onload=function(){if(window.Sentry)Sentry.init({dsn:'https://e8a5c3264a9a4dec0cd6d951e20028d5@o4511525862309888.ingest.de.sentry.io/4511525878825040',environment:'production',tracesSampleRate:0,ignoreErrors:['ResizeObserver loop','Non-Error promise rejection']});};document.head.appendChild(s);}document.readyState==='complete'?loadSentry():window.addEventListener('load',loadSentry,{once:true});})();

// ── ANALYTICS ──
(function(){
  function _loadAnalytics(){
    if(window._analyticsLoaded)return;
    window._analyticsLoaded=true;
    var ga=document.createElement('script');ga.async=true;
    ga.src='https://www.googletagmanager.com/gtag/js?id=G-DP87917XW3';
    document.head.appendChild(ga);
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
    gtag('js',new Date());gtag('config','G-DP87917XW3');
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','27521788054080884');fbq('track','PageView');
  }
  window._lakerLoadAnalytics=_loadAnalytics;
  if(localStorage.getItem('laker_cookie_consent')==='yes'){
    if(document.readyState==='complete'){_loadAnalytics();}
    else{window.addEventListener('load',_loadAnalytics,{once:true});}
  }
})();

// ── FALLBACK IMAGE ──
function lakerFallbackImage(label, sublabel) {
  var safeLabel = String(label || 'Laker Detailing').replace(/[<>&"]/g, '');
  var safeSub = String(sublabel || 'Premium detailing').replace(/[<>&"]/g, '');
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none">' +
    '<defs>' +
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#080808"/>' +
    '<stop offset="100%" stop-color="#1a1a1a"/>' +
    '</linearGradient>' +
    '<radialGradient id="r" cx="50%" cy="35%" r="80%">' +
    '<stop offset="0%" stop-color="#C9A84C" stop-opacity=".35"/>' +
    '<stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>' +
    '</radialGradient>' +
    '</defs>' +
    '<rect width="1200" height="800" fill="url(#g)"/>' +
    '<circle cx="930" cy="180" r="240" fill="url(#r)"/>' +
    '<circle cx="240" cy="620" r="280" fill="#0f0f0f"/>' +
    '<path d="M180 560h150l45-76c7-12 20-19 34-19h240c15 0 29 8 36 21l34 65h116c28 0 50 22 50 50v45H180v-86c0-1 0-1 0-1z" fill="#171717" stroke="#C9A84C" stroke-opacity=".22" stroke-width="3"/>' +
    '<circle cx="356" cy="635" r="56" fill="#0b0b0b" stroke="#c0392b" stroke-opacity=".28" stroke-width="8"/>' +
    '<circle cx="356" cy="635" r="22" fill="#2b2b2b"/>' +
    '<circle cx="815" cy="635" r="56" fill="#0b0b0b" stroke="#c0392b" stroke-opacity=".28" stroke-width="8"/>' +
    '<circle cx="815" cy="635" r="22" fill="#2b2b2b"/>' +
    '<rect x="500" y="405" width="210" height="95" rx="20" fill="#101010" stroke="#f2f0ec" stroke-opacity=".12"/>' +
    '<text x="600" y="360" fill="#F2F0EC" font-size="54" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700">' + safeLabel + '</text>' +
    '<text x="600" y="435" fill="#C9A84C" font-size="24" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" letter-spacing="4">' + safeSub + '</text>' +
    '<text x="600" y="520" fill="#9a9a9a" font-size="18" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">Fallback vizual kada spoljni host ne radi</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// ── SCROLL REVEAL ──
(function initScrollReveal() {
  const selectors = [
    '#phi .sl', '#phi .sh', '#phi .sd', '#phi .pv',
    '#cs .sl', '#cs .sh', '.cs-card',
    '#srv .sl', '#srv .sh', '.si',
    '#proc .sl', '#proc .sh', '.proc-step',
    '#pkg .sl', '#pkg .sh', '.pk',
    '#care .sl', '#care .sh', '.care-card', '.care-wash',
    '.faq-item'
  ];

  const seen = new Set();
  const targets = [];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      targets.push(el);
    });
  });

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', `${Math.min(i % 8, 7) * 70}ms`);
  });

  if (!targets.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach(el => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  targets.forEach(el => io.observe(el));
})();

// ── PWA REGISTRATION ──
(function registerPWA() {
  if (!('serviceWorker' in navigator)) return;
  const params = new URLSearchParams(location.search);
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  let swRegistration = null;
  let updateReady = false;
  let updatePoll = null;
  const hadController = !!navigator.serviceWorker.controller;
  if (params.get('reset') === '1') {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
    }).then(function () {
      if ('caches' in window) {
        return caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (key) { return caches.delete(key); }));
        });
      }
    }).catch(function () {}).finally(function () {
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
    });
    return;
  }
  function getUpdateBanner() {
    return document.getElementById('pwaUpdateBanner');
  }
  function getPushBanner() {
    return document.getElementById('pwaPushBanner');
  }
  function showUpdateBanner() {
    if (isStandalone) return;
    const banner = getUpdateBanner();
    if (!banner) return;
    banner.hidden = false;
    banner.style.display = 'flex';
  }
  function hideUpdateBanner() {
    const banner = getUpdateBanner();
    if (!banner) return;
    banner.hidden = true;
    banner.style.display = 'none';
  }
  function showPushBanner() {
    const banner = getPushBanner();
    if (!banner) return;
    banner.hidden = false;
    banner.style.display = 'flex';
  }
  function hidePushBanner() {
    const banner = getPushBanner();
    if (!banner) return;
    banner.hidden = true;
    banner.style.display = 'none';
  }
  function checkForUpdate() {
    if (!swRegistration || typeof swRegistration.update !== 'function') return;
    swRegistration.update().catch(function () {});
  }
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }
  async function getPushPublicKey() {
    const res = await fetch('/api/push-public-key?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return '';
    const data = await res.json().catch(function () { return {}; });
    return data && data.publicKey ? String(data.publicKey).trim() : '';
  }
  async function subscribeForPush() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      throw new Error('Tvoj pregledač ne podržava push obaveštenja.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Dozvola za obaveštenja nije odobrena.');
    }
    const publicKey = await getPushPublicKey();
    if (!publicKey) {
      throw new Error('Push public key nije podešen na serveru.');
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    const save = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
        source: 'pwa'
      })
    });
    if (!save.ok) {
      const txt = await save.text().catch(function () { return ''; });
      throw new Error(txt || 'Neuspešno čuvanje subscription-a.');
    }
    try { localStorage.setItem('laker-push-enabled', '1'); } catch (e) {}
    hidePushBanner();
    return true;
  }
  function bindRegistration(reg) {
    swRegistration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) {
      updateReady = true;
      showUpdateBanner();
    }
    reg.addEventListener('updatefound', function () {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          updateReady = true;
          showUpdateBanner();
        }
      });
    });
    checkForUpdate();
    if (!updatePoll) {
      updatePoll = setInterval(checkForUpdate, 30 * 60 * 1000);
    }
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
      bindRegistration(reg);
      checkForUpdate();
    }).catch(function () {});
  });
  window.addEventListener('focus', checkForUpdate);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController) return;
    hideUpdateBanner();
    location.reload();
  });
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'pwaUpdateBtn') {
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      hideUpdateBanner();
      location.reload();
    }
    if (e.target && e.target.id === 'pwaUpdateDismissBtn') {
      hideUpdateBanner();
    }
    if (e.target && e.target.id === 'pwaPushEnableBtn') {
      subscribeForPush().catch(function (err) {
        console.warn('Push subscription failed:', err);
        alert(err && err.message ? err.message : 'Obaveštenja nisu uključena.');
      });
    }
    if (e.target && e.target.id === 'pwaPushDismissBtn') {
      hidePushBanner();
      try { localStorage.setItem('laker-push-dismissed', '1'); } catch (e) {}
    }
  });
  if (('Notification' in window) && ('PushManager' in window)) {
    try {
      const dismissed = localStorage.getItem('laker-push-dismissed');
      const enabled = localStorage.getItem('laker-push-enabled');
      if (Notification.permission === 'default' && !dismissed && !enabled) {
        setTimeout(showPushBanner, isStandalone ? 1500 : 2200);
      }
    } catch (e) {
      if (Notification.permission === 'default') setTimeout(showPushBanner, isStandalone ? 1500 : 2200);
    }
  }
})();

// ── PWA INSTALL ──
(function initPwaInstall() {
  const btn = document.getElementById('pwaInstallBtn');
  const offlineBanner = document.getElementById('pwaOfflineBanner');
  const iosModal = document.getElementById('pwaIosModal');
  if (!btn) return;
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isStandalone) document.body.classList.add('pwa-standalone');
  if (isStandalone && /iphone/i.test(navigator.userAgent)) document.body.classList.add('ios-standalone-mode');

  let deferredPrompt = null;
  const iosSeenKey = 'laker-pwa-ios-help';

  function showBtn(label) {
    btn.hidden = false;
    btn.querySelector('span:last-child').textContent = label;
  }

  function updateOfflineState() {
    if (!offlineBanner) return;
    if (isStandalone) {
      offlineBanner.hidden = true;
      offlineBanner.style.display = 'none';
      return;
    }
    offlineBanner.style.display = navigator.onLine ? 'none' : 'flex';
  }

  window.closePwaIosModal = function closePwaIosModal() {
    if (!iosModal) return;
    iosModal.classList.remove('open');
    iosModal.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem(iosSeenKey, '1'); } catch (e) {}
  };

  function openIosModal() {
    if (!iosModal) return;
    iosModal.classList.add('open');
    iosModal.setAttribute('aria-hidden', 'false');
  }

  if (isIOS) {
    showBtn('iPhone: Add to Home');
    btn.addEventListener('click', function () {
      openIosModal();
    });
    try {
      if (!localStorage.getItem(iosSeenKey) && !isStandalone) {
        btn.setAttribute('aria-label', 'Dodaj aplikaciju na početni ekran');
      }
    } catch (e) {}
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showBtn('Instaliraj aplikaciju');
  });

  window.addEventListener('online', updateOfflineState);
  window.addEventListener('offline', updateOfflineState);
  updateOfflineState();
  if (isStandalone) return;

  btn.addEventListener('click', async function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(function () {});
      deferredPrompt = null;
      btn.hidden = true;
      return;
    }
    if (isIOS) openIosModal();
  });
})();

// ── COOKIE BANNER ──
(function(){
  var ov=document.getElementById('ck-overlay'),bx=document.getElementById('ck-box');
  if(!ov||!bx)return;
  if(!localStorage.getItem('laker_cookie_consent')){ov.style.display='';bx.style.display='';}
  document.getElementById('ck-yes').addEventListener('click',function(){
    localStorage.setItem('laker_cookie_consent','yes');
    ov.style.display='none';bx.style.display='none';
    if(typeof window._lakerLoadAnalytics==='function')window._lakerLoadAnalytics();
  });
  document.getElementById('ck-no').addEventListener('click',function(){
    localStorage.setItem('laker_cookie_consent','no');
    ov.style.display='none';bx.style.display='none';
  });
})();
