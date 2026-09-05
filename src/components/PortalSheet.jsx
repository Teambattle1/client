import { useEffect, useState } from 'react'
import Icon from '../lib/icons'
import { SECTIONS, infoFieldsFor } from '../lib/model'
import { kr, initialer } from '../lib/format'
import { hentVenue, venueAdresse, konferenceKontakt } from '../lib/venues'
import { hentAktivitet, aktivitetTekst, varighed } from '../lib/activities'
import { hentMedarbejdere, planlæggerGrupper, somKontakt } from '../lib/crew'
import { opdaterKunde } from '../lib/data'
import Showtime from './Showtime'
import VenueVaelger from './VenueVaelger'
import MiniKort from './MiniKort'

/* Arket der åbner, når kunden trykker på en af knapperne. */

export default function PortalSheet({ sektion, kunde, info, gemStatus, onInfo, onLuk, adminKode, onKundeRettet }) {
  useEffect(() => {
    function tast(e) { if (e.key === 'Escape') onLuk() }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [onLuk])

  const s = SECTIONS.find(x => x.key === sektion)
  if (!s) return null

  const indhold = {
    opgave: <Opgave kunde={kunde} />,
    info: <Info felter={infoFieldsFor(kunde)} info={info} gemStatus={gemStatus} onInfo={onInfo} admin={!!adminKode} />,
    location: <Location kunde={kunde} info={info} />,
    okonomi: <Okonomi kunde={kunde} />,
    tidslinje: <Tidslinje kunde={kunde} />,
    kontakt: <Kontakter kunde={kunde} info={info} adminKode={adminKode} onRettet={onKundeRettet} />,
    showtime: <Showtime kunde={kunde} adminKode={adminKode} onRettet={onKundeRettet} onLuk={onLuk} />,
  }[s.key]

  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={s.label}>
        <div className="sheet-head">
          <span className="tile-icon"><Icon name={s.icon} size={20} /></span>
          <div className="sheet-title">
            <h2>{s.label}</h2>
            <span>{s.sub}</span>
          </div>
          <button className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>
        <div className="sheet-body">{indhold}</div>
      </div>
    </div>
  )
}

/**
 * »Hvad skal I lave« — aktiviteten fra kataloget, ikke en tekst vi har
 * tastet ind på kunden.
 *
 * Kataloget har billeder og tider, men `long_description` er tom på alle
 * rækker endnu, og `short_description` er importstøj (»TeamChallenge fra
 * OCC«). Derfor: rigtig beskrivelse hvis den findes, ellers den vi selv
 * skrev på kunden. Der står hellere ingen tekst end en, kunden ikke kan
 * bruge til noget.
 */
function Opgave({ kunde }) {
  const [akt, setAkt] = useState(null)
  const med = kunde.inkluderet || []

  useEffect(() => {
    if (!kunde.aktivitetId) return
    let død = false
    hentAktivitet(kunde.aktivitetId)
      .then(a => { if (!død) setAkt(a) })
      .catch(() => { /* kataloget svarer ikke — vi viser det vi selv har */ })
    return () => { død = true }
  }, [kunde.aktivitetId])

  const navn = (akt && akt.name) || kunde.eventTitle || ''
  const tekst = aktivitetTekst(akt, kunde.beskrivelse)
  const spilletid = varighed(akt && (akt.activity_minutes || akt.duration_minutes))
  const deltagere = akt && (akt.min_participants || akt.max_participants)
    ? [akt.min_participants, akt.max_participants].filter(Boolean).join('–') + ' deltagere'
    : (kunde.deltagere ? `${kunde.deltagere} deltagere` : '—')

  return (
    <>
      {akt && akt.cover_image_url && (
        <img src={akt.cover_image_url} alt="" loading="lazy" className="akt-billede"
             onError={e => { e.currentTarget.style.display = 'none' }} />
      )}

      {navn && <h3 className="akt-navn">{navn}</h3>}

      <p className="lede">
        {tekst || 'Beskrivelsen af jeres aktivitet lægges ind her, når den er på plads. Ring endelig, hvis I vil vide mere allerede nu.'}
      </p>

      {akt && akt.venue_requirements && (
        <div className="block">
          <h3>Det kræver stedet</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{akt.venue_requirements}</p>
        </div>
      )}

      <div className="block">
        <h3>Det er med i prisen</h3>
        {med.length
          ? <div className="chips">{med.map(x => <span className="chip" key={x}>{x}</span>)}</div>
          : <p>Vi udfylder listen sammen med tilbuddet.</p>}
      </div>

      <dl style={{ margin: 0 }}>
        {spilletid && <Rk t="Selve aktiviteten" v={spilletid} />}
        <Rk t="I er i gang" v={`${kunde.startTime || '—'}${kunde.endTime ? '–' + kunde.endTime : ''}`} />
        <Rk t="Deltagere" v={deltagere} />
        <Rk t="Vejret" v="Vi gennemfører i alt vejr" />
      </dl>

      {akt && akt.external_pdf_url && (
        <div className="actions" style={{ marginTop: 14 }}>
          <a className="btn btn-quiet" href={akt.external_pdf_url} target="_blank" rel="noopener noreferrer">
            Læs mere om aktiviteten
          </a>
        </div>
      )}
    </>
  )
}

