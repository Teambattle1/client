/**
 * CVR-opslag — cvrapi.dk, det åbne register over danske virksomheder.
 *
 * Gratis, uden nøgle, og med CORS slået til, så browseren kan spørge
 * direkte. Svaret bruges kun til at FYLDE felterne ud — kunden kan rette
 * alt bagefter, for registret staver ikke altid som fakturaen skal.
 *
 * Svarer null når nummeret ikke findes eller tjenesten ikke svarer: et
 * opslag der fejler, må ikke stoppe kunden i at skrive det selv.
 */
export async function slåOpCvr(cvr, signal) {
  const rent = String(cvr || '').replace(/\D/g, '')
  if (rent.length !== 8) return null
  try {
    const r = await fetch(`https://cvrapi.dk/api?search=${rent}&country=dk`, { signal })
    if (!r.ok) return null
    const d = await r.json()
    if (!d || d.error || !d.name) return null
    return {
      navn: String(d.name || '').trim(),
      adresse: [d.address, [d.zipcode, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      mail: String(d.email || '').trim(),
    }
  } catch {
    return null
  }
}

/** Har kunden givet os nok til at sende en faktura? */
export function fakturaUdfyldt(f) {
  const x = f && typeof f === 'object' ? f : {}
  return !!(String(x.cvr || '').trim() || String(x.ean || '').trim()) && !!String(x.mail || x.firma || '').trim()
}
