/**
 * Adressesøgning — samme kilder som venue-repoet bruger, og bevidst de
 * samme: begge steder skal genkende den samme adresse på den samme måde.
 *
 * DAWA (dawa.aws.dk) er Danmarks officielle adresseregister. Gratis, med
 * CORS slået til, så browseren kan spørge direkte — ingen nøgle, ingen
 * server imellem. Photon (photon.komoot.io) tager udlandet, så et event i
 * Malmö eller Hamborg også kan slås op.
 *
 * Et forslag UDEN brugbare koordinater smides væk. Uden det ville Number('')
 * blive til 0 og sende kortet ud i Atlanterhavet — eller NaN og gøre det helt
 * blankt. Adressen skal kunne PLACERES, ellers er den ikke et svar.
 */

const DAWA_URL = 'https://dawa.aws.dk/adgangsadresser/autocomplete'
const PHOTON_URL = 'https://photon.komoot.io/api/'

function brugbar(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)
}

function fraDawa(item) {
  const a = item && item.adgangsadresse
  if (!a) return null
  const lat = Number(a.y)
  const lon = Number(a.x)
  if (!brugbar(lat, lon)) return null
  return {
    tekst: item.tekst || '',
    postnr: a.postnr || '',
    by: a.postnrnavn || '',
    lat, lon,
    land: 'DK',
  }
}

function fraPhoton(f) {
  const c = f && f.geometry && f.geometry.coordinates
  const p = (f && f.properties) || {}
  if (!Array.isArray(c)) return null
  const lat = Number(c[1])
  const lon = Number(c[0])
  if (!brugbar(lat, lon)) return null
  const linje = [
    [p.name, p.housenumber].filter(Boolean).join(' '),
    [p.postcode, p.city].filter(Boolean).join(' '),
    p.country,
  ].filter(Boolean).join(', ')
  return {
    tekst: linje,
    postnr: p.postcode || '',
    by: p.city || '',
    lat, lon,
    land: p.countrycode || '',
  }
}

/**
 * Slå en adresse op. Svarer ALTID med en liste — også en tom.
 *
 * Et opslag der fejler (intet net på et spillested, tjenesten nede) må ikke
 * kaste: kunden er midt i at udfylde en formular, og en fejl her ville
 * blokere resten af den. De får bare ingen forslag og kan skrive videre.
 */
export async function søgAdresse(tekst, signal) {
  const q = String(tekst || '').trim()
  if (q.length < 3) return []

  const svar = []
  try {
    const r = await fetch(`${DAWA_URL}?q=${encodeURIComponent(q)}&per_side=6`, { signal })
    if (r.ok) {
      const data = await r.json()
      if (Array.isArray(data)) svar.push(...data.map(fraDawa).filter(Boolean))
    }
  } catch { /* dansk opslag fejlede — prøv udlandet */ }

  if (svar.length >= 4) return svar.slice(0, 6)

  try {
    const r = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=5&lang=en`, { signal })
    if (r.ok) {
      const data = await r.json()
      const flere = (data && Array.isArray(data.features) ? data.features : [])
        .map(fraPhoton).filter(Boolean)
      // Dubletter på tværs af de to kilder ser dumme ud i en kort liste.
      for (const f of flere) {
        if (!svar.some(s => s.tekst === f.tekst)) svar.push(f)
      }
    }
  } catch { /* også udlandet fejlede — ingen forslag, ingen fejl */ }

  return svar.slice(0, 6)
}
