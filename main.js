// ── VERZIJA SAJTA (ispis u konzoli — brza provera da li je updejt uhvatio) ──
try{var _sv=document.getElementById('siteVersion');console.log('%cLaker Detailing%c  '+(_sv?_sv.textContent.replace(/\s+/g,' ').trim():'verzija ?'),'color:#C0392B;font-weight:800;font-size:13px','color:#999;font-size:12px');}catch(e){}

// ── HTML ESCAPE (sprečava XSS kad ubacujemo korisnički tekst u innerHTML) ──
function escHtml(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── CUSTOM CURSOR (samo na uređajima sa mišem, ne na touch) ──
const cur=document.getElementById('cur'),cr=document.getElementById('cur-r');
const _hasHover=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
if(_hasHover){
  // transform umesto left/top = kompozitor, bez layout-a; rAF petlja staje kad se kursor smiri
  let mx=0,my=0,rx=0,ry=0,_curRaf=null;
  function _curTick(){
    _curRaf=null;
    rx+=(mx-rx)*.16;ry+=(my-ry)*.16;
    if(Math.abs(mx-rx)>.4||Math.abs(my-ry)>.4){
      cr.style.transform='translate3d('+rx+'px,'+ry+'px,0) translate(-50%,-50%)';
      _curRaf=requestAnimationFrame(_curTick);
    }else{
      rx=mx;ry=my;
      cr.style.transform='translate3d('+mx+'px,'+my+'px,0) translate(-50%,-50%)';
    }
  }
  document.addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    cur.style.transform='translate3d('+mx+'px,'+my+'px,0) translate(-50%,-50%)';
    if(!_curRaf)_curRaf=requestAnimationFrame(_curTick);
  },{passive:true});
  document.querySelectorAll('a,button,.si,.pk,.cs-card,.tst-card,.faq-q,.sz-lbl').forEach(el=>{
    el.addEventListener('mouseenter',()=>{cr.style.width='54px';cr.style.height='54px'},{passive:true});
    el.addEventListener('mouseleave',()=>{cr.style.width='32px';cr.style.height='32px'},{passive:true});
  });
}

// ── THEME TOGGLE ──
// document.documentElement.style.colorScheme mora pratiti temu, jer Chrome/Edge
// "force dark mode" inače auto-zatamni stranicu na desktopu kad root nema
// deklarisan color-scheme koji se slaže sa stvarnom pozadinom (radi ok na mobilnom).
const themeBtn=document.getElementById('themeBtn');
let _lakerTheme='dark';
try{
  const _ts=localStorage.getItem('laker-theme');
  if(_ts==='light'){document.body.classList.add('light');_lakerTheme='light';}
}catch(e){}
document.documentElement.style.colorScheme=_lakerTheme;
themeBtn.addEventListener('click',()=>{
  document.body.classList.toggle('light');
  _lakerTheme=document.body.classList.contains('light')?'light':'dark';
  document.documentElement.style.colorScheme=_lakerTheme;
  try{localStorage.setItem('laker-theme',_lakerTheme);}catch(e){}
});

// ── HORIZONTAL SCROLL PREVENTION — CSS rešenje ──────────────────────────
// touch-action:pan-y na html+body i overscroll-behavior-x:none blokira
// horizontalni scroll uključujući iOS Safari PWA standalone mod.
// Prethodni JS {passive:false} touchmove je UKLONJEN jer blokira nativni
// scroll browser-a i uzrokuje "zaglavljivanje" scrolla na mobilnom.

// ── HAMBURGER (mobile overlay) ──
const hbg=document.getElementById('hbg');
const mobileOverlay=document.getElementById('mobileOverlay');
let mobileMenuScrollY=0;
let mobileMenuOpen=false;
function openMobileMenu(){
  if(mobileMenuOpen) return;
  mobileMenuScrollY=window.scrollY||window.pageYOffset||0;
  mobileMenuOpen=true;
  mobileOverlay.classList.add('open');
  document.body.classList.add('menu-open');
  document.body.style.position='fixed';
  document.body.style.top='-'+mobileMenuScrollY+'px';
  document.body.style.width='100%';
  document.body.style.overflowY='hidden';
  document.documentElement.style.overflowX='hidden';
  const s=hbg.querySelectorAll('span');
  s[0].style.transform='rotate(45deg) translate(4px,5px)';
  s[1].style.opacity='0';
  s[2].style.transform='rotate(-45deg) translate(4px,-5px)';
}
function closeMobileMenu(){
  if(!mobileMenuOpen) return;
  mobileMenuOpen=false;
  mobileOverlay.classList.remove('open');
  document.body.classList.remove('menu-open');
  document.body.style.position='';
  document.body.style.top='';
  document.body.style.width='';
  document.body.style.overflowY='';
  document.documentElement.style.overflowX='';
  const s=hbg.querySelectorAll('span');
  s[0].style.transform='';s[1].style.opacity='';s[2].style.transform='';
  // Meni je držao body na position:fixed → dokument je na scrollY 0, pa poziciju
  // moramo vratiti. MORA sinhrono i bez animacije: html{scroll-behavior:smooth}
  // pretvara behavior:'auto' u SMOOTH, pa je restore startovao animaciju koja je
  // otimala skrol <a href="#sekcija"> linku i vraćala korisnika na staro mesto.
  // Ovako restore završi pre nego što browser odradi default akciju linka.
  const html=document.documentElement;
  const prevBehavior=html.style.scrollBehavior;
  html.style.scrollBehavior='auto';
  window.scrollTo(0,mobileMenuScrollY);
  html.style.scrollBehavior=prevBehavior;
}
hbg.addEventListener('click',()=>{
  mobileOverlay.classList.contains('open')?closeMobileMenu():openMobileMenu();
});
mobileOverlay.addEventListener('click',function(e){if(e.target===this)closeMobileMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu();});

// ── NAV SCROLL ──
window.addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('solid',scrollY>60),{passive:true});

// ── TABS ──
function ot(btn,id){
  document.querySelectorAll('.tb').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.tp').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');document.getElementById(id).classList.add('on');
}

// ── FAQ ACCORDION ──
function toggleFaq(btn){
  const item=btn.closest('.faq-item');
  const isOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
  if(!isOpen)item.classList.add('open');
}

// ── REVEAL — prebačen u inline #scroll-reveal-init u index.html.
// Sekcije se otkrivaju odmah, bez čekanja da se ovaj fajl skine sa mreže.

// ── DATE MIN ──
const di=document.getElementById('di');
if(di)di.min=new Date().toISOString().split('T')[0];


// ── VALIDACIJA EMAIL I TELEFON ──
function validateEmailField(inp){
  const v=inp.value.trim(), hint=document.getElementById('email_hint');
  if(!v){hint.textContent='';inp.classList.remove('input-ok','input-err');return;}
  const ok=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  hint.textContent = ok ? '✓ Email izgleda ispravno' : '⚠ Email izgleda neispravno — npr. ime@gmail.com';
  hint.className   = 'field-hint ' + (ok ? 'ok' : 'err');
  inp.classList.toggle('input-ok', ok); inp.classList.toggle('input-err', !ok);
}
function validatePhoneField(inp){
  const v=inp.value.trim().replace(/\s/g,''), hint=document.getElementById('phone_hint');
  if(!v){hint.textContent='';inp.classList.remove('input-ok','input-err');return;}
  const ok=/^(\+?381|0)(6[0-9])(\d{6,7})$/.test(v);
  hint.textContent = ok ? '✓ Broj izgleda ispravno' : '⚠ Unesite srpski broj — npr. 060 726 0302';
  hint.className   = 'field-hint ' + (ok ? 'ok' : 'err');
  inp.classList.toggle('input-ok', ok); inp.classList.toggle('input-err', !ok);
}
function hasValidationErrors(form){
  const eI=form.querySelector('[name=email]'), tI=form.querySelector('[name=telefon]');
  let err=false;
  if(eI){validateEmailField(eI); if(eI.classList.contains('input-err')) err=true;}
  if(tI){validatePhoneField(tI); if(tI.classList.contains('input-err')) err=true;}
  return err;
}

