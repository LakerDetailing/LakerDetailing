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
| `usluge.html` + 5 stranica usluga | Vidi sekciju **Stranice usluga** niže. Dele `assets/css/laker-base.css`, `assets/css/laker-usluga.css` i `assets/js/usluga.js` |
| `radovi.html` | „Sajt u radovima" — spremna, prekidač UGAŠEN. Vidi sekciju **Prekidač „u radovima"** |
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

## Stranice usluga — U REŽIMU PREGLEDA, NISU JAVNE

Šest stranica je na sajtu ali **klijenti ih ne vide** dok vlasnik ne kaže da su gotove (dodato 2026-08-13).

| Ruta | Sadržaj | Cene |
|---|---|---|
| `/usluge` | Hub — kartice svih usluga, „kako izabrati", kategorije vozila | — |
| `/premium-pranje` | Ručno pranje u 3 faze, potkrila, motorni prostor | 20–35 €, 25–40 €, 30–50 € |
| `/poliranje-laka` | 4 nivoa korekcije laka | 100–290 € |
| `/keramicka-zastita` | **Svi premazi**: keramika, 1K-Nano, karnauba vosak, Nano-Glass | 140–235 €, 80–135 €, 45–65 €, 30–80 € |
| `/dubinsko-ciscenje` | Enterijer + impregnacija kože i plastike | 99–145 €, 25–50 € |
| `/poliranje-farova` | Poliranje i UV zaštita farova | 25 € (sve kategorije) |

**Bez ijedne slike — namerno.** Nema praznih okvira koji čekaju fotografiju; ritam nose brojevi koraka, tabele i razmak. Kad fotografije stignu, dodaje se nova komponenta, postojeće se ne prepravlja.

### Kako se ulazi u režim pregleda

