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
| `index.html` | Početna strana. Od renoviranja 2026-09-02 sadrži samo hero, traku, O nama, Galeriju, FAQ i Lokaciju — stil i skripte su u zasebnim fajlovima. **Sekcije Recenzije (`#tst`) i Mreže (`#soc`) izbačene 2026-09-02 na zahtev vlasnika** (Instagram/TikTok već stoje u futeru); `loadReviews()` i review modal u main.js ostaju i sami se gase kad nema `#tst-dynamic` |
| `usluge.html` + 5 strana usluga | `/usluge` pregled → `/premium-pranje`, `/detailing-auta`, `/poliranje-laka`, `/keramicka-zastita`, `/poliranje-farova` |
| `cenovnik.html` | `/cenovnik` — paketi, Loyalty, pojedinačne cene i kalkulator „Sastavi sam" (`#paketi #loyalty #pojedinacne #sastavi #prijava`) |
| `assets/css/laker.css` | **Zajednički stil svih strana** — nav, mobilni meni, dugmad, kostur sekcije, tabele, futer, PWA trake, kolačići |
| `assets/css/pocetna.css` | samo početna | 
| `assets/css/usluge.css` | `/usluge` + 5 strana usluga |
| `assets/css/cenovnik.css` | `/cenovnik`, uključujući preseljene pakete, Loyalty i modal za prijavu |
| `assets/js/laker-ui.js` | **Zajedničko ponašanje svih strana** — kursor, tema, nav, mobilni meni, tabovi, FAQ, otkrivanje sekcija, `data-click` |
| `assets/js/cenovnik.js` | birač veličine vozila + kalkulator „Sastavi sam". Spisak usluga je `div.svc[role=group] > div.st[role=checkbox]`, **ne `ul/li`** — `<li role="checkbox">` Lighthouse prijavljuje kao neispravan ARIA (2026-09-03) |
| `assets/js/auti.js` | spisak marki i modela (41 marka, 583 modela) za kalkulator |
| `main.js` | Izvorni JS — Supabase recenzije, galerija i kompletni Loyalty sistem (IIFE). **Ne učitava se direktno** |
| `main.min.js` | Minifikovana verzija koju sajt učitava. Posle izmene main.js regeneriši: `npx terser main.js --compress --mangle -o main.min.js` + bump `?v=` u index.html |
| `init.min.js`, `assets/js/laker-ui.min.js`, `assets/js/auti.min.js`, `assets/js/cenovnik.min.js` | **Od 2026-09-03 strane učitavaju SAMO `.min.js`** (PageSpeed: 10 KB uštede). Izvor se menja u `.js`, pa **obavezno** `npm run build:js` (regeneriše svih 5 minifikovanih) + bump `?v=`. Zaboravljen build = sajt vrti stari kod iako je izvor izmenjen |
| `assets/fonts/` | Self-hostovani woff2 fontovi (Cormorant Garamond + Inter, latin/latin-ext) + `fonts.css` (koristi ga admin panel; index.html ima isti @font-face inline) |
| `laker-admin-9x3k.html` | Admin panel (URL je namerno obscure, noindex) |
| `api/admin.js` | Admin API — sve admin akcije |
| `api/send-email.js` | Brevo email API — booking, loyalty welcome, recenzije |
| `loyalty-join.html` + `loyalty-join.js` | QR Loyalty prijava (`/loyalty-join`) — Google/Apple/ručna prijava, mobile-first. JS je eksterni fajl (bez inline skripti → ne dira CSP hash-eve) |
| `api/loyalty-join.js` | QR prijava backend — GET vraća javni config (Google/Apple ID iz env), POST verifikuje OAuth tokene SERVER-SIDE, rate limit, honeypot, upis u `contacts` + Brevo emailovi |
| `SETUP-OAUTH.md` | Uputstvo: GOOGLE_CLIENT_ID / APPLE_SERVICE_ID env varijable za /loyalty-join dugmad |
| `api/_google.js` | Povlačenje recenzija sa Google Mapa — dva izvora iza istog izlaza (Places / Business Profile). Vidi **Google recenzije** |
| `SETUP-GOOGLE-RECENZIJE.md` | Uputstvo za vlasnika: Google Cloud ključ + zahtev za Business Profile pristup (ne deployuje se) |
| `tools-csp-hashes.js` | Helper (ne deployuje se): `node tools-csp-hashes.js` izračuna CSP sha256 hash-eve inline skripti — OBAVEZNO pokrenuti posle izmene inline `<script>` u index/admin/offline.html i ažurirati vercel.json |
| `tools-dev-server.js` | Lokalni dev server (ne deployuje se): `node tools-dev-server.js` → http://127.0.0.1:4173, mock /api/loyalty-join config |
| `tools-galerija.js` + `SLIKE.bat` | Sistem za slike u galeriji — vlasnik sam menja slike. Vidi sekciju **Galerija** niže. Ne deployuje se |
| `galerija/` | Dropzone za originalne slike galerije (gitignored, osim `PROCITAJ-ME.txt`) — šta je ovde, to je na sajtu |
| `GALERIJA-UPUTSTVO.md` | Uputstvo za vlasnika (ne deployuje se) |
| `assets/qrcode.min.js` | Self-hostovana qrcodejs lib — QR modal u admin panelu |
| `api/push-*.js` | PWA push notifikacije |
| `api/_push.js` | Supabase helper za push API |
| `api/_security.js` | Rate limiting, audit log |
| `api/health.js` | Health check endpoint |
| `api/mera.js` + `assets/js/mera.js` | Sopstveno merenje poseta (bez kolačića). Vidi **Sopstveno merenje** |
| `api/izvestaj.js` | Nedeljni mejl sa statistikom sajta, ponedeljkom oko 12h |
| `tools-izvestaj-proba.js` | Proba izgleda tog mejla bez slanja (ne deployuje se) |
| `service-worker.js` | PWA offline + push |
| `vercel.json` | CSP headers, cache pravila, rute |
| `og-image.jpg` | OG slika za deljenje (1200×630) |
| `sitemap.xml` | Sitemap za Google |
| `llms.txt` | Sažetak sajta za AI pretraživače (Lighthouse „Agentic Browsing" ga proverava — traži Markdown sa H1 i linkovima). **Prepisan 2026-09-03**: stari je imao pogrešno radno vreme i linkove na sekcije koje ne postoje. Pri promeni cena, radnog vremena ili ruta ažurirati i njega |
| `robots.txt` | Blokira admin i api, linkuje sitemap |
| `offline.html` | PWA offline fallback |
| `radovi.html` | „Sajt u radovima" — spremna, prekidač UGAŠEN. Vidi sekciju **Prekidač „u radovima"** |
| `assets/` | Slike: hero (900/1100/1600 .avif+.webp), `gallery/` (samo `g-*` iz galerije + `logo-dark/light`), icons |
| `demo-telefon.html` + `assets/js/demo-telefon.js` | Jedina preostala demo strana (`/demo-telefon`, noindex, `no-store`) — varijante mobilnog rasporeda iz 2026-09-03. **Ostalih 9 demo strana (`demo*.html`, `laker-base.css`, `laker-demo.css`, `demo-reveal.js`, `tools-demo-build.js`, slike `work1-3`/`gallery-wheel`) je obrisano 2026-09-04** — bile su iz vremena pre renoviranja, učitavale nepostojeći `laker-usluga.css` i stari `init.js`, a generator više nije mogao da radi jer sekcija `#proc` ne postoji |
| `supabase/*.sql` | SQL migracije (samo referenca, ne deployuju se) |

### Slike — važno
Sve slike u HTML-u koriste `<picture>` tag:
- Hero: AVIF (`hero-900/1100/1600.avif`) + WebP; **fallback je WebP, ne JPG** — `hero-*.jpg` su u `.gitignore` i `.vercelignore` (od 2026-09-04 više nisu ni u gitu, samo na disku). Preload u head-u je AVIF
- Galerija: WebP srcset `*-480.webp 480w` + `*.webp 900w` + `-opt.jpg` fallback; AVIF za galeriju NE koristiti — zrnaste fotke, AVIF ispada veći od WebP
- Logo: `assets/icons/laker-logo-2.avif` + `laker-logo-2.webp` + `laker-logo-2-opt.jpg`
- `favicon.svg` je UKLONJEN (bio je 486KB lažni SVG sa base64 PNG) — koriste se .ico/.png ikone

Originalne neoptimizovane slike (hero-orig.jpg, hero-*.jpg, itd.) su u `.gitignore` — ne idu na Vercel.

---

## Struktura sajta — posle renoviranja (2026-09-02)

Sajt više nije jedna ogromna strana. Osam ruta, zajednički stil i skripta:

| Ruta | Fajl | Sadržaj |
|---|---|---|
| `/` | `index.html` | hero · traka · O nama · Galerija · FAQ · Lokacija |
| `/usluge` | `usluge.html` | samo 5 kartica usluga — uvodni tekst i „Kako izgleda tretman" izbačeni 2026-09-02 na zahtev vlasnika (`h1` je sada „Izaberite uslugu"); `.proc-*` CSS i sekcija obrisani |
| `/premium-pranje` | | 8 koraka pranja, Protector Wax, 20–35 € |
| `/detailing-auta` | | enterijer + eksterijer, 99–145 € |
| `/poliranje-laka` | | 4 nivoa, 100–290 € |
| `/keramicka-zastita` | | keramika 140–235 €, uz `#1k-nano`, `#karnauba`, `#nano-glass` |
| `/poliranje-farova` | | 25 € za sve kategorije, UV premaz do 36 meseci |
| `/cenovnik` | `cenovnik.html` | paketi → Loyalty → pojedinačne → „Sastavi sam" |

