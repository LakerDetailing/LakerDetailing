# QR Loyalty prijava — podešavanje Google / Apple dugmadi

Stranica **https://lakerdetailing.rs/loyalty-join** radi ODMAH posle deploya — ručna forma je uvek aktivna.
Google i Apple dugmad se **automatski pojavljuju** čim se podese env varijable ispod (nema izmene koda).

---

## 1. Google dugme — GOOGLE_CLIENT_ID (besplatno, ~10 min)

1. Idi na https://console.cloud.google.com/ → prijavi se sa `detailinglaker@gmail.com`
2. Gore levo: **Select a project → New Project** → ime: `Laker Detailing` → Create
3. Meni: **APIs & Services → OAuth consent screen**
   - User Type: **External** → Create
   - App name: `Laker Detailing Studio`, support email: `detailinglaker@gmail.com`
   - Authorized domains: `lakerdetailing.rs`
   - Sačuvaj (scopes preskoči, dovoljni su default email/profile)
   - **Publish app** (da ne ostane u testing modu — inače radi samo za test naloge)
4. Meni: **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Laker QR prijava`
   - **Authorized JavaScript origins:**
     - `https://lakerdetailing.rs`
     - `https://www.lakerdetailing.rs`
   - Create → kopiraj **Client ID** (izgleda kao `1234...abc.apps.googleusercontent.com`)
5. Vercel dashboard → projekat **laker-detailing** → **Settings → Environment Variables**:
   - Name: `GOOGLE_CLIENT_ID`
   - Value: (nalepi Client ID)
   - Environment: Production (+ Preview po želji)
6. **Redeploy** (Deployments → ⋯ → Redeploy) — Google dugme se pojavljuje na /loyalty-join.

## 2. Apple dugme — APPLE_SERVICE_ID (zahteva Apple Developer nalog, $99/god)

> Preskoči ako nemaš Apple Developer nalog — stranica normalno radi bez Apple dugmeta.

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles → Identifiers**
2. Napravi **App ID** (npr. `rs.lakerdetailing.app`) sa uključenim "Sign in with Apple"
3. Napravi **Services ID** (npr. `rs.lakerdetailing.web`) → uključi "Sign in with Apple" → Configure:
   - Primary App ID: gornji App ID
   - Domains: `lakerdetailing.rs`, `www.lakerdetailing.rs`
   - Return URLs: `https://lakerdetailing.rs/loyalty-join`
4. Vercel env: `APPLE_SERVICE_ID` = Services ID (npr. `rs.lakerdetailing.web`) → Redeploy.

## 3. Kako sistem radi (bezbednost)

- Mušterija skenira QR (admin panel → 📋 Loyalty Prijave → **📱 QR za prijavu**) → otvara `/loyalty-join`
- Prijava ide na `POST /api/loyalty-join` koji:
  - **verifikuje Google/Apple token SERVER-SIDE** (Google tokeninfo / Apple JWKS potpis) — klijentu se ništa ne veruje
  - rate-limituje po IP (5 prijava / 10 min) + DB trigger limit (3 / 10 min)
  - ima honeypot polje protiv botova + audit log u `security_audit_logs`
  - upisuje u `contacts` (submission_type=`loyalty_registration`, `source`=qr_manual/qr_google/qr_apple)
  - šalje email adminu + potvrdu mušteriji (Brevo)
- Prijava se pojavljuje u admin panelu → **📋 Loyalty Prijave** sa 📱 QR badge-om → klik **Aktiviraj** pravi Loyalty člana i šalje welcome email. Plan se po potrebi menja u Loyalty tabu (✎ plan).

## 4. NFC nalepnica (opciono)

Programiraj NFC tag sa URL-om: `https://lakerdetailing.rs/loyalty-join` — ista stranica, isti flow.

## 5. Sledeći korak (po želji): Google/Apple login na glavnom sajtu

Loyalty login/registracija u index.html koristi Supabase Auth (email+lozinka). Za "Sign in with Google" tamo treba:
1. Gore napravljeni Google Client ID + **Client Secret**
2. Supabase dashboard → Authentication → Providers → Google → enable (unesi ID + secret)
3. Authorized redirect URI u Google Console: `https://raxdsanycyycroucxtmy.supabase.co/auth/v1/callback`
4. Onda se u index.html loyalty modal dodaju dugmad sa `supabase.auth.signInWithOAuth({provider:'google'})`

Javi kad su env varijable podešene — dugmad rade odmah, bez izmene koda.