1. Otvori `https://www.lakerdetailing.rs/?pregled=on` — jednom po uređaju
2. Upisuje se `localStorage['laker_pregled']`, kôd je u [init.js](init.js) (blok „REŽIM PREGLEDA")
3. Tek tada se u navu, footeru i cenovniku pojave linkovi ka novim stranicama
4. Gašenje: `?pregled=off`

Isti obrazac kao `?analitika=off`. Radi po uređaju, ne po nalogu.

### Tri sloja koji drže stranice van očiju klijenata

- **`data-href` umesto `href`** u [index.html](index.html) — nav, footer i 16 naziva u cenovniku. Bez režima pregleda Googlebot nema šta da prati. U navu/footeru `href` ostaje `#pkg`, pa za klijenta ništa nije promenjeno.
- **`X-Robots-Tag: noindex, nofollow`** na svih 6 ruta u [vercel.json](vercel.json)
- **Nisu u `sitemap.xml`**

### PUŠTANJE U ŽIVO — tačno 6 koraka

1. `assets/css/laker-usluga.css` — proveri da nema više nijednog `.us-todo`: `grep -rn "us-todo" *.html`
2. [index.html](index.html) — `data-href` → `href` (nav, footer, 16 redova cenovnika), skloni `html.pregled ` sa 5 `.prc-more` pravila u `<style>`
3. [init.js](init.js) — obriši ceo blok „REŽIM PREGLEDA"
4. [vercel.json](vercel.json) — obriši headers blok sa `X-Robots-Tag` za tih 6 ruta (blok sa `usluge|premium-pranje|...`)
5. `sitemap.xml` — dodaj 6 unosa, `priority 0.8`, `changefreq monthly`
6. Bump `CACHE_VERSION` + verzija u footeru, `git push origin main`, pa `curl /api/health`

### Proizvodi i trajnost — POTVRĐENO (2026-08-13)

Vlasnik je potvrdio koje proizvode koristi; brojevi su sa **zvaničnog koch-chemie.com**:

| Usluga (cena) | Proizvod | Trajnost | Izvor |
|---|---|---|---|
| Keramička zaštita (140–235 €) | **Ceramic Body Cb0.01** | preko 36 meseci, moguća 2 sloja | zvanični KC |
| 1K-Nano premaz (80–135 €) | 1K-Nano | ~1 godina, do 3 uz negu + godišnju kontrolu | zvanični KC |
| Ručno karnauba voskiranje (45–65 €) | **Hand Wax W0.01** (karnauba) | do 3 meseca | vlasnik |
| Vosak u pranju / Clean paketu | **Protector Wax** | 4–6 nedelja | vlasnik |
| Nano-Glass (30–80 €) | Nano-Glasversiegelung | do 1 godine ili 20.000 km | zvanični KC |

> **Dva voska, ne jedan.** „4–6 nedelja" i „do 3 meseca" NISU protivrečnost — to su različiti proizvodi: Protector Wax ide uz pranje, Hand Wax W0.01 se nanosi ručno kao zasebna, skuplja usluga (najčešće posle poliranja). Ne „ujednačavati" ta dva broja.

**Tri odluke vlasnika od 2026-08-13 — ne menjati bez njega:**
- **Keramika se radi samo u 1 sloju.** Koch-Chemie dozvoljava 2, ali vlasnik ne nudi — ne pominjati drugi sloj na sajtu.
- **Bez ikakve garancije.** Na stranicama sme da stoji samo trajnost koju deklariše proizvođač, nikad obećanje studija. Provera: `grep -in garanc *.html` mora biti prazno.
- **Premium pranje traje 1–2 h** (njegovo merenje: 1:30–2:00 na dva auta). Broj uvek ide sa ogradom „zavisi od stanja vozila" jer ume da potraje duže.

**Keramika — pravilo koje mora da stoji na sajtu:** Koch-Chemie traži da se auto **ne pere prvih 9 dana** (posle 24 h je otporan na kišu, ali potpuno očvrsne tek deveti dan; ispod 15 °C i duže).

### Radno vreme — jedan izvor istine

**Ponedeljak — Subota, 09:00–20:00. Nedeljom ne radi.** Isto na sajtu, u JSON-LD `openingHoursSpecification` i na Google Mapama. Ranije je JSON-LD tvrdio pon–pet 08–18 i sub 09–15 — ispravljeno 2026-08-13. Pri svakoj izmeni ovoga proveri **oba** mesta u [index.html](index.html) i Google profil.

---

## Prekidač „u radovima"

`radovi.html` (ruta `/radovi`) je gotova i `noindex`, ali **nije uključena**. Bez inline skripti → ne dira CSP.

Paljenje: dodaj kao **prvi** unos u `redirects` niz u [vercel.json](vercel.json), pa push:

```json
{
  "source": "/((?!radovi|assets|api|_vercel|favicon.ico|robots.txt|sitemap.xml|service-worker.js).*)",
  "destination": "/radovi",
  "permanent": false
}
```

Gašenje: obriši taj unos i push.

**Dva ograničenja:** koristi se za **sate, ne dane** (Google skida rangiranje ako stoji dugo), i posetioci sa instaliranom PWA mogu na prvo otvaranje videti keširanu verziju jer Service Worker servira keš pre mreže.

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
- **Lozinke:** Supabase „leaked password protection" traži **Pro plan** (projekat je Free), pa je ista zaštita ugrađena u sajt — `isPasswordLeaked()` u [main.js](main.js) proverava HaveIBeenPwned preko k-anonimnosti (šalje se samo prvih 5 znakova SHA-1 heša). Radi u loyalty registraciji i pri resetu lozinke, fail-open uz 4s timeout. CSP: `connect-src` sadrži `https://api.pwnedpasswords.com`
- ⚠️ U istom Supabase projektu postoje `fin.*` tabele i `public.fin_*` SECURITY DEFINER funkcije (drugi projekat) koje anon može da poziva — **ne tiče se sajta**, ali stoji u `get_advisors` upozorenjima
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

## Analitika (GA4 + Facebook Pixel)

Sve je u [init.js](init.js) — blok `ANALYTICS` + blok `PRAĆENJE INTERAKCIJA`.

| Alat | ID | Kada se učitava |
|---|---|---|
| GA4 | `G-DP87917XW3` | **uvek** (Consent Mode v2, default `denied` → cookieless ping) |
| Facebook Pixel | `27521788054080884` | tek posle klika na „Prihvati sve" |
| Vercel Web Analytics | `/_vercel/insights/script.js` | **uvek** — bez kolačića, ne traži pristanak |

**Vercel Web Analytics** (uključen 2026-08-02, Hobby plan: 50k događaja/mesec, 30 dana istorije, bez custom eventa) je jedini izvor **tačnog** broja poseta — GA4 bez pristanka šalje samo cookieless ping koji Google ne prikazuje jer modelovanje traži mnogo veći saobraćaj. Skripta je na `index.html` i `loyalty-join.html`; `service-worker.js` propušta `/_vercel/*` uvek na mrežu. CSP nije trebalo dirati (`script-src 'self'` + `connect-src 'self'`, sve je same-origin).
Dashboard: https://vercel.com/laker-detailing-s-projects/laker-detailing/analytics

**Mesečni izveštaj:** GA4 Admin → Scheduled emails → „Mesecni izvestaj - Laker Detailing" (PDF, mesečno, na detailinglaker@gmail.com, aktivno do 3.8.2027).

**GA nalog:** property `lakerdetailing.rs` (a395479676 / p538559050) je na nalogu **detailinglaker@gmail.com**, koji je u Chrome-u obično `authuser=2` — bez toga GA otvori pogrešan nalog. Direktan link:
`https://analytics.google.com/analytics/web/?authuser=2#/p538559050/reports/intelligenthome`

### Custom eventi
| Event | Okidač | Parametri |
|---|---|---|
| `kontakt_whatsapp` | klik na bilo koji `wa.me` link | `metod`, `sekcija` |
| `kontakt_telefon` | klik na `tel:` | `metod`, `sekcija` |
| `kontakt_email` | klik na `mailto:` | `metod`, `sekcija` |
| `klik_instagram` | klik na Instagram | `sekcija` |
| `sekcija_prikazana` | sekcija (`pkg`/`care`/`prc`/`faq`/`tst`) pređe sredinu ekrana | `sekcija` |
| `recenzija_poslata` | uspešno poslata recenzija ([main.js](main.js)) | `ocena`, `grad` |
| `loyalty_prijava` | uspešna loyalty registracija ([main.js](main.js)) | `plan`, `velicina`, `izvor` |

> Novi event se u GA4 Admin → Events pojavi tek **do 24h** posle prvog slanja — tek tada može zvezdicom da se označi kao **Key event**.

> `/loyalty-join` (QR strana) NEMA analitiku — nema GA skriptu ni cookie baner, a njen CSP ne dozvoljava googletagmanager. Ako zatreba, mora i CSP i baner na toj ruti.

**Search Console** je povezan sa GA4 (Admin → Product links) — izveštaj „Google Organic Search Queries" počinje da se puni ~48h posle povezivanja.

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
| CI/CD & Version Control | ✅ | Git/GitHub + GitHub Actions CI (`.github/workflows/ci.yml`) — JS syntax check + smoke test produkcije posle deploya |
| Security & RLS | ✅ | CSP, HSTS, CORS, RLS, XSS, audit logs |
| Rate Limiting | ✅ | Persistent per-IP u `security_rate_limits` tabeli |
| Caching & CDN | ✅ | Vercel edge CDN, 1yr asset cache, PWA Service Worker |
| Load Balancing & Scaling | ✅ | Vercel serverless — automatski |
| Error Tracking & Logs | ✅ | `health.js` + audit logs + Sentry Browser JS (DSN: `o4511525862309888`) |
| Availability & Recovery | ✅ | Vercel/Supabase HA + UptimeRobot gađa `/api/health` na 5 min (monitor 803242939) |

**Score: 13/13 ✅ — sve implementirano**

---

## Deploy — OBAVEZNA provera posle pusha

**Zeleni build ≠ sajt radi.** Statika ide sa CDN-a, pa sajt izgleda ispravno i kad su sve serverless funkcije mrtve.

Posle svakog `git push origin main` proveri:
```bash
curl -s https://www.lakerdetailing.rs/api/health   # mora: {"ok":true,...,"db":"ok"}
```

CI ovo radi automatski (job `production-smoke`), ali proveri i ručno kad menjaš nešto u `api/`.

**Rešen kvar (2026-07-17):** deploy prolazi kao READY, ali runtime ne zakači env varijable — svih 5 `api/*` funkcija vraća `500 FUNCTION_INVOCATION_FAILED` (`EnvFileReadError`). Danas se desilo 3× od 5 deploya. **Pravi uzrok:** projekat nije imao `package.json` (bio u `.gitignore` I `.vercelignore`), pa je Vercel detektovao "čistu statiku" i povremeno radio skraćeni build koji preskoči env injekciju — u build logu tada **fali `Vercel CLI` linija** (poklapanje 4/4: sa linijom radi, bez nje puca). **Trajni lek (commit f6f605f):** `package.json` sada ide na Vercel → build radi `npm install` (nula zavisnosti) → pun build sa env injekcijom svaki put, bez obzira na build keš. **NE brisati `package.json` niti ga vraćati u ignore fajlove.** `package-lock.json` ostaje ignorisan (nema zavisnosti).

> Prepoznavanje: `/api/health` vraća **500** umesto svog urednog **503**. 503 = baza pala. 500 = funkcija uopšte ne startuje (env/runtime). Ako se ipak ponovi: proveri build log (`Vercel CLI` + `Installing dependencies` moraju biti tu); ako fale, redeploy bez keša u Vercel dashboardu ili rollback na poslednji zeleni deploy.