// ── FORM SUBMIT (Formspree) ──
async function handleSubmit(e){
  e.preventDefault();
  const form = e.target;

  // Anti-bot: honeypot + timing
  const _hp = form.querySelector('[name=website]');
  if (_hp && _hp.value) return;
  const _tEl = form.querySelector('[name=_t]');
  if (_tEl && _tEl.value && (Date.now() - parseInt(_tEl.value, 10)) < 2000) return;

  if(hasValidationErrors(form)){const fe=form.querySelector('.input-err');if(fe)fe.focus();return;}
  const btn  = form.querySelector('.f-btn');
  btn.textContent = 'Šaljem...';
  btn.disabled = true;

  const ime      = form.ime.value.trim().replace(/\b\w/g, c => c.toUpperCase());
  const email    = form.email.value.trim();
  const telefon  = form.telefon.value.trim();
  const auto     = form.auto.value.trim();
  const velicina = (()=>{ const r=form.velicina; if(!r) return '—'; if(r.value) return r.value; const c=form.querySelector('[name=velicina]:checked'); return c?c.value:'—'; })();
  const usluga   = form.usluga.value;
  const datum    = form.datum ? form.datum.value : '—';
  const napomena = form.napomena ? form.napomena.value.trim() : '—';

  // ── WhatsApp poruka klijentu ──
  // Formatiramo broj — uklanjamo razmake, +, 0 na pocetku i dodajemo 381
  function formatBroj(br){
    br = br.replace(/\s/g,'').replace(/^\+/,'').replace(/^0/,'381');
    if(!br.startsWith('381')) br = '381' + br;
    return br;
  }

  const waBroj = formatBroj(telefon);
  function toAscii(s){
    return String(s)
      .replace(/[čć]/g,'c').replace(/[ČĆ]/g,'C')
      .replace(/[š]/g,'s').replace(/[Š]/g,'S')
      .replace(/[ž]/g,'z').replace(/[Ž]/g,'Z')
      .replace(/[đ]/g,'dj').replace(/[Đ]/g,'DJ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  const _imeA = toAscii(ime).trim();
  const _lc = _imeA.slice(-1).toLowerCase();
  const _poz = ['a', 'e', 'i'].includes(_lc) ? 'Postovana' : 'Postovani';
  const waTekst = encodeURIComponent(
    _poz + ' ' + _imeA + ',\n\n' +
    'Vas zahtev je primljen u Laker Detailing Studio!\n\n' +
    'Auto: ' + toAscii(auto) + ' (' + toAscii(velicina) + ')\n' +
    'Usluga: ' + toAscii(usluga) + '\n' +
    'Datum: ' + (datum || 'nije naveden') + '\n' +
    'Vas telefon: ' + telefon + '\n\n' +
    'Javicemo Vam se sto pre radi potvrde termina.\n\n' +
    '060 726 0302\n' +
    '- Laker Detailing Studio, Cacak'
  );
  const waLink = `https://wa.me/${waBroj}?text=${waTekst}`;

  // ── Pošalji email via Brevo (serverless) pa otvori WhatsApp ──
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking',
        ime, email, telefon, auto, velicina, usluga,
        datum: datum || 'Po dogovoru',
        napomena: napomena || '—'
      })
    });
    // Sačuvaj kontakt u Supabase
    if(typeof gtag !== 'undefined') gtag('event', 'rezervacija', {event_category:'forma', event_label:usluga});
    if(typeof fbq  !== 'undefined') fbq('track', 'Lead', {content_name: usluga});
  } catch(err) {
    console.error('Brevo greška:', err);
    document.getElementById('fCont').style.display = 'none';
    document.getElementById('fOk').style.display   = 'block';
    const _okT = document.querySelector('.f-ok-t');
    const _okP = document.querySelector('.f-ok-p');
    if(_okT) _okT.textContent = 'Zahtev poslat putem WhatsApp-a.';
    if(_okP) _okP.innerHTML = 'Email potvrda možda nije stigla, ali vaš zahtev je prosleđen WhatsApp-om.<br><br>Javićemo se što pre radi potvrde termina.';
    btn.textContent = 'Pošaljite zahtev za termin \u00a0→';
    btn.disabled = false;
    setTimeout(() => { window.open(waLink, '_blank'); }, 400);
    return;
  }
  document.getElementById('fCont').style.display = 'none';
  document.getElementById('fOk').style.display   = 'block';
  setTimeout(() => { window.open(waLink, '_blank'); }, 800);
}


// ── SUPABASE CONFIG ──
const SB_URL  = 'https://raxdsanycyycroucxtmy.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheGRzYW55Y3l5Y3JvdWN4dG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTE0MjIsImV4cCI6MjA5NDkyNzQyMn0.DpXoeu6QKPBCm93Fuexmojkhqs-YwDOQUQp5bx6aMXc';

