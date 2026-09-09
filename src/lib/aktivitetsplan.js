/**
 * Flere aktiviteter på ét event — og tidslinjen der får dem til at gå op.
 *
 * DEN NORMALE DAG SER SÅDAN UD: kunden har købt to ting, deltagerne deles i
 * to grupper, og de to aktiviteter kører SAMTIDIG i to omgange — gruppe 1
 * starter på den ene, gruppe 2 på den anden, og efter pausen bytter de.
 * Alle prøver begge dele, og ingen står og venter.
 *
 * En tidslinje med én kolonne kan ikke vise det. Derfor kan en række enten
 * være ÉN ting for alle (velkomst, frokost, præmie) eller en BLOK med et
 * spor pr. gruppe. Ingen af delene er en ny slags tidslinje — en gammel
 * kunde med én aktivitet har kun almindelige rækker og ser præcis ud som før.
 *
 * Alt her er rene funktioner uden React: de skal kunne prøves af, og de
 * bruges både af vores redigering og af kundens visning.
 */

/* ---------- aktiviteter ---------- */

/**
 * Kundens aktiviteter som en LISTE, uanset hvordan de er gemt.
 *
 * De første kunder blev oprettet med ét felt (`aktivitetId`/`aktivitetNavn`),
 * og de rækker ligger i databasen endnu. Resten af appen skal ikke kende to
 * former, så alt går igennem her.
 */
export function aktiviteterFor(kunde) {
  const k = kunde || {}
  if (Array.isArray(k.aktiviteter) && k.aktiviteter.length) {
    return k.aktiviteter.filter(a => a && (a.id || a.navn)).map(renAktivitet)
  }
  if (k.aktivitetId || k.aktivitetNavn) {
    return [renAktivitet({ id: k.aktivitetId, navn: k.aktivitetNavn })]
  }
  return []
}

/** Én aktivitet på den form resten af appen regner med — uanset hvor
 *  lidt der var gemt. Tiderne kommer fra kataloget, når den vælges, og
 *  bliver hos kunden: dagen skal ikke skride, fordi kataloget rettes. */
function renAktivitet(a) {
  const tal = x => (Number.isFinite(Number(x)) && Number(x) > 0) ? Number(x) : null
  return {
    id: String(a.id || ''), navn: String(a.navn || '').trim(),
    miljø: MILJØER.some(m => m.værdi === a.miljø) ? a.miljø : '',
    note: String(a.note || '').trim(),
    tekst: String(a.tekst || ''),
    minutter: tal(a.minutter),
    opsætning: tal(a.opsætning),
  }
}

/**
 * Inde, ude eller begge dele.
 *
 * Det afgør hvad man tager på, og det er det FØRSTE en kunde spørger om,
 * når vejrudsigten ser tvivlsom ud. Der er ingen fjerde mulighed og ingen
 * »ved ikke«: er det ikke sat, står der ingenting, og så er det heller ikke
 * et løfte, vi har givet.
 */
export const MILJØER = [
  { værdi: 'inde',  kort: 'Inde',  lang: 'Indendørs' },
  { værdi: 'ude',   kort: 'Ude',   lang: 'Udendørs' },
  { værdi: 'begge', kort: 'Begge', lang: 'Både inde og ude' },
]

export function miljøTekst(værdi, lang) {
  const m = MILJØER.find(x => x.værdi === værdi)
  return m ? (lang ? m.lang : m.kort) : ''
}

/**
 * Felterne der skal gemmes, når listen ændrer sig.
 *
 * De to gamle felter skrives MED — de bruges stadig af printarket, af
 * spørgsmålene (TeamTaste spørger om allergier) og af enhver anden flade,
 * der endnu ikke er lagt om. Den første aktivitet er den, der repræsenterer
 * eventet, præcis som før.
 */
export function aktivitetsFelter(liste) {
  const rene = (liste || []).filter(a => a && (a.id || a.navn)).map(renAktivitet)
  return {
    aktiviteter: rene,
    aktivitetId: rene[0]?.id || '',
    aktivitetNavn: rene[0]?.navn || '',
  }
}

/** Navnene, som de skrives i en sætning: »TeamRace og TeamTaste«. */
export function aktivitetsNavne(kunde) {
  const navne = aktiviteterFor(kunde).map(a => a.navn).filter(Boolean)
  if (navne.length <= 1) return navne[0] || ''
  return navne.slice(0, -1).join(', ') + ' og ' + navne[navne.length - 1]
}

