/**
 * Showtime — billederne og resultatlisten fra dagen.
 *
 * Vi bygger den IKKE her. Den findes allerede i de apps, der afvikler
 * eventet (track, play, taste), og hver af dem laver sin egen showtime-side
 * med sine egne billeder og sin egen ranking. Portalen gør ét: gemmer
 * linket til netop dette events showtime og viser det indlejret, så kunden
 * bliver på sin egen side i stedet for at blive sendt et fremmed sted hen.
 *
 * Linket sættes af OS. Kunden kan hverken skrive eller ændre det — derfor
 * står det i hvidlisten i migration 003 og ikke i kundens egne svar.
 */

/** Vores egne apps. Et link herfra kan indlejres; alt andet er en gæt. */
const VORES_VÆRTER = [
  /(^|\.)eventday\.dk$/i,
  /(^|\.)teambattle\.dk$/i,
]

/**
 * Rens et indtastet link.
 *
 * Returnerer en https-adresse, eller null hvis den ikke kan bruges.
 *
 * To ting gøres med vilje:
 *  · en adresse UDEN protokol får https:// på — man skriver
 *    »play.eventday.dk/showtime/abc« når man kopierer fra en besked, og
 *    det skal ikke være en fejl
 *  · alt andet end http/https afvises. Et `javascript:`-link i et felt der
 *    senere bliver til en knap, er den klassiske vej ind i en side — og
 *    feltet her ender begge steder: i en iframe OG i et delelink.
 */
export function rensShowtimeUrl(tekst) {
  const rå = String(tekst ?? '').trim()
  if (!rå) return null
  const medProtokol = /^[a-z][a-z0-9+.-]*:/i.test(rå) ? rå : 'https://' + rå
  let u
  try { u = new URL(medProtokol) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (!u.hostname || !u.hostname.includes('.')) return null
  // http bliver til https: alle vores flader kører på https, og en
  // http-side kan alligevel ikke indlejres i en https-side.
  u.protocol = 'https:'
  return u.toString()
}

/** Er linket til en af vores egne flader? Bruges KUN til at advare os selv. */
export function erVoresLink(url) {
  try { return VORES_VÆRTER.some(m => m.test(new URL(url).hostname)) } catch { return false }
}

/** Linket som det skal bruges — eller null, hvis der ikke er et brugbart. */
export function showtimeUrl(kunde) {
  return rensShowtimeUrl(kunde && kunde.showtimeUrl)
}

/**
 * Må KUNDEN se showtime?
 *
 * To ting skal være sande, og de er bevidst adskilt: der skal være et link,
 * OG vi skal have tændt for det. Billederne er ofte klar før vi har set dem
 * igennem, og en knap der åbner et halvfærdigt show er værre end ingen knap.
 */
export function showtimeKlar(kunde) {
  return !!(kunde && kunde.showtimeAktiv && showtimeUrl(kunde))
}

/** Hvad der står under knappen. Kunden ser kun den ene tilstand. */
export function showtimeStatus(kunde, admin) {
  if (showtimeKlar(kunde)) return admin ? 'Vist for kunden' : 'Billeder og resultater'
  if (!admin) return ''
  return showtimeUrl(kunde) ? 'Link sat · skjult for kunden' : 'Intet link endnu'
}