// ── UČITAJ ODOBRENE RECENZIJE ──
async function loadReviews(){
  if(SB_URL.includes('POSTAVI')) return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/testimonials?approved=eq.true&order=created_at.desc&limit=9`,{
      headers:{'apikey':SB_ANON,'Authorization':'Bearer '+SB_ANON}
    });
    const data=await r.json();
    const grid=document.getElementById('tst-dynamic');
    if(!Array.isArray(data)||data.length===0){
      grid.innerHTML='<div class="tst-empty">Budi prvi koji ostavlja utisak ↓</div>';
      return;
    }
    // Jedan red, lepa mreža — centrirana za mali broj
    const colClass = data.length===1?'tst-dynamic-grid tst-single':data.length===2?'tst-dynamic-grid tst-double':'tst-dynamic-grid';
    grid.innerHTML='<div class="'+colClass+'">'+data.map(t=>`
      <div class="tst-card rv in">
        <div class="tst-stars">${[...Array(Math.min(5,Math.max(1,t.rating||5)))].map(()=>'<span>★</span>').join('')}</div>
        <p class="tst-text">„${escHtml(t.text)}"</p>
        <div class="tst-author">${escHtml(t.name)}${t.car?' &nbsp;·&nbsp; <span>'+escHtml(t.car)+'</span>':''}${t.city?' &nbsp;·&nbsp; <span>'+escHtml(t.city)+'</span>':''}</div>
        <div class="tst-q" aria-hidden="true">"</div>
      </div>`).join('')+'</div>';
  }catch(e){console.log('Review load error',e)}
}
if(document.readyState==='complete'){loadReviews();}
else{window.addEventListener('load',loadReviews,{once:true});}

// ── REVIEW MODAL ──
let rmRating=5;
function openReviewModal(){
  const t=document.getElementById('_review_t');
  if(t) t.value=Date.now();
  const m=document.getElementById('reviewModal');
  m.style.display='flex';
  document.body.style.overflowY='hidden';
  setRating(5);
  document.getElementById('rmForm').style.display='block';
  document.getElementById('rmOk').style.display='none';
  // Resetuj polja da ne ostane stari tekst
  document.getElementById('rmName').value='';
  document.getElementById('rmCar').value='';
  document.getElementById('rmCity').value='';
  document.getElementById('rmText').value='';
  const btn=document.querySelector('.rm-btn');
  if(btn){btn.textContent='Pošalji utisak \u00a0→';btn.disabled=false;}
}
function closeReviewModal(){
  document.getElementById('reviewModal').style.display='none';
  document.body.style.overflowY='';
}
/* Review modal — backdrop click i Escape su NAMERNO isključeni da korisnik ne izgubi utisak koji kuca */

function setRating(n){
  rmRating=n;
  document.querySelectorAll('.rm-star').forEach(s=>{
    s.classList.toggle('active',parseInt(s.dataset.v)<=n);
  });
}

async function submitReview(){
  // Anti-bot: honeypot + timing
  const _hp=document.getElementById('_hp_review');
  if(_hp && _hp.value) return;
  const _tEl=document.getElementById('_review_t');
  if(_tEl && _tEl.value && (Date.now()-parseInt(_tEl.value,10))<1500) return;

  const name=document.getElementById('rmName').value.trim();
  const car=document.getElementById('rmCar').value.trim();
  const city=document.getElementById('rmCity').value.trim();
  const text=document.getElementById('rmText').value.trim();
  if(!name){alert('Molimo unesite vaše ime.');return;}
  if(!text){alert('Molimo napišite vaš utisak.');return;}

  const btn=document.querySelector('.rm-btn');
  btn.textContent='Šaljem...';
  btn.disabled=true;

  if(SB_URL.includes('POSTAVI')){
    // Demo mode — prikaži OK bez slanja
    document.getElementById('rmForm').style.display='none';
    document.getElementById('rmOk').style.display='block';
    return;
  }

  try{
    const r=await fetch('/api/send-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'testimonial', name, car, city, text, rating:rmRating, website:''})
    });
    const data=await r.json().catch(()=>({}));
    if(r.ok && data.success !== false){
      document.getElementById('rmForm').style.display='none';
      document.getElementById('rmOk').style.display='block';
      if(typeof window.gtag === 'function') window.gtag('event','recenzija_poslata',{ocena:rmRating, grad:city||'—'});
    }else{
      btn.textContent='Pošalji utisak →';
      btn.disabled=false;
      // Prikaži konkretnu poruku sa servera (prekratko, previše često, itd.)
      alert(data.error || 'Greška. Pokušaj ponovo ili nas kontaktiraj direktno.');
    }
  }catch(e){
    btn.textContent='Pošalji utisak →';
    btn.disabled=false;
    alert('Greška pri slanju. Proveri internet konekciju.');
  }
}



// ── Expandable package item info ──
function togglePkInfo(btn){
  btn.classList.toggle('open');
  var panel = btn.closest('.pk-li').querySelector('.pk-info');
  panel.classList.toggle('show');
}

// ── Loyalty registration: veličina vozila + plan ──
var _loyRegSz = 'ms', _loyRegPl = 'god';
var _loyPrices = { ms:{mes:'od €35/mes',god:'od €299 · uštedi 29%'}, vs:{mes:'od €40/mes',god:'od €349 · uštedi 27%'} };

function _setRegBtn(id, active){
  var el = document.getElementById(id); if(!el) return;
  el.classList.toggle('active', active);
}

function selectLoySize(val){
  if(_loyRegSz===val) return;
  _loyRegSz = val;
  document.getElementById('lreg-size') && (document.getElementById('lreg-size').value = val);
  _setRegBtn('lreg-sz-ms', val==='ms');
  _setRegBtn('lreg-sz-vs', val==='vs');
  _updateRegPrices();
}

function selectLoyPlan(val){
  if(_loyRegPl===val) return;
  _loyRegPl = val;
  document.getElementById('lreg-plan') && (document.getElementById('lreg-plan').value = val);
  _setRegBtn('lreg-pl-mes', val==='mes');
  _setRegBtn('lreg-pl-god', val==='god');
  _updateRegPrices();
}

function _updateRegPrices(){
  var p = _loyPrices[_loyRegSz] || _loyPrices.ms;
  var mp = document.getElementById('lreg-pl-mes-price');
  var gp = document.getElementById('lreg-pl-god-price');
  if(mp){ mp.textContent = p.mes; mp.style.color = _loyRegPl==='mes' ? '#C9A84C' : '#666'; }
  if(gp){ gp.textContent = p.god; gp.style.color = _loyRegPl==='god' ? '#C9A84C' : '#666'; }
}

// ── Loyalty sekcija: jedan paket, dva izbora (plaćanje + veličina) ──
var _loyBill = 'god';   // 'god' | 'mes'
var _loyVeh  = 'ms';    // 'ms'  | 'vs'
var LOY_TABLE = {
  ms: { mes:35, god:299, save:29, sub:'A klasa · C klasa · Hatchback · Sedan' },
  vs: { mes:40, god:349, save:27, sub:'E klasa · SUV · Van · Karavan' }
};
function selectLoyBill(b){ _loyBill = b; renderLoySection(); }
function selectLoyVeh(v){ _loyVeh = v; renderLoySection(); }
function renderLoySection(){
  var p = LOY_TABLE[_loyVeh] || LOY_TABLE.ms;
  var setOn = function(id,on){ var el=document.getElementById(id); if(el) el.classList.toggle('on', on); };
  setOn('bill-god', _loyBill==='god'); setOn('bill-mes', _loyBill==='mes');
  setOn('size-ms', _loyVeh==='ms');    setOn('size-vs', _loyVeh==='vs');
  var sub = document.getElementById('loy-veh-sub'); if(sub) sub.textContent = p.sub;
  var tag = document.getElementById('bill-god-tag'); if(tag) tag.textContent = '−'+p.save+'%';
  var num = document.getElementById('loy-price-num');
  var per = document.getElementById('loy-price-per');
  var note= document.getElementById('loy-price-note');
  var pill= document.getElementById('loy-save-pill');
  if(_loyBill==='god'){
    if(num) num.textContent = p.god;
    if(per) per.textContent = ' /god';
    if(note) note.textContent = '= €'+(p.god/12).toFixed(2)+' mesečno';
    if(pill){ pill.style.display=''; pill.textContent = '✦ Uštedi '+p.save+'% vs mesečno'; }
  } else {
    if(num) num.textContent = p.mes;
    if(per) per.textContent = ' /mes';
    if(note) note.textContent = 'fleksibilno · otkažite kad hoćete';
    if(pill) pill.style.display='none';
  }
}
// CTA — pretpopuni registracionu formu izborom iz sekcije, pa otvori modal
function activateLoyalty(){
  try{
    if(typeof selectLoySize==='function') selectLoySize(_loyVeh);
    if(typeof selectLoyPlan==='function') selectLoyPlan(_loyBill);
  }catch(e){}
  if(typeof openLoyalty==='function') openLoyalty();
}
renderLoySection();

// ══════════════════════════════════════════
// LOYALTY SYSTEM — LAKER DETAILING v2.1
// ══════════════════════════════════════════
(function(){
const SB   = 'https://raxdsanycyycroucxtmy.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheGRzYW55Y3l5Y3JvdWN4dG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTE0MjIsImV4cCI6MjA5NDkyNzQyMn0.DpXoeu6QKPBCm93Fuexmojkhqs-YwDOQUQp5bx6aMXc';

let _user    = null;
let _profile = null;

function $(id){ return document.getElementById(id); }

// ── REST helper ──────────────────────────
async function api(path, opts={}){
  const tok = (_user && _user.access_token) || ANON;
  const res = await fetch(SB + path, {
    method: opts.method || 'GET',
    headers: {
      'apikey':        ANON,
      'Authorization': 'Bearer ' + tok,
      'Content-Type':  'application/json',
      'Prefer':        opts.prefer || ''
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if(opts.raw) return res;
  if(res.status === 204 || res.status === 201) return {ok:true};
  try{ return await res.json(); } catch(e){ return null; }
}

// ── OPEN / CLOSE ─────────────────────────
window.openLoyalty = function(){
  $('loyOverlay').style.display = 'flex';
  document.body.style.overflowY  = 'hidden';
  // Restart modal entry animation on each open
  const _box = $('loyOverlay').firstElementChild;
  if(_box){_box.style.animation='none';_box.offsetHeight;_box.style.animation='loy-modal-in .38s cubic-bezier(.34,1.3,.64,1) both'}
  // Lazy-load Google Identity script only when modal actually opens (not on page load)
  initLoyaltyGoogleBtn();
  if(_user){
    // Korisnik je ulogovan — prikaži dashboard (ne resetuj tab)
    const dash = $('loy-dash');
    const dashReady = dash && dash.style.display !== 'none'
      && dash.innerHTML.trim().length > 50
      && !dash.innerHTML.includes('UČITAVANJE');
    if(!dashReady){
      loadAndShowDash();
    } else {
      // Dashboard je već učitan, samo se pobrinemo da je vidljiv
      $('loy-auth-area').style.display = 'none';
      $('loy-dash').style.display = 'block';
    }
  } else {
    // Nije ulogovan — uvek loyalty tab sa login formom
    window.loyProgramTab('loyalty');
    showAuthArea();
  }
};
window.closeLoyalty = function(){
  // Blokira zatvaranje samo dok je recovery token aktivan (korisnik unosi novu lozinku)
  if (window._recoveryToken) return;
  $('loyOverlay').style.display = 'none';
  document.body.style.overflowY  = '';
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    // Ne zatvara loyalty ako je care modal ili review modal otvoren iznad
    const careOpen = document.getElementById('care-modal-overlay')?.classList.contains('open');
    const reviewOpen = document.getElementById('reviewModal')?.style.display === 'flex';
    if (!careOpen && !reviewOpen) window.closeLoyalty();
  }
});

// ── TABS ─────────────────────────────────
window.loyTab = function(t){
  $('loy-form-login').style.display = t === 'login' ? 'block' : 'none';
  $('loy-form-reg').style.display   = t === 'reg'   ? 'block' : 'none';
  const tl = $('tab-login'), tr = $('tab-reg');
  if(tl){ tl.classList.toggle('active', t === 'login'); }
  if(tr){ tr.classList.toggle('active', t === 'reg'); }
  const slider = $('loy-tab-slider');
  if(slider) slider.style.left = t === 'login' ? '0' : '50%';
};

window.loyProgramTab = function(program){
  window._loyActiveProgram = 'loyalty';
  const dash = $('loy-dash');
  if(dash && dash.style.display !== 'none' && _user) return;
  $('loy-auth-area').style.display = 'block';
  if ($('loy-form-login').style.display === 'none' && $('loy-form-reg').style.display === 'none') {
    window.loyTab('login');
  }
};

function showAuthArea(){
  window._loyActiveProgram = 'loyalty';
  $('loy-auth-area').style.display = 'block';
  $('loy-dash').style.display      = 'none';
  window.loyTab('login');
}

function setMsg(id, txt, ok){
  const el = $(id); if(!el) return;
  el.textContent = txt;
  el.style.display = txt ? 'block' : 'none';
  el.style.color = ok === true ? '#27AE60' : ok === false ? '#E8C96A' : '#888';
}

function validateStrongPassword(pw){
  const value = String(pw || '');
  const issues = [];
  if (value.length < 10) issues.push('najmanje 10 karaktera');
  if (!/[a-z]/.test(value)) issues.push('malo slovo');
  if (!/[A-Z]/.test(value)) issues.push('veliko slovo');
  if (!/\d/.test(value)) issues.push('broj');
  if (!/[^\w\s]/.test(value)) issues.push('simbol');
  return {
    ok: issues.length === 0,
    issues
  };
}

function updatePasswordHint(inputId, hintId){
  const input = $(inputId);
  const hint  = $(hintId);
  if (!input || !hint) return;
  const value = getPasswordRawValue(input);
  if (!value) {
    hint.textContent = 'Koristi veliko i malo slovo, broj i simbol. To je mnogo sigurnije.';
    hint.className = 'pw-hint';
    return;
  }

  const state = validateStrongPassword(value);
  if (state.ok) {
    hint.textContent = '✓ Lozinka je dovoljno jaka.';
    hint.className = 'pw-hint ok';
  } else {
    hint.textContent = 'Još nedostaje: ' + state.issues.join(', ') + '.';
    hint.className = 'pw-hint warn';
  }
}

function updatePasswordMeter(inputId, meterId){
  const input = $(inputId);
  const meter = $(meterId);
  if (!input || !meter) return;

  const value = getPasswordRawValue(input);
  const checks = [
    value.length >= 10,
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^\w\s]/.test(value)
  ];
  const score = checks.filter(Boolean).length;
  const level = score === 0 ? 0 : score === 1 ? 1 : score === 2 ? 2 : score === 3 ? 3 : 4;
  meter.className = 'pw-meter m' + level;

  const labels = ['Slaba', 'Osnovna', 'Srednja', 'Jaka', 'Odlična'];
  const desc = [
    'Dodaj minimum 10 karaktera',
    'Dodaj veliko slovo',
    'Dodaj broj',
    'Dodaj simbol',
    'Lozinka izgleda dobro'
  ];

  const labelEl = meter.querySelector('[data-meter-label]');
  const descEl = meter.querySelector('[data-meter-desc]');
  if (labelEl) labelEl.textContent = labels[level];
  if (descEl) descEl.textContent = value ? desc[Math.min(level, desc.length - 1)] : 'Kucaj lozinku da vidiš jačinu';
}

function makePasswordMeter(id){
  return `
    <div class="pw-meter m0" id="${id}">
      <div class="pw-meter-bar"><div class="pw-meter-fill"></div></div>
      <div class="pw-meter-txt"><span data-meter-label>Slaba</span><strong data-meter-desc>Kucaj lozinku da vidiš jačinu</strong></div>
    </div>
  `;
}

const PW_MASK_CHAR = '•';

function getPasswordRawValue(input){
  return input && input.dataset && typeof input.dataset.pwRaw === 'string' ? input.dataset.pwRaw : (input ? input.value || '' : '');
}

function maskPasswordValue(value, keepLast = true){
  const raw = String(value || '');
  if (!raw) return '';
  if (!keepLast || raw.length === 1) return PW_MASK_CHAR.repeat(raw.length);
  return PW_MASK_CHAR.repeat(raw.length - 1) + raw.slice(-1);
}

function renderPasswordField(input, { visible = false, flashLast = false } = {}){
  if (!input) return;
  clearTimeout(input._pwMaskTimer);
  const raw = String(getPasswordRawValue(input));
  input.dataset.pwVisible = visible ? '1' : '0';
  input.type = 'text';
  input.value = visible ? raw : (flashLast ? maskPasswordValue(raw, true) : maskPasswordValue(raw, false));
  if (!visible && flashLast && raw) {
    input._pwMaskTimer = setTimeout(() => {
      if (input.dataset.pwVisible === '1') return;
      input.value = maskPasswordValue(getPasswordRawValue(input), false);
    }, 500);
  }
}

function setPasswordVisible(input, button, visible){
  renderPasswordField(input, { visible, flashLast: false });
  if (button) {
    button.textContent = visible ? '🙈' : '👁';
    button.classList.toggle('on', visible);
    button.setAttribute('aria-label', visible ? 'Sakrij lozinku' : 'Prikaži lozinku');
    button.title = visible ? 'Sakrij lozinku' : 'Prikaži lozinku';
  }
}

function syncPasswordToggleButton(button, input){
  if (!button || !input) return;
  const visible = input.dataset.pwVisible === '1';
  button.type = 'button';
  button.textContent = visible ? '🙈' : '👁';
  button.title = visible ? 'Sakrij lozinku' : 'Prikaži lozinku';
  button.setAttribute('aria-label', visible ? 'Sakrij lozinku' : 'Prikaži lozinku');
  button.classList.toggle('on', visible);
}

function findPasswordToggleForInput(input){
  if (!input || !input.id) return null;
  return document.querySelector(`.pw-toggle[data-pw-toggle="${input.id}"]`);
}

function initPasswordControls(){
  document.querySelectorAll('.pw-toggle[data-pw-toggle]').forEach(button => {
    const input = document.getElementById(button.dataset.pwToggle);
    if (!input) return;
    if (!input.dataset.pwVisible) input.dataset.pwVisible = '0';
    input.dataset.pwRaw = input.value || '';
    input.type = 'text';
    syncPasswordToggleButton(button, input);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const visible = input.dataset.pwVisible === '1';
      setPasswordVisible(input, button, !visible);
      input.focus({ preventScroll: true });
    });
    if (input.dataset.pwHint) updatePasswordHint(input.id, input.dataset.pwHint);
    if (input.dataset.pwMeter) updatePasswordMeter(input.id, input.dataset.pwMeter);
    if (input.dataset.pwVisible !== '1') renderPasswordField(input, { visible: false, flashLast: false });
  });
}

document.addEventListener('beforeinput', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!findPasswordToggleForInput(input)) return;
  if (input.dataset.pwVisible === '1') {
    input.dataset.pwRaw = input.value || '';
    return;
  }

  const raw = String(getPasswordRawValue(input));
  const start = typeof input.selectionStart === 'number' ? input.selectionStart : raw.length;
  const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : raw.length;
  let next = raw;

  if (event.inputType === 'insertText' || event.inputType === 'insertCompositionText') {
    next = raw.slice(0, start) + (event.data || '') + raw.slice(end);
  } else if (event.inputType === 'insertFromPaste') {
    next = raw.slice(0, start) + (event.data || '') + raw.slice(end);
  } else if (event.inputType === 'deleteContentBackward') {
    if (start !== end) next = raw.slice(0, start) + raw.slice(end);
    else if (start > 0) next = raw.slice(0, start - 1) + raw.slice(end);
  } else if (event.inputType === 'deleteContentForward') {
    if (start !== end) next = raw.slice(0, start) + raw.slice(end);
    else if (start < raw.length) next = raw.slice(0, start) + raw.slice(start + 1);
  } else {
    return;
  }

  event.preventDefault();
  input.dataset.pwRaw = next;
  renderPasswordField(input, { visible: false, flashLast: true });
  if (input.dataset.pwHint) updatePasswordHint(input.id, input.dataset.pwHint);
  if (input.dataset.pwMeter) updatePasswordMeter(input.id, input.dataset.pwMeter);
  if (typeof input.setSelectionRange === 'function') {
    const pos = input.value.length;
    input.setSelectionRange(pos, pos);
  }
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!findPasswordToggleForInput(input)) return;
  if (input.dataset.pwVisible === '1') {
    input.dataset.pwRaw = input.value || '';
  } else {
    const raw = getPasswordRawValue(input);
    const masked = maskPasswordValue(raw, false);
    const flashMasked = maskPasswordValue(raw, true);
    if (input.value && input.value !== masked && input.value !== flashMasked) {
      input.dataset.pwRaw = input.value || '';
      renderPasswordField(input, { visible: false, flashLast: false });
    }
  }
  if (input.dataset.pwHint) updatePasswordHint(input.id, input.dataset.pwHint);
  if (input.dataset.pwMeter) updatePasswordMeter(input.id, input.dataset.pwMeter);
});

document.addEventListener('blur', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!findPasswordToggleForInput(input)) return;
  clearTimeout(input._pwMaskTimer);
  if (input.dataset.pwVisible !== '1') renderPasswordField(input, { visible: false, flashLast: false });
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPasswordControls();
    const bt = document.getElementById('_booking_t');
    if (bt) bt.value = Date.now();
  }, { once: true });
} else {
  initPasswordControls();
  const bt = document.getElementById('_booking_t');
  if (bt) bt.value = Date.now();
}

function resetAccountPricing(){}
function applyAccountPricing(profile){}

// ── VALIDACIJA TELEFONA (SRPSKI FORMAT) ──────────────────
function isValidPhone(phone) {
  const cleaned = phone.replace(/\s/g,'');
  return /^(\+?381|0)(6[0-9])(\d{6,7})$/.test(cleaned);
}

// ── FORGOT PASSWORD ───────────────────────────────────────
window.loyForgotPassword = function() {
  const area = document.getElementById('forgot-area');
  area.style.display = area.style.display === 'none' ? 'block' : 'none';
  const emailVal = document.getElementById('llog-email')?.value || '';
  if (emailVal) document.getElementById('forgot-email').value = emailVal;
};

window.sendPasswordReset = async function() {
  const email = document.getElementById('forgot-email').value.trim();
  const msgEl = document.getElementById('forgot-msg');
  if (!email) {
    msgEl.style.cssText = 'display:block;color:#E8C96A;background:rgba(229,57,53,.08);border-left:2px solid #E8C96A;padding:9px 12px';
    msgEl.textContent = 'Unesite email adresu.';
    return;
  }
  try {
    const redirectTo = window.location.origin + window.location.pathname + '#recovery';
    const res = await fetch(SB + '/auth/v1/recover', {
      method: 'POST',
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirect_to: redirectTo })
    });
    msgEl.style.cssText = 'display:block;color:#27AE60;background:rgba(76,175,80,.08);border-left:2px solid #27AE60;padding:9px 12px';
    msgEl.textContent = '✓ Link za reset je poslat na ' + email + '. Proverite inbox (i spam folder).';
  } catch(e) {
    msgEl.style.cssText = 'display:block;color:#E8C96A;background:rgba(229,57,53,.08);border-left:2px solid #E8C96A;padding:9px 12px';
    msgEl.textContent = 'Greška. Pokušajte ponovo.';
  }
};

// ── RECOVERY TOKEN DETEKCIJA (password reset link) ───────
(function checkRecoveryHash() {
  const hash = window.location.hash.substring(1);
  const search = window.location.search.substring(1);
  const raw = [hash, search].filter(Boolean).join('&');
  if (!raw) return;
  const params = {};
  raw.split('&').forEach(p => {
    const [k, v] = p.split('=');
    params[k] = decodeURIComponent(v || '');
  });
  const recoveryToken = params.access_token || params.token || params.token_hash || '';
  // Samo recovery tip – ne uključujemo Google OAuth callback (type=bearer)
  const isRecovery = params.type === 'recovery' || params.recovery === '1';
  if (isRecovery && recoveryToken) {
    window._recoveryToken = recoveryToken;
    history.replaceState(null, '', window.location.pathname);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        openLoyalty();
        document.getElementById('loy-auth-area').style.display = 'none';
        document.getElementById('loy-form-new-pass').style.display = 'block';
      });
    } else {
      openLoyalty();
      document.getElementById('loy-auth-area').style.display = 'none';
      document.getElementById('loy-form-new-pass').style.display = 'block';
    }
    return;
  }
  if (params.type === 'recovery' || params.recovery === '1') {
    openLoyalty();
    document.getElementById('loy-auth-area').style.display = 'none';
    document.getElementById('loy-form-new-pass').style.display = 'block';
    const _msg = document.getElementById('new-pass-msg');
    if(_msg){ _msg.style.cssText = 'display:block;color:#E8C96A;background:rgba(229,57,53,.08);border-left:2px solid #E8C96A;padding:9px 12px'; _msg.textContent = 'Link je otvoren, ali token nije stigao. Zatražite novi reset link.'; }
  }
})();

window.submitNewPassword = async function() {
  const p1  = getPasswordRawValue(document.getElementById('new-pass-1'));
  const p2  = getPasswordRawValue(document.getElementById('new-pass-2'));
  const msg = document.getElementById('new-pass-msg');

  const showMsg = (text, ok) => {
    msg.style.cssText = ok
      ? 'display:block;color:#27AE60;background:rgba(76,175,80,.08);border-left:2px solid #27AE60;padding:9px 12px'
      : 'display:block;color:#E8C96A;background:rgba(229,57,53,.08);border-left:2px solid #E8C96A;padding:9px 12px';
    msg.textContent = text;
  };

  const strong = validateStrongPassword(p1);
  if (!p1) { showMsg('Unesite novu lozinku.', false); return; }
  if (!strong.ok) { showMsg('Lozinka mora imati najmanje 10 karaktera, veliko i malo slovo, broj i simbol.', false); return; }
  if (p1 !== p2)             { showMsg('Lozinke se ne poklapaju.', false); return; }
  if (!window._recoveryToken){ showMsg('Token je istekao. Zatražite novi reset link.', false); return; }

  try {
    const res = await fetch(SB + '/auth/v1/user', {
      method:  'PUT',
      headers: {
        'apikey':        ANON,
        'Authorization': 'Bearer ' + window._recoveryToken,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ password: p1 })
    });
    const d = await res.json();
    if (!res.ok) { showMsg(d.error_description || d.msg || 'Greška. Pokušajte ponovo.', false); return; }

    showMsg('✓ Lozinka uspešno promenjena! Možete se prijaviti.', true);
    window._recoveryToken = null;
    setTimeout(() => {
      document.getElementById('loy-form-new-pass').style.display = 'none';
      document.getElementById('loy-auth-area').style.display = 'block';
      loyTab('login');
    }, 2000);
  } catch(e) {
    showMsg('Greška. Pokušajte ponovo.', false);
  }
};

// ── REGISTRACIJA ─────────────────────────
// Korak: validacija → provjera jedinstvenosti → signup → login → INSERT profil
window.loyRegister = async function(){
  const firstName = $('lreg-name').value.trim();
  const surname   = $('lreg-surname').value.trim();
  const email     = $('lreg-email').value.trim();
  const pass      = getPasswordRawValue($('lreg-pass'));
  const phone     = $('lreg-phone').value.trim().replace(/\s/g,'');
  const planType  = (document.getElementById('lreg-plan')?.value) || _loyRegPl || 'god';
  const carSize   = (document.getElementById('lreg-size')?.value) || _loyRegSz || 'ms';

  // ── Validacija svih polja ────────────────────────────────
  if (!firstName || !surname) {
    setMsg('lreg-msg', 'Unesite ime i prezime.', false); return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    setMsg('lreg-msg', 'Unesite ispravnu email adresu.', false); return;
  }
  if (!phone || !isValidPhone(phone)) {
    setMsg('lreg-msg', 'Unesite ispravan srpski broj telefona (npr. 060 726 0302).', false); return;
  }
  const pwState = validateStrongPassword(pass);
  if (!pwState.ok) {
    setMsg('lreg-msg', 'Lozinka mora imati najmanje 10 karaktera, veliko i malo slovo, broj i simbol.', false); return;
  }

  const btn = $('lreg-btn');
  btn.textContent = 'Proveravam...';
  btn.disabled = true;
  setMsg('lreg-msg', '', null);

  btn.textContent = 'Kreiram nalog...';

  try {
  // KORAK 1: Signup
  const signupRes = await fetch(SB + '/auth/v1/signup', {
    method: 'POST',
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  const signupData = await signupRes.json();

  if (signupData.error) {
    const m = signupData.error.message || '';
    setMsg('lreg-msg',
      (m.includes('already') || m.includes('registered'))
        ? 'Email već postoji — prijavite se.'
        : (m || 'Greška pri registraciji.'),
      false
    );
    btn.textContent = 'Napravi nalog →'; btn.disabled = false; return;
  }

  // KORAK 2: Odmah login da dobijemo access_token
  const loginRes = await fetch(SB + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  const loginData = await loginRes.json();

  if (!loginData.access_token) {
    setMsg('lreg-msg', '✅ Nalog kreiran! Proverite email za potvrdu, pa se prijavite.', true);
    btn.textContent = 'Napravi nalog →'; btn.disabled = false;
    $('llog-email').value = email;
    setTimeout(() => window.loyTab('login'), 1500); return;
  }

  // KORAK 3: Postavi usera
  _user = { id: loginData.user.id, email: loginData.user.email, access_token: loginData.access_token };

  // KORAK 4: Veži postojeći profil ili napravi novi
  const fullName = firstName + ' ' + surname;
  const [byEmail, byPhone] = await Promise.all([
    api('/rest/v1/loyalty_customers?email=eq.' + encodeURIComponent(email) + '&select=*'),
    api('/rest/v1/loyalty_customers?phone=eq.' + encodeURIComponent(phone) + '&select=*')
  ]);
  const existing = Array.isArray(byEmail) && byEmail.length ? byEmail[0] : (Array.isArray(byPhone) && byPhone.length ? byPhone[0] : null);

  if (existing) {
    await api('/rest/v1/loyalty_customers?id=eq.' + existing.id, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        auth_user_id: _user.id,
        name:    existing.name    || fullName,
        surname: existing.surname || surname,
        email,
        phone,
        plan_type: existing.plan_type || planType,
        car_size:  existing.car_size  || carSize
      }
    });
  } else {
    await api('/rest/v1/loyalty_customers', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        auth_user_id: _user.id,
        name:         fullName,
        surname:      surname,
        email,
        phone,
        plan_type:    planType,
        car_size:     carSize,
        wash_count:   0
        // care_plan se NE postavlja — čeka odobrenje od admina
      }
    });
  }

  // KORAK 5: Pošalji email potvrde prijave (NE welcome — to šalje admin kad odobri)
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'loyalty_registration',
      ime: firstName,
      email,
      telefon: phone,
      plan_type: planType,
      car_size: carSize
    })
  }).catch(() => {});

  // KORAK 6: Sačuvaj sesiju i prikaži dashboard
  if(typeof window.gtag === 'function') window.gtag('event','loyalty_prijava',{plan:planType, velicina:carSize, izvor:'sajt'});
  if(typeof window.fbq  === 'function') window.fbq('track','Lead',{content_name:'loyalty '+planType});
  saveSession(_user);
  updateNavBtn(firstName || _user.email, 0);
  btn.textContent = 'Napravi nalog →'; btn.disabled = false;
  loadAndShowDash();
  } catch(e) {
    setMsg('lreg-msg', 'Greška u mreži. Proverite konekciju i pokušajte ponovo.', false);
    btn.textContent = 'Napravi nalog →'; btn.disabled = false;
  }
};

// ── LOGIN ─────────────────────────────────
window.loyLogin = async function(){
  const email = $('llog-email').value.trim();
  const pass  = getPasswordRawValue($('llog-pass'));
  if(!email || !pass){
    setMsg('llog-msg', 'Unesite email i lozinku.', false);
    return;
  }
  const btn = $('llog-btn');
  btn.textContent = 'Prijavljujem...';
  btn.disabled = true;
  setMsg('llog-msg', '', null);

  try {
    const res = await fetch(SB + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const d = await res.json();

    if(!d.access_token){
      setMsg('llog-msg',
        d.error_description || d.error?.message || 'Pogrešan email ili lozinka.',
        false
      );
      btn.textContent = 'Prijavi se →';
      btn.disabled = false;
      return;
    }

    _user = { id: d.user.id, email: d.user.email, access_token: d.access_token };
    saveSession(_user);
    updateNavBtn(_user.email);
    btn.textContent = 'Prijavi se →';
    btn.disabled = false;
    loadAndShowDash();
  } catch(e) {
    setMsg('llog-msg', 'Greška u mreži. Proverite konekciju i pokušajte ponovo.', false);
    btn.textContent = 'Prijavi se →';
    btn.disabled = false;
  }
};

// ── LOGOUT ───────────────────────────────
window.loyIsLoggedIn = function(){ return !!_user; };
window.loyLogout = function(){
  // Lokalna sesija se uvek briše odmah — čak i ako server-side logout ne uspe
  const tok = _user ? _user.access_token : null;
  _user = null; _profile = null;
  window._loyActiveProgram = 'loyalty';
  clearSession();
  const nb = $('loyNavBtn');
  if(nb) nb.innerHTML = 'PRIJAVA <span class="loy-nav-email" id="loyNavEmail" style="display:none"></span>';
  showAuthArea();
  // Server-side invalidacija tokena (fire-and-forget — sesija je već lokalno obrisana)
  if(tok){
    fetch(SB + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + tok }
    }).catch(() => {});
  }
};

// ── LOAD DASHBOARD ────────────────────────
async function loadAndShowDash(){
  $('loy-auth-area').style.display = 'none';
  const dash = $('loy-dash');
  dash.style.display = 'block';
  dash.innerHTML = '<div style="padding:48px 44px;text-align:center;color:#555;font-size:11px;letter-spacing:3px;text-transform:uppercase">UČITAVANJE...</div>';

  // Pokušaj da nađeš profil
  let profiles = await api('/rest/v1/loyalty_customers?auth_user_id=eq.' + _user.id + '&select=*&limit=1');
  _profile = Array.isArray(profiles) ? profiles[0] : null;

  // Ako profil ne postoji po auth_user_id — pokusaj po email-u
  // (slucaj: admin je odobrio loyalty plan pre nego sto je korisnik napravio nalog)
  if(!_profile){
    const byEmail = await api('/rest/v1/loyalty_customers?email=eq.' + encodeURIComponent(_user.email) + '&auth_user_id=is.null&select=*&limit=1');
    const emailProfile = Array.isArray(byEmail) ? byEmail[0] : null;
    if(emailProfile){
      // Nadjeno po email-u bez auth_user_id — povezemo nalog
      await api('/rest/v1/loyalty_customers?id=eq.' + emailProfile.id, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { auth_user_id: _user.id }
      });
      profiles = await api('/rest/v1/loyalty_customers?auth_user_id=eq.' + _user.id + '&select=*&limit=1');
      _profile = Array.isArray(profiles) ? profiles[0] : null;
    }
  }

  // Ako i dalje nema profila — kreiraj novi (novi loyalty clan)
  if(!_profile){
    const newName = _googleName || _user.email.split('@')[0];
    _googleName = null;
    await api('/rest/v1/loyalty_customers', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        auth_user_id: _user.id,
        name:         newName,
        email:        _user.email,
        phone:        null,
        wash_count:   0
      }
    });
    profiles = await api('/rest/v1/loyalty_customers?auth_user_id=eq.' + _user.id + '&select=*&limit=1');
    _profile = Array.isArray(profiles) ? profiles[0] : null;
  }

  if(!_profile){
    dash.innerHTML = '<div style="padding:32px 44px;color:#888;font-size:13px;line-height:1.8">Greška pri kreiranju profila.<br>Proverite internet konekciju i pokušajte ponovo.</div>';
    return;
  }

  const washes = await api('/rest/v1/loyalty_washes?customer_id=eq.' + _profile.id + '&order=service_date.desc,created_at.desc&select=*&limit=50');
  const washArr = Array.isArray(washes) ? washes : [];

  renderDash(dash, _profile, washArr);
  updateNavBtn(_profile.name ? _profile.name.split(' ')[0] : _user.email, _profile.wash_count);
}

function renderDash(dash, p, washes){
  const firstName = escHtml((p.name || '').split(' ')[0] || 'klijente');

  // Ako nema odobrenog plana — prikaži pending stanje
  if (!p.care_plan) {
    const isGod = p.plan_type === 'god';
    const isVS  = p.car_size  === 'vs';
    const planLabel  = isGod ? 'Godišnji plan' : (p.plan_type === 'mes' ? 'Mesečni plan' : '—');
    const velLabel   = isVS  ? 'Veliki / SUV'  : (p.car_size  === 'ms' ? 'Mali / Srednji' : '—');
    const priceLabel = isVS
      ? (isGod ? '€349 / godišnje' : '€40 / mesečno')
      : (isGod ? '€299 / godišnje' : '€35 / mesečno');
    dash.innerHTML = `
      <div style="padding-bottom:44px">
        <div style="padding-top:26px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;margin-bottom:4px">
            Zdravo, <em style="font-style:italic;color:#C9A84C">${firstName}</em>
          </div>
          <div style="font-size:12px;color:#555;margin-bottom:22px;font-weight:300">${escHtml(p.email || '')}</div>

          <div style="background:#141414;border-left:2px solid #F2C200;padding:22px 24px;margin-bottom:4px">
            <div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#F2C200;margin-bottom:10px;font-weight:700">⏳ PRIJAVA NA ČEKANJU</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:300;color:#F2F0EC;margin-bottom:8px">
              Vaša prijava je <em style="font-style:italic;color:#F2C200">primljena</em>
            </div>
            <p style="font-size:13px;color:#888;line-height:1.8;margin:0">
              Pregledaćemo je i javiti se u najkraćem roku radi potvrde i zakazivanja prvog termina.
            </p>
          </div>

          <div style="background:#141414;padding:18px 22px;margin-bottom:4px">
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:10px;font-weight:700">Prijavljeni plan</div>
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
              <div>
                <div style="font-size:15px;color:#F2F0EC;font-weight:500">${planLabel}</div>
                <div style="font-size:12px;color:#666;margin-top:3px">${priceLabel}</div>
              </div>
              <div style="font-size:13px;color:#888">${velLabel}</div>
            </div>
          </div>

          <div style="background:#141414;padding:16px 22px;margin-bottom:20px">
            <div style="font-size:12px;color:#555;line-height:1.7">
              Pitanja ili žurba — WhatsApp:
              <a href="https://wa.me/381607260302" target="_blank" rel="noopener noreferrer" style="color:#C9A84C;text-decoration:none;font-weight:600"> 060 726 0302 →</a>
            </div>
          </div>

          <button type="button" data-click="loyLogout" class="ld-logout">↩ Odjavi se</button>
        </div>
      </div>`;
    return;
  }

  const planType  = p.plan_type  || (String(p.care_plan||'').includes('god') ? 'god' : 'mes') || 'god';
  const carSize   = p.car_size   || (String(p.care_plan||'').includes('_vs') ? 'vs' : 'ms') || 'ms';

  const planLabel  = planType === 'god' ? 'Godišnji plan' : 'Mesečni plan';
  const sizeLabel  = carSize  === 'vs'  ? 'Veliki / SUV'  : 'Mali / Srednji';
  const priceLabel = planType === 'god'
    ? (carSize === 'vs' ? '€349 / godišnje' : '€299 / godišnje')
    : (carSize === 'vs' ? '€40 / mesečno'   : '€35 / mesečno');

  const now = new Date();
  let totalAllowed, usedThisPeriod, periodLabel;
  if (planType === 'god') {
    totalAllowed = 24;
    const yr = now.getFullYear();
    usedThisPeriod = washes.filter(w => {
      const d = new Date(w.service_date ? w.service_date + 'T00:00:00' : w.created_at);
      return d.getFullYear() === yr;
    }).length;
    periodLabel = String(yr) + '. godine';
  } else {
    totalAllowed = 2;
    const yr = now.getFullYear(), mo = now.getMonth();
    usedThisPeriod = washes.filter(w => {
      const d = new Date(w.service_date ? w.service_date + 'T00:00:00' : w.created_at);
      return d.getFullYear() === yr && d.getMonth() === mo;
    }).length;
    const meseci = ['januara','februara','marta','aprila','maja','juna','jula','avgusta','septembra','oktobra','novembra','decembra'];
    periodLabel = meseci[mo];
  }

  const pct = Math.min(100, totalAllowed > 0 ? Math.round((usedThisPeriod / totalAllowed) * 100) : 0);

  const hist = washes.length === 0
    ? '<p style="font-family:\'Cormorant Garamond\',serif;font-size:16px;color:rgba(201,168,76,.3);font-style:italic;padding:10px 0">Još nema zabeleženih usluga.</p>'
    : washes.slice(0, 50).map((w, i) => {
        const rawDate = w.service_date
          ? new Date(w.service_date + 'T00:00:00')
          : new Date(w.created_at);
        const dateStr = rawDate.toLocaleDateString('sr-RS', {day:'2-digit', month:'long', year:'numeric'});
        const washNum = washes.length - i;
        return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px">
          <span style="font-size:9px;font-weight:800;letter-spacing:1px;padding:3px 8px;background:rgba(201,168,76,.1);color:#C9A84C;flex-shrink:0;min-width:28px;text-align:center">#${washNum}</span>
          <div style="flex:1;min-width:0">
            <div style="color:#F2F0EC;font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(w.note || 'Premium pranje')}</div>
            <div style="color:#555;font-size:11px;font-weight:300">${dateStr}</div>
          </div>
        </div>`;
      }).join('');

  dash.innerHTML = `
    <div style="padding-bottom:44px">
      <div style="padding-top:26px">
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;margin-bottom:4px">
          Zdravo, <em style="font-style:italic;color:#C9A84C">${firstName}</em>
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:22px;font-weight:300">${escHtml(p.email || '')}</div>

        <div style="background:#141414;border-left:2px solid #C9A84C;padding:18px 22px;margin-bottom:4px">
          <div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;font-weight:700">★ VAŠE AKTIVNO ČLANSTVO</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
            <div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;color:#F2F0EC;line-height:1.2">${planLabel} — <em style="font-style:italic;color:#C9A84C">${sizeLabel}</em></div>
              <div style="font-size:13px;color:#777;margin-top:6px;font-weight:300">${priceLabel}</div>
            </div>
          </div>
          ${(()=>{
            const since = p.care_plan_since;
            if (!since) return '';
            const sinceDate = new Date(since);
            const sinceLabel = sinceDate.toLocaleDateString('sr-RS', {day:'2-digit', month:'long', year:'numeric'});
            const isAnnual = planType === 'god';
            if (isAnnual) {
              const expDate = new Date(sinceDate);
              expDate.setFullYear(expDate.getFullYear() + 1);
              const expLabel = expDate.toLocaleDateString('sr-RS', {day:'2-digit', month:'long', year:'numeric'});
              const now2 = new Date();
              const daysLeft = Math.ceil((expDate - now2) / 86400000);
              const statusColor = daysLeft < 0 ? '#C9A84C' : daysLeft < 30 ? '#E67E22' : '#27AE60';
              const statusText  = daysLeft < 0
                ? 'Pretplata istekla'
                : daysLeft < 30
                  ? `Ističe za ${daysLeft} dana`
                  : `Aktivna · ${daysLeft} dana preostalo`;
              return `<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div style="background:#0E0E0E;padding:12px 14px">
                  <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:5px;font-weight:600">AKTIVNO OD</div>
                  <div style="font-size:13px;color:#F2F0EC;font-weight:400">${sinceLabel}</div>
                </div>
                <div style="background:#0E0E0E;padding:12px 14px">
                  <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:5px;font-weight:600">VAŽI DO</div>
                  <div style="font-size:13px;color:#F2F0EC;font-weight:400">${expLabel}</div>
                </div>
                <div style="grid-column:1/-1;background:#0E0E0E;padding:10px 14px;display:flex;align-items:center;gap:8px">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${statusColor};flex-shrink:0"></span>
                  <span style="font-size:11px;color:${statusColor};font-weight:500">${statusText}</span>
                </div>
              </div>`;
            } else {
              return `<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:12px">
                <div style="background:#0E0E0E;padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  <div>
                    <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:5px;font-weight:600">AKTIVNO OD</div>
                    <div style="font-size:13px;color:#F2F0EC;font-weight:400">${sinceLabel}</div>
                  </div>
                  <div>
                    <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:5px;font-weight:600">OBNAVLJANJE</div>
                    <div style="font-size:13px;color:#27AE60;font-weight:400">Mesečno</div>
                  </div>
                </div>
              </div>`;
            }
          })()}
        </div>

        <div style="background:#141414;padding:20px 22px;margin-bottom:4px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:300">
              Usluge <em style="font-style:italic;color:#C9A84C">${periodLabel}</em>
            </div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;color:#C9A84C;line-height:1">
              ${usedThisPeriod}<span style="font-size:16px;color:#555;font-family:'Inter',sans-serif">/${totalAllowed}</span>
            </div>
          </div>
          <div style="height:6px;background:#252525;margin-bottom:10px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#C9A84C;transition:width .6s ease"></div>
          </div>
          <div style="font-size:11px;color:#666;font-weight:300">
            ${usedThisPeriod >= totalAllowed
              ? '<span style="color:#C9A84C">✓ Iskorišćene sve usluge za ovaj period.</span>'
              : 'Preostalo: <strong style="color:#aaa">' + (totalAllowed - usedThisPeriod) + '</strong> usluga'}
          </div>
        </div>

        <div style="background:#141414;padding:20px 22px;margin-bottom:20px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:300;margin-bottom:14px">
            Istorija <em style="font-style:italic;color:#C9A84C">usluga</em>
          </div>
          ${hist}
        </div>

        <div style="font-size:11px;color:#444;font-weight:300;margin-bottom:18px">
          Pitanja ili termin:
          <a href="https://wa.me/381607260302" target="_blank" rel="noopener noreferrer" style="color:#C9A84C;text-decoration:none;font-weight:600">WhatsApp 060 726 0302 →</a>
        </div>

        <button type="button" data-click="loyLogout" class="ld-logout">↩ Odjavi se</button>
      </div>
    </div>`;
}


