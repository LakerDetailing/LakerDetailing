# Laker Detailing Studio — lakerdetailing.rs

Auto detailing studio u Čačku. Vanilla HTML/JS sajt hostovan na Vercel, backend Supabase, email Brevo, PWA sa push notifikacijama.

---

## DEPLOY PRAVILO — KRITIČNO
**Jedino: `git push origin main`** → GitHub automatski triggeruje Vercel deploy.  
**NIKAD** ne deplojavati direktno na Vercel! GitHub → Vercel je jedini ispravni tok.

---

## Struktura fajlova

| Fajl/Folder | Opis |
|---|---|
| `index.html` | Ceo sajt (~200KB) — sav HTML, CSS i JS u jednom fajlu |
| `main.js` | Izvorni JS — Supabase recenzije + kompletni Loyalty sistem (IIFE). **Ne učitava se direktno** |
| `main.min.js` | Minifikovana verzija koju sajt učitava. Posle izmene main.js regeneriši: `npx terser main.js --compress --mangle -o main.min.js` + bump `?v=` u index.html |
| `assets/fonts/` | Self-hostovani woff2 fontovi (Cormorant Garamond + Inter, latin/latin-ext) + `fonts.css` (koristi ga admin panel; index.html ima isti @font-face inline) |
| `laker-admin-9x3k.html` | Admin panel (URL je namerno obscure, noindex) |
| `api/admin.js` | Admin API — sve admin akcije |
| `api/send-email.js` | Brevo email API — booking, loyalty welcome, recenzije |
| `loyalty-join.html` + `loyalty-join.js` | QR Loyalty prijava (`/loyalty-join`) — Google/Apple/ručna prijava, mobile-first. JS je eksterni fajl (bez inline skripti → ne dira CSP hash-eve) |
| `api/loyalty-join.js` | QR prijava backend — GET vraća javni config (Google/Apple ID iz env), POST verifikuje OAuth tokene SERVER-SIDE, rate limit, honeypot, upis u `contacts` + Brevo emailovi |
| `SETUP-OAUTH.md` | Uputstvo: GOOGLE_CLIENT_ID / APPLE_SERVICE_ID env varijable za /loyalty-join dugmad |
| `tools-csp-hashes.js` | Helper (ne deployuje se): `node tools-csp-hashes.js` izračuna CSP sha256 hash-eve inline skripti — OBAVEZNO pokrenuti posle izmene inline `<script>` u index/admin/offline.html i ažurirati vercel.json |
| `tools-dev-server.js` | Lokalni dev server (ne deployuje se): `node tools-dev-server.js` → http://127.0.0.1:4173, mock /api/loyalty-join config |
| `assets/qrcode.min.js` | Self-hostovana qrcodejs lib — QR modal u admin panelu |
| `api/push-*.js` | PWA push notifikacije |
| `api/_push.js` | Supabase helper za push API |
| `api/_security.js` | Rate limiting, audit log |
| `api/health.js` | Health check endpoint |
| `service-worker.js` | PWA offline + push |
| `vercel.json` | CSP headers, cache pravila, rute |
| `og-image.jpg` | OG slika za deljenje (1200×630) |
| `sitemap.xml` | Sitemap za Google |
| `robots.txt` | Blokira admin i api, linkuje sitemap |
| `offline.html` | PWA offline fallback |
| `assets/` | Slike: hero (900/1100/1600 .jpg+.webp), gallery (work1-3, path2, wheel), icons |
| `supabase/*.sql` | SQL migracije (samo referenca, ne deployuju se) |

### Slike — važno
Sve slike u HTML-u koriste `<picture>` tag:
- Hero: AVIF (`hero-900/1100/1600.avif`) + WebP + JPG fallback; preload u head-u je AVIF
- Galerija: WebP srcset `*-480.webp 480w` + `*.webp 900w` + `-opt.jpg` fallback; AVIF za galeriju NE koristiti — zrnaste fotke, AVIF ispada veći od WebP
- Logo: `laker-logo.webp` + `laker-logo-opt.jpg`
- `favicon.svg` je UKLONJEN (bio je 486KB lažni SVG sa base64 PNG) — koriste se .ico/.png ikone

Originalne neoptimizovane slike (work1.jpg, work2.jpg, gallery-wheel.jpeg, itd.) su u `.gitignore` — ne idu na Vercel.

