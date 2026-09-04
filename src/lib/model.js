// Portalens indhold: de seks knapper, felterne kunden selv udfylder, og
// eksempelkunden. Alt tekst er dansk — portalen er kundevendt.

export const SECTIONS = [
  { key: 'opgave',    label: 'Hvad skal I lave', icon: 'flag',   sub: 'Aktiviteten I har bestilt' },
  { key: 'info',      label: 'Info fra jer',     icon: 'form',   sub: 'Det vi mangler at vide' },
  { key: 'location',  label: 'Location',         icon: 'pin',    sub: 'Mødested og praktisk' },
  { key: 'okonomi',   label: 'Økonomi',          icon: 'money',  sub: 'Pris og betaling' },
  { key: 'tidslinje', label: 'Tidslinje',        icon: 'clock',  sub: 'Sådan forløber dagen' },
  { key: 'kontakt',   label: 'Kontakter',        icon: 'person', sub: 'Hvem I skal tale med' },
]

/**
 * Hvad kunden har købt, udledt af AKTIVITETEN — ikke spurgt om en ekstra gang.
 *
 * Aktiviteten står allerede i kataloget (`ef_activities`), og TeamTaste er en
 * af dem. At spørge »hvad er det for et produkt?« ved siden af ville være at
 * bede om den samme oplysning to gange og give os to steder, den kan være
 * forkert.
 *
 * Det er NAVNET vi kigger på, ikke kategorien: alle tolv aktiviteter i
 * kataloget bærer kategorien »teambuilding«, så den kan ikke skelne mad fra
 * et løb. Navnet gemmes på kunden ved oprettelsen, så spørgsmålene kan
 * afgøres uden at vente på et opslag.
 */
export function produktFor(kunde) {
  const navn = String((kunde && kunde.aktivitetNavn) || '').toLowerCase()
  return navn.includes('teamtaste') ? 'taste' : 'track'
}

const INFO_FIELDS = [
  { key: 'deltagere', label: 'Endeligt antal deltagere', type: 'text', ph: 'fx 48',
    hint: 'Vi låser tallet 5 dage før — små ændringer klarer vi på dagen.' },
  { key: 'hold', label: 'Holdinddeling', type: 'select',
    options: ['Vi vælger selv holdene', 'I må gerne inddele os', 'Vi blander på dagen'],
    hint: 'Vælger I selv, sender vi en holdliste I kan udfylde.' },
  // Stedet er ét spørgsmål, ikke fem: enten et af vores steder, eller jeres
  // eget — og vælger I jeres eget, skal vi vide hvordan vi kommer ind.
  { key: 'sted', label: 'Hvor skal det foregå?', type: 'venue' },
  { key: 'logistik', label: 'Særlige logistiske forhold', type: 'textarea',
    ph: 'Fx varer der skal køres ind, en elevator der er i stykker, en trappe uden gelænder, larm fra et andet møde',
    hint: 'Alt hvad der er værd at vide, før vi står der med udstyret.' },
  { key: 'ankomst', label: 'Hvornår er I fremme?', type: 'text', ph: 'fx 12.45',
    hint: 'Vi står klar 45 minutter før jeres starttid.' },
  // To kontakter, fordi det sjældent er den samme person: den ene planlægger
  // eventet med os i ugerne før, den anden står der på dagen.
  { key: 'kontaktOpgave', label: 'Jeres kontaktperson for opgaven', type: 'kontakt',
    hint: 'Den vi aftaler indhold, tider og pris med op til dagen.' },
  { key: 'kontaktDagen', label: 'Kontaktperson på dagen', type: 'kontakt',
    hint: 'Den vi ringer til på selve dagen, hvis noget skal afklares.' },
  // KUN ved TeamTaste. Et løb gennem byen skal ikke spørge om allergier —
  // det er et spørgsmål der får kunden til at tro, at der bliver serveret
  // mad, og det efterlader et tomt felt de ikke kan svare på.
  { key: 'allergi', label: 'Allergier og hensyn', type: 'textarea',
    produkt: 'taste',
    ph: 'Allergier, intolerancer, andet køkkenet skal vide',
    hint: 'Skriv gerne »ingen« — så ved vi at I har taget stilling.' },
  { key: 'bemaerk', label: 'Andet vi skal vide', type: 'textarea',
    ph: 'Fx en fødselar, en chef der skal hyldes, en overraskelse' },
]

/**
 * Spørgsmålene til NETOP denne kunde.
 *
 * Et felt uden `produkt` stilles til alle; et felt MED stilles kun til det
 * produkt. Ukendt eller manglende produkt får kun fællesspørgsmålene —
 * hellere et spørgsmål for lidt end et der ikke giver mening.
 */
