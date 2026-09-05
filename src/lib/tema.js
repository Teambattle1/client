/**
 * Lyst eller mørkt.
 *
 * Udgangspunktet er ALTID enhedens egen indstilling — en telefon der står i
 * mørk tilstand kl. 22 skal ikke blændes af en hvid side, uden at nogen har
 * bedt om det. Først når man trykker på knappen, gemmer vi et valg, og fra
 * da af er dét valget: sætter man siden lys på en telefon i mørk tilstand,
 * er det fordi man MENER det.
 *
 * Selve farverne bor i `globals.css` (`:root[data-theme="dark"]` og en
 * `prefers-color-scheme`-blok for dem, der ikke har valgt). Her flyttes kun
 * ét attribut — der er ingen farver i den her fil, og det skal der blive
 * ved med ikke at være.
 */

export const NØGLE = 'ed_tema'

/** Det gemte valg, eller null hvis enheden stadig bestemmer. */
export function gemtValg(store) {
  try {
    const v = store?.getItem(NØGLE)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    // Privat vindue uden lager: så følger vi enheden. Bedre end at kaste.
    return null
  }
}

export function gemValg(valg, store) {
  try {
    if (valg === 'light' || valg === 'dark') store?.setItem(NØGLE, valg)
    else store?.removeItem(NØGLE)
  } catch { /* privat vindue */ }
}

/** Hvad enheden selv siger. */
export function systemErMørk(win) {
  try { return !!win?.matchMedia?.('(prefers-color-scheme: dark)').matches } catch { return false }
}

/** Det tema der FAKTISK vises — valget hvis der er et, ellers enhedens. */
export function aktivtTema(valg, mørkSystem) {
  if (valg === 'light' || valg === 'dark') return valg
  return mørkSystem ? 'dark' : 'light'
}

/** Trykket på knappen: det modsatte af det, man kigger på lige nu. */
export function næsteValg(valg, mørkSystem) {
  return aktivtTema(valg, mørkSystem) === 'dark' ? 'light' : 'dark'
}

/**
 * Sæt attributtet på <html>.
 *
 * Uden valg FJERNES det — så overtager `prefers-color-scheme` igen, og
 * siden følger enheden, hvis man senere skifter den.
 */
export function anvendTema(valg, doc) {
  const rod = doc?.documentElement
  if (!rod) return
  if (valg === 'light' || valg === 'dark') rod.setAttribute('data-theme', valg)
  else rod.removeAttribute('data-theme')
}
