# Client

Nyt kundevendt site/app for EventDay — bygget videre på ideen bag
**client.eventday.dk** (kundeportalen i EventFlow), men som sit eget produkt
med moduler hentet fra de eksisterende Teambattle1-repos.

## Status

🟡 **Beskrivelses-fasen, med en første prototype.** Selve appen er ikke bygget
endnu — først lægger vi fast hvad sitet skal kunne og hvilke moduler det låner
fra de andre projekter. Kundens portal findes dog allerede som en klikbar
prototype, så designet kan vurderes på en telefon inden der bygges.

## Hvor står hvad

| Fil | Hvad står der |
|---|---|
| [`SPEC.md`](SPEC.md) | **Beskrivelsen af det nye site.** Den udfyldes først — alt andet følger af den. |
| [`docs/MODUL-KILDER.md`](docs/MODUL-KILDER.md) | Oversigt over de eksisterende repos, og hvad der kan lånes fra hvert af dem. |
| [`docs/UDGANGSPUNKT.md`](docs/UDGANGSPUNKT.md) | Hvad client.eventday.dk er i dag — hvad der virker, og hvad der er værd at gøre anderledes. |
| [`prototype/kundeportal.html`](prototype/kundeportal.html) | Klikbar prototype: kundens portal med de seks knapper, plus oprettelse af kunder og adgang til deres portal. Én selvstændig fil uden byggetrin. |
| `CLAUDE.md` | Arbejdsreglerne for projektet (kommunikation, stak, konventioner). |

## Prototypen

`prototype/kundeportal.html` er en enkelt fil uden afhængigheder — åbn den
direkte i en browser. Den viser to ting:

- **Kunder** — søg en kunde frem eller opret en ny. Hver kunde får sin egen
  kode og sit eget portal-link, der kan kopieres og sendes.
- **Kundens portal** (`?k=<kode>`) — eventkort med nedtælling og fremdrift,
  og de seks knapper: hvad skal I lave, info fra jer, location, økonomi,
  tidslinje, kontakt. Kun »info fra jer« skrives af kunden selv.

Farver og skrifter er hentet fra EventFlow, så prototypen ligner EventDay.
Kunde-data gemmes af den publicerede udgave; åbnet som en løs fil kører den på
eksempelkunden alene.

## Næste skridt

1. Udfyld `SPEC.md` — den kan udfyldes i stikord eller i almindelig tale.
2. Marker i `docs/MODUL-KILDER.md` hvilke repos der skal bidrage med noget.
3. Så bygges skelettet og modulerne hentes ind, ét ad gangen.