---

## Brand

- **Primary boja:** `#C0392B` | **Hover:** `#E74C3C` | **Bg:** `#080808`
- **Naslovi:** Cormorant Garamond | **Tekst:** Inter
- **Sekcije:** `#hero` `#phi` `#cs` `#proc` `#pkg` `#care` `#prc` `#faq` `#tst` `#soc` (sekcije `#srv` i `#rvw` NE postoje — svi "Usluge" linkovi vode na `#pkg`)

---

## Paketi i cene

| Paket | Mali (A) | Srednji (C) | Veliki (E+) | Ekstra (SUV/Van) |
|-------|----------|-------------|-------------|-----------------|
| Clean | €99  | €110 | €130 | €145 |
| Boost | €249 | €260 | €280 | €295 |
| Laker | €499 | €510 | €530 | €545 |

---

## Loyalty sistem

| Vozilo | Mesečno | Godišnje | Ušteda |
|--------|---------|----------|--------|
| Mali/Srednji | €35/mes | €299/god | 29% |
| Veliki/SUV   | €40/mes | €349/god | 27% |

- 24 pranja/godišnje (2× mesečno), prioritetan termin
- Toggle default = Godišnje
- Registracija: Ime, Prezime, Email, Telefon, Veličina, Plan

---

## Admin panel (`laker-admin-9x3k.html`)

Login: email + lozinka (Supabase auth). 4 taba (prečice 1–4):

1. **Dashboard** — pregled statova u realnom vremenu
2. **Recenzije** — odobravanje/odbijanje testimonijala
3. **Loyalty** — lista članova, dodavanje pranja, napomene, plan
4. **Loyalty Prijave** — nove prijave koje čekaju aktivaciju (kontakti iz `contacts` tabele sa `submission_type = loyalty_registration`). Uključuje QR prijave: filter pills (Svi / 📱 QR prijave / 🌐 Sajt), 📱 QR badge po izvoru (Google/Apple/Ručno), dugme **📱 QR za prijavu** otvara modal sa QR kodom za `/loyalty-join` + download PNG. Liste se auto-osvežavaju na 90s dok je admin ulogovan.

> ⚠️ Tab "Upiti" je uklonjen — booking forma nije aktivna na sajtu.

---

## Email tipovi (`api/send-email.js`)

| Tip | Okidač |
|---|---|
| `booking` | Zahtev za termin |
| `loyalty_welcome` | Aktivacija loyalty člana |
| `maintenance` / `care` / `loyalty` | Generički Brevo template |
| `testimonial` | Potvrda recenzije |
| `birthday` | Deaktiviran |

`loyalty_welcome` prima: `{ name, email, plan, velicina }`

---

## Supabase

**Projekat:** `raxdsanycyycroucxtmy.supabase.co`  
**Anon ključ:** javno vidljiv u `main.js` — normalno za Supabase, sigurnost osigurava RLS.

### Tabele
- `loyalty_customers` — name, email, phone, care_plan, plan_type, car_size, wash_count, auth_user_id
- `contacts` — loyalty prijave i booking upiti (submission_type: 'loyalty_registration' | 'booking'); kolona `source` = izvor (web | qr_manual | qr_google | qr_apple); trigger `contacts_spam_guard` = max 3 prijave/IP/10min
- `testimonials` — recenzije (approved: bool)
- `loyalty_washes` — istorija pranja
- `loyalty_wash_requests` — zahtevi za pranje

### RLS politike — sve konfigurisano ispravno
- `loyalty_customers`: SELECT/INSERT/UPDATE samo za sopstveni red (`auth_user_id = auth.uid()`), anon nema pristup
- `contacts`: INSERT za anon/authenticated (samo dozvoljeni submission_type), SELECT blokiran
- `testimonials`: SELECT samo approved=true (public), ostalo blokirana
- `push_*`, `security_*`: blokirani za sve public role

---

## Ključne JS funkcije

### index.html (inline)
```
togglePkInfo(btn)             // paketi — expandable stavke
setLoyBilling('mes'|'god')    // loyalty cenovnik toggle
selectLoySize('ms'|'vs')      // registracija — veličina vozila
selectLoyPlan('mes'|'god')    // registracija — plan
openLoyalty() / closeLoyalty()
loyTab('login'|'reg')
loyLogin() / loyRegister()
```