**`/dubinsko-ciscenje` je obrisan** — 301 na `/detailing-auta` (redirect u [vercel.json](vercel.json)).

### Pravila koja se ne smeju pokvariti

- **Stil se ne piše u HTML.** `laker.css` je zajednički; ono što koristi jedna strana ide u
  `pocetna.css`, `usluge.css` ili `cenovnik.css`. Pri premeštanju pravila između fajlova pazi na
  redosled: fajl koji se učitava kasnije pobeđuje kod iste specifičnosti. Tri mesta gde je to
  već ugrizlo nose komentar u kodu (`.rd` kašnjenje, mobilna polja `.fg`, `#nav`).
- **`#nav`, ne `nav`.** Strane imaju i druge `<nav>` oznake (putanja, donja traka na telefonu);
  fiksni gornji meni sme da pogodi samo `#nav`.
- **Nove strane nemaju inline `<script>`** osim tri: JSON-LD, prekidač teme i `js-ready`.
  Poslednja dva moraju da rade PRE iscrtavanja (inače treperi svetla tema), pa ostaju inline i
  imaju svoj CSP hash. Posle svake izmene: `node tools-csp-hashes.js` → `vercel.json`.
- **Cene stoje na dva mesta** i moraju da se poklapaju: u tabelama `cenovnik.html` i u nizu
  `USLUGE` u [assets/js/cenovnik.js](assets/js/cenovnik.js). Kartice sa cenom na stranama usluga
  su treće mesto.
- **Birač veličine vozila** (`.szbar` na cenovniku) menja sve odjednom: pakete, Loyalty
  (Mali/Srednji → 35 €/299 €, Veliki/SUV → 40 €/349 €), istaknutu kolonu u tabelama i kalkulator.
  Izbor auta u kalkulatoru sam postavlja tu veličinu.