// ── SUBMIT ZAHTEV ─────────────────────────
window.loySubmitRequest = async function(){
  if(!_profile) return;
  const note  = ($('loy-req-note')?.value || '').trim() || 'Premium pranje';
  const btn   = $('loy-req-btn');
  const msgEl = $('loy-req-msg');
  btn.textContent = 'Šaljem...';
  btn.disabled = true;

  try {
    const res = await api('/rest/v1/loyalty_wash_requests', {
      method: 'POST',
      prefer: 'return=minimal',
      raw:    true,
      body: {
        customer_id:    _profile.id,
        customer_name:  _profile.name,
        customer_email: _profile.email,
        customer_phone: _profile.phone || '',
        note,
        status: 'pending'
      }
    });

    if(res && (res.ok || res.status === 201 || res.status === 204)){
      if(msgEl){
        msgEl.style.cssText = 'display:block;color:#27AE60;background:rgba(76,175,80,.08);border-left:2px solid #27AE60;padding:10px 14px';
        msgEl.textContent = '✓ Zahtev poslat! Laker će potvrditi ubrzo.';
      }
      setTimeout(() => loadAndShowDash(), 1800);
    } else {
      if(msgEl){
        msgEl.style.cssText = 'display:block;color:#E8C96A;background:rgba(229,57,53,.08);border-left:2px solid #E8C96A;padding:10px 14px';
        msgEl.textContent = 'Greška. Pokušajte ponovo.';
      }
      btn.textContent = 'Potvrdi moju posetu →';
      btn.disabled = false;
    }
  } catch(e) {
    if(msgEl){
      msgEl.style.cssText = 'display:block;color:#E8C96A;background:rgba(229,57,53,.08);border-left:2px solid #E8C96A;padding:10px 14px';
      msgEl.textContent = 'Greška u mreži. Proverite konekciju i pokušajte ponovo.';
    }
    btn.textContent = 'Potvrdi moju posetu →';
    btn.disabled = false;
  }
};

