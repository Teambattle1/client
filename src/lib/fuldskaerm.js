/**
 * Fuld skærm.
 *
 * »Tving det igennem hvis muligt« er browserens beslutning, ikke vores: fuld
 * skærm kræver et TRYK, og tilladelsen udløber få sekunder efter. Vi må godt
 * bede om det lige efter et tryk (turen fra »se showtime« til den her side er
 * inden for vinduet), men vi kan aldrig regne med et ja.
 *
 * Og på en iPhone er svaret altid nej — Safari på telefon har slet ikke fuld
 * skærm for andet end video. Derfor er anbefalingen ikke en trøstepræmie:
 * for en stor del af dem, der åbner showtime, er den DEN eneste vej.
 *
 * Præfikserne er der, fordi den ældre webkit-form stadig er den eneste, der
 * virker i Safari på Mac.
 */

/** Kan browseren overhovedet? Siger den nej, viser vi anbefalingen i stedet. */
export function kanFuldskærm(el, doc) {
  const d = doc || (typeof document === 'undefined' ? null : document)
  if (!d || !el) return false
  if (d.fullscreenEnabled === false && !d.webkitFullscreenEnabled) return false
  return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen)
}

export function erFuldskærm(doc) {
  const d = doc || (typeof document === 'undefined' ? null : document)
  return !!(d && (d.fullscreenElement || d.webkitFullscreenElement))
}

/** Beder om fuld skærm. Svarer true/false — kaster aldrig. */
export async function startFuldskærm(el) {
  try {
    const kald = el?.requestFullscreen || el?.webkitRequestFullscreen || el?.webkitRequestFullScreen
    if (!kald) return false
    await kald.call(el)
    return true
  } catch {
    // Nej fra browseren (ingen tilladelse, ingen understøttelse, brugeren
    // afviste). Det er et forventet svar, ikke en fejl vi skal skrige om.
    return false
  }
}

export async function stopFuldskærm(doc) {
  const d = doc || (typeof document === 'undefined' ? null : document)
  try {
    const kald = d?.exitFullscreen || d?.webkitExitFullscreen
    if (kald) await kald.call(d)
  } catch { /* var der ikke alligevel */ }
}

/** Lyt efter skift — også når brugeren selv trykker Esc. */
export function lytFuldskærm(doc, lyt) {
  const d = doc || (typeof document === 'undefined' ? null : document)
  if (!d) return () => {}
  d.addEventListener('fullscreenchange', lyt)
  d.addEventListener('webkitfullscreenchange', lyt)
  return () => {
    d.removeEventListener('fullscreenchange', lyt)
    d.removeEventListener('webkitfullscreenchange', lyt)
  }
}