/**
 * »Info fra jer« — de spørgsmål NETOP denne kunde skal svare på.
 *
 * Listen kommer fra `infoFieldsFor`, ikke fra en fast række felter: en
 * byjagt og en madaften har ikke det samme at afklare. Fire felttyper:
 * stedet (sammensat), en kontaktperson (navn + nummer + mail), fritekst og
 * en almindelig linje.
 */
function Info({ felter, info, gemStatus, onInfo, admin }) {
  return (
    <>
      <p className="lede">
        Jo før vi har det her, jo mindre skal I tage stilling til på dagen.
        Det gemmer sig selv, og I kan komme tilbage senere.
      </p>
      {felter.map(f => (
        <div className="field" key={f.key}>
          {f.type === 'venue'
            ? <span className="felt-titel">{f.label}</span>
            : <label htmlFor={'f-' + f.key}>{f.label}</label>}
          {f.type === 'venue' ? (
            <VenueVaelger værdi={info[f.key]} onÆndre={v => onInfo(f.key, v)} admin={admin} />
          ) : f.type === 'kontakt' ? (
            <KontaktFelt k={info[f.key]} onÆndre={v => onInfo(f.key, v)} navnId={'f-' + f.key} />
          ) : f.type === 'textarea' ? (
            <textarea id={'f-' + f.key} value={info[f.key] || ''} placeholder={f.ph || ''}
                      onChange={e => onInfo(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <select id={'f-' + f.key} value={info[f.key] || ''} onChange={e => onInfo(f.key, e.target.value)}>
              <option value="">Vælg …</option>
              {f.options.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input id={'f-' + f.key} type="text" value={info[f.key] || ''} placeholder={f.ph || ''}
                   onChange={e => onInfo(f.key, e.target.value)} />
          )}
          {f.hint && <p className="hint">{f.hint}</p>}
        </div>
      ))}
      <div className="saved">
        {gemStatus === 'gemmer' && <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Gemmer …</span>}
        {gemStatus === 'gemt' && <><Icon name="check" size={16} color="currentColor" />Gemt</>}
        {gemStatus === 'fejl' && <span style={{ color: 'var(--red)' }}>Kunne ikke gemme — prøv igen om lidt</span>}
      </div>
    </>
  )
}

/** Navn, mail og telefon i én blok. Tre felter frem for ét frit felt, fordi
 *  »Thomas« uden et nummer ikke er nogen man kan ringe til klokken syv. */
function KontaktFelt({ k, onÆndre, navnId }) {
  const v = k && typeof k === 'object' ? k
    // Ældre svar var én tekstlinje. Den kastes ikke væk — den lander i navnet,
    // så kunden kan se hvad de skrev og selv rette det op.
    : (k ? { navn: String(k) } : {})
  const sæt = patch => onÆndre({ ...v, ...patch })
  return (
    <div className="kontakt-felt">
      <input id={navnId} type="text" value={v.navn || ''} placeholder="Navn"
             onChange={e => sæt({ navn: e.target.value })} />
      <div className="row2">
        <input type="tel" inputMode="tel" value={v.tlf || ''} placeholder="Mobil"
               onChange={e => sæt({ tlf: e.target.value })} />
        <input type="email" inputMode="email" value={v.mail || ''} placeholder="E-mail"
               onChange={e => sæt({ mail: e.target.value })} />
      </div>
    </div>
  )
}

/**
 * Location viser det, kunden har SVARET — ikke det vi gættede da vi oprettede
 * dem. Er der ikke svaret endnu, falder den tilbage på stedet fra tilbuddet,
 * så arket aldrig står tomt.
 *
 * Er det et af vores steder, står stedets egen konferencekonsulent her — med
 * den linje der er hele pointen: kunden skal IKKE selv aftale noget med dem.
 */
function Location({ kunde, info }) {
  const svar = (info && info.sted) || {}
  const [venue, setVenue] = useState(null)
  const [venueFejl, setVenueFejl] = useState(false)

  useEffect(() => {
    if (svar.valg !== 'vores' || !svar.venueId) { setVenue(null); return }
    let død = false
    setVenueFejl(false)
    hentVenue(svar.venueId)
      .then(v => { if (!død) setVenue(v) })
      .catch(() => { if (!død) setVenueFejl(true) })
    return () => { død = true }
  }, [svar.valg, svar.venueId])

  const egen = svar.valg === 'egen'
  const adresse = venue ? venueAdresse(venue)
    : egen ? (svar.adresse || '')
    : (kunde.sted || '')
  const lat = venue ? venue.lat : (egen ? svar.lat : null)
  const lon = venue ? venue.lon : (egen ? svar.lon : null)
  const konsulent = venue ? konferenceKontakt(venue) : null
  const logistik = (info && info.logistik) || ''

  return (
    <>
      <div className="block">
        <h3>{venue ? venue.name : egen ? 'Jeres location' : 'Mødested'}</h3>
        <p>{adresse || 'Stedet er ikke sat endnu — vælg det under »info fra jer«.'}</p>
        {!egen && !venue && kunde.modested && (
          <p style={{ marginTop: 8, color: 'var(--ink)', fontWeight: 600 }}>{kunde.modested}</p>
        )}
        <MiniKort lat={lat} lon={lon} højde={170} />
      </div>

      {venueFejl && (
        <p className="hint" style={{ color: 'var(--red)', marginBottom: 12 }}>
          Vi kunne ikke hente stedets oplysninger lige nu. Jeres valg er gemt.
        </p>
      )}

      {egen && svar.adgang && (
        <div className="block">
          <h3>Sådan kommer vi ind</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{svar.adgang}</p>
        </div>
      )}

      {logistik && (
        <div className="block">
          <h3>Særlige forhold</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{logistik}</p>
        </div>
      )}

      {venue && (
        <p className="hint" style={{ marginBottom: 14 }}>
          Stedets egen kontaktperson står under <b>Kontakter</b>. I skal ikke
          aftale noget med dem — vi gør det.
        </p>
      )}

      {!egen && !venue && (
        <dl style={{ margin: '0 0 16px' }}>
          <Rk t="Parkering" v={kunde.parkering || '—'} />
          <Rk t="Toiletter" v="Ved mødestedet" />
          <Rk t="Ly for regn" v="Ja, indendørs samlingssted" />
        </dl>
      )}

      {adresse && (
        <div className="actions">
          <a className="btn btn-primary" target="_blank" rel="noopener noreferrer"
             href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adresse)}>
            <Icon name="pin" size={18} />Vis på kort
          </a>
        </div>
      )}
    </>
  )
}

function Okonomi({ kunde }) {
  const pris = Number(kunde.pris || 0)
  const stk = Number(kunde.deltagere || 0)
  const pr = stk > 0 && pris > 0 ? Math.round(pris / stk) : null
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {kunde.betalt
          ? <span className="pill pill-green"><Icon name="check" size={13} color="currentColor" />Betalt</span>
          : <span className="pill pill-gold">Faktura sendt</span>}
      </div>
      <dl style={{ margin: 0 }}>
        <Rk t={`Aktivitet, ${kunde.deltagere || '—'} deltagere`} v={kr(pris)} />
        {pr && <Rk t="Pris pr. deltager" v={kr(pr)} />}
        <Rk t="Moms" v="Tillægges" />
        <Rk t="Betaling" v="8 dage netto" />
        <Rk t="Faktureres til" v={kunde.faktura || '—'} />
      </dl>
      <div className="total"><span>I alt ekskl. moms</span><b>{kr(pris)}</b></div>
      <p className="note">
        Ændrer antallet af deltagere sig mere end 10 %, retter vi fakturaen efter det endelige tal.
      </p>
    </>
  )
}

