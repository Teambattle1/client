import { supabase, erKoblet } from './supabase'

/**
 * Vores aktiviteter — `ef_activities`, samme tabel som EventFlow bygger
 * tilbud af, i samme database. Portalen LÆSER kun; kataloget vedligeholdes
 * ét sted, i EventFlows indstillinger.
 *
 * TRE AF RÆKKERNE ER IKKE AKTIVITETER. »Miljøtillæg«, »Projektledelse« og
 * »Transport & logistik« ligger i samme tabel, fordi de er linjer på et
 * tilbud — men de er ikke noget, et hold skal LAVE. De bærer kategorien 't'
 * (tillæg), og dem filtrerer vi fra: en kunde der åbner sin portal og læser
 * at de skal lave »Miljøtillæg« har fået et kig ind i vores fakturering.
 */
const TILLÆG = 't'

export async function hentAktiviteter() {
  if (!erKoblet) return []
  const { data, error } = await supabase
    .from('ef_activities')
    .select('id, name, category, short_description, long_description, cover_image_url, gallery_images, duration_minutes, setup_minutes, activity_minutes, teardown_minutes, min_participants, max_participants, venue_requirements, external_pdf_url, video_url, color')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data || []).filter(a => a && a.name && a.category !== TILLÆG)
}

/** Én aktivitet. null = findes ikke; kaster ved fejl — samme skel som resten. */
export async function hentAktivitet(id) {
  if (!erKoblet || !id) return null
  const { data, error } = await supabase
    .from('ef_activities')
    .select('id, name, category, short_description, long_description, cover_image_url, gallery_images, duration_minutes, setup_minutes, activity_minutes, teardown_minutes, min_participants, max_participants, venue_requirements, external_pdf_url, video_url, color')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

/**
 * Teksten kunden skal læse.
 *
 * `short_description` er i praksis »TeamChallenge fra OCC« — en note fra da
 * kataloget blev importeret, ikke noget en kunde skal møde. Den bruges
 * derfor ALDRIG. Findes der ingen rigtig beskrivelse, bruger vi den vi selv
 * skrev på kunden; findes heller ikke den, siger vi det ærligt.
 */
export function aktivitetTekst(aktivitet, kundensEgen) {
  // Kundens egen tekst vinder: den er en kopi af grundteksten, som nogen
  // har rettet til netop denne dag. Grundteksten er dét, alle andre ser.
  const egen = String(kundensEgen || '').trim()
  if (egen) return egen
  return grundtekst(aktivitet)
}

/** Grundteksten fra EventFlows katalog — den alle kunder ser, indtil de får
 *  deres egen. `short_description` bruges ALDRIG (se ovenfor). */
export function grundtekst(aktivitet) {
  return String((aktivitet && aktivitet.long_description) || '').trim()
}

/**
 * Ret grundteksten — for ALLE kunder, og i EventFlows eget katalog.
 *
 * Det er samme række, tilbudsbyggeren læser af, så det er en beslutning,
 * ikke en rettelse til én dag. Skal teksten kun ændres for én kunde,
 * kopieres den over på kunden i stedet.
 */
export async function gemGrundtekst(id, tekst) {
  if (!erKoblet) throw new Error('Der er ingen database koblet på.')
  const { error } = await supabase
    .from('ef_activities')
    .update({ long_description: String(tekst || '').trim() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Dagens rammer fra EventFlows tidslinjeskabelon.
 *
 * Skabelonen »TeamBattle Standard« har én række pr. fast punkt på dagen
 * (opsætning, velkomst, kåring …) med minutter på. Vi læser tallene, ikke
 * rækkerne: det er OS der bestemmer, hvad kunden ser, men det er
 * skabelonen der bestemmer, hvor lang tid tingene tager. Svarer altid —
 * kan den ikke hentes, gælder standardtallene.
 */
export async function hentTidslinjeRammer() {
  if (!erKoblet) return {}
  try {
    const { data, error } = await supabase
      .from('ef_timeline_templates')
      .select('name, items')
      .order('created_at', { ascending: true })
      .limit(10)
    if (error || !data || !data.length) return {}
    const skabelon = data.find(t => /standard/i.test(t.name || '')) || data[0]
    const items = Array.isArray(skabelon.items) ? skabelon.items : []
    const minutter = mønster => {
      const r = items.find(x => (x.tags || []).some(t => mønster.test(String(t))) || mønster.test(String(x.name || '')))
      const m = Number(r && r.duration_minutes)
      return Number.isFinite(m) && m > 0 ? m : undefined
    }
    const ud = {
      opsætning: minutter(/ops[æa]tning/i),
      velkomst: minutter(/velkomst|briefing/i),
      kåring: minutter(/k[åa]ring|afslutning/i),
    }
    return Object.fromEntries(Object.entries(ud).filter(([, v]) => v !== undefined))
  } catch {
    return {}
  }
}

/** »2 timer 15 min« — minutter er en oplysning til os, ikke til kunden. */
export function varighed(minutter) {
  const m = Number(minutter)
  if (!Number.isFinite(m) || m <= 0) return ''
  const t = Math.floor(m / 60)
  const rest = m % 60
  if (!t) return `${rest} min`
  if (!rest) return t === 1 ? '1 time' : `${t} timer`
  return `${t === 1 ? '1 time' : `${t} timer`} ${rest} min`
}
