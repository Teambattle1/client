// Rene hjælpefunktioner — ingen React, ingen netværk. Alt hvad der skal
// vises for en kunde formateres HER, så samme tal aldrig ser forskelligt ud
// to steder i appen.

export function danskDato(iso) {
  if (!iso) return 'Dato ikke sat'
  const md = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december']
  const ud = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag']
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d)) return String(iso)
  return `${ud[d.getDay()]} d. ${d.getDate()}. ${md[d.getMonth()]} ${d.getFullYear()}`
}

/** Hele dage til datoen. Negativt = afholdt. null = ingen dato. */
export function dageTil(iso) {
  if (!iso) return null
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d)) return null
  const nu = new Date()
  nu.setHours(12, 0, 0, 0)
  return Math.round((d - nu) / 86400000)
}

export function kr(n) {
  if (n === null || n === undefined || n === '') return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  return v.toLocaleString('da-DK') + ' kr.'
}

export function initialer(s) {
  const dele = String(s || '?').trim().split(/\s+/)
  const a = (dele[0] || '?')[0]
  const b = dele.length > 1 ? dele[dele.length - 1][0] : ''
  return (a + b).toUpperCase()
}

/** Kundens eget link. Bruges både i admin og når linket skal kopieres. */
export function portalLink(code) {
  return `${window.location.origin}/p/${code}`
}