/**
 * Eventets navn, når ingen har skrevet et selv.
 *
 * Én aktivitet hedder bare det, den hedder. Er der flere, er det ikke en
 * aktivitet længere — det er en dag — og så skal navnet sige begge dele:
 * »Teamdag med TeamRace og TeamTaste«. Det er dét, kunden ser øverst på sin
 * side og i mailen, og det er tit den eneste sætning, der fortæller dem hvad
 * de har købt.
 */
export function standardEventNavn(liste) {
  const navne = (liste || []).map(a => (a?.navn || a?.name || '').trim()).filter(Boolean)
  if (!navne.length) return ''
  if (navne.length === 1) return navne[0]
  const alle = navne.slice(0, -1).join(', ') + ' og ' + navne[navne.length - 1]
  return `Teamdag med ${alle}`
}

/* ---------- showtime pr. aktivitet ---------- */

/**
 * Showtime-linkene som en liste — ét pr. aktivitet.
 *
 * Har kunden kun én aktivitet, er svaret det gamle ene felt. Det er derfor
 * en kunde fra i går ikke mister sit show, fordi vi har lavet listen om.
 */
export function showtimesFor(kunde) {
  const k = kunde || {}
  const akt = aktiviteterFor(k)
  const gemte = Array.isArray(k.showtimes) ? k.showtimes : []

  if (!akt.length) {
    return k.showtimeUrl
      ? [{ aktivitetId: '', navn: 'Showtime', url: k.showtimeUrl, aktiv: !!k.showtimeAktiv }]
      : []
  }

  return akt.map((a, i) => {
    const træf = gemte.find(s => s && String(s.aktivitetId || '') === a.id && a.id) ||
                 (gemte.length === akt.length ? gemte[i] : null)
    // Den FØRSTE aktivitet arver det gamle enkeltfelt, hvis den ikke har sit
    // eget — ellers ville et link, der er sat før i dag, se ud som om det var
    // væk, i det sekund nogen tilføjede aktivitet nummer to.
    const arv = i === 0 && !træf && k.showtimeUrl
      ? { url: k.showtimeUrl, aktiv: !!k.showtimeAktiv } : null
    return {
      aktivitetId: a.id,
      navn: a.navn || 'Showtime',
      url: String((træf || arv || {}).url || ''),
      aktiv: !!(træf || arv || {}).aktiv,
    }
  })
}

/** Dem kunden må se. Er der ingen, findes knappen ikke på deres side. */
export function synligeShowtimes(kunde) {
  return showtimesFor(kunde).filter(s => s.aktiv && s.url)
}

/**
 * Felterne der skal gemmes, når ét showtime ændrer sig.
 *
 * De gamle enkeltfelter holdes i sync med den FØRSTE aktivitet, så alt der
 * endnu læser dem (og enhver kunde med kun én aktivitet) ser det rigtige.
 */
export function showtimeFelter(kunde, aktivitetId, patch) {
  const nu = showtimesFor(kunde)
  const næste = nu.map(s => s.aktivitetId === aktivitetId ? { ...s, ...patch } : s)
  const første = næste[0] || { url: '', aktiv: false }
  return {
    showtimes: næste.map(s => ({ aktivitetId: s.aktivitetId, url: s.url, aktiv: !!s.aktiv })),
    showtimeUrl: første.url || '',
    showtimeAktiv: !!første.aktiv,
  }
}

/* ---------- tidslinjen ---------- */

/** En række med flere spor kører samtidig; en almindelig række gør ikke. */
export function erParallel(række) {
  return !!(række && Array.isArray(række.spor) && række.spor.length > 1)
}

/** Alle rækker på en form visningen kan tegne uden at kende to slags. */
export function programRækker(kunde) {
  return ((kunde && kunde.program) || []).map(r => ({
    tid: String(r?.tid || ''),
    titel: String(r?.titel || ''),
    note: String(r?.note || ''),
    spor: Array.isArray(r?.spor)
      ? r.spor.filter(Boolean).map(s => ({ gruppe: String(s.gruppe || ''), titel: String(s.titel || '') }))
      : null,
  }))
}

/**
 * Læg minutter til et klokkeslæt. »13.00« + 40 → »13.40«.
 * Ugyldigt input giver tom streng frem for et forkert tidspunkt.
 */
