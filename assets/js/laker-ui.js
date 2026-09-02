// ══════════════════════════════════════════════════════════════════════════
// LAKER DETAILING — ZAJEDNIČKO PONAŠANJE INTERFEJSA
// Učitava se na SVIM stranama, sa `defer`. Izvučeno iz main.js i iz inline
// skripte #scroll-reveal-init u index.html (renoviranje, faza 1).
//
// Ovde je samo ono što svaka strana ima ili sme da ima: ispis verzije,
// kursor, tema, navigacija i mobilni meni, tabovi, FAQ, otkrivanje sekcija
// pri skrolu, mirovanje ukrasnih animacija i prevođenje `data-click`
// atributa u pozive funkcija.
//
// Sve je pisano sa proverom postojanja elementa — strana koja nema navigaciju,
// FAQ ili modal ne sme da baci grešku.
// ══════════════════════════════════════════════════════════════════════════

// ── VERZIJA SAJTA (ispis u konzoli — brza provera da li je updejt uhvatio) ──
try{var _sv=document.getElementById('siteVersion');console.log('%cLaker Detailing%c  '+(_sv?_sv.textContent.replace(/\s+/g,' ').trim():'verzija ?'),'color:#C0392B;font-weight:800;font-size:13px','color:#999;font-size:12px');}catch(e){}

// ── CUSTOM CURSOR (samo na uređajima sa mišem, ne na touch) ──
const cur=document.getElementById('cur'),cr=document.getElementById('cur-r');
const _hasHover=cur&&cr&&window.matchMedia('(hover:hover) and (pointer:fine)').matches;
if(_hasHover){
  // transform umesto left/top = kompozitor, bez layout-a; rAF petlja staje kad se kursor smiri.
  // Pozicija se upisuje ISKLJUCIVO unutar rAF-a: gejmerski mis salje mousemove
  // 500-1000 puta u sekundi, a ekran se osvezava najvise 144 puta — upis stila
  // u samom dogadjaju je znacio i do 7 nepotrebnih invalidacija po frejmu.
  // Vizuelno je isto (izmedju dva frejma se ionako nista ne iscrtava).
  let mx=0,my=0,rx=0,ry=0,_dotX=null,_dotY=null,_curRaf=null;
  function _curTick(){
    _curRaf=null;
    if(_dotX!==mx||_dotY!==my){
      _dotX=mx;_dotY=my;
      cur.style.transform='translate3d('+mx+'px,'+my+'px,0) translate(-50%,-50%)';
    }
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
    if(!_curRaf)_curRaf=requestAnimationFrame(_curTick);
  },{passive:true});
  document.querySelectorAll('a,button,.si,.pk,.cs-card,.tst-card,.faq-q,.sz-lbl').forEach(el=>{
    el.addEventListener('mouseenter',()=>{cr.style.width='54px';cr.style.height='54px'},{passive:true});
    el.addEventListener('mouseleave',()=>{cr.style.width='32px';cr.style.height='32px'},{passive:true});
  });
}