export function infoFieldsFor(kunde) {
  const produkt = produktFor(kunde)
  return INFO_FIELDS.filter(f => !f.produkt || f.produkt === produkt)
}

/** Hvor mange af kundens felter der er udfyldt. Driver både fremdriftslinjen
 *  og »MANGLER«-mærket på Info-knappen. Tæller KUN de spørgsmål kunden
 *  faktisk får stillet — ellers ville en byjagt aldrig kunne nå 100 %. */
/**
 * Er ET spørgsmål besvaret?
 *
 * Kan ikke bare være `String(v) !== ''`: et sammensat svar (stedet, en
 * kontakt) er et objekt, og String() på et objekt giver »[object Object]« —
 * altså ville et TOMT felt tælle som udfyldt, og kunden ville se 100 % uden
 * at have svaret på noget.
 */
export function feltUdfyldt(felt, værdi) {
  if (felt.type === 'venue') {
    const v = værdi || {}
    if (v.valg === 'vores') return !!v.venueId
    if (v.valg === 'egen') return !!(v.adresse && String(v.adresse).trim())
    return false
  }
  if (felt.type === 'kontakt') {
    const k = værdi || {}
    // Et navn uden en måde at nå personen på er ikke en kontakt.
    return !!(String(k.navn || '').trim() && (String(k.mail || '').trim() || String(k.tlf || '').trim()))
  }
  return String(værdi ?? '').trim() !== ''
}

export function infoUdfyldt(kunde) {
  const info = (kunde && kunde.info) || {}
  return infoFieldsFor(kunde).filter(f => feltUdfyldt(f, info[f.key])).length
}

/** Eksempelkunden. Findes så portalen kan ses og vurderes uden at der er
 *  oprettet en rigtig kunde — den gemmes aldrig i databasen. */
export const DEMO = {
  code: '100100', demo: true, aktivitetNavn: 'TeamRace',
  firma: 'Nordisk Revision A/S', kontakt: 'Mette Hylleborg',
  email: 'mh@nordiskrevision.dk', telefon: '27 41 88 05',
  eventTitle: 'Byjagt i Aarhus', eventDate: '2026-09-26',
  startTime: '13.00', endTime: '16.30',
  sted: 'Dokk1, Hack Kampmanns Plads 2, 8000 Aarhus C',
  modested: 'Trappen foran hovedindgangen',
  parkering: 'Salling P-hus, 4 min. gang',
  deltagere: 48, pris: 23400, betalt: false, faktura: 'EAN 5798009812345',
  beskrivelse: 'Et hold-mod-hold løb gennem Aarhus midtby. I får hver en tablet, en rute og 22 opgaver undervejs — fotoopgaver, gåder og små udfordringer, der kræver at I taler sammen. Der er ingen fysiske krav ud over almindelig gang.',
  inkluderet: ['22 opgaver', 'Tablets til alle hold', 'Gamemaster på ruten', 'Resultatshow til sidst', 'Billeder dagen efter'],
  gamemaster: { navn: 'Kasper Lund', rolle: 'Gamemaster på jeres event', telefon: '40 27 40 27', email: 'kasper@eventday.dk' },
  eventplanner: { navn: 'Maria Lund', mail: 'maria@eventday.dk', tlf: '28 55 12 04' },
  leadInstruktor: { navn: 'Kasper Lund', mail: 'kasper@eventday.dk', tlf: '40 27 40 27' },
  program: [
    { tid: '12.15', titel: 'Vi rigger op', note: 'I skal ikke være der endnu' },
    { tid: '13.00', titel: 'Velkomst og holdinddeling', note: 'Ved trappen foran Dokk1' },
    { tid: '13.20', titel: 'Byjagten går i gang', note: 'Holdene sendes af sted med hver sin startopgave' },
    { tid: '15.45', titel: 'Alle hold tilbage', note: 'Sidste opgave lukker præcis 15.45' },
    { tid: '16.00', titel: 'Resultatshow og præmie', note: 'Ca. 20 minutter' },
    { tid: '16.30', titel: 'Tak for i dag', note: '' },
  ],
  info: {},
}

/** En ny, tom kunde. Felterne findes fra dag ét, så portalen aldrig render
 *  på undefined — den viser bare »ikke sat endnu«. */
export function tomKunde(felter) {
  return {
    firma: '', kontakt: '', email: '', telefon: '',
    aktivitetId: '', aktivitetNavn: '',
    eventplanner: null, leadInstruktor: null,
    eventTitle: '', eventDate: '', startTime: '', endTime: '',
    sted: '', modested: '', parkering: '',
    deltagere: null, pris: null, betalt: false, faktura: '',
    beskrivelse: '', inkluderet: [],
    gamemaster: { navn: '', rolle: 'Gamemaster på jeres event', telefon: '', email: '' },
    program: [], info: {},
    ...felter,
  }
}
