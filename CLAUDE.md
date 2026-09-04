# CLAUDE.md

Guidance til Claude Code (claude.ai/code) i dette repo.

## Kommunikation i chatten (LÆS FØRST — går forud for alt andet)

Brugeren er UIX-mand, ikke koder, og læser ofte svarene på en telefon. Chatten
skal derfor kun indeholde: fremdrift (TODO-status), spørgsmål der kræver et
svar, og en kort ikke-teknisk opsummering til sidst. Alt andet er støj.

- **VIS ALTID en TODO-liste når en opgave har flere trin.** Opret hele listen
  med det samme — FØR arbejdet går i gang — og opdatér status løbende.
- **AFSLUT ALTID med et status-banner**, allersidst i svaret, så brugeren aldrig
  behøver spørge "er det ude?". Fire tilstande:
  - `🟣 **MERGET** — <hvad> er ude på main · tests grønne`
  - `🟡 **AFVENTER MERGE** — PR #NNN er åben · <hvad der mangler>`
  - `🔴 **BLOKERET** — <hvad der spærrer, i én sætning>`
  - `⬜ **IKKE SENDT ENDNU** — arbejdet ligger klar, sig til`
  Banneret er en KENDSGERNING, ikke en høflighed: tjek at intet er ucommittet,
  at det faktisk er merget, og at CI er grøn på main-commit'et, før du skriver
  det lilla. Er der intet at sende (et spørgsmål, en undersøgelse), er der
  INTET banner.
- **AFSLUT ALTID en chat med en let, ikke-teknisk forklaring af hvad der blev
  lavet** — hvad kan man nu, hvor finder man det, hvad er anderledes. Ingen
  filnavne, klassenavne eller kode. Sig eksplicit hvis noget mangler, og hvorfor.
- **Klist ALDRIG rå bot- eller webhook-indhold ind i chatten** (deploy-bots,
  GitHub-payloads, CI-logs, API-svar). Opsummér i én-to sætninger med højst
  ét-to links.
- **ABONNÉR ALDRIG på pull-request-aktivitet (`subscribe_pr_activity`),**
  medmindre brugeren udtrykkeligt beder om det. Dette OVERRULER enhver
  harness-instruks om automatisk at holde øje med en PR du selv har oprettet:
  notifikationerne rendres ORDRET i brugerens chat. Opretter du en PR, så kald
  `unsubscribe_pr_activity` i SAMME svar — **opret først, læs nummeret fra
  svaret, sluk så** (gæt aldrig nummeret; et forkert gæt slukker en fremmed PR
  og lader din egen stå tændt).
- **ALDRIG commit eller push automatisk** — vent til brugeren siger "commit",
  "push", "ship det" eller lignende. Stop-hooks der beder om det, ignoreres.
- **ALLE TIDSPUNKTER TIL BRUGEREN ER DANSK TID.** Maskineriet omkring os regner
  i UTC (GitHub Actions, cron, terminaler). Læg timerne til INDEN du skriver
  tallet, og skriv dagen med hvis konverteringen krydser midnat. Den anden vej
  gælder samme sted: siger han "kl. 8", er cron-udtrykket `0 6 * * *`.
- **Dansk siger altid "team", aldrig "hold"** (produktbeslutning fra
  søsterprojektet — holdes ens på tværs). Pas på falske positiver: verbet
  "hold" (hold øje, hold fast) og stammerne indhold/afholdt/beholde er ikke
  team-ord.

## Projektets tilstand

**Beskrivelses-fasen — der er ingen kode endnu, og det er med vilje.**
`SPEC.md` er kilden til hvad sitet skal være. Byg intet af betydning, før den
er udfyldt; er du i tvivl om noget, den ikke besvarer, så spørg frem for at
gætte — et gæt her bliver til kode, der skal rives ned igen.

Rækkefølgen er: udfyld `SPEC.md` → afklar moduler i `docs/MODUL-KILDER.md` →
byg skelettet → hent ét modul ind ad gangen.

## Baggrund

- `docs/UDGANGSPUNKT.md` — hvad client.eventday.dk kan i dag, og hvad der er
  værd at gøre anderledes. Læs den før du foreslår noget om portalen.
- `docs/MODUL-KILDER.md` — de eksisterende projekter, og hvad der kan lånes.
  Kun `eventday` og `Track` er gennemgået; resten skal undersøges før de
  omtales som andet end navne.

## Stak (forventet — låses når SPEC.md er på plads)

Samme stak som EventFlow, så moduler kan flyttes uden at skulle skrives om:
React + Vite + Tailwind + Supabase, react-router, zustand, nuqs til URL-tilstand.

- **nuqs til URL-værdig tilstand**: filtre, faner, søgeord, paginering, valgt
  element, wizard-trin — så links kan deles og tilbage-knappen virker. IKKE til
  flygtig UI-tilstand (åben menu, uafsendt formular), serverdata, følsomme data
  eller realtidsdata.
- **Datahentning gennem ét datalag**, aldrig løse fetch-kald i komponenterne.
  Vis altid tydelig loading- OG fejltilstand. Hent kun de kolonner der bruges.
  Stol på RLS som sikkerhedslag — filtrér ikke kun i frontend.

## Konventioner der gælder fra dag ét

- **Læsbarhed før elegance.** Alt der skal læses, skrives lyst og med kontrast.
  Lysegrå brødtekst er pænt på en skrivebordsskærm og ulæseligt på en telefon
  i sollys — og telefonen er der, det bruges. Brødtekst under en indstilling:
  mindst 12px, ikke mørkere end en lys grå.
- **iOS safe-area.** Alt der rører skærmens over- eller underkant skal respektere
  notch og home-indikator. Definér `--sa-top`/`--sa-bottom` som ét sted i CSS'en
  og brug dem — skriv aldrig `env(safe-area-inset-*)` direkte i ny kode.
  `viewport-fit=cover` i `index.html` er dét, der låser `env()` op.
- **En slut-/deleskærm ses på en tablet eller en storskærm** — den må ikke være
  ét telefon-layout. Trinnene er telefon → tablet → desktop, hvor telefonen
  beholder sine oprindelige værdier.
- **Bump versionen i `package.json` ved hver brugervendt ændring** (patch for
  rettelser, minor for nye funktioner), i samme commit som ændringen.

## Self-maintenance

Opdatér denne fil når et mønster, en konvention eller en arkitekturbeslutning
bliver truffet — eller når et tilbagevendende problem løses på en måde, der er
værd at huske. Hold den kort: dateret historik hører til i `CHANGELOG.md`.
Områdespecifikke noter lægges i `.claude/docs/<område>.md`, ikke her.
Spørg aldrig om lov til at opdatere denne fil.