- **Izgled birača preuređen 2026-09-03** (vlasnik: „baš je sitno, ne vidi se lepo"). Naslov je u
  svom redu, dugmad su mreža od četiri jednake kolone preko cele širine, tekst je normalnim slovima
  (bez `text-transform:uppercase` i `letter-spacing`, koji su reč širili trostruko i terali font na
  7,3–8 px). **Doradjeno istog dana: u dugmetu su tri poznata auta u čipovima (`.szm`), a red
  `#szHint` je obrisan** — segmenti i metri se NE pišu nigde na sajtu (vlasnik: „ne mogu da mešam
  C klasu, to niko ne razume"). Na telefonu (`≤768px`) čipovi gube okvir i idu jedan ispod drugog,
  a na `≤480px` se **drugi po redu krije** (`nth-child(2)`), pa ostaju parovi Polo/Corsa,
  Golf/Rapid, Camry/Serija 5, X7/Macan — zato redosled u HTML-u nije proizvoljan. Pravila su `.szbar .szp*` u
  [assets/css/cenovnik.css](assets/css/cenovnik.css). **Dugme mora zadržati klasu `.tb`** — po njoj
  ga traže `cenovnik.js` i `ot()`; `.szp` je samo za izgled. Tekstovi u `HINT` moraju stati u JEDAN
  red na 320 px (~52 znaka), inače lepljiva traka poskoči pri promeni veličine. Boja teksta na
  izabranom dugmetu je tvrdo `#0B0B0B`, ne `var(--black)` — u svetloj temi je `--black` svetlo bež,
  pa bi na crvenom ispao na 3,3:1 kontrasta.
- **Primeri auta stoje na 6 mesta i moraju biti IDENTIČNI**: čipovi u biraču, napomena ispod
  tabela (`.prc-note`), `#cfgVelicina` u kalkulatoru, Loyalty kartica (`#loy-veh-sub` u
  [main.js](main.js) i `.loy-pick-sub`) i spisak cena na svih 5 strana usluga. Tekst je:
  **Mali (Polo, Audi A2, Corsa) · Srednji (Golf, Peugeot 307, Rapid) · Veliki (Camry, CX-5,
  Serija 5) · Ekstra (X7, Tiggo 8, Macan)** — spisak je vlasnikov izbor (2026-09-03), ne menjati
  bez njega. Svaki primer mora stvarno da pada u tu kategoriju u [assets/js/auti.js](assets/js/auti.js);
  provera: `node -e "global.window={};require('./assets/js/auti.js')..."`.
  U čipovima je REDOSLED bitan — drugi po redu se krije na telefonu, pa na drugom mestu stoji
  onaj koji sme da otpadne (Audi A2, Peugeot 307, CX-5, Tiggo 8), a ne najprepoznatljiviji. `KAT_PUN` u cenovnik.js nosi opis („kao Golf ili Astra"), koji
  mora imati smisla uz svaku karoseriju — stoji kao „opis · limuzina · crna".
- **Telefon (≤768px) na /cenovnik i /usluge — izbor vlasnika 2026-09-03** (demo `/demo-telefon`,
  varijanta C svuda): paketi su **tabovi Clean/Boost/Laker + horizontalni karusel** sa brojačem
  „Paket 1 od 3" i ivicom sledeće kartice koja viri (vlasnik: „da ljudima ne promakne da ima tri");
  markup `.pk-nav` u cenovnik.html, karusel i cene u tabovima u cenovnik.js, CSS na kraju
  cenovnik.css. Kartica `.pk` je tamo CSS grid sa `minmax(0,1fr)` (bez toga dugačka stavka razvuče
  mrežu preko ivice), `.pk-num` sakriven, dugme preko cele širine. **Pojedinačne usluge su prava
  tabela sa 4 kolone** (`#pojedinacne .tp` gazi kartice iz laker.css), a `/usluge` je **spisak**
  (naziv · kratak opis · cena · strelica). U `.sh` naslovima stoji razmak ispred `<br>` jer se na
  telefonu `br` krije (`h1.sh br,h2.sh br{display:none}`) — bez razmaka se reči zalepe. Računar netaknut.
- **`/poliranje-laka` nema tabelu nivoa** (2026-09-06, vlasnik odobrio demo). Tabela je govorila
  koliko prolaza ima nivo, ali ne i šta klijent dobija. Zamenile su je **kartice `.niv-c`** sa jednom
  podebljanom rečenicom koristi, cenom i trakom „Koliko rešava" (`--w` 30/50/75/100%). Traka NIJE
  procenat ničega merljivog, samo redosled jačine zahvata — zato uz nju **ne sme stajati broj**.
  Dvoslojno nosi `.mid` („Ulazi u Boost paket"), troslojno `.top` (crveni okvir, „Ulazi u Laker paket") —
  tako oko pada na skuplji nivo. Iznad je blok `#test` sa tri provere koje klijent uradi sam (sunce,
  nokat, oksidacija) — svrha je da problem prepozna pre nego što pozove. Stil je `.niv*` i `.tst3` na
  kraju [assets/css/usluge.css](assets/css/usluge.css). Boja teksta na crvenoj oznaci je tvrdo `#0B0B0B`,
  ne `var(--black)` — isti razlog kao kod birača veličine.
- **Mikroni se ne pišu na sajtu.** Vlasnik je pitao da li je „ispod 85 loše"; fabrički lak varira po
  marki i nema zvanične granice, pa bi svaki broj prvi klijent sa manjom debljinom osporio. Na strani
  stoji samo da se lak meri i da poliranje ne ide neograničen broj puta — granicu vlasnik drži u glavi.
- **One Cut & Finish P6** je po zvaničnom koch-chemie.com pasta koja u jednom prolazu seče i polira
  (seča 6 / sjaj 8 od 10), sadrži karnaubu pa ostavlja blagi zaštitni efekat, i skida hologram, sitne
  ogrebotine i tragove šmirgle od P2000. Rok trajanja tog efekta proizvođač **ne navodi** — ne pisati ga.
  Vlasnik je tražio da se ostali proizvodi ne imenuju, samo „Koch-Chemie"; P6 je izuzetak jer je to ime
  samog nivoa u cenovniku.
- **`.todo` oznake i njihov CSS su obrisani 2026-09-02** — otvorena pitanja vlasniku idu u razgovor, ne na sajt.
- **`body{overflow-x:clip}`, nikad `hidden`.** `hidden` od body-ja pravi scroll kontejner i `position:sticky` prestaje da radi
  (birač veličine `.szbar`, kartica cene `.usl-aside`, `.cfg-r`, `.faq-sticky`). Nađeno i popravljeno 2026-09-02.
- **`[hidden]{display:none!important}` stoji u laker.css.** Bez toga `.row2{display:grid}` i `.carbox{display:grid}` gaze
  `hidden` atribut, pa se u kalkulatoru videla prazna kutija auta i ručni izbor karoserije.
- **`ot()` skida `.on` samo u istoj grupi tabova** — i birač veličine koristi `.tb`, pa bi globalni reset ugasio izabranu veličinu.
- **Dugme „Prijava" na samom cenovniku je `#prijava`** — modal se otvara i na `hashchange`, ne samo pri učitavanju (cenovnik.js).
- **Kalkulator ne dozvoljava besmislene kombinacije** (2026-09-02). `GRUPE` i `SADRZI` u
  [assets/js/cenovnik.js](assets/js/cenovnik.js): od četiri nivoa poliranja sme jedan, od tri
  zaštite laka (keramika / 1K-Nano / karnauba) sme jedna, od dva Nano-Glass-a sme jedan, a
  „Detailing auta" gasi „Premium pranje" jer ga već sadrži. Sivi red se ne klikće; `dodajUslugu()`
  izbacuje manju uslugu kad se izabere veća, a `uskladi()` čisti staro stanje iz localStorage-a.
  Nova usluga koja se sa nečim ne slaže — dodaj je u `GRUPE`, ne piši novu granu koda.
- **Impregnacija kože i plastike ULAZI u sva tri paketa i u „Detailing auta"** (vlasnik 2026-09-03:
  „spada u clean paket, nemoj da navodiš onako da se doplaćuje"). Stoji kao stavka u Clean, Boost i
  Laker paketu i u „Šta ulazi" na [detailing-auta.html](detailing-auta.html); blok „Impregnacija —
  naplaćuje se posebno" je obrisan sa te strane. **Samostalno se i dalje naručuje** (25/40/45/50 €,
  odluka vlasnika), pa ostaje u tabeli `#pojedinacne` — ali bez `prc-more` linka na /detailing-auta,
  uz `.tbl-note` ispod tabele koji kaže da uz paket nema doplate. U kalkulatoru je `koza` i `plastika`
  u `SADRZI` pod `detailing`, pa se posive kad se izabere „Detailing auta".
- **„Detailing potkrila" nije zasebna cena** (izbačeno 2026-09-02, odluka vlasnika) — nema ga ni
  u tabeli `#pojedinacne` ni u kalkulatoru. U opisu paketa Clean, Boost i Laker **ostaje**.

### Proizvodi i trajnost — POTVRĐENO (2026-08-13)

Vlasnik je potvrdio koje proizvode koristi; brojevi su sa **zvaničnog koch-chemie.com**:

| Usluga (cena) | Proizvod | Trajnost | Izvor |
|---|---|---|---|
| Keramička zaštita (140–235 €) | **Ceramic Body Cb0.01** | preko 36 meseci, moguća 2 sloja | zvanični KC |
| 1K-Nano premaz (80–135 €) | 1K-Nano | ~1 godina, do 3 uz negu + godišnju kontrolu | zvanični KC |
| Ručno karnauba voskiranje (45–65 €) | **Hand Wax W0.01** (karnauba) | do 3 meseca | vlasnik |
| Vosak u pranju / Clean paketu | **Protector Wax** | 4–6 nedelja | vlasnik |
| Nano-Glass (30–80 €) | Nano-Glasversiegelung | do 1 godine ili 20.000 km | zvanični KC |
| Zaštita farova (25 €) | **GYEON Q² Trim** — ime se NE piše na sajtu | do 36 meseci / 50.000 km | zvanični gyeon.co |

> **Dva voska, ne jedan.** „4–6 nedelja" i „do 3 meseca" NISU protivrečnost — to su različiti proizvodi: Protector Wax ide uz pranje, Hand Wax W0.01 se nanosi ručno kao zasebna, skuplja usluga (najčešće posle poliranja). Ne „ujednačavati" ta dva broja.

**Farovi (2026-09-02):** vlasnik je potvrdio da posle brušenja ide **GYEON Q² Trim** i tražio da se
**ime proizvoda ne piše na sajtu**. Na `/poliranje-farova` sme da stoji samo „keramički premaz, do 36
meseci po deklaraciji proizvođača" — što je i tačno: gyeon.co za Q² Trim EVO navodi „up to 36 months /
50k km" i izričito ga dozvoljava na staklima farova posle renovacije.

**Tri odluke vlasnika od 2026-08-13 — ne menjati bez njega:**
- **Keramika se radi samo u 1 sloju.** Koch-Chemie dozvoljava 2, ali vlasnik ne nudi — ne pominjati drugi sloj na sajtu.
- **Bez ikakve garancije.** Na stranicama sme da stoji samo trajnost koju deklariše proizvođač, nikad obećanje studija. Provera: `grep -in garanc *.html` mora biti prazno.
- **Premium pranje traje 1–2 h** (njegovo merenje: 1:30–2:00 na dva auta). Broj uvek ide sa ogradom „zavisi od stanja vozila" jer ume da potraje duže.

**Koliko traje ostalo — NE PISATI.** Vlasnik je 2026-08 izričito tražio da se sklone svi rokovi
koje nije izmerio (poliranje, keramika, detailing, farovi). Jedini dozvoljeni broj je 1–2 h za pranje.

### Radno vreme — jedan izvor istine

**Ponedeljak — Subota, 09:00–20:00. Nedeljom ne radi.** Isto na sajtu, u JSON-LD `openingHoursSpecification` i na Google Mapama. Ranije je JSON-LD tvrdio pon–pet 08–18 i sub 09–15 — ispravljeno 2026-08-13. Pri svakoj izmeni ovoga proveri **oba** mesta u [index.html](index.html) i Google profil.

---

## Galerija — vlasnik je menja sam (2026-08-13)

Sekcija `#cs` („Premium estetika") se **generiše skriptom**, ne piše se rukom.

**Tok:** vlasnik ubaci/obriše sliku u `galerija\` → dupli klik na `SLIKE.bat` → opcija 1 → skripta smanji slike, upiše HTML u index.html, podigne verziju, pita za objavu, pa `git push` i sačeka da slike budu žive.

| Deo | Detalj |
|---|---|
| Ulaz | `galerija/` — ime fajla je `<broj> - <opis>.jpg`; broj = redosled, opis = `alt` tekst. Eventualni stari `@NN` na kraju imena se odbacuje |
| Izlaz | `assets/gallery/g-<slug>-<hash8>.webp` + `-480.webp` + `-opt.jpg` (900px / 480px / JPG fallback) |
| Alat | **ffmpeg + ffprobe** (`winget install Gyan.FFmpeg`) — nema npm zavisnosti, `package.json` ostaje prazan |
| Markeri | `<!-- GALERIJA:POCETAK ... -->` / `<!-- GALERIJA:KRAJ -->` u [index.html](index.html) — **između njih ne pisati rukom**, skripta pregazi |
| Undo | `.galerija-backup/` — `SLIKE.bat` opcija 3 vraća index.html, service-worker.js i obrisane slike |

**Zašto hash u imenu:** `/assets/(.*)` ima `max-age=31536000, immutable` u [vercel.json](vercel.json). Da se ime ponovi, posetioci bi zauvek gledali staru sliku iz keša. Nova sadržina → nov hash → novo ime → nema keš problema.

**Pravila koja skripta poštuje (ne kvariti ih):**
- **Rotacija:** ffmpeg sam primeni EXIF orijentaciju (fotke sa telefona), pa se `width`/`height` čitaju sa **gotove** slike, nikad sa originala — inače bi uspravne fotke dobile ležeći odnos
- **Brisanje:** briše samo `g-*` fajlove kojih nema ni u novom index.html ni u ostalim `.html` stranama. `logo-dark/logo-light` koristi index.html van markera — zato nikad ne nestaju
- **Prazan folder = stop**, ništa se ne menja. Smanjenje broja slika traži izričitu potvrdu
- Verziju (`CACHE_VERSION` + footer) podiže sama; `git pull --rebase` ide sa `autoStash`

### Raspored galerije — izlog (2026-08-21), bez okvira (2026-08-22)

Vlasnik je odbio i poravnate redove: sa mešanim oblicima („jedna šira, jedna duža") red mu je delovao neuredno. Izabrao je **izlog**: jedna velika slika, sličice ispod, klik otvara sliku preko celog ekrana.

**2026-08-22 — okvir je ukinut.** Vlasniku je smetalo sivo/crno „kolo" oko slike: podloga `#050505` (tamnija od pozadine sajta), zamućena kopija slike i tanka bela ivica. Kod uspravnih fotki je to bilo **58% površine okvira**. Video je demo sa tri varijante i izabrao onu bez ijedne praznine, ali sa istom visinom za sve slike (u demou „C"). **Senku pod slikom je izričito odbio** — ne dodavati je.

| Deo | Kako radi |
|---|---|
| Okvir | `.izl-frame` — **nema podlogu ni ivicu**. Odnos mu je odnos SAME slike: `--arn` = širina/visina kao broj. Oko slike se vidi pozadina sajta i ničeg drugog |
| Visina | Ista za sve slike (`min(78vh, 700px, puna_širina/--arn)`) — menja se samo **širina**, pa se sličice i ostatak stranice ne pomeraju pri prelasku kroz slike |
| `--arn` | Za prvu sliku ga upisuje `tools-galerija.js` pravo u markup (da visina bude tačna i pre nego što se učita JS), dalje ga menja [main.js](main.js) pri svakoj promeni |
| Telefon | Tamo je slika već preko cele širine, pa ista visina bez praznine **nije moguća** — visina prati sliku (`@media max-width:768px`). `max-height:82vh` je kočnica za ekstremno uspravnu fotku |
| Slika | `object-fit:contain` — stoji **cela**, ništa se ne seče. Sve slike su u DOM-u (`.izl-slide`), menja se samo klasa `.on`, pa je prelaz trenutan |
| Sličice | `.izl-thumb`, kvadratne, aktivna ima crvenu ivicu. Centrirane dok staju u red; kad ih bude previše, traka se skroluje |
| Pregled | `.gv` / `#galView` u [index.html](index.html) — strelice i tastatura na kompjuteru, prevlačenje prstom na telefonu, `×` i Escape za izlaz |
| Ponašanje | [main.js](main.js), blok „GALERIJA — IZLOG". Markup piše `tools-galerija.js`, stilovi su u [index.html](index.html) |

**Zašto uopšte NE vraćati zamućenu pozadinu:** ranije je prazninu pored uspravnih fotki punila zamućena kopija slike. Zamućenje je moralo da bude **pečeno u sliku** (kopija od 64px), jer `filter:blur()` preko te površine browser računa iznova pri svakom iscrtavanju — mereno na 144 Hz je obarao p95 sa 7.1 na 13.8 ms čim se miš pomeri preko galerije. Sada praznine nema, pa ni pozadina ne treba: `.izl-bg`, `data-mini` i `-blur.webp` su uklonjeni. Ako se ikad vraća neka pozadina, **nikad `filter:blur()`** — samo pečena kopija.

> `brightness()`/`saturate()` nisu bili problem — to su operacije po pikselu. Skupa je samo `blur()`, jer je konvolucija. Ista razlika objašnjava zašto hero `filter:brightness().saturate()` nikad nije smetao.

### Šta je nestalo sa izlogom

- `.izl-bg`, `data-mini`, `SIRINA_MUTNA` i pravljenje `-blur.webp` (2026-08-22). Stare `-blur.webp` datoteke briše samo čišćenje u `tools-galerija.js` pri prvom sledećem pokretanju
- `podeliURedove()`, `SIRINA_TRAKE`, `CILJNA_VISINA` u `tools-galerija.js` — nema više računanja redova
- `.cs-row`, `.cs-pair`, `.cs-card` i `--ar` u [index.html](index.html) (stare demo strane i `laker-base.css` koje su ih još nosile obrisane su 2026-09-04)
- Pravilo „najšira slika ide poslednja" (važilo je samo za parove na telefonu)
- Redosled slika u `galerija/` sada je **slobodan** — bira samo koja se prva prikazuje

> `.cs-card` je namerno ostao u listi selektora u inline skripti `scroll-reveal-init` u [index.html](index.html). Ne poklapa se ni sa čim i ne smeta, a menjanje inline skripte bi tražilo i novi CSP hash u [vercel.json](vercel.json).

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
- **Sekcije na početnoj:** `#hero` `#phi` `#cs` `#faq` `#loc` (`#tst` i `#soc` izbačeni 2026-09-02)
- **Sekcije na cenovniku:** `#paketi` `#loyalty` `#pojedinacne` `#sastavi`
- `#proc` više ne postoji nigde (sekcija „Kako izgleda tretman" obrisana 2026-09-02); `#pkg`, `#care`, `#prc` i `#book` takođe ne postoje

---

## Paketi i cene

| Paket | Mali (A) | Srednji (C) | Veliki (E+) | Ekstra (SUV/Van) |
|-------|----------|-------------|-------------|-----------------|
| Clean | €99  | €110 | €130 | €145 |
| Boost | €275 | €285 | €310 | €325 |
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

### laker-ui.js (sve strane)
```
ot(btn, id)                   // tabovi
toggleFaq(btn)                // FAQ harmonika
openMobileMenu() / closeMobileMenu()
```
Sve se poziva preko `data-click="ime"` atributa, ne preko `onclick`.

### main.js (početna i /cenovnik)
```
togglePkInfo(btn)             // paketi — stavka koja se širi
selectLoyBill('mes'|'god')    // Loyalty — način plaćanja
selectLoyVeh('ms'|'vs')       // Loyalty — veličina vozila (poziva ga cenovnik.js)
activateLoyalty()             // otvara modal sa pretpopunjenim izborom
selectLoySize / selectLoyPlan // registracija u modalu
openLoyalty() / closeLoyalty()
loyTab('login'|'reg') · loyLogin() / loyRegister()
```

### main.js
- `loadReviews()` — učitava odobrene recenzije iz Supabase
- Loyalty IIFE blok — kompletna auth/session logika, Supabase JWT

---

## Sopstveno merenje + nedeljni mejl (2026-08-23)

Vlasnik dobija **svakog ponedeljka oko 12h** mejl sa svim brojkama sa sajta. Merenje je sopstveno — GA4 i Vercel Analytics za to NE mogu da posluže.

**Zašto sopstveno:**
- GA4 radi sa Consent Mode `denied` dok posetilac ne klikne „Prihvati sve"; do tada Google dobija samo cookieless ping koji **ne prikazuje** u izveštajima. Većina ljudi ne klikne → GA4 brojevi su prazni.
- Vercel Web Analytics ima tačne brojeve, ali na **Hobby planu nema API** (`/v1/web-analytics` vraća `404 Web Analytics not found`), nema zakazane mejlove ni custom evente. Samo ručno gledanje dashboarda.
- Zakazani GA4 mejl koji je postojao bio je **mesečni**, i prvi je tek trebalo da krene 3.9.2026 — zato mesec dana nije stiglo ništa.

| Deo | Fajl | Šta radi |
|---|---|---|
| Sakupljanje | `assets/js/mera.js` | Učitan na SVIH 9 strana (`?v=7`). **Ne čitati `innerWidth`/`scrollHeight` pri startu** — skripta ide pre prvog paint-a, pa to tera layout cele strane (PageSpeed forced reflow ~1 s, 2026-09-03); širina se čita pri slanju, dubina posle paint-a. **Odgovor sa `/api/mera` se MORA pročitati (`r.text()`), pa makar i baciti** — nepročitano telo Chrome drži kao otvoren tok, DevTools nikad ne javi „završeno", pa su Lighthouse i PageSpeed na svih 8 strana čekali 45 s i prijavljivali „strana se učitava presporo" sa nepotpunim rezultatom (nađeno i popravljeno 2026-09-03). `keepalive` samo na završnom paketu. Šalje `pregled`, `klik`, `sekcija`, `kraj` na `/api/mera`. Od 2026-09-03 beleži i interne prelaze (`klik` naziv `ka:/cenovnik#sastavi`), izbor veličine na cenovniku (`velicina:veliki`), `paket-detalji`, a kao „sekcije" meri i `.usl-block[id]` / `.usl-aside#cena` na stranama usluga |
| Prijem | [api/mera.js](api/mera.js) | Filtrira robote, izvodi anonimni otisak, upisuje u `stat_dogadjaji` |
| Računanje | SQL `stat_izvestaj(od, do)` **v2** + `stat_nedelje(kraj, koliko)` | Sve agregacije u bazi, `security invoker`, `execute` samo za `service_role`. v2 (migracija `stat_izvestaj_v2_po_stranama`, 2026-09-03) vraća i: `strane` (ljudi, otvaranja, vreme, dubina, ulazi, izlazi, kontakt_ljudi po strani), `ulazi`, `prelazi` (sa→na), `kanali` **po PRVOM otvaranju** (interni link više ne pravi „direktno"), `izvori`, `brauzeri`, `zemlje`, `sekcije` po strani sa `od_ukupno`, `kontakti_po_strani`, `ostali_klikovi`, `vreme_posete` (zbir kroz sve strane), `strana_po_poseti`, `vise_strana`, `vratili_se` |
| Mejl | [api/izvestaj.js](api/izvestaj.js) | Sastavi HTML i pošalje preko Brevo na detailinglaker@gmail.com |
| Raspored | `crons` u [vercel.json](vercel.json) | `/api/izvestaj` **svaki dan** u 10:00 UTC; kod šalje samo ponedeljkom |

> ⚠️ **KVAR 2026-08-23 → 2026-09-03: mejl nije stizao jer je cron dobijao 401.** Kod je čekao zaglavlje
> `x-vercel-cron`, koje **Vercel ne šalje** — šalje samo `x-vercel-cron-schedule` i, kad je podešen
> `CRON_SECRET`, `Authorization: Bearer <CRON_SECRET>`. Odbijeni poziv ne ostavlja trag u
> `security_audit_logs`, pa je izgledalo kao da cron ne radi. Lek: `CRON_SECRET` je **podešen u Vercel-u
> 2026-09-03** (kopija u lokalnom `.env.local`, gitignored) i kod prihvata `x-vercel-cron-schedule` kao
> rezervu. Ručno pokretanje sad može i sa `Authorization: Bearer <CRON_SECRET>` umesto `kljuc=`.
> Pravilo ponavljanja: **ponedeljkom šalje uvek** (osim ako je uspešno slanje bilo pre <20h), ostalim
> danima samo nadoknada ako je od poslednjeg uspeha prošlo >8 dana — ručna proba subotom ne pojede ponedeljak.

**Zašto dnevni cron a ne nedeljni:** Hobby plan dozvoljava 2 crona i pravila oko učestalosti su labava, pa se dan bira u kodu (`danBeograda() === 1`). Vercel ume da zakasni do sat vremena. 10:00 UTC = **12h leti, 11h zimi** u Srbiji — tačniji sat nije moguć jer cron ide po UTC-u, a ne prati letnje računanje vremena.

**Nikad ne šalje dva mejla, ali ne preskače nedelju:** `poslednjiUspeh()` gleda `security_audit_logs` (scope `izvestaj`, status `ok`). Ako je uspešno slanje bilo pre manje od 6 dana — ćuti. Ako je bilo pre više od 8 dana ili nikad — šalje i van ponedeljka, dok jednom ne prođe. Tako pad Brevo-a u ponedeljak ne pojede celu nedelju.

> ⚠️ **Brevo „Authorised IPs" mora biti UGAŠEN.** Vercel funkcije nemaju stalnu IP adresu; kad Brevo naiđe na novu, odbija poziv sa `unrecognised IP address` i umesto mejla stigne „Security Alert: Verify a new IP". Dodavanje jedne adrese ne pomaže jer se sutra promeni — gasi se cela provera: Brevo → Settings → Security → Authorised IPs. Ovo pogađa **sve** mejlove sa sajta (loyalty, recenzije, booking), ne samo izveštaj. Prvi put viđeno 2026-08-23 i **tada ugašeno** (Settings → Security → Authorized IPs → „Blocking unauthorized IP addresses" → API keys: `Deactivated`). Na spisku je do tada bila 41 automatski odobrena Amazon adresa — dokaz koliko Vercel menja IP. Ako se ikad ponovo uključi, mejlovi počnu tiho da padaju.

### Privatnost — zašto ne treba pristanak
- **Nijedan kolačić i ništa se ne upisuje na uređaj** (jedini izuzetak je ručni prekidač „ne meri me").
- Sirov IP se **nigde ne čuva**. Od njega se na serveru pravi `poseta_id = sha256(dan + servisni_ključ + ip + user-agent)` — menja se svakog ponoća, pa isti čovek sutra više nije prepoznatljiv.
- Zato baner za kolačiće nije potreban i merenje radi za **100% posetilaca**, ne samo za one koji kliknu „Prihvati sve".

### Vlasnikovi uređaji se ne broje
Koristi se **isti prekidač kao za GA4/Pixel/Vercel**: `https://www.lakerdetailing.rs/?analitika=off` gasi i ovo merenje (`mera.js` čita `localStorage['laker_no_analytics']` i `window._lakerNoAnalytics`). Ko je ranije upalio `?analitika=off` ne mora ništa da radi.

Postoji i `?nemeri=on` / `?nemeri=off` ako ikad zatreba da se ugasi **samo** ovo merenje a GA4 ostane. Jednom po uređaju i po brauzeru; poništi se čišćenjem podataka pregledača.

> Ovo važi samo za **sajt**. Statistika Google Business Profila (koliko puta je profil viđen, klikovi na Mape) je Googleova i tamo se vlasnikovi pregledi ne mogu isključiti.

### Ručno pokretanje
```
/api/izvestaj?kljuc=<ADMIN_PASSWORD>&sada=1          → pošalji odmah
/api/izvestaj?kljuc=<ADMIN_PASSWORD>&sada=1&suvo=1   → samo prikaži brojke, bez mejla
```
Cron poziv prolazi i bez ključa (zaglavlje `x-vercel-cron`) **samo** kad `CRON_SECRET` nije podešen i **samo** za redovno ponedeljno slanje — `sada=1` uvek traži lozinku. Ako se ikad podesi `CRON_SECRET` u Vercel-u, koristi se `Authorization: Bearer`.

### Održavanje
- Sirovi događaji stariji od **120 dana** se brišu posle svakog uspešnog mejla (`ocisti()`).
- Proba izgleda mejla bez slanja: `node tools-izvestaj-proba.js` → `proba-izvestaj.html`. Ne deployuje se.
- Nove sekcije na sajtu se mere same (`section[id]`, `.usl-block[id]`, `.usl-aside[id]`), ali im treba **ime na srpskom** u `IME_SEKCIJE` u [api/_izvestaj-mejl.js](api/_izvestaj-mejl.js), inače se u mejlu vidi goli id. Nova strana → `IME_STRANE` u istom fajlu + regex `STRANE` u `mera.js`.
- Mejl sa primerom (`node tools-izvestaj-proba.js`) je ~67 KB; **Gmail seče preko ~102 KB** — ne dodavati sekcije bez ograničenja spiskova.
- Novo dugme se meri ako mu se doda `data-click` iz spiska `VAZNI_DATA` u `assets/js/mera.js`; kontakt linkovi (`tel:`, `wa.me`, `mailto:`, Instagram) se hvataju sami.

---

## Google recenzije — vlasnik bira šta ide na sajt (2026-08-23)

Recenzije sa Google Mapa stižu u admin panel; vlasnik klikom bira koje se prikazuju
u sekciji `#tst`. Izbor može da menja koliko god puta — ništa se ne briše.

> ⚠️ **Sekcija `#tst` je izbačena sa početne 2026-09-02**, pa se izabrane recenzije trenutno **nigde ne prikazuju** — admin deo i baza rade, `loadReviews()` se sam gasi kad nema `#tst-dynamic`. Da se vrate na sajt, treba ponovo markup sekcije (vlasnikova odluka).

| Deo | Fajl | Šta radi |
|---|---|---|
| Povlačenje | [api/_google.js](api/_google.js) | Dva izvora, isti oblik podataka na izlazu |
| Akcije | [api/admin.js](api/admin.js) | `google_lista`, `google_sync`, `google_na_sajt`, `google_sakrij`, `google_redosled` |
| Admin UI | [laker-admin-9x3k.html](laker-admin-9x3k.html) | Sekcija „Sa Google Mapa" u tabu Recenzije, blok „GOOGLE RECENZIJE" |
| Sajt | [main.js](main.js) | `loadReviews()` spaja `google_recenzije` + `testimonials` u jednu sekciju |
| Baza | `google_recenzije` | RLS: anon SELECT **samo** `na_sajtu = true`, nikakav upis sa klijenta |

### Dva izvora — `places` sad, `business` kad Google odobri

| Izvor | Koliko recenzija | Šta traži |
|---|---|---|
| `places` (Places API New) | **najviše 5**, tvrdo Googleovo ograničenje od 2015, nema paginacije | samo `GOOGLE_PLACES_KEY` |
| `business` (Business Profile API v4) | **sve** | ručno odobrenje Googlea (7–10 radnih dana zvanično, u praksi do 6 nedelja) + OAuth |

`povuciGoogleRecenzije()` sam bira: čim je pet `GBP_*` varijabli podešeno, prelazi na
`business`. **Ništa drugo se ne menja** — ni tabela, ni admin panel, ni sajt.

> **Zašto je `id` heš autora, a ne Googleov id.** Places i Business Profile daju
> RAZLIČITE identifikatore za istu recenziju, pa bi se pri prelasku sve udvojilo.
> Zato je `id = sha1(autor)` (Google dozvoljava jednu recenziju po korisniku po firmi),
> a sirovi Googleov id stoji u `google_id` samo kao referenca. Uzgredna korist: ako
> klijent izmeni tekst ili ocenu, to ostaje ISTA recenzija — ne iskoči duplikat i ne
> ispadne sa sajta. Bezimene („A Google user") se heširaju po tekstu da se ne sliju u jedan red.

### Pravila koja se ne smeju pokvariti

- **`google_sync` NIKAD ne gazi vlasnikov izbor.** Prvo pročita `na_sajtu`, `redosled`,
  `sakrivena`, `prvi_put` iz baze pa ih vrati u red koji upisuje. PostgREST upsert sa
  `resolution=merge-duplicates` menja **ceo red** — kolona koju ne pošalješ pada na DEFAULT,
  pa bi svaki sync obrisao sve što je vlasnik izabrao.
- **Poziv Googleu ide samo na vlasnikov klik i pri prijavi** (`loadAll()` → `loadGoogle(true)`,
  i dugme ↻ Osveži → `osveziRecenzije()`). Auto-refresh na 90s dira samo `loadCare()` — ne vezivati
  Google za njega, potrošio bi besplatnu kvotu.
- **Na sajtu se ne vidi da je recenzija sa Googlea** — odluka vlasnika (2026-08-23).
  Ne dodavati Google logo, „Powered by Google" ni link na Mape u `#tst`.
- **Ocena bez teksta se ne može pustiti na sajt** — nema dugme „+ Na sajt", a `loadReviews()`
  je filtrira i drugi put u JS-u.

### Env varijable

`GOOGLE_PLACES_KEY` (obavezno), `GOOGLE_PLACE_ID` (opciono — podrazumevano
`ChIJUbhOjVRzV0cRQpiB_thOjDg`, isti Place ID koji stoji u linkovima ka Mapama u index.html).
Za `business` fazu: `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REFRESH_TOKEN`,
`GBP_ACCOUNT_ID`, `GBP_LOCATION_ID`.

> API ključ **ne sme** da ima Application restriction po IP-u — Vercel funkcije menjaju
> IP adresu. Isti razlog zbog kog je Brevo „Authorised IPs" morao da se ugasi.
> Ograničiti ga po API-ju (`Places API (New)`), ne po adresi.

Ceo postupak podešavanja je u `SETUP-GOOGLE-RECENZIJE.md` (za vlasnika, ne deployuje se).

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
- **Baner „Dozvoli obaveštenja“ je UGAŠEN (2026-08-22, odluka vlasnika)** — posetiocu se više ne pojavljuje ništa i `Notification.requestPermission()` se ne poziva. Ugašen je uklanjanjem JEDINOG poziva `showPushBanner()` u [init.js](init.js) (blok „BANER ZA OBAVESTENJA“); markup `#pwaPushBanner`, `subscribeForPush()` i `api/push-*.js` ostaju netaknuti, pa ko je ranije uključio obaveštenja i dalje ih dobija, a paljenje je jedan red koda. Ne mešati sa banerom „Nova verzija spremna“ (`#pwaUpdateBanner`) — on ostaje uključen
- CSP u `vercel.json`: `script-src` je `'self'` + sha256 hash-evi (NEMA `unsafe-inline` za skripte — zato `data-click` umesto `onclick`); `'unsafe-inline'` stoji samo u `style-src`
- Admin URL je namerno obscure (ne linkovan nigde, `noindex`)
- Google Search Console: sajt dodat, sitemap submitan
- IndexNow (pokriva Bing, Edge, Yahoo, DuckDuckGo i ChatGPT pretragu): ključ u fajlu `2e68d4c0350193ca6d78089e4129f608.txt` u root-u. ⚠️ **GET oblik `?url=...&key=...` šalje SAMO taj jedan URL** — za izmenu koja dira više strana koristi bulk POST, vidi sekciju **Pretraživači — posle izmene sadržaja** na kraju fajla.
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

## Renoviranje — stanje 2026-09-02 (posle dorade)

Faze 1–5 uradio Opus, doradu i pripremu za puštanje Fable 5.1 istog dana, sve na grani `renoviranje`. **`main` nije diran.**

Urađeno u doradi: obrisane `.todo` oznake i njihov CSS; skinut `X-Robots-Tag: noindex` sa 8 novih ruta u [vercel.json](vercel.json);
`sitemap.xml` ima 8 unosa; verzija 62 + `CACHE_VERSION` v62 + `?v=20260902c`; CSP hash-evi preračunati (JSON-LD u index.html
se promenio); `robots.txt` više ne objavljuje admin URL (admin i dalje ima meta + header noindex); FAQ „od 20 €" i trajanja paketa
usklađeni sa cenovnikom (Clean do 3 radna dana, Boost do 5 dana, Laker 6–7 dana); izmišljen `aggregateRating` (47 recenzija)
izbačen iz JSON-LD-a; opisi Vorreiniger B / Plast Star / Protector Wax svedeni na ono što piše na koch-chemie.com
(**Protector Wax 4–6 nedelja je vlasnikov broj, NE deklaracija proizvođača** — ne pisati „deklariše proizvođač" uz njega).

**Baza (Supabase, migracije 2026-09-02):** triger `loyalty_customers_lock_on_client_update` — klijent (rola authenticated) pri
povezivanju naloga ne može sebi da upiše `care_plan`, `plan_type`, `plan_paid_until`, `wash_count`, `admin_note` itd.;
EXECUTE na trigerskim funkcijama oduzet od `public/anon/authenticated`. **Confirm email je UKLJUČEN u Supabase Auth
(2026-09-02, popodne).** Posledica u kodu: `/auth/v1/signup` više ne vraća sesiju, pa registracija u [main.js](main.js)
šalje ime/prezime/telefon/plan/veličinu kao `data` (user_metadata), a `loadAndShowDash()` pravi profil iz `_regMeta`
pri **prvoj prijavi posle potvrde** i tek tada šalje `loyalty_registration` mejl i GA event. Ne vraćati stari tok koji
je pravio profil odmah posle signup-a — bez sesije bi tiho propao i član bi ostao bez imena, telefona i plana.

**Donja traka „WhatsApp / Pozovi" (`.dock`) je OBRISANA SA CELOG SAJTA 2026-09-03** — vlasnik: „ružna je i
loše stoji". Prvo je 2026-09-02 skinuta sa `/usluge` i `/cenovnik`, a 2026-09-03 i sa svih 5 strana pojedinačnih
usluga, zajedno sa klasom `body.ima-dock` i celim `.dock` blokom u [assets/css/laker.css](assets/css/laker.css).
Nijedna strana usluga više nema traku na dnu. **Ne vraćati.** Početna i dalje ima plutajuće `.wa-stick` dugme —
to je druga stvar i ostaje.

**Search Console:** „Request indexing" urađen 2026-09-02 za svih 8 URL-ova; IndexNow pingovan. Verzija 69 (2026-09-03).

**Kategorije vozila — vlasnik potvrdio 2026-09-02.** Obična vozila idu po evropskom segmentu (A i B → Mali, C → Srednji,
D/E/F → Veliki), a SUV i krosover po **dužini**, jer ih i evropska podela deli na JA–JF: do 4,35 m → Srednji (Juke, Captur,
T-Cross, 2008, Duster, Mokka), 4,35–4,65 m → Veliki (Tiguan, Qashqai, Sportage, RAV4, Karoq, Kuga, 3008), preko 4,65 m →
Ekstra (Kodiaq, X5, Touareg, Santa Fe, Range Rover). Kombi, putnički van i pikap su uvek Ekstra. **Limuzina duža od 5 m je Ekstra**
(dodato 2026-09-03 na zahtev vlasnika — S klasa, A8, BMW Serija 7, Phaeton, Jaguar XJ, Panamera,
Lexus LS; E klasa, A6, Serija 5, Insignia, Superb i Passat su ispod 5 m i OSTAJU Veliki, vlasnik je
izričito odbio da ih diže). Time je 104 modela promenilo
kategoriju — pre toga je SVAKI SUV bio Ekstra, pa su Juke i GLS plaćali isto. Pravilo stoji i u zaglavlju
[assets/js/auti.js](assets/js/auti.js). **Oznake kategorija na svih 6 strana prate to pravilo** („Ekstra (veliki SUV, kombi)",
ne više „Ekstra (SUV / Van)") — ako se pravilo menja, menjaju se i one, i `KAT_PUN`/`HINT` u cenovnik.js.

**Slike auta u kalkulatoru — NEMA IH** (odluka vlasnika 2026-09-02). Kutija `.carbox` posle izbora modela
prikazuje samo prepoznatu kategoriju i ispod nje „segment · tip karoserije · boja"; `#cfgSlika`, `SILUETE` i
`bojaHex()` su obrisani, `.carbox` više nije dvokolonski grid. Izbor boje **ostaje** (ulazi u WhatsApp upit).
Četvrto polje u [assets/js/auti.js](assets/js/auti.js) (slug slike) stoji rezervisano i svuda je `null` —
kad vlasnik pošalje slike, vraća se prikaz slike, ne silueta.

Puštanje: `git checkout main && git merge renoviranje && git push origin main` → `curl -s https://www.lakerdetailing.rs/api/health`
→ IndexNow ping → Search Console „Request indexing" za 8 URL-ova.

## Deploy — OBAVEZNA provera posle pusha

**Zeleni build ≠ sajt radi.** Statika ide sa CDN-a, pa sajt izgleda ispravno i kad su sve serverless funkcije mrtve.

Posle svakog `git push origin main` proveri:
```bash
curl -s https://www.lakerdetailing.rs/api/health   # mora: {"ok":true,...,"db":"ok"}
```

CI ovo radi automatski (job `production-smoke`), ali proveri i ručno kad menjaš nešto u `api/`.

**Rešen kvar (2026-07-17):** deploy prolazi kao READY, ali runtime ne zakači env varijable — svih 5 `api/*` funkcija vraća `500 FUNCTION_INVOCATION_FAILED` (`EnvFileReadError`). Danas se desilo 3× od 5 deploya. **Pravi uzrok:** projekat nije imao `package.json` (bio u `.gitignore` I `.vercelignore`), pa je Vercel detektovao "čistu statiku" i povremeno radio skraćeni build koji preskoči env injekciju — u build logu tada **fali `Vercel CLI` linija** (poklapanje 4/4: sa linijom radi, bez nje puca). **Trajni lek (commit f6f605f):** `package.json` sada ide na Vercel → build radi `npm install` (nula zavisnosti) → pun build sa env injekcijom svaki put, bez obzira na build keš. **NE brisati `package.json` niti ga vraćati u ignore fajlove.** `package-lock.json` ostaje ignorisan (nema zavisnosti).

> Prepoznavanje: `/api/health` vraća **500** umesto svog urednog **503**. 503 = baza pala. 500 = funkcija uopšte ne startuje (env/runtime). Ako se ipak ponovi: proveri build log (`Vercel CLI` + `Installing dependencies` moraju biti tu); ako fale, redeploy bez keša u Vercel dashboardu ili rollback na poslednji zeleni deploy.

---

## Pretraživači — posle izmene sadržaja

**Zeleni deploy ne znači da Google i Bing znaju za izmenu.** Ovo se ne dešava samo od sebe.

### 1. IndexNow — uvek bulk, nikad samo koren

GET oblik (`?url=...&key=...`) šalje **jedan jedini URL**. Zato posle renoviranja 2026-09-02
nove strane dugo nisu stigle do Binga — pingovan je samo koren sajta. Za svaku izmenu koja
dira više strana ide bulk POST:

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST https://api.indexnow.org/indexnow -H "Content-Type: application/json; charset=utf-8" -d '{"host":"www.lakerdetailing.rs","key":"2e68d4c0350193ca6d78089e4129f608","keyLocation":"https://www.lakerdetailing.rs/2e68d4c0350193ca6d78089e4129f608.txt","urlList":["https://www.lakerdetailing.rs/","https://www.lakerdetailing.rs/usluge","https://www.lakerdetailing.rs/cenovnik","https://www.lakerdetailing.rs/premium-pranje","https://www.lakerdetailing.rs/detailing-auta","https://www.lakerdetailing.rs/poliranje-laka","https://www.lakerdetailing.rs/keramicka-zastita","https://www.lakerdetailing.rs/poliranje-farova"]}'
```

`HTTP 200` = primljeno (odgovor je prazan, to je normalno). Provera da je stiglo:
Bing WMT → IndexNow → „Submitted Urls list".

### 2. Sitemap se NE osvežava sam

**Nađeno 2026-09-03:** Bing je `sitemap.xml` poslednji put pročitao **12.07.2026, kada je
imao 1 URL** — sajt je tada još bio jedna strana. Posle renoviranja na 8 ruta sam se nije
vratio po njega, pa je dva meseca radio sa starom slikom sajta (u rezultatima je stajao
zastareo opis početne).

Posle svake izmene **strukture** sajta (nova ruta, obrisana ruta, promenjen `sitemap.xml`):
Bing WMT → Sitemaps → **Submit sitemap** → `https://www.lakerdetailing.rs/sitemap.xml`.
IndexNow ovo NE zamenjuje — to su dva odvojena signala.

Google Search Console isto: Sitemaps → ponovo pošalji, pa „Request indexing" po URL-u.

### 3. Limiti za naslov i opis

| | Google seče prikaz | Bing prijavljuje grešku preko |
|---|---|---|
| `<title>` | ~60 znakova | 65 |
| `<meta name="description">` | ~160 znakova | 160 (i ispod 25) |

Broji **znakove, ne bajtove** — `wc -m` u Git Bash-u naša slova (č, ć, š, ž, đ, €, —) broji
kao dva i daje naduvan rezultat. Meri Python-om:

```bash
PYTHONIOENCODING=utf-8 python - <<'EOF'
import re, io, glob
for f in sorted(glob.glob('*.html')):
    s = io.open(f, encoding='utf-8').read()
    t = re.search(r'<title>(.*?)</title>', s, re.S)
    d = re.search(r'<meta name="description" content="(.*?)">', s, re.S)
    if not t or not d: continue          # offline/radovi/admin nemaju description
    tl, dl = len(t.group(1)), len(d.group(1))
    flag = ('  <-- TITLE' if tl > 65 else '') + ('  <-- DESC' if dl > 160 else '')
    print('%-24s title=%3d desc=%3d%s' % (f, tl, dl, flag))
EOF
```

Stanje od 2026-09-03 (verzija 69): svih 8 strana je ispod oba limita. Sa naslova strana
usluga izbačen je sufiks `| Laker Detailing` — Google iznad naslova ionako prikazuje
`lakerdetailing.rs`, pa se brend ne ponavlja dva puta.

> `og:title` i `og:description` su NAMERNO ostavljeni duži od `<title>`/`<meta description>`.
> Njih pretraživači ne prikazuju — služe za WhatsApp i Facebook pregled, gde ima više mesta.
> Ne „ujednačavati" ih sa naslovom.

### 4. Bing SEO skener ume da laže

Prijavljuje **„Alt attribute for images is missing"** za 5 sličica galerije koje imaju
`alt=""`. To je NAMERNO i ispravno: roditeljski `<button class="izl-thumb">` već nosi
`aria-label` sa opisom slike, pa bi alt tekst čitač ekrana pročitao dva puta.
**Ne „popravljati".**

### 5. Kako se proverava status indeksiranja

**NIKAD preko `site:` pretrage.** Google na to baca CAPTCHA u automatizovanom brauzeru,
a Bing i DuckDuckGo taj operator ne obrađuju pouzdano — DDG je 2026-09-03 pokazao samo
početnu i naveo na pogrešan zaključak da Bing nema ostale strane, iako su sve bile
indeksirane.

Jedini pouzdan način: **Bing WMT → URL Inspection** (kvota za „Request indexing" je
100 URL-ova dnevno) i **Search Console → URL Inspection**.
