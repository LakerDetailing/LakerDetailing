// ══════════════════════════════════════════════════════════
//  LAKER DETAILING STUDIO — povlačenje recenzija sa Google Mapa
//
//  Dva izvora, isti oblik podataka na izlazu:
//
//    places   — Places API (New). Radi odmah sa običnim API ključem,
//               ali Google vraća NAJVIŠE 5 recenzija i to je tvrdo
//               ograničenje (nema paginacije).
//    business — Business Profile API v4. Vraća SVE recenzije, ali
//               traži da Google ručno odobri pristup + OAuth.
//
//  Kad `business` bude podešen, sam se koristi umesto `places`.
//  Ništa drugo u projektu ne treba menjati — id recenzije je naš
//  heš autora, pa ista recenzija ostaje isti red u bazi i posle
//  prelaska sa jednog izvora na drugi.
//
//  Env: GOOGLE_PLACES_KEY, GOOGLE_PLACE_ID (opciono)
//       GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN,
//       GBP_ACCOUNT_ID, GBP_LOCATION_ID
// ══════════════════════════════════════════════════════════

const crypto = require('node:crypto');

// Place ID studija — isti onaj koji stoji u linkovima ka Mapama na sajtu.
const PLACE_ID_PODRAZUMEVANI = 'ChIJUbhOjVRzV0cRQpiB_thOjDg';

