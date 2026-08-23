// Proba izgleda nedeljnog mejla — ne šalje ništa, samo napravi HTML fajl.
//   node tools-izvestaj-proba.js
// Otvori zatim proba-izvestaj.html u brauzeru.
// Koristi ISTE izmišljene brojeve kao /api/izvestaj?primer=1.
// Ne deployuje se (u .vercelignore).

const fs = require('fs');
const { sastaviMejl, primerPodaci } = require('./api/_izvestaj-mejl.js');

const p = primerPodaci();
const html = sastaviMejl(p.sada, p.pre, p.dodatno, p.od, p.doo, { primer: true });

fs.writeFileSync('proba-izvestaj.html', html, 'utf8');
console.log('Napravljeno: proba-izvestaj.html  (' + html.length + ' znakova)');