export function plusMinutter(tid, minutter) {
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(String(tid || '').trim())
  if (!m) return ''
  const samlet = (Number(m[1]) * 60 + Number(m[2]) + Number(minutter || 0) + 24 * 60) % (24 * 60)
  const t = Math.floor(samlet / 60)
  const min = samlet % 60
  return `${t}.${String(min).padStart(2, '0')}`
}

/**
 * Rundeplanen — dagen som vi faktisk afvikler den.
 *
 * To (eller flere) aktiviteter, deltagerne delt i lige så mange grupper, og
 * en omgang pr. gruppe: alle når alt, og der er aldrig nogen der venter.
 * Rotationen er den simple: i omgang nummer n rykker gruppe g én plads.
 *
 * Der laves KUN de rækker, planen selv kan stå inde for — velkomst og
 * afslutning er med, fordi de altid er der, men vi finder ikke på pauser
 * eller frokost; dét ved den, der bygger dagen, bedre end vi gør.
 */
export function rundeplan({ aktiviteter, grupper, start, blokMinutter = 60, pauseMinutter = 10, velkomstMinutter = 15 }) {
  const akt = (aktiviteter || []).map(a => (a?.navn || '').trim()).filter(Boolean)
  const grp = (grupper || []).map(g => String(g || '').trim()).filter(Boolean)
  if (akt.length < 2 || grp.length < 2 || !plusMinutter(start, 0)) return []

  const antal = Math.min(akt.length, grp.length)
  const rækker = [{ tid: start, titel: 'Velkomst og teaminddeling', note: `I deles i ${antal} grupper` }]

  let tid = plusMinutter(start, velkomstMinutter)
  for (let omgang = 0; omgang < antal; omgang++) {
    rækker.push({
      tid,
      titel: `Omgang ${omgang + 1}`,
      note: '',
      spor: grp.slice(0, antal).map((g, i) => ({
        gruppe: g,
        // Rotationen: gruppe i tager aktivitet (i + omgang) rundt i ringen.
        titel: akt[(i + omgang) % antal],
      })),
    })
    tid = plusMinutter(tid, blokMinutter)
    if (omgang < antal - 1) {
      rækker.push({ tid, titel: 'Skift og pause', note: 'Grupperne bytter aktivitet' })
      tid = plusMinutter(tid, pauseMinutter)
    }
  }

  rækker.push({ tid, titel: 'Fælles afslutning', note: 'Resultater og præmie' })
  return rækker
}

/* ---------- dagen, bygget af sig selv ---------- */

/**
 * Hvordan afvikles to (eller flere) aktiviteter?
 *
 *  · DELT I GRUPPER: deltagerne deles, aktiviteterne kører samtidig, og
 *    grupperne bytter efter en omgang. Alle når alt, ingen venter. Det er
 *    den normale dag.
 *  · EFTER HINANDEN: alle laver det samme — først den ene, så den næste.
 *    Dagen bliver længere, men gruppen er samlet hele vejen.
 *
 * Det er et spørgsmål, ikke et gæt: vi spørger, når der vælges aktivitet
 * nummer to, og svaret gemmes på kunden.
 */
export const AFVIKLING = [
  { værdi: 'parallel',    kort: 'Delt i grupper',  lang: 'Deltagerne deles i grupper, aktiviteterne kører samtidig, og grupperne bytter undervejs' },
  { værdi: 'forlængelse', kort: 'Efter hinanden',  lang: 'Alle laver det samme — først den ene aktivitet, så den næste' },
]

export function afviklingFor(kunde) {
  const a = kunde && kunde.afvikling
  return AFVIKLING.some(x => x.værdi === a) ? a : 'parallel'
}

/**
 * Dagens faste rammer. De læses fra EventFlows tidslinjeskabelon (»TeamBattle
 * Standard«) når databasen svarer — det er dét, der ligger her, hvis den
 * ikke gør. Tallene er de samme som i skabelonen i dag.
 */
export const STANDARD_RAMMER = { opsætning: 30, velkomst: 10, kåring: 15, pause: 10, aktivitet: 90 }

/** Grupperne, som de hedder når ingen har givet dem navne. */
export function standardGrupper(antal) {
  return Array.from({ length: Math.max(2, antal || 2) }, (_, i) => `Gruppe ${i + 1}`)
}

