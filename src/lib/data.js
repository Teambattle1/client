import { supabase, erKoblet } from './supabase'
import { DEMO, tomKunde } from './model'

/* ---------------------------------------------------------------
   Ét datalag. Ingen komponent taler med databasen selv.

   To drivere:
   - er der en database, går alt gennem funktioner i databasen, så
     browseren aldrig kan hente hele kundelisten uden admin-koden
   - er der ingen, kører appen i demo-tilstand: den husker i browseren
     og kender kun eksempelkunden

   VIGTIGT om fejl: »findes ikke« og »kunne ikke læses« er IKKE det samme.
   Et opslag der ikke findes svarer null; går noget galt, kaster den. Ellers
   ville en dårlig forbindelse se ud som en forkert kode, og kunden ville
   lede efter en tastefejl der ikke findes.
----------------------------------------------------------------*/

const DEMO_NØGLE = 'ed_portal_demo'
const DEMO_ADMIN = import.meta.env.VITE_ADMIN_CODE || '100408'

export const demoTilstand = !erKoblet

/* ---------- demo-lager ---------- */
function demoLæs() {
  try {
    const rå = localStorage.getItem(DEMO_NØGLE)
    return rå ? JSON.parse(rå) : {}
  } catch { return {} }
}
function demoSkriv(alle) {
  try { localStorage.setItem(DEMO_NØGLE, JSON.stringify(alle)) } catch { /* privat vindue */ }
}

/* ---------- koder ---------- */
/** Seks cifre. Aldrig admin-koden, og aldrig en der allerede er i brug. */
export function nyKode(optaget = []) {
  const brugt = new Set([...optaget, DEMO_ADMIN])
  for (let i = 0; i < 200; i++) {
    const k = String(Math.floor(100000 + Math.random() * 900000))
    if (!brugt.has(k)) return k
  }
  return null
}

export function erKodeFormat(k) {
  return /^[0-9]{6}$/.test(String(k || '').trim())
}

/* ---------- kunden ---------- */

/** Hent én kunde ud fra koden. null = koden findes ikke. Kaster ved fejl. */
export async function hentKunde(code) {
  if (!erKodeFormat(code)) return null
  // Eksempelkunden bor i koden, men det VI retter på den (showtime-linket,
  // vores folk) lægger sig oven på i browserens lager — ellers kunne den
  // ikke bruges til at vise, hvordan en rettelse ser ud.
  if (code === DEMO.code) {
    const gemt = demoLæs()[DEMO.code] || {}
    return { ...DEMO, ...gemt, code: DEMO.code, demo: true, info: { ...(gemt.info || {}) } }
  }

  if (demoTilstand) {
    return demoLæs()[code] || null
  }
  const { data, error } = await supabase.rpc('portal_client_by_code', { p_code: code })
  if (error) throw new Error(error.message)
  return data || null
}

/** Gem det kunden selv har udfyldt. */
export async function gemInfo(code, info) {
  if (demoTilstand || code === DEMO.code) {
    const alle = demoLæs()
    alle[code] = { ...(alle[code] || {}), info }
    demoSkriv(alle)
    return
  }
  const { error } = await supabase.rpc('portal_save_info', { p_code: code, p_info: info })
  if (error) throw new Error(error.message)
}

/* ---------- admin ---------- */

/** Er det her admin-koden? I drift afgøres det i databasen, ikke i browseren. */
export async function tjekAdminKode(code) {
  if (!erKodeFormat(code)) return false
  if (demoTilstand) return code === DEMO_ADMIN
  const { data, error } = await supabase.rpc('portal_admin_check', { p_code: code })
  if (error) throw new Error(error.message)
  return data === true
}

/** Hele kundelisten. Kræver admin-koden — også i databasen. */
export async function hentKunder(adminKode) {
  if (demoTilstand) {
    const alle = demoLæs()
    return Object.values(alle)
      .filter(k => k && k.firma)
      .sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')))
  }
  const { data, error } = await supabase.rpc('portal_admin_list', { p_code: adminKode })
  if (error) throw new Error(error.message)
  return Array.isArray(data) ? data : []
}

/**
 * Ret de felter der er VORES — ikke kundens egne svar.
 *
 * Kræver adminkoden, og databasen håndhæver selv hvilke felter der må røres
 * (se migration 002). Kunden kan altså ikke skrive en anden instruktør på
 * deres eget event, uanset hvad browseren sender.
 */
export async function opdaterKunde(adminKode, code, patch) {
  if (demoTilstand || code === DEMO.code) {
    const alle = demoLæs()
    if (!alle[code] && code !== DEMO.code) throw new Error('Kunden findes ikke')
    alle[code] = { ...(alle[code] || {}), ...patch }
    demoSkriv(alle)
    return code === DEMO.code
      ? { ...DEMO, ...alle[code], code: DEMO.code, demo: true, info: { ...(alle[code].info || {}) } }
      : alle[code]
  }
  const { data, error } = await supabase.rpc('portal_admin_update', {
    p_code: code, p_admin: adminKode, p_patch: patch,
  })
  if (error) throw new Error(error.message)
  return data
}

/** Opret en kunde og giv den en kode. Returnerer kunden med koden på. */
export async function opretKunde(adminKode, felter) {
  if (demoTilstand) {
    const alle = demoLæs()
    const kode = nyKode(Object.keys(alle))
    if (!kode) throw new Error('Kunne ikke finde en ledig kode')
    const kunde = tomKunde({ ...felter, code: kode })
    alle[kode] = kunde
    demoSkriv(alle)
    return kunde
  }
  const { data, error } = await supabase.rpc('portal_admin_create', {
    p_code: adminKode,
    p_payload: tomKunde(felter),
  })
  if (error) throw new Error(error.message)
  return data
}
