import { supabase, erKoblet } from './supabase'

/**
 * Vores egne folk — `employees`, samme tabel som crew-systemet bruger.
 *
 * KUN TIL OS: listen kræver adminkoden og hentes gennem databasefunktionen
 * `portal_admin_employees` (migration 20261117150000). Tabellen er lukket for
 * den offentlige nøgle; en kunde har heller ikke brug for listen — deres
 * eventplanner og leadinstruktør står allerede på kunderækken.
 *
 * VI FÅR KUN FIRE FELTER (id, navn, email, telefon). Rækken indeholder også
 * fødselsdato, tøjstørrelse, kørekortbilleder, lønniveau og mere af den slags.
 * Funktionen sender aldrig mere — udvid den ikke uden en grund, en kunde
 * ville kunne læse højt.
 */
export async function hentMedarbejdere(adminKode) {
  if (!erKoblet) return []
  const { data, error } = await supabase.rpc('portal_admin_employees', { p_admin: adminKode })
  if (error) throw new Error(error.message)
  return (Array.isArray(data) ? data : []).filter(m => m && m.navn)
}

/**
 * De to der plejer at være eventplanner, øverst i listen.
 *
 * Det er en GENVEJ, ikke en begrænsning: hele listen står stadig nedenunder.
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
