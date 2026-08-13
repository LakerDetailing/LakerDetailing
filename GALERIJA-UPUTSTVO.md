# Slike u galeriji — uputstvo za vlasnika

Galerija na sajtu (sekcija **Premium estetika**) se od sada menja sama, iz jednog foldera.
Ne treba ti Claude, ne treba ti kod. Treba ti folder i jedan dupli klik.

---

## Pravilo koje sve objašnjava

> **Šta je u folderu `galerija\` — to je na sajtu.**

- Ubaciš sliku u folder → pojavi se na sajtu
- Obrišeš sliku iz foldera → nestane sa sajta
- Zameniš sliku → zamenjena je i na sajtu

Dok ne pokreneš `SLIKE.bat`, na sajtu se **ništa** ne menja. Folder je tvoja radna soba, sajt vidi tek kad ti kažeš.

---

## Kako se menja slika — korak po korak

### 1. Otvori folder sa slikama

Dupli klik na **`SLIKE.bat`** → izaberi **4** (Otvori folder sa slikama).
Ili ručno: `D:\d Destkop\sajt laker\LakerDetailing-main\galerija\`

### 2. Uradi izmenu

**Da izbaciš sliku:** obriši je iz foldera (Delete).

**Da dodaš novu:** prevuci je u folder i preimenuj po pravilu ispod.

**Da zameniš:** obriši staru, ubaci novu.

### 3. Ime slike — jedino pravilo koje moraš da zapamtiš

```
1 - Mercedes AMG enterijer detailing.jpg
│   └── opis slike (ovo čita Google)
└────── redni broj (1 je prva u galeriji)
```

To je celo pravilo — nema ničeg drugog da se pamti.

Piši normalno: razmaci, velika slova, naša slova (č, ć, ž, š, đ) — sve radi.
Opis nije ukras: to je ono što Google čita o slici i po čemu te ljudi nalaze u pretrazi slika.

### 4. Pokreni `SLIKE.bat` → opcija **1**

Skripta ti sve kaže na ekranu:
- koje slike je našla i kojim redom
- šta se dodaje, šta se sklanja
- ponudi da **pogledaš sajt pre objave** (preporučujem: uvek pogledaj)
- pita **„Objaviti na sajt?"** — tek na `d` ide na internet

### 5. Sačekaj poruku „nove slike su ŽIVE na sajtu"

Skripta sama proverava sajt i javi ti kad je gotovo (do ~2 minuta).
Onda otvori sajt i pritisni **Ctrl+F5** (osvežava i briše keš).

---

## Koje slike smeju

| Format | Radi |
|---|---|
| `.jpg` `.jpeg` | ✅ |
| `.png` | ✅ |
| `.webp` | ✅ |
| `.heic` (iPhone) | ❌ skripta ti javi i preskoči |
| `.mov` `.mp4` | ❌ |

**iPhone:** Podešavanja → Kamera → Formati → **„Najkompatibilnije"**. Posle toga telefon slika u `.jpg` i sve radi.

**Veličina nije bitna.** Ubaci sliku od 8 MB pravo sa telefona — skripta je sama smanji na oko 100–200 KB za sajt. Original ostaje netaknut u folderu.

---

## Kako galerija slaže slike

Slike se slažu u redove. **U jednom redu sve slike imaju istu visinu**, a širine se prilagode obliku slike — uspravna je uža, položena šira. Red uvek popuni celu širinu, ivice su prave, i **nijedna slika se ne seče**.

Sve to se računa samo, iz stvarnih dimenzija tvojih slika. Ne moraš ništa da podešavaš — ubaci sliku bilo kog oblika i ona se uklopi.

Na telefonu idu po dve slike u redu, na kompjuteru obično četiri — zavisi od toga koliko ih ima i kakvog su oblika.

---

## Koliko slika

- **4 ili 8** — najlepše
- Radi sa bilo kojim brojem
- Manje od 3 — galerija izgleda prazno
- Više od 12 — sajt se sporije učitava

---

## Ako nešto krene naopako

| Šta se desilo | Šta da uradiš |
|---|---|
| Pogrešio si i **nisi još objavio** | `SLIKE.bat` → **3** (Vrati kako je bilo) |
| **Objavio si** pa se predomislio | `SLIKE.bat` → **3**, pa opet **1** i objavi vraćeno stanje |
| Skripta kaže „nema ffmpeg" | U PowerShell-u: `winget install Gyan.FFmpeg`, pa zatvori i otvori `SLIKE.bat` |
| Skripta kaže „nema slika u folderu" | Folder je prazan — **sajt nije diran**, vrati slike i pokreni ponovo |
| Bilo šta drugo | Pošalji Claude Code-u tačan tekst sa ekrana |

**Skripta nikad ne menja sajt bez tvoje potvrde,** i uvek napravi rezervnu kopiju pre nego što bilo šta dirne.

---

## Tri stvari koje NE treba da radiš

1. **Ne diraj `assets/gallery/`** — to su fajlovi koje skripta pravi. Tvoje slike idu isključivo u `galerija\`.
2. **Ne menjaj galeriju ručno u `index.html`** — sledeće pokretanje skripte će to pregaziti. Između markera `GALERIJA:POCETAK` i `GALERIJA:KRAJ` piše samo skripta.
3. **Ne pokreći `SLIKE.bat` dok Claude radi na sajtu** — objava povuče i njegove nedovršene izmene.

---

## Zašto ne moraš da brineš za keš

Svaka slika dobija ime sa svojim „otiskom" (`g-mercedes-amg-...-e9c5a541.webp`). Nova slika = novo ime, pa nijedan pregledač ne može da ti servira staru sliku iz keša. Zato ćeš u folderu `assets/gallery/` videti duga imena — to je namerno i ne diraj ih.