// ── NAV BTN ───────────────────────────────
function updateNavBtn(email, washCount){
  const nb = $('loyNavBtn'); if(!nb) return;
  const raw = (email || '').split('@')[0];
  const first = raw.length > 12 ? raw.slice(0,12) + '...' : raw;
  const label = first || 'LOYALTY';
  const countBadge = (washCount != null && washCount >= 0)
    ? `<span style="font-size:9px;color:#888;display:inline;margin-left:4px;letter-spacing:0;font-weight:400">(${washCount}/8)</span>`
    : '';
  nb.innerHTML = `${label}${countBadge}<span style="font-size:9px;color:#C9A84C;display:inline;margin-left:6px;letter-spacing:1px;font-weight:500;opacity:.9">LOYALTY</span>`;
}

// ── GOOGLE OAUTH (Loyalty Modal) ──────────
let _googleName = null;
let _gsiRendered = false;
let _gsiInitStarted = false;

function initLoyaltyGoogleBtn() {
  if (_gsiInitStarted) { _renderGoogleButton(); return; }
  _gsiInitStarted = true;
  fetch('/api/loyalty-join')
    .then(function(r){ return r.json(); })
    .then(function(cfg){
      if (!cfg || !cfg.google_client_id) return;
      const zone = $('loy-google-zone');
      if (!zone) return;
      zone.style.display = 'block';
      if (window.google && window.google.accounts && window.google.accounts.id) {
        _setupGSI(cfg.google_client_id);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = function(){ _setupGSI(cfg.google_client_id); };
      s.onerror = function(){
        const z = $('loy-google-zone');
        if (z) z.style.display = 'none';
      };
      document.head.appendChild(s);
    })
    .catch(function(){});
}

function _setupGSI(clientId) {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
  window.google.accounts.id.initialize({
    client_id:   clientId,
    callback:    _handleGoogleCredential,
    ux_mode:     'popup',
    auto_select: false,
    itp_support: true
  });
  // Render only if modal is already open (container has dimensions); else deferred to openLoyalty
  const overlay = $('loyOverlay');
  if (overlay && overlay.style.display === 'flex') {
    _renderGoogleButton();
  }
}

function _renderGoogleButton() {
  if (_gsiRendered) return;
  if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
  const wrap = $('loy-google-wrap');
  if (!wrap) return;
  const outer = wrap.closest('.loy-google-outer');
  // Use container width when visible, fall back to 360
  const w = Math.min(400, Math.max(280, outer ? outer.clientWidth : 360));
  window.google.accounts.id.renderButton(wrap, {
    theme:          'filled_black',
    size:           'large',
    shape:          'pill',
    text:           'continue_with',
    logo_alignment: 'left',
    locale:         'sr',
    width:          w
  });
  _gsiRendered = true;
}
window._renderGoogleButton = _renderGoogleButton;

function _handleGoogleCredential(resp) {
  const errEl = $('loy-google-err');
  if (!resp || !resp.credential) {
    if (errEl) { errEl.textContent = 'Google prijava je otkazana.'; errEl.style.display = 'block'; }
    return;
  }
  if (errEl) errEl.style.display = 'none';

  // Dekoduj Google JWT da izvučemo ime korisnika
  try {
    const parts = resp.credential.split('.');
    const pad = parts[1] + '==='.slice((parts[1].length + 3) % 4);
    const data = JSON.parse(atob(pad.replace(/-/g, '+').replace(/_/g, '/')));
    _googleName = data.name || ([data.given_name, data.family_name].filter(Boolean).join(' ')) || null;
  } catch(e) { _googleName = null; }

  // Razmeni Google ID token za Supabase sesiju (id_token grant)
  fetch(SB + '/auth/v1/token?grant_type=id_token', {
    method: 'POST',
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', id_token: resp.credential })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (!d.access_token) {
      const msg = String(d.error_description || d.error || '').toLowerCase();
      const txt = (msg.includes('provider') || msg.includes('disabled') || msg.includes('not') || msg.includes('enabled'))
        ? 'Google prijava nije aktivirana na ovom sajtu. Koristite email/lozinku.'
        : 'Google prijava nije uspela. Pokušajte ponovo.';
      if (errEl) { errEl.textContent = txt; errEl.style.display = 'block'; }
      _googleName = null;
      return;
    }
    _user = { id: d.user.id, email: d.user.email, access_token: d.access_token };
    saveSession(_user);
    updateNavBtn(_googleName ? _googleName.split(' ')[0] : _user.email);
    loadAndShowDash();
  })
  .catch(function(){
    if (errEl) { errEl.textContent = 'Greška u mreži. Pokušajte ponovo.'; errEl.style.display = 'block'; }
    _googleName = null;
  });
}

