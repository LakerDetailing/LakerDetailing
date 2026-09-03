/* Demo /demo-telefon — samo prikaz, ne deployuje se u sajt. Podaci prepisani sa /cenovnik i /usluge. */
(function(){
'use strict';
var SZ=['Mali','Srednji','Veliki','Ekstra'];
var PK=[
 {name:'Cle<em>an</em>',sub:'Osnovna nega',c:[99,110,130,145],dur:'3 radna dana',
  li:['Ručno premium pranje eksterijera (3 faze)','Voskiranje premium voskom','Dubinsko pranje enterijera','Impregnacija kože i plastike','Detailing potkrila (bez skidanja felni)','Čišćenje felni']},
 {name:'Bo<em>ost</em>',sub:'Pranje + poliranje',c:[249,260,280,295],dur:'do 5 dana',tag:'Najpopularnije',
  li:['Ručno premium pranje eksterijera (3 faze)','Dvoslojno poliranje laka','Ručno karnauba voskiranje','Dubinsko pranje enterijera','Impregnacija kože i plastike','Detailing potkrila (bez skidanja felni)','Poliranje i zaštita farova']},
 {name:'Lak<em>er</em>',sub:'Ultimate paket',c:[499,510,530,545],dur:'6 – 7 dana',
  li:['Ručno premium pranje eksterijera (3 faze)','Troslojno poliranje laka','Keramička zaštita Koch-Chemie (1 sloj)','Nano-Glass All — anti-kiša sva stakla','Dubinsko pranje enterijera','Impregnacija kože i plastike','Detailing motornog prostora','Detailing potkrila','Poliranje i zaštita farova']}
];
var TB=[
 [['Ručno premium pranje u 3 faze, voskiranje',[20,25,30,35]],['Detailing motornog prostora',[30,40,45,50]],['Nano-Glass Front / Rear (anti-kiša)',[30,30,40,55]],['Nano-Glass All — sva stakla',[50,55,65,80]]],
 [['Detailing auta (enterijer + eksterijer)',[99,110,130,145]],['Impregnacija kožnih površina',[25,40,45,50]],['Impregnacija plastičnih površina',[25,40,45,50]]],
 [['Jednoslojno poliranje',[100,110,135,150]],['One Cut & Finish P6',[110,130,145,155]],['Dvoslojno poliranje',[140,150,170,195]],['Troslojno / višeslojno poliranje',[235,250,260,290]],['Keramička zaštita Koch-Chemie (1 sloj)',[140,140,205,235]],['1K-Nano premaz',[80,105,115,135]],['Ručno karnauba voskiranje',[45,55,60,65]],['Poliranje i zaštita farova',[25,25,25,25]]]
];
var US=[
 {k:'Eksterijer i enterijer',h:'Premium ručno pranje',p:'Pranje rukom u tri faze, bez četki i bez automata. Osam koraka pokriva i karoseriju i unutrašnjost.',pr:'od 20 €',s:'1–2 h'},
 {k:'Enterijer + eksterijer',h:'Detailing auta',p:'Sedišta, patosnice, plafon, plastike i kontrolna tabla, plus kompletno premium pranje spolja.',pr:'od 99 €'},
 {k:'Korekcija laka',h:'Poliranje laka',p:'Četiri nivoa, od jednog prolaza mašinom do tri. Nivo se bira prema stanju laka, ne prema ceni.',pr:'od 100 €'},
 {k:'Zaštita laka',h:'Keramička zaštita',p:'Ceramic Body Cb0.01 u jednom sloju, preko 36 meseci po deklaraciji proizvođača. Tu su i 1K-Nano, karnauba vosak i Nano-Glass.',pr:'od 140 €',s1:'Ceramic Body Cb0.01, 1K-Nano, karnauba i Nano-Glass.'},
 {k:'Farovi',h:'Poliranje i zaštita farova',p:'Skidanje žutila i zamagljenja, poliranje do providnosti, pa nov UV premaz sa rokom do 36 meseci.',pr:'25 €',s:'sve kategorije'}
];
var k=1, tab=0, pkOn=0;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}

function pkCard(p){
  var sz=p.c.map(function(v,i){return '<span'+(i===k?' class="on"':'')+'>'+SZ[i]+'<b>€'+v+'</b></span>'}).join('');
  return '<div class="pk">'+(p.tag?'<div class="pk-tag">'+p.tag+'</div>':'')+
   '<div class="pk-head"><div><div class="pk-name">'+p.name+'</div><div class="pk-sub">'+p.sub+'</div></div>'+
   '<div class="pk-price"><b><sup>€</sup>'+p.c[k]+'</b><small>'+SZ[k]+'</small></div></div>'+
   '<div class="pk-sizes">'+sz+'</div>'+
   '<ul class="pk-ul">'+p.li.map(function(t){return '<li><span>'+esc(t)+'</span><i>+</i></li>'}).join('')+'</ul>'+
   '<div class="pk-foot"><div class="pk-dur">⏱ &nbsp;'+p.dur+'</div><a class="btn" href="#">Kontaktirajte nas →</a></div></div>';
}
function renderPk(){
  $('#pkB-list').innerHTML=PK.map(pkCard).join('');
  $('#pkC-list').innerHTML=PK.map(function(p,i){return '<div class="pk-pane'+(i===pkOn?' on':'')+'">'+pkCard(p)+'</div>'}).join('');
  $$('#pk-tabs button').forEach(function(b,i){b.classList.toggle('on',i===pkOn)});
}
function renderTb(){
  var rows=TB[tab];
  $('#tbB-list').innerHTML='<ul class="lst">'+rows.map(function(r){
    var o=r[1].map(function(v,i){return i===k?null:'<b>'+SZ[i]+'</b> '+v}).filter(Boolean).join(' &nbsp;·&nbsp; ');
    return '<li><div><div class="n">'+esc(r[0])+'</div><div class="o">'+o+'</div></div><div class="p">'+r[1][k]+' €</div></li>';
  }).join('')+'</ul>';
  $('#tbC-list').innerHTML='<table class="tbl"><thead><tr><th>Usluga</th>'+SZ.map(function(s,i){return '<th'+(i===k?' class="hi"':'')+'>'+s+'</th>'}).join('')+'</tr></thead><tbody>'+
    rows.map(function(r){return '<tr><td>'+esc(r[0])+'</td>'+r[1].map(function(v,i){return '<td'+(i===k?' class="hi"':'')+'>'+v+'</td>'}).join('')+'</tr>'}).join('')+
    '</tbody></table><div class="tbl-note">Mali — Polo, Audi A2, Corsa · Srednji — Golf, Peugeot 307, Rapid · Veliki — Camry, CX-5, Serija 5 · Ekstra — X7, Tiggo 8, Macan</div>';
  $$('#tb3B button,#tb3C button').forEach(function(b){b.classList.toggle('on',+b.dataset.t===tab)});
}
function renderCalc(){
  var sum=0;
  $$('#ck li').forEach(function(li){
    var b=$('b',li),v=+b.dataset.c.split(',')[k];
    b.textContent=v+' €'; if(li.classList.contains('on'))sum+=v;
  });
  $('#sumv').textContent=sum+' €';
}
function renderUs(){
  $('#usB-list').innerHTML=US.map(function(u){return '<a href="#"><div class="k2">'+u.k+'</div><h3>'+u.h+'</h3><p>'+u.p+'</p><div class="pr"><b>'+u.pr+(u.s?'<small>'+u.s+'</small>':'')+'</b><span>Detaljnije →</span></div></a>'}).join('');
  $('#usC-list').innerHTML=US.map(function(u){return '<a href="#"><div><div class="k2">'+u.k+'</div><h3>'+u.h+'</h3><p>'+(u.s1||u.p.split('.')[0]+'.')+'</p></div><div class="p">'+u.pr+(u.s?'<small>'+u.s+'</small>':'')+'</div><div class="ar">→</div></a>'}).join('');
  $('#usD-list').innerHTML=US.map(function(u,i){return '<a href="#"'+(i===4?' class="w"':'')+'><div><div class="k2">'+u.k+'</div><h3>'+u.h+'</h3></div><div><div class="p">'+u.pr+(u.s?'<small>'+u.s+'</small>':'')+'</div><div class="ar">Detaljnije →</div></div></a>'}).join('');
}
function renderAll(){renderPk();renderTb();renderCalc();renderUs()}

/* birač veličine */
$('#sz').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b)return;
  k=+b.dataset.k; $$('#sz button').forEach(function(x){x.classList.toggle('on',x===b)}); renderAll();
});
/* tabovi paketa (C) + prevlačenje */
$('#pk-tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;pkOn=+b.dataset.p;renderPk()});
var sx=null;
$('#pkC-list').addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
$('#pkC-list').addEventListener('touchend',function(e){
  if(sx===null)return; var dx=e.changedTouches[0].clientX-sx; sx=null;
  if(Math.abs(dx)<50)return; pkOn=Math.max(0,Math.min(2,pkOn+(dx<0?1:-1))); renderPk();
});
/* tabovi tabele */
document.addEventListener('click',function(e){
  var b=e.target.closest('#tb3B button,#tb3C button'); if(b){tab=+b.dataset.t;renderTb();return}
  var li=e.target.closest('#ck li'); if(li){li.classList.toggle('on');$('i',li).textContent=li.classList.contains('on')?'✓':'';renderCalc();return}
  var v=e.target.closest('.var button');
  if(v){var g=v.parentNode; $$('button',g).forEach(function(x){x.classList.toggle('on',x===v)});
    $$('[data-v]').forEach(function(el){ if(el.tagName==='BUTTON')return; var mine=$$('button',g).some(function(x){return x.dataset.v===el.dataset.v}); if(mine)el.classList.toggle('show',el.dataset.v===v.dataset.v)}); return}
  var p=e.target.closest('.dbar .pg button[data-page]');
  if(p){$$('.dbar .pg button[data-page]').forEach(function(x){x.classList.toggle('on',x===p)});
    $('#pg-cen').hidden=p.dataset.page!=='cen'; $('#pg-usl').hidden=p.dataset.page!=='usl'; window.scrollTo(0,0); return}
  if(e.target.closest('a[href="#"]'))e.preventDefault();
});
/* tema */
try{if(localStorage.getItem('laker-theme')==='light')document.body.classList.add('light')}catch(e){}
$('#th').addEventListener('click',function(){document.body.classList.toggle('light')});
/* meni koji se sklanja pri skrolu nadole */
var ly=0,acc=0;
window.addEventListener('scroll',function(){
  var y=window.scrollY, d=y-ly; ly=y;
  document.body.classList.toggle('scrolled',y>140);
  if(y<80){document.body.classList.remove('hide-nav');acc=0;return}
  acc=(d>0)===(acc>0)?acc+d:d;
  if(acc>40)document.body.classList.add('hide-nav');
  else if(acc<-40)document.body.classList.remove('hide-nav');
},{passive:true});
renderAll();
})();
