# Laker Detailing Studio

Auto detailing studio, Čačak. `lakerdetailing.rs` → Vercel. Backend: Supabase. Email: Brevo. PWA.

## DEPLOY PRAVILO — KRITIČNO
**SAMO `git push origin main`** → GitHub automatski povuče na Vercel. NIKAD direktno na Vercel!

## Fajlovi
- `index.html` — ceo sajt (~300KB, sve u jednom)
- `laker-admin-9x3k.html` — admin panel
- `api/send-email.js` — Brevo emailovi
- `api/admin.js`, `api/push-*.js` — admin API, push notifikacije
- `service-worker.js` — PWA
- `vercel.json` — Vercel konfiguracija (CSP headers, cache)

## Brand
- Boje: `#C0392B` (primary), `#E74C3C` (hover), `#080808` (bg)
- Fontovi: Cormorant Garamond (naslovi), Inter (tekst)

## Paketi i cene
| Paket | Mali | Srednji | Veliki | Ekstra |
|-------|------|---------|--------|--------|
| Clean | €99  | €110    | €130   | €145   |
| Boost | €250 | €260    | €280   | €295   |
| Laker | €499 | €510    | €530   | €545   |
Veličine: Mali=A klasa, Srednji=C, Veliki=E+, Ekstra=SUV/Van

## Loyalty sistem
| Vozilo | Mesečno | Godišnje | Ušteda |
|--------|---------|----------|--------|
| Mali/Srednji | €35/mes | €299/god | 29% |
| Veliki/SUV   | €40/mes | €349/god | 27% |
- 24 pranja/god (2×mes), prioritetan termin
- Toggle default = Godišnje
- Registracija: Ime, Prezime, Email, Telefon, Veličina, Plan

## Admin panel (`laker-admin-9x3k.html`)
Login: email+lozinka (Supabase auth). Tabovi (1-5):
1. Dashboard — stat kartice
2. Recenzije — odobravanje
3. Loyalty — članovi, +pranje
4. Loyalty Prijave — čekaju aktivaciju
5. Upiti — kontakt/booking

## Email tipovi (`api/send-email.js`)
`booking` | `loyalty_welcome` | `maintenance`/`care`/`loyalty` | `testimonial` | `birthday` (deaktiviran)

`loyalty_welcome` prima: `{ name, email, plan, velicina }`

## Supabase tabele
- `loyalty_customers` — name, email, phone, care_plan, wash_count, auth_user_id
- `contacts` — booking/kontakt upiti
- `testimonials` — recenzije
- `loyalty_washes`, `loyalty_wash_requests`

## Ključne JS funkcije (index.html)
```
togglePkInfo(btn)          // paketi — expandable stavke
setLoyBilling('mes'|'god') // loyalty toggle
selectLoySize('ms'|'vs')   // registracija — veličina
selectLoyPlan('mes'|'god') // registracija — plan
openLoyalty() / closeLoyalty() / loyTab('login'|'reg')
loyLogin() / loyRegister()
```

## Env varijable (Vercel)
`BREVO_API_KEY` | `SUPABASE_URL` | `SUPABASE_SERVICE_KEY`

## Napomene
- Custom cursor isključen na touch uređajima (`hover:none` media query)
- PWA push notifikacije rade
- Admin URL je namerno obscure
- `vercel.json` ima `unsafe-inline` u CSP (potrebno zbog inline event handlera)