// ── SESSION ───────────────────────────────
function saveSession(u){
  const remember = document.getElementById('loyRememberMe')?.checked === true;
  const payload = { id:u.id, email:u.email, token:u.access_token };
  try{
    if (remember) {
      payload.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('lk_loy', JSON.stringify(payload));
      sessionStorage.removeItem('lk_loy');
    } else {
      sessionStorage.setItem('lk_loy', JSON.stringify(payload));
      localStorage.removeItem('lk_loy');
    }
  } catch(e){}
}
function clearSession(){
  try{ localStorage.removeItem('lk_loy'); sessionStorage.removeItem('lk_loy'); } catch(e){}
}

// ── AUTO-LOGIN ON PAGE LOAD ───────────────
async function init(){
  try{
    let s=null;let source='';
    try{
      s=sessionStorage.getItem('lk_loy');
      if(!s){ s=localStorage.getItem('lk_loy'); source = s ? 'local' : ''; }
      else { source = 'session'; }
    }catch(e){}
    if(!s){ resetAccountPricing(); return; }
    const saved = JSON.parse(s);
    const {id, email, token} = saved;
    let { expiresAt } = saved;
    if (source === 'local' && !expiresAt) {
      expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      try{
        localStorage.setItem('lk_loy', JSON.stringify({ ...saved, expiresAt }));
      }catch(e){}
    }
    if (expiresAt && Date.now() > expiresAt) {
      clearSession();
      resetAccountPricing();
      return;
    }
    // Verifikuj token
    const chk = await fetch(SB + '/auth/v1/user', {
      headers: {'apikey': ANON, 'Authorization': 'Bearer ' + token}
    });
    if(!chk.ok){ clearSession(); resetAccountPricing(); return; }
    _user = {id, email, access_token: token};
    // Uzmi profil za nav i personalizovane cene
    const pr = await api('/rest/v1/loyalty_customers?auth_user_id=eq.' + id + '&select=wash_count,name,care_plan,care_streak,admin_note&limit=1');
    const p  = Array.isArray(pr) ? pr[0] : null;
    updateNavBtn(p ? (p.name || p.email || email).split(/[\s@]/)[0] : email, p ? p.wash_count : undefined);
    applyAccountPricing(p);
  } catch(e){ clearSession(); resetAccountPricing(); }
}
if(document.readyState==='complete'){init();}
else{window.addEventListener('load',init,{once:true});}

})();