### main.js
- `loadReviews()` — učitava odobrene recenzije iz Supabase
- Loyalty IIFE blok — kompletna auth/session logika, Supabase JWT

---

## Env varijable (Vercel dashboard)

| Promenljiva | Opis |
|---|---|
| `BREVO_API_KEY` | Brevo email API ključ |
| `SUPABASE_URL` | `https://raxdsanycyycroucxtmy.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side only) |
| `ADMIN_PASSWORD` | Admin panel lozinka |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | PWA push notifikacije |
| `GOOGLE_CLIENT_ID` | (opciono) Google dugme na `/loyalty-join` — setup u SETUP-OAUTH.md; bez njega dugme je sakriveno |
| `APPLE_SERVICE_ID` | (opciono) Apple dugme na `/loyalty-join` — setup u SETUP-OAUTH.md; bez njega dugme je sakriveno |

---

## Napomene

- Fontovi su self-hostovani (`assets/fonts/`) — Google Fonts domeni uklonjeni iz HTML-a i CSP-a
- Custom cursor isključen na touch uređajima (`@media (hover:none)`)
- PWA push notifikacije rade — setup u `PWA_PUSH_SETUP.md` (lokalno, ne u repo)
- `vercel.json` ima `unsafe-inline` u CSP — potrebno zbog inline event handlera u HTML-u
- Admin URL je namerno obscure (ne linkovan nigde, `noindex`)
- Google Search Console: sajt dodat, sitemap submitan
- IndexNow (Bing/Edge): ključ u fajlu `2e68d4c0350193ca6d78089e4129f608.txt` u root-u. Posle većih izmena pingovati: `https://api.indexnow.org/indexnow?url=https://www.lakerdetailing.rs/&key=2e68d4c0350193ca6d78089e4129f608`
- SEO (2026-07-12): JSON-LD FAQ mora biti identičan vidljivim FAQ pitanjima (trenutno 9) — pri izmeni FAQ sekcije ažurirati i JSON-LD! Schema tipovi: LocalBusiness+AutoBodyShop+AutoRepair+CarWash; 12 areaServed lokacija; 8 offera u OfferCatalog
- `assets/pwa/` folder ne postoji u repo-u — koristi se isključivo `assets/icons/`
- **QR Loyalty prijava** (`/loyalty-join`, dodato 2026-06-12): potpuno odvojen flow od loyalty sistema u index.html. Ručna forma radi odmah; Google/Apple dugmad se same pojave kad se podese env varijable (vidi SETUP-OAUTH.md). `/loyalty-join` ruta ima SVOJ CSP header u vercel.json (accounts.google.com + appleid) i COOP `same-origin-allow-popups` (globalni `same-origin` bi blokirao Google popup). Token verifikacija je isključivo server-side u `api/loyalty-join.js`.

---

## Full-Stack Production Checklist (audit 2026-06-07)

| Kategorija | Status | Napomena |
|---|---|---|
| Frontend | ✅ | PWA, WebP, responsive |
| APIs & Backend Logic | ✅ | Vercel serverless (`api/*.js`) |
| Database & Storage | ✅ | Supabase PostgreSQL |
| Auth & Permissions | ✅ | Supabase JWT, brute-force zaštita |
| Hosting & Deployment | ✅ | Vercel, GitHub→Vercel auto-deploy |
| Cloud & Compute | ✅ | Vercel serverless auto-scale |
| CI/CD & Version Control | ✅ | Git/GitHub + GitHub Actions CI (`.github/workflows/ci.yml`) — JS syntax check na svakom push |
| Security & RLS | ✅ | CSP, HSTS, CORS, RLS, XSS, audit logs |
| Rate Limiting | ✅ | Persistent per-IP u `security_rate_limits` tabeli |
| Caching & CDN | ✅ | Vercel edge CDN, 1yr asset cache, PWA Service Worker |
| Load Balancing & Scaling | ✅ | Vercel serverless — automatski |
| Error Tracking & Logs | ✅ | `health.js` + audit logs + Sentry Browser JS (DSN: `o4511525862309888`) |
| Availability & Recovery | ⚠️ | Vercel/Supabase HA ✅ — nedostaje uptime monitoring (UptimeRobot) |

**Score: 13/13 ✅ — sve implementirano**
