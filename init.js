// ── SENTRY ── učitava se tek kad je glavna nit slobodna (requestIdleCallback),
// da veliki Sentry bundle ne blokira renderovanje i ne diže TBT na PageSpeed-u.
(function(){
  // Samo pravi sajt prijavljuje greške. localhost, preview deploy i *.vercel.app
  // se preskaču — inače lokalno testiranje puni dnevnik lažnim "production" greškama.
  var host = location.hostname;
  if (host !== 'www.lakerdetailing.rs' && host !== 'lakerdetailing.rs') return;

  function loadSentry(){
    var s=document.createElement('script');
    s.src='https://browser.sentry-cdn.com/8.47.0/bundle.min.js';
    s.crossOrigin='anonymous';
    s.onload=function(){
      if(!window.Sentry) return;
      Sentry.init({
        dsn:'https://e8a5c3264a9a4dec0cd6d951e20028d5@o4511525862309888.ingest.de.sentry.io/4511525878825040',
        environment:'production',
        tracesSampleRate:0,
        ignoreErrors:[
          'ResizeObserver loop','Non-Error promise rejection','Script error.',
          // In-app pregledači (Instagram/Facebook/TikTok webview) ubacuju svoj
          // most ka native aplikaciji; on puca na iOS-u i nema veze sa sajtom.
          'window.webkit.messageHandlers',
          'webkit.messageHandlers',
          '_AutofillCallbackHandler'
        ],
        denyUrls:[/extension:\/\//i, /^chrome:\/\//i, /^about:/i],
        beforeSend:function(event){
          try{
            var v = event.exception && event.exception.values;
            var frames = v && v[0] && v[0].stacktrace && v[0].stacktrace.frames;
            if (frames && frames.length){
              // Skripte koje in-app pregledači ubacuju INLINE u stranicu nemaju
              // svoj fajl, pa ih pregledač prijavi pod URL-om dokumenta — filter
              // po nazivu fajla ih ne hvata. Prepoznaj ih po imenu funkcije.
              var INJECTED = /^(sendDataToNative|sendPageHideMessage|sendMessageToNative|_AutofillCallbackHandler|__fb|__ig)/;
              var injected = frames.some(function(f){
                return INJECTED.test(String(f.function || ''));
              });
              if (injected) return null;

              // Propusti samo greške čiji stack pokazuje na NAŠ kod. Sve ostalo
              // (dodaci pregledača, kod kucan u konzoli) je šum.
              var ours = frames.some(function(f){
                return String(f.filename || '').indexOf('lakerdetailing.rs') > -1;
              });
              if (!ours) return null;
            }
          }catch(e){}
          return event;
        }
      });
    };
    document.head.appendChild(s);
  }
  function scheduleSentry(){ if('requestIdleCallback' in window){requestIdleCallback(loadSentry,{timeout:5000});} else {setTimeout(loadSentry,2500);} }
  document.readyState==='complete'?scheduleSentry():window.addEventListener('load',scheduleSentry,{once:true});
})();

// ── ISKLJUČIVANJE SOPSTVENOG SAOBRAĆAJA ──
// Vlasnik otvori https://www.lakerdetailing.rs/?analitika=off  → ovaj uređaj se više
// ne broji ni u GA4, ni u Facebook Pixel-u, ni u Vercel Analytics-u.
// Vraćanje: ?analitika=on
// Radi po uređaju/pregledaču i ne zavisi od IP adrese — za razliku od GA filtera po IP-u,
// preživi promenu IP-a i pokriva i mobilni internet. Ponoviti na svakom uređaju.
(function(){
  try{
    var q = new URLSearchParams(location.search).get('analitika');
    if(q === 'off')      localStorage.setItem('laker_no_analytics','1');
    else if(q === 'on')  localStorage.removeItem('laker_no_analytics');
    window._lakerNoAnalytics = localStorage.getItem('laker_no_analytics') === '1';
    if(q){
      console.log('%cLaker analitika: ' + (window._lakerNoAnalytics ? 'ISKLJUČENA na ovom uređaju' : 'uključena'),
                  'color:#FF2A2A;font-weight:700;font-size:13px');
    }
  }catch(e){ window._lakerNoAnalytics = false; }
})();

// ── ANALYTICS (Google Consent Mode v2) ──
// GA4 se učitava SVIM posetiocima, ali dok nema pristanka radi bez kolačića
// (analytics_storage:'denied' → cookieless ping): posetu izbroji, ali ne prati osobu.
// Facebook Pixel i reklamni signali se pale TEK kad posetilac klikne "Prihvati".
(function(){
  if(window._lakerNoAnalytics) return;   // vlasnikov uređaj — ništa se ne učitava
  var GA_ID='G-DP87917XW3', FB_ID='27521788054080884';
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  window.gtag=gtag;

  // Podrazumevano sve odbijeno — mora da ide PRE učitavanja gtag skripte.
  gtag('consent','default',{
    ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    analytics_storage:'denied', functionality_storage:'granted', security_storage:'granted'
  });

  function _loadGA(){
    if(window._gaLoaded)return;
    window._gaLoaded=true;
    var ga=document.createElement('script');ga.async=true;
    ga.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
    document.head.appendChild(ga);
    gtag('js',new Date());
    gtag('config',GA_ID);
  }
  function _loadPixel(){
    if(window._fbqLoaded)return;
    window._fbqLoaded=true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',FB_ID);fbq('track','PageView');
  }

  // Poziva se iz cookie banera kad korisnik prihvati.
  window._lakerConsentGrant=function(){
    gtag('consent','update',{
      ad_storage:'granted', ad_user_data:'granted',
      ad_personalization:'granted', analytics_storage:'granted'
    });
    _loadPixel();
  };
  window._lakerLoadAnalytics=window._lakerConsentGrant; // stari naziv, radi isto

  var accepted=localStorage.getItem('laker_cookie_consent')==='yes';
  if(accepted){
    gtag('consent','update',{
      ad_storage:'granted', ad_user_data:'granted',
      ad_personalization:'granted', analytics_storage:'granted'
    });
  }
  // Vercel Web Analytics — učitava se odavde (a ne statičkim tagom u index.html)
  // da bi i on poštovao ?analitika=off. Bez kolačića, ne traži pristanak.
  function _loadVercel(){
    if(window._vercelLoaded) return;
    window._vercelLoaded = true;
    var v=document.createElement('script'); v.defer=true;
    v.src='/_vercel/insights/script.js';
    document.head.appendChild(v);
  }
  // GA tek kad je glavna nit slobodna (isto kao Sentry): gtag.js jede ~1,2 s CPU
  // na telefonu i bio je najveci deo Total Blocking Time na PageSpeed-u (2026-09-03).
  // page_view i dalje ode — gtag() red ceka u dataLayer-u dok se skripta ne ucita.
  function _bootGA(){ if('requestIdleCallback' in window){requestIdleCallback(_loadGA,{timeout:3000});} else {setTimeout(_loadGA,1500);} }
  function _boot(){ _bootGA(); _loadVercel(); if(accepted) _loadPixel(); }
  if(document.readyState==='complete'){_boot();}
  else{window.addEventListener('load',_boot,{once:true});}
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

// ── SCROLL REVEAL ── prebačen u assets/js/laker-ui.js
// (duplikat je ovde pravio drugi IntersectionObserver nad istim elementima).

// ── PWA REGISTRATION ──
(function registerPWA() {
  if (!('serviceWorker' in navigator)) return;
  const params = new URLSearchParams(location.search);
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  let swRegistration = null;
  let updateReady = false;
  let updatePoll = null;
  let refreshing = false;
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
    if (Notification.permission === 'denied') {
      throw new Error('Obaveštenja su blokirana u podešavanjima pregledača. Otvorite Podešavanja pregledača → Privatnost → Obaveštenja, pronađite ovaj sajt i dozvolite obaveštenja, zatim osvežite stranicu.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (permission === 'denied') {
        throw new Error('Obaveštenja su blokirana. Kliknite na ikonu katanca u adresnoj traci, dozvolite obaveštenja za ovaj sajt, pa osvežite stranicu.');
      }
      throw new Error('Dozvola za obaveštenja nije odobrena. Pokušajte ponovo i kliknite "Dozvoli" kada pregledač pita.');
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
  function applyUpdate(reg) {
    // Activate the freshly installed SW immediately → triggers controllerchange → auto-reload.
    if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  // Tihi update SAMO odmah po otvaranju (korisnik još ništa ne radi) — kasnije
  // se prikazuje baner umesto nasilnog reload-a usred čitanja/skrolovanja.
  function isEarlyInLoad() {
    return performance.now() < 3500 && (window.scrollY || 0) < 120;
  }
  // ── RESET LOZINKE: nikad ne reload-uj usred toka ──────────
  // main.js uhvati token iz #fragmenta, sacuva ga u window._recoveryToken i
  // ODMAH ocisti URL (history.replaceState). Ako SW u tom trenutku uradi tihi
  // reload, token je nepovratno izgubljen — URL vise nema fragment, a promenljiva
  // se brise sa stranicom. Korisnik zavrsi na obicnom sajtu i nema pojma zasto.
  // Race je bio zagarantovan: oba reload-a se okidaju bas kad i isEarlyInLoad().
  function recoveryInProgress() {
    return !!window._recoveryToken;
  }
  function promptOrApplyUpdate(reg) {
    updateReady = true;
    if (recoveryInProgress()) return;
    if (isEarlyInLoad()) { applyUpdate(reg); return; }
    showUpdateBanner();
  }
  function bindRegistration(reg) {
    swRegistration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) {
      promptOrApplyUpdate(reg);
    }
    reg.addEventListener('updatefound', function () {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          promptOrApplyUpdate(reg);
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
    if (!hadController || refreshing || recoveryInProgress()) return;
    refreshing = true;
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
  // ── BANER ZA OBAVESTENJA — UGASEN (2026-08-22, odluka vlasnika) ──────
  // Ranije se posetiocu posle ~2 s sam pojavio baner "Dozvoli / Kasnije" i,
  // na klik, trazio dozvolu za push obavestenja. Vlasnik ga ne zeli, pa se
  // vise NE PRIKAZUJE nikome i Notification.requestPermission() se ne poziva.
  //
  // Ostalo je netaknuto namerno: markup banera (#pwaPushBanner u index.html,
  // ima `hidden`), showPushBanner(), subscribeForPush() i dugmad. Ko je vec
  // ranije ukljucio obavestenja i dalje ih dobija, a paljenje je jedan poziv:
  //   if (Notification.permission === 'default') setTimeout(showPushBanner, 2200);
  //
  // NE zameniti ovo sa banerom "Nova verzija spremna" (#pwaUpdateBanner) —
  // to je druga stvar i ona ostaje ukljucena.

  // CONTENT_UPDATED: SW detektovao svež HTML (stale-while-revalidate + ETag poređenje).
  // Odmah po otvaranju → tihi reload (deluje kao deo učitavanja). Kasnije → baner,
  // jer nasilni reload usred skrolovanja izgleda kao da je sajt pukao.
  navigator.serviceWorker.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'CONTENT_UPDATED') return;
    if (refreshing) return;
    if (recoveryInProgress()) return;
    if (isEarlyInLoad()) {
      refreshing = true;
      location.reload();
      return;
    }
    showUpdateBanner();
  });

  // bfcache restore (back/forward) ostaje INSTANT — samo proveri update u pozadini,
  // ako ima novog sadržaja gornji mehanizmi (banner / SW update) to rešavaju.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) checkForUpdate();
  });
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
    if(typeof window._lakerConsentGrant==='function')window._lakerConsentGrant();
  });
  document.getElementById('ck-no').addEventListener('click',function(){
    localStorage.setItem('laker_cookie_consent','no');
    ov.style.display='none';bx.style.display='none';
    // GA ostaje u cookieless režimu (consent default = denied) — poseta se broji anonimno.
  });
})();

