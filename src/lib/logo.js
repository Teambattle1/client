import { supabase, erKoblet } from './supabase'

/**
 * Kundens logo.
 *
 * DET BØR FINDES I FORVEJEN. Firmaet ligger som regel allerede i EventFlow
 * med et logo på (`ef_clients.logo_url`) — det er dét, vi leder efter først,
 * så det samme logo står på tilbuddet og på portalen. Findes det ikke,
 * gætter vi på et par almindelige kilder, og ellers kan man lægge en fil op.
 *
 * ADGANG: der læses KUN `firma` og `logo_url`. Kunde-tabellen i EventFlow
 * indeholder også CVR, betalingsoplysninger, EAN og fakturamails — den
 * kolonneliste må ALDRIG udvides herfra. Samme regel som i crew.js.
 */

const BUCKET = 'ef-logos'
const MAKS_FIL = 4 * 1024 * 1024   // 4 MB ind
const MAKS_KANT = 320              // px ud — logoet vises aldrig større

/** »Nordisk Revision A/S« → »nordiskrevision«. Bruges kun til at gætte. */
export function gætDomæne(firma) {
  return String(firma || '')
    .toLowerCase()
    .replace(/\b(a\/s|aps|i\/s|k\/s|ivs|as|ab|gmbh|ltd|inc|holding|group|danmark|denmark)\b/g, '')
    .replace(/[^a-z0-9æøå]/g, '')
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .slice(0, 30)
}

/**
 * Har vi allerede et logo på firmaet? Svarer null, hvis vi ikke har.
 *
 * Fejler opslaget (ingen adgang, intet net), svarer den også null — et
 * manglende logo må aldrig stoppe en kundeoprettelse.
 */
export async function findKendtLogo(firma) {
  const navn = String(firma || '').trim()
  if (!erKoblet || navn.length < 2) return null
  try {
    const { data } = await supabase
      .from('ef_clients')
      .select('firma, logo_url')
      .ilike('firma', `%${navn.split(' ')[0]}%`)
      .not('logo_url', 'is', null)
      .limit(3)
    const træf = (data || []).find(c => c.logo_url)
    return træf ? { url: træf.logo_url, navn: træf.firma, kilde: 'EventFlow' } : null
  } catch {
    return null
  }
}

/**
 * Forslag til et logo, bedst først.
 *
 * De to første kilder er VORES egne (EventFlow-kunden og mødedatabasen);
 * resten er gæt ud fra firmanavnet, som man selv skal kigge på, før man
 * vælger. Et gæt der rammer ved siden af er tydeligt — det er et fremmed
 * firmas mærke — så det er sikkert at vise dem.
 */
export async function søgLogoer(firma) {
  const navn = String(firma || '').trim()
  if (navn.length < 2) return []
  const forslag = []

  const kendt = await findKendtLogo(navn)
  if (kendt) forslag.push(kendt)

  if (erKoblet) {
    try {
      const { data } = await supabase
        .from('meet_companies')
        .select('company_name, logo_url')
        .ilike('company_name', `%${navn.split(' ')[0]}%`)
        .not('logo_url', 'is', null)
        .limit(3)
      for (const c of data || []) {
        if (c.logo_url && !forslag.some(f => f.url === c.logo_url)) {
          forslag.push({ url: c.logo_url, navn: c.company_name, kilde: 'Firmabasen' })
        }
      }
    } catch { /* tabellen findes måske ikke — så er der bare færre forslag */ }
  }

  const d = gætDomæne(navn)
  if (d.length >= 3) {
    for (const tld of ['dk', 'com']) {
      forslag.push({ url: `https://logo.clearbit.com/${d}.${tld}`, navn: `${d}.${tld}`, kilde: 'Gæt' })
    }
    forslag.push({ url: `https://icon.horse/icon/${d}.dk`, navn: `${d}.dk`, kilde: 'Gæt' })
  }
  return forslag
}

/**
 * Skalér ned til noget, der kan bæres rundt.
 *
 * Et logo vises aldrig større end et par hundrede pixels i portalen, men
 * filen man får tilsendt er tit 2000 px fra et pressekit. Nedskaleringen
 * sker FØR alt andet, så både uploaden og nødløsningen nedenfor arbejder
 * på noget lille. PNG bevares (logoer har gennemsigtig baggrund).
 */
export function skalérBillede(fil, maksKant = MAKS_KANT) {
  return new Promise((klar, fejl) => {
    const læser = new FileReader()
    læser.onerror = () => fejl(new Error('Filen kunne ikke læses'))
    læser.onload = () => {
      const img = new Image()
      img.onerror = () => fejl(new Error('Filen er ikke et billede'))
      img.onload = () => {
        const skala = Math.min(1, maksKant / Math.max(img.width, img.height))
        const b = Math.max(1, Math.round(img.width * skala))
        const h = Math.max(1, Math.round(img.height * skala))
        const c = document.createElement('canvas')
        c.width = b; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, b, h)
        c.toBlob(blob => blob ? klar({ blob, dataUrl: c.toDataURL('image/png') })
                              : fejl(new Error('Billedet kunne ikke omdannes')), 'image/png')
      }
      img.src = String(læser.result)
    }
    læser.readAsDataURL(fil)
  })
}

/**
 * Læg et logo op og få en adresse tilbage.
 *
 * Først forsøges den fælles logo-spand, så logoet ligger samme sted som
 * alle andres. Kan den ikke skrives til herfra, gemmes billedet i stedet
 * MED kunden som en indlejret adresse. Det er derfor nedskaleringen ikke er
 * valgfri: en nedskaleret PNG er små tyve kilobyte, og det kan en kunderække
 * bære — en rå fil på to megabyte kan den ikke.
 */
export async function lægLogoOp(fil, kode) {
  if (!fil) throw new Error('Ingen fil valgt')
  if (!/^image\//.test(fil.type)) throw new Error('Vælg en billedfil — PNG, JPG eller SVG')
  if (fil.size > MAKS_FIL) throw new Error('Filen er for stor. Vælg en under 4 MB')

  const { blob, dataUrl } = await skalérBillede(fil)

  if (erKoblet) {
    try {
      const sti = `client-portal/${kode || 'ny'}-${Date.now()}.png`
      const { error } = await supabase.storage.from(BUCKET).upload(sti, blob, {
        contentType: 'image/png', upsert: true,
      })
      if (!error) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(sti)
        if (data?.publicUrl) return { url: data.publicUrl, gemt: 'spand' }
      }
    } catch { /* falder igennem til nødløsningen nedenfor */ }
  }
  return { url: dataUrl, gemt: 'kunden' }
}
