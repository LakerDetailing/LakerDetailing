// Proba izgleda nedeljnog mejla — ne šalje ništa, samo napravi HTML fajl.
//   node tools-izvestaj-proba.js
// Otvori zatim proba-izvestaj.html u brauzeru.
// Ne deployuje se (u .vercelignore).

const fs = require('fs');
const { _sastavi } = require('./api/izvestaj.js');

const ovaNedelja = {
  posetioci: 147, pregledi: 231, vreme_sec: 96, dubina: 58,
  odmah_otisli: 41, ukupno_sesija: 231, kontakt_ljudi: 24,
  kontakti: [
    { naziv: 'whatsapp',            klikova: 22, ljudi: 18 },
    { naziv: 'telefon',             klikova: 11, ljudi:  9 },
    { naziv: 'galerija',            klikova: 47, ljudi: 26 },
    { naziv: 'instagram',           klikova:  8, ljudi:  7 },
    { naziv: 'loyalty-otvoren',     klikova:  6, ljudi:  5 },
    { naziv: 'mapa',                klikova:  4, ljudi:  4 },
    { naziv: 'email',               klikova:  2, ljudi:  2 },
    { naziv: 'recenzija-otvorena',  klikova:  2, ljudi:  2 }
  ],
  po_danima: [
    { dan: '2026-08-16', posetioci: 14, pregledi: 21, kontakti: 1, vreme_sec:  71, vrhunac: 20 },
    { dan: '2026-08-17', posetioci: 26, pregledi: 38, kontakti: 6, vreme_sec: 112, vrhunac: 19 },
    { dan: '2026-08-18', posetioci: 19, pregledi: 30, kontakti: 3, vreme_sec:  88, vrhunac: 13 },
    { dan: '2026-08-19', posetioci: 23, pregledi: 37, kontakti: 5, vreme_sec: 101, vrhunac: 19 },
    { dan: '2026-08-20', posetioci: 31, pregledi: 49, kontakti: 9, vreme_sec: 124, vrhunac: 21 },
    { dan: '2026-08-21', posetioci: 22, pregledi: 34, kontakti: 7, vreme_sec:  95, vrhunac: 18 },
    { dan: '2026-08-22', posetioci: 12, pregledi: 22, kontakti: 2, vreme_sec:  64, vrhunac: 11 }
  ],
  po_satima: [
    { sat: 9, posetioci: 8 }, { sat: 13, posetioci: 15 },
    { sat: 19, posetioci: 27 }, { sat: 21, posetioci: 22 }
  ],
  kanali: [
    { kanal: 'google', ljudi: 71 }, { kanal: 'instagram', ljudi: 38 },
    { kanal: 'direktno', ljudi: 24 }, { kanal: 'poruka', ljudi: 9 },
    { kanal: 'facebook', ljudi: 5 }
  ],
  uredjaji: [
    { uredjaj: 'telefon', ljudi: 118 }, { uredjaj: 'kompjuter', ljudi: 23 },
    { uredjaj: 'tablet', ljudi: 6 }
  ],
  gradovi: [
    { grad: 'Cacak', ljudi: 76 }, { grad: 'Beograd', ljudi: 21 },
    { grad: 'Kraljevo', ljudi: 14 }, { grad: 'Uzice', ljudi: 11 },
    { grad: 'Gornji Milanovac', ljudi: 9 }, { grad: 'nepoznato', ljudi: 16 }
  ],
  strane: [
    { putanja: '/', pregledi: 198 }, { putanja: '/usluge', pregledi: 21 },
    { putanja: '/keramicka-zastita', pregledi: 12 }
  ],
  sekcije: [
    { sekcija: 'hero', sesija: 228 }, { sekcija: 'phi', sesija: 171 },
    { sekcija: 'cs',   sesija: 149 }, { sekcija: 'proc', sesija: 118 },
    { sekcija: 'pkg',  sesija: 96 },  { sekcija: 'prc',  sesija: 74 },
    { sekcija: 'faq',  sesija: 41 },  { sekcija: 'tst',  sesija: 33 },
    { sekcija: 'loc',  sesija: 27 }
  ]
};

const proslaNedelja = JSON.parse(JSON.stringify(ovaNedelja));
proslaNedelja.posetioci = 121;
proslaNedelja.pregledi  = 205;
proslaNedelja.vreme_sec = 104;
proslaNedelja.kontakt_ljudi = 19;
proslaNedelja.kontakti  = [
  { naziv: 'whatsapp', klikova: 14, ljudi: 12 },
  { naziv: 'telefon',  klikova:  9, ljudi:  8 },
  { naziv: 'email',    klikova:  1, ljudi:  1 }
];

const doo = new Date('2026-08-23T00:00:00+02:00');
const od  = new Date(doo.getTime() - 7 * 24 * 60 * 60 * 1000);

const html = _sastavi(ovaNedelja, proslaNedelja, { prijave: 3, recenzije: 1, nedelje: [
    { od: '2026-07-05', posetioci:  38, kontakti:  4 },
    { od: '2026-07-12', posetioci:  52, kontakti:  6 },
    { od: '2026-07-19', posetioci:  71, kontakti:  9 },
    { od: '2026-07-26', posetioci:  84, kontakti: 11 },
    { od: '2026-08-02', posetioci:  96, kontakti: 14 },
    { od: '2026-08-09', posetioci: 121, kontakti: 21 },
    { od: '2026-08-16', posetioci: 147, kontakti: 33 }
  ] }, od, doo);
fs.writeFileSync('proba-izvestaj.html', html, 'utf8');
console.log('Napravljeno: proba-izvestaj.html  (' + html.length + ' znakova)');
