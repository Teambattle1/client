// Portalens indhold: de seks knapper, felterne kunden selv udfylder, og
// eksempelkunden. Alt tekst er dansk — portalen er kundevendt.

export const SECTIONS = [
  { key: 'opgave',    label: 'Hvad skal I lave', icon: 'flag',   sub: 'Aktiviteten I har bestilt' },
  { key: 'info',      label: 'Info fra jer',     icon: 'form',   sub: 'Det vi mangler at vide' },
  { key: 'location',  label: 'Location',         icon: 'pin',    sub: 'Mødested og praktisk' },
  { key: 'okonomi',   label: 'Økonomi',          icon: 'money',  sub: 'Pris og betaling' },
  { key: 'tidslinje', label: 'Tidslinje',        icon: 'clock',  sub: 'Sådan forløber dagen' },
  { key: 'kontakt',   label: 'Kontakt',          icon: 'person', sub: 'Jeres gamemaster på opgaven' },
]

export const INFO_FIELDS = [
  { key: 'deltagere', label: 'Endeligt antal deltagere', type: 'text', ph: 'fx 48',
    hint: 'Vi låser tallet 5 dage før — små ændringer klarer vi på dagen.' },
  { key: 'hold', label: 'Holdinddeling', type: 'select',
    options: ['Vi vælger selv holdene', 'I må gerne inddele os', 'Vi blander på dagen'],
    hint: 'Vælger I selv, sender vi en holdliste I kan udfylde.' },
  { key: 'ankomst', label: 'Hvornår er I fremme?', type: 'text', ph: 'fx 12.45',
    hint: 'Vi står klar 45 minutter før jeres starttid.' },
  { key: 'kontaktDagen', label: 'Kontaktperson på dagen', type: 'text', ph: 'Navn og mobil',
    hint: 'Den vi ringer til, hvis noget skal afklares undervejs.' },
  { key: 'allergi', label: 'Allergier og hensyn', type: 'textarea',
    ph: 'Allergier, gangbesvær, andet vi skal tage højde for',
    hint: 'Skriv gerne »ingen« — så ved vi at I har taget stilling.' },
  { key: 'bemaerk', label: 'Andet vi skal vide', type: 'textarea',
    ph: 'Fx en fødselar, en chef der skal hyldes, en overraskelse' },
]

/** Hvor mange af kundens felter der er udfyldt. Driver både fremdriftslinjen
 *  og »MANGLER«-mærket på Info-knappen. */
export function infoUdfyldt(kunde) {
  const info = (kunde && kunde.info) || {}
  return INFO_FIELDS.filter(f => String(info[f.key] ?? '').trim() !== '').length
}

/** Eksempelkunden. Findes så portalen kan ses og vurderes uden at der er
 *  oprettet en rigtig kunde — den gemmes aldrig i databasen. */
export const DEMO = {
  code: '100100', demo: true,
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
    eventTitle: '', eventDate: '', startTime: '', endTime: '',
    sted: '', modested: '', parkering: '',
    deltagere: null, pris: null, betalt: false, faktura: '',
    beskrivelse: '', inkluderet: [],
    gamemaster: { navn: '', rolle: 'Gamemaster på jeres event', telefon: '', email: '' },
    program: [], info: {},
    ...felter,
  }
}
