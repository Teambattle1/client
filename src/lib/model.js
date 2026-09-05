// Portalens indhold: knapperne, felterne kunden selv udfylder, og
// eksempelkunden. Alt tekst er dansk — portalen er kundevendt.

import { showtimeKlar } from './showtime'
import { aktiviteterFor } from './aktivitetsplan'

export const SECTIONS = [
  { key: 'opgave',    label: 'Hvad skal I lave', icon: 'flag',   sub: 'Aktiviteten I har bestilt' },
  { key: 'info',      label: 'Info fra jer',     icon: 'form',   sub: 'Det vi mangler at vide' },
  { key: 'location',  label: 'Location',         icon: 'pin',    sub: 'Mødested og praktisk' },
  { key: 'okonomi',   label: 'Økonomi',          icon: 'money',  sub: 'Pris og betaling' },
  { key: 'tidslinje', label: 'Tidslinje',        icon: 'clock',  sub: 'Sådan forløber dagen' },
  { key: 'kontakt',   label: 'Kontakter',        icon: 'person', sub: 'Hvem I skal tale med' },
  { key: 'showtime',  label: 'Showtime',         icon: 'showtime', sub: 'Billeder og resultater fra dagen' },
]

/**
 * Knapperne til NETOP denne kunde.
 *
 * Showtime er den eneste, der kan være væk: den findes først, når vi har
 * sat linket OG tændt for det. En knap der åbner et tomt show er værre end
 * ingen knap — kunden trykker på den dagen efter eventet, hvor forventningen
 * er størst. VI ser den altid, ellers var der ingen steder at sætte linket.
 */
export function sektionerFor(kunde, admin) {
  return SECTIONS.filter(s => s.key !== 'showtime' || admin || showtimeKlar(kunde))
}

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
  // ALLE aktiviteter tæller: har kunden købt en byjagt OG en madaften, skal
  // vi stadig spørge om allergier. Ét spørgsmål for meget er til at leve
  // med; en madaften uden allergier er ikke.
  const navne = aktiviteterFor(kunde).map(a => a.navn).join(' ').toLowerCase()
  return navne.includes('teamtaste') ? 'taste' : 'track'
}

const INFO_FIELDS = [
  { key: 'deltagere', label: 'Endeligt antal deltagere', type: 'text', ph: 'fx 48',
    hint: 'Vi låser tallet 5 dage før — små ændringer klarer vi på dagen.' },
  // TO valg, ikke tre. Det tredje (»I må gerne inddele os«) var i praksis
  // det samme som det andet, og et valg, man skal tænke over, er ét valg
  // for meget på en formular, folk udfylder på en telefon.
  { key: 'hold', label: 'Teaminddeling', kort: 'Teams', type: 'select',
    options: ['Vi blander selv teams', 'TeamBattle blander på dagen'],
    hint: 'Et team er altid 4 personer, hvis ikke andet er aftalt. Blander I selv, sender vi en teamliste, I kan udfylde.' },
  // Stedet er ét spørgsmål, ikke fem: enten et af vores steder, eller jeres
  // eget — og vælger I jeres eget, skal vi vide hvordan vi kommer ind.
  { key: 'sted', label: 'Hvor skal det foregå?', type: 'venue' },
  // KUN når det er kundens eget sted. Er eventet på et af vores venues,
  // står forholdene i venue-systemet — og dét svar er rigtigere end et,
  // kunden gætter sig til om et sted, de også selv er gæst på.
  { key: 'logistik', label: 'Særlige forhold ved ankomst til location?', type: 'textarea',
    // Kort form til printarket: dér er der to smalle spalter, og et langt
    // spørgsmål presser svaret ned i en ny linje — og arket over én side.
    kort: 'Særlige forhold', kunEgetSted: true,
    ph: 'Fx varer der skal køres ind, en elevator der er i stykker, en trappe uden gelænder, larm fra et andet møde',
    hint: 'Alt hvad der er værd at vide, før vi står der med udstyret.' },
  { key: 'ankomst', label: 'Hvornår er I fremme?', kort: 'I er fremme', type: 'text', ph: 'fx 12.45',
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
  const k = kunde || {}
  // Er stedet et af VORES venues — sat af os eller valgt af kunden dengang
  // de kunne — så kommer ankomstforholdene derfra.
  const påVoresVenue = !!(k.venueId || (k.info && k.info.sted && k.info.sted.venueId))
  return INFO_FIELDS
    .filter(f => !f.produkt || f.produkt === produkt)
    .filter(f => !f.kunEgetSted || !påVoresVenue)
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
export function feltUdfyldt(felt, værdi, kunde) {
  if (felt.type === 'venue') {
    const v = værdi || {}
    if (v.valg === 'vores') return !!v.venueId
    if (v.valg === 'egen') return !!(v.adresse && String(v.adresse).trim())
    // HAR VI SELV SAT STEDET, er spørgsmålet besvaret. Kunden skal ikke
    // udfylde noget, vi allerede ved — og de skal slet ikke se et
    // »mangler«-mærke for det.
    return !!(kunde && String(kunde.sted || '').trim())
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
  return infoFieldsFor(kunde).filter(f => feltUdfyldt(f, info[f.key], kunde)).length
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
  beskrivelse: 'Et team-mod-team løb gennem Aarhus midtby. I får hver en tablet, en rute og 22 opgaver undervejs — fotoopgaver, gåder og små udfordringer, der kræver at I taler sammen. Der er ingen fysiske krav ud over almindelig gang.',
  inkluderet: ['22 opgaver', 'Tablets til alle teams', 'Gamemaster på ruten', 'Resultatshow til sidst', 'Billeder dagen efter'],
  gamemaster: { navn: 'Kasper Lund', rolle: 'Gamemaster på jeres event', telefon: '40 27 40 27', email: 'kasper@eventday.dk' },
  eventplanner: { navn: 'Maria Lund', mail: 'maria@eventday.dk', tlf: '28 55 12 04' },
  leadInstruktor: { navn: 'Kasper Lund', mail: 'kasper@eventday.dk', tlf: '40 27 40 27' },
  program: [
    { tid: '12.15', titel: 'Vi rigger op', note: 'I skal ikke være der endnu' },
    { tid: '13.00', titel: 'Velkomst og teaminddeling', note: 'Ved trappen foran Dokk1' },
    { tid: '13.20', titel: 'Byjagten går i gang', note: 'Teamene sendes af sted med hver sin startopgave' },
    { tid: '15.45', titel: 'Alle teams tilbage', note: 'Sidste opgave lukker præcis 15.45' },
    { tid: '16.00', titel: 'Resultatshow og præmie', note: 'Ca. 20 minutter' },
    { tid: '16.30', titel: 'Tak for i dag', note: '' },
  ],
  info: {},
}

/** En ny, tom kunde. Felterne findes fra dag ét, så portalen aldrig render
 *  på undefined — den viser bare »ikke sat endnu«. */
export function tomKunde(felter) {
  return {
    firma: '', kontakt: '', email: '', telefon: '', logoUrl: '',
    aktivitetId: '', aktivitetNavn: '', aktiviteter: [], showtimes: [], grupper: [],
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
