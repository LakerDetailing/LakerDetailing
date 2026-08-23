# Google recenzije na sajtu — šta treba da uradiš

Kod je gotov i deployovan. Da bi recenzije počele da stižu u admin panel,
treba još samo ovo — i to radiš **ti**, jer traži prijavu na tvoje naloge.

---

## KORAK 1 — Google API ključ (10 minuta, radi odmah)

Bez ovoga admin panel piše *„Google ključ još nije podešen"*.

1. Otvori https://console.cloud.google.com — **prijavi se kao `detailinglaker@gmail.com`**
   (u Chrome-u je to obično `authuser=2`; ako te otvori pogrešan nalog, prebaci gore desno)
2. Gore levo, pored „Google Cloud", klikni na birač projekata → **New Project**
   - Ime: `laker-recenzije` → **Create**, pa sačekaj i izaberi taj projekat
3. U pretragu gore ukucaj **Places API (New)** → otvori → **Enable**
   - Traži da uključiš naplatu (Billing). Mora kartica, ali **neće ti skinuti novac** —
     Google daje 10.000 besplatnih poziva mesečno po API-ju, a sajt troši
     najviše par desetina (poziv ide samo kad otvoriš admin panel).
   - Ako hoćeš da budeš siguran: **Billing → Budgets & alerts → Create budget → 1 €**,
     pa ti stigne mejl ako se ikad išta naplati.
4. Levo meni → **APIs & Services → Credentials → Create credentials → API key**
5. Kopiraj ključ, pa odmah klikni **Edit API key** i zaključaj ga:
   - **Application restrictions:** `None`
     (poziv ide sa Vercel servera koji menja IP adresu, pa ograničenje po IP-u ne radi —
      isti razlog zbog kog je Brevo „Authorised IPs" morao da se ugasi)
   - **API restrictions:** `Restrict key` → čekiraj **samo** `Places API (New)`
   - **Save**

### Ubaci ključ u Vercel
1. https://vercel.com → projekat **laker-detailing** → **Settings → Environment Variables**
2. **Add New:**
   - Name: `GOOGLE_PLACES_KEY`
   - Value: *(ključ iz koraka 5)*
   - Environments: čekiraj sva tri (Production, Preview, Development)
3. **Save**, pa **Deployments → poslednji → ⋯ → Redeploy**
   (env varijable se hvataju tek pri sledećem deployu)

### Proba
Otvori admin panel → tab **⭐ Recenzije** → dugme **↻ Povuci sa Googlea**.
Treba da ti se pojave recenzije sa Mapa. Klikni **+ Na sajt** na onima koje hoćeš.

---

## KORAK 2 — Pristup svim recenzijama (pošalji ODMAH, čeka se nedeljama)

Places API iz koraka 1 daje **najviše 5** recenzija. To je Googleovo tvrdo
ograničenje — ne postoji način da se zaobiđe.

Za **sve** recenzije treba Business Profile API, a njega Google odobrava ručno.
Zvanično 7–10 radnih dana, u praksi ume i 6 nedelja. **Zato ovo pošalji danas.**

### Uslovi (sve ispunjavaš)
- Verifikovan Google Business Profile stariji od 60 dana ✔
- Sajt firme ✔ (lakerdetailing.rs)
- Zahtev se šalje sa naloga koji je **vlasnik** profila → `detailinglaker@gmail.com`

### Kako se šalje
1. U Google Cloud-u (isti projekat `laker-recenzije`) uključi:
   - **Google My Business API**
   - **My Business Account Management API**
   - **My Business Business Information API**
   > `Google My Business API` (onaj sa recenzijama) se **neće uključiti** dok ne prođe
   > odobrenje — to je normalno, ne znači da si nešto pogrešio.
2. Otvori formu: https://developers.google.com/my-business/content/prereqs
   → link **request access** (ili „Business Profile APIs contact form")
3. U formi:
   - Tip zahteva: **Application for Basic API Access**
   - Google Cloud **Project ID**: piše ti gore u konzoli (npr. `laker-recenzije-472913`)
   - Nalog: `detailinglaker@gmail.com`
   - Sajt: `https://www.lakerdetailing.rs`
   - Opis upotrebe — možeš prekopirati:

     > Auto detailing studio u Čačku, Srbija. Naš sajt (lakerdetailing.rs) treba
     > da prikazuje recenzije naše sopstvene lokacije na Google Business Profile-u.
     > Vlasnik ručno bira koje recenzije se prikazuju kroz interni admin panel.
     > Koristimo isključivo reviews.list za jednu lokaciju koju sami posedujemo,
     > sa keširanjem — bez pisanja podataka i bez pristupa tuđim lokacijama.

4. Kad stigne odobrenje — **javi mi** i ja prebacim izvor. Traje par minuta,
   admin panel i sajt ostaju identični, samo ti se pojave sve recenzije umesto 5.

---

## Kako se koristi (posle koraka 1)

Admin panel → **⭐ Recenzije** → sekcija **Sa Google Mapa**:

| Dugme | Šta radi |
|---|---|
| **↻ Povuci sa Googlea** | Skine trenutno stanje sa Mapa. Ide samo na tvoj klik i pri prijavi |
| **+ Na sajt** | Recenzija se odmah pojavi u sekciji utisaka na sajtu |
| **− Skloni sa sajta** | Skida je sa sajta. Ostaje ti u listi, možeš je vratiti kad hoćeš |
| **🚫 Sakrij** | Skloni je iz ove liste da ti ne smeta. Ne briše se — filter „Sakrivene" je vraća |
| Filteri | *Sve · Na sajtu · Nisu na sajtu · Sakrivene* |

**Tvoj izbor se nikad ne gubi.** Povlačenje sa Googlea osvežava samo tekst i ocenu;
šta je na sajtu, a šta nije, ostaje kako si ti postavio. Nove recenzije se same
pojave u listi kao „Nije na sajtu" i čekaju tvoj klik.

Na sajtu se Google recenzije prikazuju **isto kao ostale** — nigde ne piše Google.
Idu prve, pa ispod njih utisci poslati preko forme na sajtu.

Recenzija koja ima samo ocenu bez teksta se ne može staviti na sajt (nema šta da se prikaže).