function Tidslinje({ kunde }) {
  const p = kunde.program || []
  if (!p.length) return <p className="lede">Programmet lægges her, så snart tiderne er faldet på plads.</p>
  return (
    <>
      <p className="lede">
        Sådan ser dagen ud lige nu. Skal noget flyttes, så sig til — det er nemmest inden ugen før.
      </p>
      <ul className="tl">
        {p.map((x, i) => (
          <li key={i}>
            <span className="tl-dot" />
            <span className="tl-time">{x.tid}</span>
            <span className="tl-txt"><strong>{x.titel}</strong>{x.note && <span>{x.note}</span>}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Kontakter — alle fire på ét sted, i den rækkefølge kunden får brug for dem.
 *
 *  1. Vores eventplanner: den de aftaler indhold og pris med i ugerne før.
 *  2. Leadinstruktøren: den der står med udstyret på dagen.
 *  3. Deres egen kontakt: den de selv har skrevet under »info fra jer«, så de
 *     kan se hvem VI ringer til — og rette den, hvis det bliver en anden.
 *  4. Stedets kontaktperson, hvis de har valgt et af vores steder.
 *
 * De to første er VORES og kan kun rettes med adminkoden. Åbner en af os
 * kundens side fra kundelisten, står der en lille rette-knap; en kunde ser
 * den aldrig, og databasen afviser rettelsen uanset hvad browseren sender.
 */
function Kontakter({ kunde, info, adminKode, onRettet }) {
  const [venue, setVenue] = useState(null)
  const [retter, setRetter] = useState(false)

  const svar = (info && info.sted) || {}
  useEffect(() => {
    if (svar.valg !== 'vores' || !svar.venueId) { setVenue(null); return }
    let død = false
    hentVenue(svar.venueId).then(v => { if (!død) setVenue(v) }).catch(() => {})
    return () => { død = true }
  }, [svar.valg, svar.venueId])

  const konsulent = venue ? konferenceKontakt(venue) : null
  const gm = kunde.gamemaster || {}
  const planner = kunde.eventplanner
  const lead = kunde.leadInstruktor
    // Er der ingen leadinstruktør sat endnu, står den gamle gamemaster-linje
    // stadig på ældre kunder. Den bruges frem for at vise et tomt felt.
    || (gm.navn ? { navn: gm.navn, mail: gm.email, tlf: gm.telefon } : null)

  return (
    <>
      <p className="lede">
        Er I i tvivl om noget, så ring. Det er altid bedre end at gætte på dagen.
      </p>

      <Person titel="Jeres eventplanner hos os" k={planner}
              rolle="Aftaler indhold, tider og pris med jer"
              tom="Vi sætter navn på snarest." />

      <Person titel="Leadinstruktør på dagen" k={lead}
              rolle="Står klar på stedet 45 minutter før"
              tom="Instruktøren sættes på, når vi er tættere på dagen." />

      <Person titel="Jeres egen kontakt på dagen" k={info && info.kontaktDagen}
              rolle="Den vi ringer til, hvis noget skal afklares"
              tom="Udfyld den under »info fra jer«, så vi ved hvem vi skal ringe til." />

      {konsulent && (
        <>
          <Person titel="Stedets kontaktperson" k={{ navn: konsulent.name, mail: konsulent.email, tlf: konsulent.mobile }}
                  rolle={[venue.name, konsulent.title].filter(Boolean).join(' · ')} />
          <p className="hint" style={{ marginTop: -4, marginBottom: 14 }}>
            <b>I skal ikke aftale noget med stedet.</b> Vi kontakter dem og
            arrangerer det praktiske. Nummeret står her, så I ved hvem vi taler med.
          </p>
        </>
      )}

      {adminKode && (
        <div style={{ marginTop: 6 }}>
          {retter
            ? <RetVoresFolk kunde={kunde} adminKode={adminKode}
                            onLuk={() => setRetter(false)} onRettet={onRettet} />
            : <button className="btn btn-quiet" onClick={() => setRetter(true)}>
                Ret eventplanner og instruktør
              </button>}
        </div>
      )}
    </>
  )
}

/** Én kontakt: navn, hvad de laver, og knapper der ringer eller skriver. */
function Person({ titel, k, rolle, tom }) {
  const har = k && (k.navn || k.mail || k.tlf)
  return (
    <div className="block">
      <h3>{titel}</h3>
      {har ? (
        <>
          <div className="person" style={{ marginBottom: 10 }}>
            <div className="avatar">{initialer(k.navn || '?')}</div>
            <div>
              <b>{k.navn || 'Uden navn'}</b>
              {rolle && <span>{rolle}</span>}
            </div>
          </div>
          <div className="actions">
            {k.tlf && (
              <a className="btn btn-primary" href={'tel:' + String(k.tlf).replace(/\s/g, '')}>
                <Icon name="phone" size={16} />{k.tlf}
              </a>
            )}
            {k.mail && (
              <a className="btn btn-quiet" href={'mailto:' + k.mail}>
                <Icon name="mail" size={16} color="currentColor" />Skriv
              </a>
            )}
          </div>
        </>
      ) : (
        <p>{tom || 'Ikke sat endnu.'}</p>
      )}
    </div>
  )
}

/** Rette-panelet — kun for os. Samme to lister som ved oprettelsen. */
function RetVoresFolk({ kunde, adminKode, onLuk, onRettet }) {
  const [folk, setFolk] = useState([])
  const [planner, setPlanner] = useState((kunde.eventplanner && kunde.eventplanner.id) || '')
  const [lead, setLead] = useState((kunde.leadInstruktor && kunde.leadInstruktor.id) || '')
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)

  useEffect(() => {
    let død = false
    hentMedarbejdere().then(m => { if (!død) setFolk(m) }).catch(() => setFejl('Holdlisten kunne ikke hentes.'))
    return () => { død = true }
  }, [])

  async function gem() {
    setGemmer(true); setFejl(null)
    try {
      const patch = {
        eventplanner: somKontakt(folk.find(m => m.id === planner)),
        leadInstruktor: somKontakt(folk.find(m => m.id === lead)),
      }
      const ny = await opdaterKunde(adminKode, kunde.code, patch)
      onRettet?.(ny)
      onLuk()
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally {
      setGemmer(false)
    }
  }

  const { typiske, øvrige } = planlæggerGrupper(folk)

  return (
    <div className="block">
      <h3>Ret vores folk</h3>
      <div className="field">
        <label htmlFor="ret-planner">Eventplanner</label>
        <select id="ret-planner" value={planner} onChange={e => setPlanner(e.target.value)}>
          <option value="">Ikke sat</option>
          {typiske.length > 0 && (
            <optgroup label="Plejer at være">
              {typiske.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
            </optgroup>
          )}
          <optgroup label="Alle">
            {øvrige.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
          </optgroup>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ret-lead">Leadinstruktør på dagen</label>
        <select id="ret-lead" value={lead} onChange={e => setLead(e.target.value)}>
          <option value="">Ikke sat</option>
          {folk.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
        </select>
      </div>
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 8 }}>{fejl}</p>}
      <div className="actions">
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer …' : 'Gem'}
        </button>
        <button className="btn btn-quiet" onClick={onLuk}>Fortryd</button>
      </div>
    </div>
  )
}

function Rk({ t, v }) {
  return <div className="kv"><dt>{t}</dt><dd>{v}</dd></div>
}
