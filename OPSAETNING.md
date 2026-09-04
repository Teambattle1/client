# Sæt portalen live på client.eventday.dk

Tre opgaver. Den første tager to minutter, den sidste venter mest på at
internettet opdager sig selv.

> Der findes en klikbar udgave af den her vejledning, hvor hakkene huskes
> undervejs, og hvor databasekoden kan kopieres med ét tryk. Linket ligger i
> chatten — den her fil er den samme vejledning, bare som tekst.

---

## 1. Læg databasen ind

Portalen har ingen steder at gemme kunderne endnu. Det her opretter dem — og
sætter adminkoden til `100408`.

1. **Åbn jeres Supabase-projekt** → https://supabase.com/dashboard/projects
   Vælg TeamBattle-projektet i listen.
2. **Gå til SQL Editor** i menuen i venstre side → **New query**.
3. **Indsæt koden og tryk Run.** Koden er
   [`supabase/migrations/001_portal.sql`](supabase/migrations/001_portal.sql).
   Der skal stå **Success. No rows returned**.
4. **Tjek at det virkede.** Under **Table Editor** skal der nu ligge to nye
   tabeller: `portal_clients` og `portal_config`. Den sidste har én linje,
   hvor der står `100408`.

Du kan trygt køre koden igen, hvis du er i tvivl om den gik igennem. Den laver
ikke noget om, der allerede er der — og den sletter aldrig en kunde.

---

## 2. Sæt sitet op på Netlify

Her bygges portalen, og her fortæller du den, hvor databasen står.

1. **Opret sitet ud fra repoet** → https://app.netlify.com/start
   **Add new site** → **Import an existing project** → GitHub →
   **Teambattle1/client**. Byggeindstillingerne udfylder sig selv; de ligger
   i `netlify.toml`.
2. **Hent de to værdier i Supabase** →
   https://supabase.com/dashboard/project/_/settings/api
   Du skal bruge **Project URL** og nøglen der hedder **anon public**. Den
   nøgle er offentlig med vilje — den ligger i enhver besøgendes browser.
3. **Skriv dem ind i Netlify:** **Site configuration** → **Environment
   variables** → **Add a variable**. Navnene skal staves præcis sådan her:

   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

4. **Byg sitet igen:** **Deploys** → **Trigger deploy** → **Deploy site**.

**Det sidste punkt er ikke til pynt.** De to nøgler bages ind, når sitet
bygges — så et site, der allerede var bygget, kender dem ikke. Springer du det
over, ser portalen helt rigtig ud, men den finder ingen kunder, og du tror
databasen er gået galt.

---

## 3. Sæt adressen på

1. **Tilføj adressen i Netlify:** **Domain management** → **Add a domain** →
   `client.eventday.dk`. Netlify svarer med den linje, der skal ind hos jeres
   DNS.
2. **Læg linjen ind hos jeres DNS** — samme sted som `flow.eventday.dk` og
   `track.eventday.dk` er sat op. Det er typisk en CNAME, der peger på jeres
   Netlify-adresse.
3. **Vent på hængelåsen.** Netlify henter selv et sikkerhedscertifikat, når
   DNS er slået igennem. Typisk minutter, men det kan tage timer.

---

## Til sidst: prøv den som en kunde

Fem minutter der fanger alt, hvad der kan være gået galt.

1. Åbn `client.eventday.dk` og tast `100408`. Kundelisten skal åbne.
2. Står der en orange besked om demo-tilstand, mangler nøglerne fra trin 2 —
   eller sitet er ikke bygget igen.
3. Opret en testkunde. Der skal komme seks cifre og et link frem med det samme.
4. Åbn linket i et privat vindue. Kunden skal se sit event uden at logge ind.
5. Skriv noget under **info fra jer**, luk vinduet, åbn linket igen. Det skal
   stadig stå der — så gemmer databasen rigtigt.

---

## Bagefter

- **Skift adminkoden:** se afsnittet på [`README.md`](README.md).
- **Kunder oprettes** i admin-delen; hver kunde får seks cifre og et link, der
  kan sendes. De skal ikke oprettes eller logge ind.
