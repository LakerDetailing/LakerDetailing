# PWA / Push Setup

Kratka checklist za produkciju.

## Potrebno na serveru

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` ili `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `PUSH_VAPID_PRIVATE_KEY_PEM` ili `VAPID_PRIVATE_KEY_PEM`
- `PUSH_VAPID_SUBJECT` ili `VAPID_SUBJECT`

## Supabase tabele

Pokreni SQL iz `supabase/push-schema.sql` i kreiraj:

- `push_subscriptions`
- `push_notifications`
- `push_delivery_logs`
- RLS je uključen i javni pristup je blokiran

## Kako radi

- Korisnik na iPhone-u doda sajt na Home Screen.
- U aplikaciji dozvoli notifikacije.
- Admin otvori `laker-admin-9x3k.html`.
- Klikne `Pošalji push` i pošalje naslov, poruku i link.

## Napomena

- Ako VAPID nije podešen, poruka se i dalje čuva u bazi, ali se push ne šalje.
- Ako nema pretplatnika, poruka će biti sačuvana, ali niko neće dobiti notifikaciju.
- Log slanja ide u `push_delivery_logs` da možeš da vidiš rezultate kasnije.
