# Laker Detailing Studio — Projektna dokumentacija

## Šta je ovaj projekat

Auto detailing studio u Čačku. Sajt na `lakerdetailing.rs`, deployovan na **Vercel**. Backend je **Supabase** (baza + auth). Email servis je **Brevo**. PWA sa push notifikacijama.

## Fajlovi

```
index.html          — glavni sajt (sve u jednom fajlu, ~300KB)
laker-admin-9x3k.html — admin panel (interni, ~300KB)
api/send-email.js   — Vercel serverless funkcija za emailove (Brevo)
api/admin.js        — admin API
api/push-*.js       — push notifikacije
service-worker.js   — PWA
vercel.json         — Vercel konfiguracija
```

## Brand

- **Boje:** Crvena `#C0392B` (primary), `#E74C3C` (hover), tamna pozadina `#080808`
- **Fontovi:** Cormorant Garamond (serif, naslovi), Inter (sans, tekst)
- **Ton:** Luksuzno, minimalistično, 2026 estetika

## Paketi i cene (ažurirano)

| Paket | Mali | Srednji | Veliki | Ekstra |
|-------|------|---------|--------|--------|
| Clean | €99  | €110    | €130   | €145   |
| Boost | €250 | €260    | €280   | €295   |
| Laker | €499 | €510    | €530   | €545   |

Veličine: Mali = A klasa, Srednji = C klasa, Veliki = E klasa+, Ekstra = SUV/Van

Svaka stavka u paketu ima `+` dugme koje otvori 4 tačke objašnjenja (CSS klase: `.pk-li`, `.pk-li-row`, `.pk-plus`, `.pk-info`).

## Loyalty sistem (ažurirano — NE maintenance!)

**Dva paketa:**

| Vozilo | Mesečno | Godišnje | Ušteda |
|--------|---------|----------|--------|
| Mali/Srednji | €35/mes | €299/god | 29% |
| Veliki/SUV | €40/mes | €349/god | 27% |

Oba uključuju: 24 pranja godišnje (2× mesečno), prioritetan termin.

**Toggle default = Godišnje** (prikazuje se prvi, vizuelno istaknuto).

**NEMA više:** 8. pranje gratis, birthday poklon — to je staro i uklonjeno.

## Loyalty modal (login/registracija)

Registracija traži: Ime, Prezime, Email, Telefon, Veličina vozila (Mali/Srednji ili Veliki/SUV), Plan (Godišnje default, Mesečno).

Cene u formi se automatski ažuriraju kada se menja veličina vozila.

JS funkcije: `selectLoySize(val)`, `selectLoyPlan(val)`, `_updateRegPrices()`

## Admin panel (`laker-admin-9x3k.html`)

Login je email + lozinka (Supabase auth). Postoji i Demo mode.

**Tabovi (prečice 1-5):**
1. 📊 **Dashboard** — stat kartice (upiti, loyalty membri, prihod po planu)
2. ⭐ **Recenzije** — odobravanje recenzija
3. 💎 **Loyalty** — baza članova, +pranje, filter po planu
4. 📋 **Loyalty Prijave** — nove prijave koje čekaju aktivaciju
5. 📬 **Upiti** — kontakt forme/booking

**Plan opcije u admin modalu:**
- Mali/Srednji · Mesečno €35
- Veliki/SUV · Mesečno €40
- Mali/Srednji · Godišnje €299 (ušteda 29%)
- Veliki/SUV · Godišnje €349 (ušteda 27%)

## Email sistem (`api/send-email.js`)

Koristi **Brevo API**. Tipovi emailova:

| `type` | Opis |
|--------|------|
| `booking` | Zahtev za termin (klijent + admin) |
| `loyalty_welcome` | Dobrodošlica novom loyalty članu |
| `maintenance` / `care` / `loyalty` | Loyalty prijava (klijent + admin) |
| `testimonial` | Čuva recenziju u Supabase |
| `birthday` | DEAKTIVIRAN (handler postoji ali ne šalje) |

`loyalty_welcome` prima: `{ name, email, plan, velicina }` — prikazuje plan i cenu u emailu.

## Supabase tabele (relevantne)

- `loyalty_customers` — loyalty članovi (kolone: `name`, `email`, `phone`, `care_plan`, `wash_count`, `auth_user_id`)
- `contacts` — booking i kontakt upiti
- `testimonials` — recenzije
- `loyalty_washes` — istorija pranja
- `loyalty_wash_requests` — zahtevi za pranje

## JS funkcije u index.html (važne)

```js
togglePkInfo(btn)         // expandable stavke u paketima
setLoyBilling('mes'|'god') // toggle na Loyalty sekciji
selectLoySize('ms'|'vs')  // u registracija formi — veličina vozila
selectLoyPlan('mes'|'god') // u registracija formi — plan
openLoyalty()             // otvori loyalty modal
closeLoyalty()            // zatvori loyalty modal
loyTab('login'|'reg')     // prebaci tab u modalu
loyLogin()                // login
loyRegister()             // registracija
```

## Environment varijable (Vercel)

```
BREVO_API_KEY           — Brevo email API
SUPABASE_URL            — Supabase project URL
SUPABASE_SERVICE_KEY    — Supabase service role key
```

## Deployment

Push na `main` branch → automatski deploy na Vercel. Fajlovi se direktno edituju, nema build procesa (čist HTML/JS/CSS).

## Šta je rađeno u prethodnoj sesiji

1. Cene paketa ažurirane (Clean/Boost/Laker sa size gridom)
2. Expandable `+` dugmići na svakoj stavci paketa
3. Loyalty sistem kompletno redizajniran (Maintenance uklonjen)
4. Loyalty toggle default = Godišnje, % uštede prikazane
5. Loyalty registracija dobila veličinu vozila + plan selektor
6. Email fajl ažuriran (loyalty_welcome sa planom/veličinom, birthday deaktiviran)
7. Admin panel dobio Dashboard tab + sve "Maintenance" oznake → "Loyalty"
8. Nav linkovi: "Maintenance" → "Loyalty" na svim mestima

## Napomene

- Slike: ibb.co linkovi mogu biti nestabilni na live sajtu — ako neka slika ne radi, ubaci je lokalno u `/assets/`
- Admin panel URL je namerno obscure (`laker-admin-9x3k.html`)
- Sajt ima custom cursor koji se isključuje na touch uređajima
- PWA sa push notifikacijama je implementirana i radi
