import { supabase, erKoblet } from './supabase'

/**
 * Vores egne steder — samme `locations`-tabel som venue.eventday.dk skriver
 * i, samme database. Portalen LÆSER kun; stederne vedligeholdes ét sted.
 *
 * KUN aktive steder vises kunden. Tabellen er også et CRM: af 112 rækker er
 * 100 »lead« — steder vi er i gang med at få en aftale med — og én er
 * »dormant«. Dem må en kunde ikke se: en liste over hvem vi forhandler med
 * er vores, ikke deres, og et sted vi ikke har en aftale med kan de ikke
 * bestille. Skal et sted kunne vælges, skal det sættes aktivt i venue-appen.
 */

/** Rækkefølgen betyder noget: den første der passer, er den vi viser. */
const KONFERENCE_TITLER = [/konference/i, /booking/i, /salg/i, /koordinator/i, /prim/i]

/** De kolonner portalen bruger — læses OG skrives. Alt andet i tabellen
 *  (CRM-noter, afstande, scanningsregler) er venue-appens og rører vi ikke. */
const VENUE_KOLONNER = 'id, name, address, postal_code, city, lat, lon, contacts, venue_type, logo_url, crm_status, adgang_note, phone, website'

/** Status som den siges højt. »rejected« vises aldrig — de er ikke et sted. */
export const STATUS_TEKST = { active: 'Aktiv', lead: 'På vej', dormant: 'Hvilende', rejected: 'Sagt nej' }
export const STATUS_VALG = ['active', 'lead', 'dormant']

export async function hentVenues({ alle = false } = {}) {
  if (!erKoblet) return []
  let q = supabase
    .from('locations')
    .select(VENUE_KOLONNER)
  // Kunden ser KUN de aktive. Vi ser også dem, der er på vej — men aldrig
  // dem, der er sagt nej til; de er ikke et sted, nogen skal vælge.
  if (alle) q = q.neq('crm_status', 'rejected')
  else q = q.eq('crm_status', 'active')
  const { data, error } = await q.order('name', { ascending: true }).limit(400)
  if (error) throw new Error(error.message)
  return (data || []).filter(v => v && v.name)
}

/** Er stedet klar til at blive brugt? Alt andet end »active« mangler noget. */
export function erAktiv(v) {
  return !!v && v.crm_status === 'active'
}

/**
 * Direkte hen til stedet i venue-systemet, hvor det kan gøres færdigt.
 * Ruten er `/i/:locationId` — instruktørmodulet for netop det sted.
 */
export function venueRedigerUrl(id) {
  return `https://venue.eventday.dk/i/${encodeURIComponent(id || '')}`
}

/** Adressen som én linje, uanset hvor pænt rækken er udfyldt. */
export function venueAdresse(v) {
  if (!v) return ''
  const post = [v.postal_code, v.city].filter(Boolean).join(' ')
  // Nogle rækker har hele adressen i ét felt, andre har den delt op.
  const adr = String(v.address || '').trim()
  if (!post || adr.includes(post)) return adr
  return [adr, post].filter(Boolean).join(', ')
}

/**
 * Stedets konferencekonsulent — den kunden må se.
 *
 * Vi viser ÉN, ikke hele huset: kunden skal ikke selv sortere i fire
 * kontakter, og det er alligevel os der tager fat i dem. Findes ingen med
 * en genkendelig titel, tages den første med en mail eller et nummer —
 * en kontakt uden begge dele er ikke en kontakt, man kan bruge til noget.
 */
export function konferenceKontakt(v) {
  const alle = (v && Array.isArray(v.contacts) ? v.contacts : [])
    .filter(c => c && c.name && (c.email || c.mobile))
  if (!alle.length) return null
  for (const mønster of KONFERENCE_TITLER) {
    const fundet = alle.find(c => mønster.test(String(c.title || '')))
    if (fundet) return fundet
  }
  return alle[0]
}

/** Ét sted, til Location-arket. Svarer null hvis det ikke findes; kaster ved fejl
 *  — samme skel som resten af datalaget, så »ikke fundet« og »kunne ikke læses«
 *  ikke bliver til den samme tomme skærm. */
