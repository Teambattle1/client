# Udgangspunktet: client.eventday.dk i dag

Det nye site tager afsæt i **kundeportalen** i EventFlow-projektet
(`Teambattle1/eventday`). Denne side beskriver hvad den kan i dag, så
beskrivelsen af det nye kan forholde sig til noget konkret i stedet for
at starte forfra.

## Hvordan kunden kommer ind

Kunden får et **personligt link med en kode i** — der er ingen brugeroprettelse
og intet kodeord. Linket åbner direkte kundens egen side, hvor alt handler om
netop deres event. Spillestedet (venue) har sit **eget separate link**, som
typisk deles via en QR-kode, og som kun viser det spillestedet har brug for.

## Hvad kunden møder

Portalen er én side med en række faner:

| Fane | Hvad den er til |
|---|---|
| **Tilbud** | Kunden læser tilbuddet og kan godkende det. |
| **Info / tjekliste** | De oplysninger vi mangler fra kunden, med en tæller der viser hvor langt de er. Der dukker en påmindelse op, hvis der stadig mangler noget. |
| **Tidsplan** | Programmet for dagen — hvad sker der hvornår. |
| **GameInfo** | Det praktiske om selve spillet. |
| **Betaling** | Vises kun for firmakunder, ikke for private. |
| **Teams** | Kundens egen holdopsætning. |
| **Holdscript** | Drejebogen. |
| **Chat** | Direkte beskeder mellem kunden og os. |

Bag kulissen ligger en administrationsdel til os selv: kundedatabase, leads,
tilbudsbygger, skabeloner, tjeklister, aktivitetslog, brugere og en scanner —
plus en forhåndsvisning, så vi kan se kundens side præcis som kunden ser den.

## Hvad der er værd at tage med

- **Login uden kodeord.** Et link er nok. Det er den største enkeltstående grund
  til at kunderne faktisk bruger portalen.
- **Tælleren på tjeklisten.** Kunden kan se hvor langt de er, uden at vi skal
  rykke dem.
- **Kundens side og vores side er det samme.** Vi kan se præcis hvad kunden ser.
- **Spillestedet har sit eget link.** De skal ikke se kundens tilbud og priser.

## Hvad der er værd at overveje at gøre anderledes

Det er ikke fejl — det er valg, der blev truffet dengang, og som er værd at
tage stilling til igen:

- **Fanerækken vokser.** Otte faner i toppen af en telefon er meget; nogle af
  dem er kun relevante i bestemte perioder op til eventet.
- **Alt vises altid.** Der skelnes kun få steder mellem "før eventet",
  "på dagen" og "efter eventet", selvom kundens behov er vidt forskellige.
- **Firma og privat deler næsten alt.** Kun betalingsfanen skjules for private.
- **Efter eventet er der ikke rigtig noget.** Billeder, resultater og en
  afrunding hører til her, men bor i dag i andre systemer.
- **Portalen står alene.** Den ved ikke noget om selve spillet, mens det kører.