function env(...imena) {
  for (const ime of imena) {
    const v = process.env[ime];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// ── Stabilan ključ recenzije ──────────────────────────────
// Google dozvoljava jednu recenziju po korisniku po firmi, pa je autor
// dovoljno jedinstven. Prednost: ako klijent kasnije izmeni tekst ili
// ocenu, to ostaje ISTA recenzija — ne pojavi se duplikat, i ne ispadne
// sa sajta ako ju je vlasnik već pustio.
function kljucRecenzije(autor, tekst) {
  const osnova = String(autor || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  // Bezimene ("A Google user") ne smeju sve da se sliju u jedan red.
  const bezimena = !osnova || /^(a )?google (user|korisnik)/.test(osnova);
  const seme = bezimena ? 'anon|' + String(tekst || '').slice(0, 120) : osnova;
  return crypto.createHash('sha1').update(seme).digest('hex').slice(0, 24);
}

function ocenaUBroj(v) {
  if (typeof v === 'number') return Math.min(5, Math.max(1, Math.round(v)));
  const mapa = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return mapa[String(v || '').toUpperCase()] || 5;
}

function ociscenTekst(v, maks = 4000) {
  return String(v || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim().slice(0, maks);
}

function uIso(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ══════════════════════════════════════════════════════════
//  IZVOR 1 — Places API (New)   → najviše 5 recenzija
// ══════════════════════════════════════════════════════════
async function saPlacesa() {
  const kljuc   = env('GOOGLE_PLACES_KEY', 'GOOGLE_MAPS_API_KEY', 'GOOGLE_API_KEY');
  const placeId = env('GOOGLE_PLACE_ID') || PLACE_ID_PODRAZUMEVANI;

  if (!kljuc) {
    const e = new Error('GOOGLE_PLACES_KEY nije podešen u Vercel env varijablama.');
    e.kod = 'nema_kljuca';
    throw e;
  }

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=sr&regionCode=RS`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key':   kljuc,
      'X-Goog-FieldMask': 'id,rating,userRatingCount,reviews'
    }
  });

  const telo = await res.json().catch(() => ({}));
  if (!res.ok) {
    const poruka = telo?.error?.message || `Google Places greška ${res.status}`;
    const e = new Error(poruka);
    e.kod = 'google_greska';
    e.status = res.status;
    throw e;
  }

  const sirove = Array.isArray(telo.reviews) ? telo.reviews : [];
  const recenzije = sirove.map(r => {
    const autor = ociscenTekst(r?.authorAttribution?.displayName || '', 120);
    // originalText je ono što je klijent stvarno napisao; `text` ume da bude
    // Googleov prevod na traženi jezik. Nama treba original.
    const tekst = ociscenTekst(r?.originalText?.text || r?.text?.text || '');
    return {
      id:          kljucRecenzije(autor, tekst),
      google_id:   String(r?.name || '').split('/').pop() || null,
      autor,
      autor_slika: r?.authorAttribution?.photoUri || null,
      autor_link:  r?.authorAttribution?.uri || null,
      ocena:       ocenaUBroj(r?.rating),
      tekst,
      jezik:       r?.originalText?.languageCode || r?.text?.languageCode || null,
      objavljeno:  uIso(r?.publishTime),
      link:        r?.googleMapsUri || null,
      izvor:       'places'
    };
  });

  return {
    izvor:     'places',
    recenzije,
    prosek:    typeof telo.rating === 'number' ? telo.rating : null,
    ukupno:    typeof telo.userRatingCount === 'number' ? telo.userRatingCount : null,
    nepotpuno: true   // Places uvek daje najviše 5 — javi to admin panelu
  };
}

// ══════════════════════════════════════════════════════════
//  IZVOR 2 — Business Profile API v4   → sve recenzije
// ══════════════════════════════════════════════════════════
function businessPodesen() {
  return Boolean(
    env('GBP_CLIENT_ID') && env('GBP_CLIENT_SECRET') &&
    env('GBP_REFRESH_TOKEN') && env('GBP_ACCOUNT_ID') && env('GBP_LOCATION_ID')
  );
}

async function pristupniToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     env('GBP_CLIENT_ID'),
      client_secret: env('GBP_CLIENT_SECRET'),
      refresh_token: env('GBP_REFRESH_TOKEN'),
      grant_type:    'refresh_token'
    }).toString()
  });
  const telo = await res.json().catch(() => ({}));
  if (!res.ok || !telo.access_token) {
    const e = new Error(telo?.error_description || telo?.error || 'OAuth osvežavanje nije uspelo');
    e.kod = 'oauth_greska';
    throw e;
  }
  return telo.access_token;
}

async function saBusinessa() {
  const token   = await pristupniToken();
  const nalog   = env('GBP_ACCOUNT_ID');
  const lokacija = env('GBP_LOCATION_ID');

  const recenzije = [];
  let stranica = '';
  let prosek = null, ukupno = null;

  // Google vraća po stranicama; skupi sve (uz kočnicu da ne vrtimo u prazno).
  for (let i = 0; i < 20; i++) {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(nalog)}` +
                `/locations/${encodeURIComponent(lokacija)}/reviews?pageSize=50` +
                (stranica ? `&pageToken=${encodeURIComponent(stranica)}` : '');

    const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const telo = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(telo?.error?.message || `Business Profile greška ${res.status}`);
      e.kod = 'google_greska';
      e.status = res.status;
      throw e;
    }

    if (typeof telo.averageRating === 'number') prosek = telo.averageRating;
    if (typeof telo.totalReviewCount === 'number') ukupno = telo.totalReviewCount;

    for (const r of (telo.reviews || [])) {
      const autor = ociscenTekst(r?.reviewer?.displayName || '', 120);
      const tekst = ociscenTekst(r?.comment || '');
      recenzije.push({
        id:          kljucRecenzije(autor, tekst),
        google_id:   r?.reviewId || null,
        autor,
        autor_slika: r?.reviewer?.profilePhotoUrl || null,
        autor_link:  null,
        ocena:       ocenaUBroj(r?.starRating),
        tekst,
        jezik:       null,
        objavljeno:  uIso(r?.createTime),
        link:        null,
        izvor:       'business'
      });
    }

    stranica = telo.nextPageToken || '';
    if (!stranica) break;
  }

  return { izvor: 'business', recenzije, prosek, ukupno, nepotpuno: false };
}

// ══════════════════════════════════════════════════════════
//  Jedini ulaz koji ostatak projekta koristi
// ══════════════════════════════════════════════════════════
async function povuciGoogleRecenzije() {
  if (businessPodesen()) return await saBusinessa();
  return await saPlacesa();
}

module.exports = { povuciGoogleRecenzije, businessPodesen, kljucRecenzije };