export async function hentVenue(id) {
  if (!erKoblet || !id) return null
  const { data, error } = await supabase
    .from('locations')
    .select(VENUE_KOLONNER)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

/**
 * Stedets egen besked om ankomst — skrevet af dem, der kender stedet.
 *
 * Er eventet på et af VORES steder, skal kunden ikke svare på, hvordan man
 * kommer ind: det står i venue-systemet, og dét svar er rigtigere end et,
 * kunden gætter sig til om et sted, de også selv er gæst på.
 */
export function ankomstNote(venue) {
  return String((venue && venue.adgang_note) || '').trim()
}

/**
 * Find de steder der passer på det, man er ved at skrive.
 *
 * Kører i browseren på den liste vi allerede har hentet: der er godt hundrede
 * steder, og et opslag pr. tastetryk mod databasen ville være langsommere
 * end at kigge dem igennem her. Navne der BEGYNDER med ordet står først —
 * skriver man »hara«, er det Haraldskær man leder efter, ikke et sted hvor
 * ordet tilfældigvis står i adressen.
 */
export function matchVenues(liste, tekst, max = 5) {
  const q = String(tekst || '').toLowerCase().trim()
  if (q.length < 2) return []
  const først = [], siden = []
  for (const v of liste || []) {
    const navn = String(v.name || '').toLowerCase()
    if (navn.startsWith(q)) først.push(v)
    else if (navn.includes(q) || venueAdresse(v).toLowerCase().includes(q)) siden.push(v)
    if (først.length >= max) break
  }
  return [...først, ...siden].slice(0, max)
}

/** Kun dét portalen må rette. Sendes hele tabellen ind, går kun disse igennem. */
function tilRække(felter) {
  const f = felter || {}
  const tal = x => (x === '' || x == null || !Number.isFinite(Number(x))) ? null : Number(x)
  const ud = {}
  if ('name' in f) ud.name = String(f.name || '').trim()
  if ('address' in f) ud.address = String(f.address || '').trim()
  if ('postal_code' in f) ud.postal_code = String(f.postal_code || '').trim()
  if ('city' in f) ud.city = String(f.city || '').trim()
  if ('lat' in f) ud.lat = tal(f.lat)
  if ('lon' in f) ud.lon = tal(f.lon)
  if ('crm_status' in f) ud.crm_status = STATUS_VALG.includes(f.crm_status) ? f.crm_status : 'lead'
  if ('adgang_note' in f) ud.adgang_note = String(f.adgang_note || '').trim() || null
  if ('phone' in f) ud.phone = String(f.phone || '').trim() || null
  if ('website' in f) ud.website = String(f.website || '').trim() || null
  if ('contacts' in f) ud.contacts = Array.isArray(f.contacts) ? f.contacts : []
  return ud
}

/**
 * Ret et sted — i den SAMME tabel venue-appen bruger, så rettelsen står
 * begge steder med det samme. Svarer med rækken som den ser ud nu.
 */
export async function gemVenue(id, felter) {
  if (!erKoblet) throw new Error('Der er ingen database koblet på — stedet kan ikke gemmes.')
  if (!id) throw new Error('Stedet mangler et id.')
  const række = { ...tilRække(felter), updated_at: new Date().toISOString() }
  if ('name' in række && !række.name) throw new Error('Stedet skal have et navn.')
  const { data, error } = await supabase
    .from('locations')
    .update(række)
    .eq('id', id)
    .select(VENUE_KOLONNER)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/** Opret et nyt sted. Det starter som »på vej«, medmindre man siger andet. */
export async function opretVenue(felter) {
  if (!erKoblet) throw new Error('Der er ingen database koblet på — stedet kan ikke oprettes.')
  const række = { crm_status: 'lead', contacts: [], ...tilRække(felter) }
  if (!række.name) throw new Error('Stedet skal have et navn.')
  const id = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  const { data, error } = await supabase
    .from('locations')
    .insert({ id, ...række })
    .select(VENUE_KOLONNER)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Byt den kontakt kunden ser ud med en rettet udgave — eller læg en ny
 * til, hvis stedet ingen havde. Resten af husets kontakter røres ikke.
 */
export function medKontakt(venue, kontakt) {
  const alle = (venue && Array.isArray(venue.contacts) ? venue.contacts : []).filter(Boolean)
  const k = kontakt || {}
  const tom = !String(k.name || '').trim() && !String(k.email || '').trim() && !String(k.mobile || '').trim()
  const nuværende = konferenceKontakt(venue)
  if (tom) return nuværende ? alle.filter(c => c !== nuværende) : alle
  const ny = {
    ...(nuværende || { id: Math.random().toString(36).slice(2, 21), notes: '' }),
    name: String(k.name || '').trim(),
    title: String(k.title || '').trim() || 'Konference',
    email: String(k.email || '').trim(),
    mobile: String(k.mobile || '').trim(),
  }
  if (!nuværende) return [ny, ...alle]
  return alle.map(c => c === nuværende ? ny : c)
}
