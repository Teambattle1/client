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

export async function hentVenues({ alle = false } = {}) {
  if (!erKoblet) return []
  let q = supabase
    .from('locations')
    .select('id, name, address, postal_code, city, lat, lon, contacts, venue_type, logo_url, crm_status')
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
    .select('id, name, address, postal_code, city, lat, lon, contacts, logo_url')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}
