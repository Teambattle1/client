import { supabase, erKoblet } from './supabase'

/**
 * Vores egne folk — `employees`, samme tabel som crew-systemet bruger.
 *
 * VI HENTER KUN FIRE FELTER. Rækken indeholder også fødselsdato, tøjstørrelse,
 * kørekortbilleder, lønniveau og mere af den slags. Intet af det har en kunde
 * noget at gøre med, og det skal derfor ikke hentes ned i deres browser —
 * heller ikke »bare for at have det«. Udvid aldrig denne select uden at have
 * en grund, en kunde ville kunne læse højt.
 */
export async function hentMedarbejdere() {
  if (!erKoblet) return []
  const { data, error } = await supabase
    .from('employees')
    .select('id, navn, email, telefon')
    .eq('status', 'aktiv')
    .order('navn', { ascending: true })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data || []).filter(m => m && m.navn)
}

/**
 * De to der plejer at være eventplanner, øverst i listen.
 *
 * Det er en GENVEJ, ikke en begrænsning: hele holdet står stadig nedenunder.
 * `role`-kolonnen er tom på alle 23 rækker, så der er ikke andet at sortere
 * efter endnu. Bliver rollerne udfyldt i crew-systemet, skal den her liste
 * væk og erstattes af et filter på rollen.
 */
export const TYPISKE_PLANNERE = ['Maria Lund', 'Thomas Sunke']

/** Del listen i »dem det plejer at være« og »alle andre«. */
export function planlæggerGrupper(medarbejdere) {
  const typiske = TYPISKE_PLANNERE
    .map(n => medarbejdere.find(m => m.navn === n))
    .filter(Boolean)
  const øvrige = medarbejdere.filter(m => !TYPISKE_PLANNERE.includes(m.navn))
  return { typiske, øvrige }
}

/** Én person som den gemmes på kunden — navn, mail og nummer, intet andet. */
export function somKontakt(m) {
  if (!m) return null
  return {
    id: m.id,
    navn: m.navn || '',
    mail: m.email || '',
    tlf: m.telefon || '',
  }
}