// ── COMPOUND CLICK HELPERS ─────────────────────────────────────────────────
window.openLoyaltyMenu = function(){
  // Meni PRVO, modal POSLE: closeMobileMenu() briše body.style.overflowY, pa bi
  // obrnutim redom obrisao i scroll lock koji openLoyalty() postavlja za modal.
  typeof closeMobileMenu === 'function' && closeMobileMenu();
  window.openLoyalty && window.openLoyalty();
};
window.closePwaIosModalScroll = function(){
  window.closePwaIosModal && window.closePwaIosModal();
  window.scrollTo({top:0,behavior:'smooth'});
};

// ── GLOBAL CLICK DELEGATION (replaces all onclick= attributes) ─────────────
document.addEventListener('click', function(e){
  // Stop-propagation wrapper (modal inner box)
  var btn = e.target.closest('[data-click]');
  var sp  = btn ? null : e.target.closest('[data-sp]');
  if(sp){ e.stopPropagation(); return; }
  if(!btn) return;

  var cmd    = btn.getAttribute('data-click');
  var sep    = cmd.indexOf(':');
  var fnName = sep === -1 ? cmd : cmd.slice(0, sep);
  var arg    = sep === -1 ? undefined : cmd.slice(sep + 1);
  var fn     = window[fnName];
  if(typeof fn !== 'function') return;

  if(fnName === 'togglePkInfo' || fnName === 'toggleFaq'){
    fn(btn);
  } else if(fnName === 'ot'){
    fn(btn, arg);
  } else if(arg !== undefined){
    fn(arg);
  } else {
    fn();
  }

  // Prevent navigation on pure anchor buttons
  var href = btn.getAttribute('href');
  if(btn.tagName === 'A' && (!href || href === '#' || href === 'javascript:void(0)')){
    e.preventDefault();
  }
});

// ── EVENT LISTENERS (replaces oninput/onblur/onkeydown/onsubmit) ──────────
(function(){
  function bindInput(id, fn){
    var el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('input',  function(){ fn(el); });
    el.addEventListener('blur',   function(){ fn(el); });
  }
  bindInput('telefon_field', validatePhoneField);
  bindInput('email_field',   validateEmailField);

  var llogePass = document.getElementById('llog-pass');
  if(llogePass) llogePass.addEventListener('keydown', function(e){
    if(e.key === 'Enter') window.loyLogin && window.loyLogin();
  });

  var np2 = document.getElementById('new-pass-2');
  if(np2) np2.addEventListener('keydown', function(e){
    if(e.key === 'Enter') window.submitNewPassword && window.submitNewPassword();
  });

  var bookForm = document.querySelector('#fCont form');
  if(bookForm) bookForm.addEventListener('submit', handleSubmit);
})();