// ── MIROVANJE UKRASNIH ANIMACIJA ────────────────────────────────────────────
// Animacija ume da trosi frejmove ni za sta u dve situacije:
//   1) otvoren je modal preko celog ekrana — sve iza njega je zamuceno
//      backdrop-filter-om, pa svaki pomeraj u pozadini tera Chrome da ponovo
//      izracuna zamucenje CELOG ekrana, u svakom frejmu. To je bilo seckanje
//      misa dok je "Prijava" otvorena (mereno na 144Hz: najduzi frejm 34.8ms).
//   2) ukras nije na ekranu — niko ga ne vidi, a i dalje se vrti.
// U oba slucaja animacija se samo pauzira. Vizuelno se ne gubi nista.
// Marquee (.mq-t) vec ima svoj IntersectionObserver preko klase .paused —
// njega ne diramo, samo ga hvatamo pravilom body.bg-freeze .mq-t.
(function(){
  // 1) modali preko celog ekrana
  var modali = ['loyOverlay','reviewModal','care-modal-overlay','pwaIosModal','galView']
    .map(function(id){ return document.getElementById(id); })
    .filter(Boolean);
  if(modali.length){
    var otvoren = function(el){ return getComputedStyle(el).display !== 'none'; };
    var uskladi = function(){
      document.body.classList.toggle('bg-freeze', modali.some(otvoren));
    };
    // hvata SVAKI nacin otvaranja (inline display, klasa .open) — ne moramo da
    // diramo svaku open/close funkciju ponaosob
    var mo = new MutationObserver(uskladi);
    modali.forEach(function(el){
      mo.observe(el, { attributes:true, attributeFilter:['style','class'] });
    });
    uskladi();
  }
  // 2) ukrasi van ekrana
  var ukrasi = document.querySelectorAll('.hs-line,.care-glow,.loc-pin');
  if(ukrasi.length && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(lista){
      lista.forEach(function(e){
        e.target.classList.toggle('anim-pauza', !e.isIntersecting);
      });
    }, { rootMargin:'150px 0px' });
    ukrasi.forEach(function(el){ io.observe(el); });
  }
})();

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
if(themeBtn)themeBtn.addEventListener('click',()=>{
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
  if(mobileMenuOpen||!hbg||!mobileOverlay) return;
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
  if(!mobileMenuOpen||!hbg||!mobileOverlay) return;
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
if(hbg&&mobileOverlay){
  hbg.addEventListener('click',()=>{
    mobileOverlay.classList.contains('open')?closeMobileMenu():openMobileMenu();
  });
  mobileOverlay.addEventListener('click',function(e){if(e.target===this)closeMobileMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu();});
}

// ── NAV SCROLL ──
(function(){
  var _nav=document.getElementById('nav');
  if(!_nav) return;
  window.addEventListener('scroll',()=>_nav.classList.toggle('solid',scrollY>60),{passive:true});
})();


// ── TABS ──
function ot(btn,id){
  const panel=document.getElementById(id);
  if(!btn||!panel) return;
  document.querySelectorAll('.tb').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.tp').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');panel.classList.add('on');
}

// ── FAQ ACCORDION ──
function toggleFaq(btn){
  const item=btn&&btn.closest('.faq-item');
  if(!item) return;
  const isOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
  if(!isOpen)item.classList.add('open');
}


// ── OTKRIVANJE SEKCIJA PRI SKROLU ───────────────────────────────────────────
// Ranije inline skripta #scroll-reveal-init pri dnu <body> u index.html.
// SKRIVANJE je sada u CSS-u (pocetna.css, pravilo html:where(.js-ready)) — tako
// se ne vidi treptaj dok se ovaj fajl skida sa mreže. Ovde ostaje samo
// stepenasto kašnjenje po elementu i posmatrač koji dodaje klasu `.in`.
(function(){
  // Spisak pokriva sve strane; svaka strana ima samo svoje elemente, pa se
  // ostalo prosto ne poklopi. Isti spisak stoji u CSS-u te strane
  // (pravilo html:where(.js-ready)) — tamo je skrivanje, ovde otkrivanje.
  var s=['#phi .sl','#phi .sh','#phi .sd','#phi .pv','#cs .sl','#cs .sh','.faq-item','.proc-card','.us-card','.pk','.loy-single-card','.loy-wash'];
  var seen=new Set();var t=[];
  s.forEach(function(sel){document.querySelectorAll(sel).forEach(function(el){if(seen.has(el))return;seen.add(el);t.push(el);});});
  t.forEach(function(el,i){el.classList.add('reveal');el.style.setProperty('--reveal-delay',(Math.min(i%8,7)*70)+'ms');});
  var r=[].slice.call(document.querySelectorAll('.rv,.rl,.rr'));
  var all=t.concat(r);
  if(!all.length)return;
  if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion:reduce)').matches){
    all.forEach(function(el){el.classList.add('in');});return;
  }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:0.08,rootMargin:'0px 0px -6% 0px'});
  all.forEach(function(el){io.observe(el);});
  var mq=document.getElementById('mq-t');
  if(mq){
    var mo=new IntersectionObserver(function(en){
      en.forEach(function(e){mq.classList.toggle('paused',!e.isIntersecting);});
    },{rootMargin:'100px 0px'});
    mo.observe(mq.parentElement||mq);
  }
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
