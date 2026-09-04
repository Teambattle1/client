# Client

Kundevendt site for EventDay — kunden taster seks cifre og lander på sin egen
side med alt om deres event. Bygget til at ligge på **client.eventday.dk**.

## Status

🟡 **Appen er bygget og virker — den mangler at blive koblet på databasen og
sat på domænet.** Tre ting udestår; de står under »Sådan kommer den live«.

## Sådan virker den

| Adresse | Hvem | Hvad |
|---|---|---|
| `/` | alle | Ét felt til seks cifre. Kundens kode åbner deres side; admin-koden åbner kundelisten. |
| `/p/<seks cifre>` | kunden | Kundens egen side. Kan sendes som direkte link, så de slipper for at taste. |
| `/admin` | os | Find en kunde, opret en ny, kopiér deres link. Lukker sig selv, når fanen lukkes. |

Kundens side har seks knapper: **hvad skal I lave · info fra jer · location ·
økonomi · tidslinje · kontakt**. Kun »info fra jer« skriver kunden selv — den
gemmer løbende og bærer et »MANGLER«-mærke, indtil den er udfyldt. Øverst står
eventet med dato, nedtælling og en linje, der viser hvor langt kunden er.

## Sådan kommer den live

**Trin for trin med links: [`OPSAETNING.md`](OPSAETNING.md).** Kort fortalt:

**1. Læg tabellerne ind.** Kør [`supabase/migrations/001_portal.sql`](supabase/migrations/001_portal.sql)
én gang i Supabase → SQL Editor. Den opretter to tabeller og de funktioner,
appen henter data gennem, og sætter admin-koden til `100408`.

**2. Sæt de to nøgler i Netlify** (Site settings → Environment variables):

```
VITE_SUPABASE_URL       = https://<projekt>.supabase.co
VITE_SUPABASE_ANON_KEY  = <anon-nøglen fra Supabase → API>
```

Uden dem kører appen i demo-tilstand: den husker kun i den ene browser, og kun
eksempelkunden `100100` findes. Det er med vilje — så kan siden altid vises
frem, også før databasen er på plads.

**3. Peg domænet på sitet.** Netlify bygger med `npm run build` og udgiver
`dist/`. SPA-omdirigeringen ligger allerede i `netlify.toml` og
`public/_redirects`; uden den ville et direkte kundelink give 404.

### Skift admin-koden

```sql
update portal_config set value = '<ny kode>' where key = 'admin_code';
```

Koden tjekkes i databasen, ikke i browseren — så den ligger ikke i det, kunden
henter ned, og en forkert kode får intet at vide om kundelisten. **Men seks
cifre er seks cifre:** en maskine kan prøve sig frem. Skal admin-delen bruges
af flere end os, eller ligge åbent i længere tid, bør den have et rigtigt
login. Det står som en åben ting i `SPEC.md`.

## Kør den lokalt

```bash
npm install
npm run dev        # http://localhost:5173
```

Uden `.env.local` kører den i demo-tilstand. Prøv `100100` for at se en kundes
side og `100408` for kundelisten. Kopiér `.env.example` til `.env.local` og
udfyld, hvis du vil køre mod den rigtige database.

## To ting der er værd at kende, før du retter i den

**Skrifterne må ikke blokere.** Google Fonts hentes med `media="print"` +
`onload`, ikke som et almindeligt stylesheet. Et stylesheet i `<head>` holder
modul-scriptet tilbage, til det er hentet — og kan Google ikke nås (dårligt
mobilnet på et spillested), står kunden med en HELT tom skærm, til forbindelsen
giver op. Målt i denne sandkasse, hvor Google er spærret: intet blev tegnet.
Lav det aldrig om til et almindeligt `<link>`.

**»Findes ikke« og »kunne ikke læses« skal holdes adskilt.** Datalaget svarer
`null`, når koden ikke findes, og kaster, når noget går galt. Ellers ville en
dårlig forbindelse se ud som en forkert kode, og kunden ville lede efter en
tastefejl, der ikke findes. Slå dem aldrig sammen til ét svar.

## Hvor står hvad

| Fil | Hvad står der |
|---|---|
| [`SPEC.md`](SPEC.md) | Beskrivelsen af det færdige site. Kun delvist udfyldt — de seks knapper er bygget, resten af produktet mangler at blive beskrevet. |
| [`docs/MODUL-KILDER.md`](docs/MODUL-KILDER.md) | De eksisterende projekter, og hvad der kan lånes fra hvert af dem. |
| [`docs/UDGANGSPUNKT.md`](docs/UDGANGSPUNKT.md) | Hvad kundeportalen i EventFlow kan i dag, og hvad der er værd at gøre anderledes. |
| [`prototype/kundeportal.html`](prototype/kundeportal.html) | Den første skitse i én fil. Den rigtige app har overhalet den — behold den kun som reference. |
| [`OPSAETNING.md`](OPSAETNING.md) | Trin for trin til at få portalen live: database, nøgler, domæne — med links og en prøve til sidst. |
| `CLAUDE.md` | Arbejdsreglerne for projektet. |

## Stak

React 18 + Vite 5 + Tailwind 3 + react-router + Supabase — samme stak som
EventFlow (`Teambattle1/eventday`), så moduler kan flyttes mellem de to uden at
skulle skrives om. Farver og skrifter er hentet derfra.