/**
 * Tidslinjen, bygget af det vi ved: starttid, aktiviteter og deres tider
 * fra kataloget, og hvordan dagen afvikles.
 *
 * Rækkefølgen følger EventFlows egen skabelon: vi rigger op FØR kunden
 * kommer, velkomst og briefing, aktiviteterne, kåring af vinder. Vores egne
 * rækker efter kåringen (nedpakning, afgang) er ikke med — kunden er gået,
 * og de skal ikke stå og læse om, hvornår vi pakker bilen.
 *
 * Svarer med { program, slut } så sluttiden kan sættes på kunden samtidig.
 * Er der intet at bygge af (ingen starttid, ingen aktivitet), er programmet
 * tomt — vi finder ikke på en dag.
 */
export function bygProgram({ aktiviteter, start, afvikling = 'parallel', grupper, rammer } = {}) {
  const r = { ...STANDARD_RAMMER, ...(rammer || {}) }
  const akt = (aktiviteter || []).map(a => ({
    navn: String(a?.navn || a?.name || '').trim(),
    minutter: Number(a?.minutter || a?.activity_minutes || a?.duration_minutes) || r.aktivitet,
    opsætning: Number(a?.opsætning || a?.setup_minutes) || 0,
  })).filter(a => a.navn)
  if (!akt.length || !plusMinutter(start, 0)) return { program: [], slut: '' }

  const parallel = akt.length > 1 && afvikling === 'parallel'
  const grp = (parallel ? (grupper && grupper.length >= 2 ? grupper : standardGrupper(akt.length)) : [])
    .map(g => String(g || '').trim()).filter(Boolean)
  const antal = parallel ? Math.min(akt.length, grp.length) : 0

  const opsætning = Math.max(r.opsætning, ...akt.map(a => a.opsætning))
  const program = [
    { tid: plusMinutter(start, -opsætning), titel: 'Vi rigger op', note: 'I skal ikke være der endnu' },
    { tid: start, titel: 'Velkomst og briefing',
      note: parallel ? `I deles i ${antal} grupper` : 'Programmet og reglerne for dagen' },
  ]
  let tid = plusMinutter(start, r.velkomst)

  if (parallel) {
    // Alle omgange er lige lange: den længste aktivitet sætter takten, for
    // grupperne skal bytte på samme tid.
    const blok = Math.max(...akt.slice(0, antal).map(a => a.minutter))
    for (let omgang = 0; omgang < antal; omgang++) {
      program.push({
        tid, titel: `Omgang ${omgang + 1}`, note: '',
        // Rotationen: gruppe i tager aktivitet (i + omgang) rundt i ringen.
        spor: grp.slice(0, antal).map((g, i) => ({ gruppe: g, titel: akt[(i + omgang) % antal].navn })),
      })
      tid = plusMinutter(tid, blok)
      if (omgang < antal - 1) {
        program.push({ tid, titel: 'Skift og pause', note: 'Grupperne bytter aktivitet' })
        tid = plusMinutter(tid, r.pause)
      }
    }
  } else {
    akt.forEach((a, i) => {
      program.push({ tid, titel: a.navn, note: '' })
      tid = plusMinutter(tid, a.minutter)
      if (i < akt.length - 1) {
        program.push({ tid, titel: 'Kort pause', note: 'Så gør vi klar til det næste' })
        tid = plusMinutter(tid, r.pause)
      }
    })
  }

  program.push({ tid, titel: 'Kåring af vinder', note: 'Pointoptælling, præmie og fælles afslutning' })
  const slut = plusMinutter(tid, r.kåring)
  return { program, slut }
}

/**
 * Felterne der skal gemmes, når dagen bygges af sig selv.
 *
 * `programAuto` er mærket: så længe det står, er tidslinjen vores gæt, og
 * den må bygges om, når aktiviteterne ændrer sig. Har nogen rettet i den
 * med hånden, sættes mærket af — og så rører vi den ikke igen.
 */
export function programFelter(kunde, { aktiviteter, afvikling, rammer, grupper } = {}) {
  const k = kunde || {}
  const { program, slut } = bygProgram({
    aktiviteter: aktiviteter || aktiviteterFor(k),
    start: k.startTime,
    afvikling: afvikling || afviklingFor(k),
    grupper: grupper || k.grupper,
    rammer,
  })
  if (!program.length) return {}
  const ud = { program, programAuto: true }
  if (!k.endTime || k.programAuto) ud.endTime = slut
  if (program.some(r => r.spor) && !(k.grupper && k.grupper.length)) {
    ud.grupper = program.find(r => r.spor).spor.map(s => s.gruppe)
  }
  return ud
}