// ── PRAĆENJE INTERAKCIJA (GA4 eventi) ──
// Beleži šta posetilac zaista uradi: kontakt, dokle je stigao na strani.
(function(){
  function ev(name,params){ if(typeof window.gtag==='function') window.gtag('event',name,params||{}); }
  window._lakerEvent=ev;

  // 1) Klik na kontakt (WhatsApp / telefon / email / Instagram)
  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t || !t.closest) t = t && t.parentElement;
    var a = t && t.closest ? t.closest('a[href]') : null;
    if(!a) return;
    var href=a.getAttribute('href')||'';
    var sec=a.closest('section');
    var gde=(sec && sec.id) ? sec.id : 'ostalo';

    if(href.indexOf('wa.me/')>-1 || href.indexOf('api.whatsapp.com')>-1){
      ev('kontakt_whatsapp',{metod:'whatsapp',sekcija:gde});
      if(typeof window.fbq==='function') fbq('track','Contact',{content_name:'whatsapp'});
    } else if(href.indexOf('tel:')===0){
      ev('kontakt_telefon',{metod:'telefon',sekcija:gde});
      if(typeof window.fbq==='function') fbq('track','Contact',{content_name:'telefon'});
    } else if(href.indexOf('mailto:')===0){
      ev('kontakt_email',{metod:'email',sekcija:gde});
    } else if(href.indexOf('instagram.com')>-1){
      ev('klik_instagram',{sekcija:gde});
    }
  },true);

  // 2) Dokle su stigli — javi se kad sekcija pređe sredinu ekrana (jednom po poseti)
  if('IntersectionObserver' in window){
    var mapa={pkg:'paketi',care:'loyalty',prc:'cenovnik',faq:'faq',tst:'recenzije'};
    var io=new IntersectionObserver(function(list){
      for(var i=0;i<list.length;i++){
        if(!list[i].isIntersecting) continue;
        var el=list[i].target;
        io.unobserve(el);
        ev('sekcija_prikazana',{sekcija:mapa[el.id]||el.id});
      }
    },{rootMargin:'-50% 0px -50% 0px',threshold:0});
    Object.keys(mapa).forEach(function(id){
      var el=document.getElementById(id);
      if(el) io.observe(el);
    });
  }
})();
