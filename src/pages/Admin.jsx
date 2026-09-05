import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../lib/icons'
import { danskDato, dageTil, initialer, portalLink } from '../lib/format'
import { hentKunder, opretKunde, demoTilstand } from '../lib/data'
import { hentAktiviteter } from '../lib/activities'
import { hentMedarbejdere, planlæggerGrupper, somKontakt } from '../lib/crew'
import { DEMO } from '../lib/model'
import TemaKnap from '../components/TemaKnap'
import LogoVaelger from '../components/LogoVaelger'

/* Vores egen side: find en kunde, eller opret en ny og send dem adgang. */

export default function Admin({ adminKode, onLogUd }) {
  const navigate = useNavigate()
  const [tilstand, setTilstand] = useState('indlæser')
  const [kunder, setKunder] = useState([])
  const [søg, setSøg] = useState('')
  const [opretter, setOpretter] = useState(false)
  const [nyKunde, setNyKunde] = useState(null)
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [aktiviteter, setAktiviteter] = useState([])
  const [folk, setFolk] = useState([])

  // Kataloget hentes én gang. Fejler det, står formularen tilbage med et
  // frit felt til eventnavnet — man skal kunne oprette en kunde, selv om
  // aktivitetslisten er nede.
  useEffect(() => {
    let død = false
    hentAktiviteter()
      .then(a => { if (!død) setAktiviteter(a) })
      .catch(() => { /* uden katalog: eventnavnet skrives i hånden */ })
    hentMedarbejdere()
      .then(m => { if (!død) setFolk(m) })
      .catch(() => { /* uden holdliste: sættes på bagefter */ })
    return () => { død = true }
  }, [])

  useEffect(() => { hent() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Preview af en rigtig kunde hvis der er en, ellers eksempelkunden. */
  function åbnPreview() {
    const først = kunder.find(k => k.code) || null
    navigate('/p/' + ((først && først.code) || DEMO.code) + '?preview=1')
  }

  function hent() {
    setTilstand('indlæser')
    hentKunder(adminKode)
      .then(liste => { setKunder(liste); setTilstand('klar') })
      .catch(() => setTilstand('fejl'))
  }

  async function gem(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const firma = String(f.get('firma') || '').trim()
    if (!firma) return
    const valgt = aktiviteter.find(a => a.id === String(f.get('aktivitet') || '')) || null
    setGemmer(true)
    setFejl(null)
    try {
      const kunde = await opretKunde(adminKode, {
        firma,
        // Aktiviteten afgør både hvad kunden ser under »hvad skal I lave«
        // og hvilke spørgsmål de får — TeamTaste spørger om allergier.
        aktivitetId: valgt ? valgt.id : '',
        aktivitetNavn: valgt ? valgt.name : '',
        eventplanner: somKontakt(folk.find(m => m.id === String(f.get('planner') || ''))),
        leadInstruktor: somKontakt(folk.find(m => m.id === String(f.get('lead') || ''))),
        kontakt: String(f.get('kontakt') || '').trim(),
        email: String(f.get('email') || '').trim(),
        telefon: String(f.get('telefon') || '').trim(),
        logoUrl: String(f.get('logoUrl') || '').trim(),
        eventTitle: String(f.get('event') || '').trim() || (valgt ? valgt.name : 'Event uden navn'),
        eventDate: String(f.get('dato') || ''),
        startTime: String(f.get('start') || '').trim(),
        sted: String(f.get('sted') || '').trim(),
        deltagere: f.get('antal') ? Number(f.get('antal')) : null,
        pris: f.get('pris') ? Number(f.get('pris')) : null,
      })
      setKunder(k => [kunde, ...k])
      setNyKunde(kunde)
      setOpretter(false)
    } catch (err) {
      setFejl('Kunden blev ikke oprettet: ' + err.message)
    } finally {
      setGemmer(false)
    }
  }

  const q = søg.toLowerCase().trim()
  const liste = kunder.filter(k => !q ||
    `${k.firma || ''} ${k.kontakt || ''} ${k.eventTitle || ''} ${k.code}`.toLowerCase().includes(q))

  return (
    <div className="page">
      <div className="wrap">
        <div className="brand">
          <span className="brand-mark"><Icon name="flag" size={15} /></span>
          <span className="brand-name">EventDay</span>
          <span className="brand-spacer" />
          {/* Se siden som KUNDEN ser den. Vores egne knapper (showtime-linket,
              »ret vores folk«) forsvinder i preview — ellers ville man sidde og
              godkende en side, ingen kunde nogensinde får at se. */}
          <button className="ghost-btn" onClick={() => åbnPreview()}>Preview kundeside</button>
          <TemaKnap />
          <button className="ghost-btn" onClick={() => { setOpretter(v => !v); setNyKunde(null) }}>
            {opretter ? 'Luk' : '+ Ny kunde'}
          </button>
          <button className="ghost-btn" onClick={() => { onLogUd(); navigate('/') }}>Log ud</button>
        </div>

        <div className="admin-head">
          <div className="eyebrow" style={{ marginBottom: 7 }}>Kundeportaler</div>
          <h1>Kunder</h1>
          <p>Find en kunde, eller opret en ny og send dem koden til deres egen side.</p>
        </div>

        {demoTilstand && (
          <div className="banner">
            Der er ingen database koblet på endnu, så kunder du opretter her bliver kun
            på den her browser. Sæt de to nøgler i Netlify, så gælder de rigtigt.
          </div>
        )}

        {opretter && <OpretForm onSubmit={gem} gemmer={gemmer} fejl={fejl} aktiviteter={aktiviteter} folk={folk} />}
        {nyKunde && <Kvittering kunde={nyKunde} onLuk={() => setNyKunde(null)} onÅbn={() => navigate('/p/' + nyKunde.code)} />}

        {tilstand === 'indlæser' && <div className="empty"><h3>Henter kunder …</h3></div>}

        {tilstand === 'fejl' && (
          <div className="empty">
            <h3>Kundelisten kunne ikke hentes</h3>
            <p>Forbindelsen til databasen svarer ikke. Ingen data er gået tabt.</p>
            <div className="actions" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button className="btn btn-primary" onClick={hent}>Prøv igen</button>
            </div>
          </div>
        )}

        {tilstand === 'klar' && kunder.length === 0 && (
          <>
            <div className="empty">
              <h3>Ingen kunder endnu</h3>
              <p>Opret den første herover. Hver kunde får sine egne seks cifre og sit eget link.</p>
            </div>
            <div className="sec-label">Se hvordan kundens side ser ud</div>
            <div className="clist">
              <button className="crow" onClick={() => navigate('/p/' + DEMO.code)}>
                <span className="crow-mark">{initialer(DEMO.firma)}</span>
                <span className="crow-main">
                  <b>{DEMO.firma}</b>
                  <span>Eksempelkunde · {DEMO.eventTitle.toLowerCase()}</span>
                </span>
                <span className="crow-side">
                  <span className="code">{DEMO.code}</span>
                  <span>eksempel</span>
                </span>
              </button>
            </div>
          </>
        )}

        {tilstand === 'klar' && kunder.length > 0 && (
          <>
            <div className="search">
              <Icon name="search" size={18} color="currentColor" />
              <input type="search" value={søg} onChange={e => setSøg(e.target.value)}
                     placeholder="Søg på firma, kontakt, event eller kode" />
            </div>
            {liste.length ? (
              <div className="clist">
                {liste.map(k => {
                  const d = dageTil(k.eventDate)
                  return (
                    <button className="crow" key={k.code} onClick={() => navigate('/p/' + k.code)}>
                      <span className="crow-mark">{initialer(k.firma)}</span>
                      <span className="crow-main">
                        <b>{k.firma || 'Uden navn'}</b>
                        <span>{k.eventTitle || 'Event ikke navngivet'} · {danskDato(k.eventDate)}</span>
                      </span>
                      <span className="crow-side">
                        <span className="code">{k.code}</span>
                        <span>{d !== null && d >= 0 ? `om ${d} dage` : 'afholdt'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="empty"><h3>Ingen træffere</h3><p>Prøv et andet ord, eller opret kunden.</p></div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function OpretForm({ onSubmit, gemmer, fejl, aktiviteter, folk }) {
  const { typiske, øvrige } = planlæggerGrupper(folk || [])
  // Firmanavnet holdes her, så logo-søgningen kan gå i gang mens man taster.
  // Resten af formularen læses stadig som FormData ved indsendelse.
  const [firma, setFirma] = useState('')
  const [logo, setLogo] = useState('')
  return (
    <form className="block" style={{ padding: 18 }} onSubmit={onSubmit}>
      <h3 style={{ fontSize: 18, marginBottom: 14 }}>Ny kunde</h3>
      <div className="field">
        <label htmlFor="n-aktivitet">Hvad har de købt?</label>
        <select id="n-aktivitet" name="aktivitet" defaultValue="">
          <option value="">Vælg aktivitet …</option>
          {aktiviteter.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <p className="hint">
          {aktiviteter.length
            ? 'Kunden ser aktiviteten under »hvad skal I lave«. Ved TeamTaste spørger vi også om allergier.'
            : 'Aktivitetslisten kunne ikke hentes — skriv eventets navn i feltet nedenfor i stedet.'}
        </p>
      </div>
      <div className="row2">
        <Felt navn="firma" label="Firma" ph="Nordisk Revision A/S" required
              onChange={e => setFirma(e.target.value)} />
        <Felt navn="kontakt" label="Kontaktperson" ph="Mette Hylleborg" />
        <Felt navn="email" label="E-mail" type="email" ph="mh@firma.dk" />
        <Felt navn="telefon" label="Telefon" ph="27 41 88 05" />
        <Felt navn="event" label="Event-navn (valgfrit)" ph="Byjagt i Aarhus" />
        <Felt navn="dato" label="Dato" type="date" />
        <Felt navn="start" label="Starttid" ph="13.00" />
        <Felt navn="antal" label="Antal deltagere" ph="48" />
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="n-planner">Eventplanner</label>
          <select id="n-planner" name="planner" defaultValue="">
            <option value="">Ikke sat endnu</option>
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
          <label htmlFor="n-lead">Leadinstruktør på dagen</label>
          <select id="n-lead" name="lead" defaultValue="">
            <option value="">Sættes på senere</option>
            {(folk || []).map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
          </select>
        </div>
      </div>
      <Felt navn="sted" label="Sted" ph="Dokk1, Hack Kampmanns Plads 2, 8000 Aarhus C" />
      <Felt navn="pris" label="Pris ekskl. moms" ph="23400" />

      <div className="field">
        <label>Kundens logo</label>
        <LogoVaelger firma={firma} værdi={logo} onÆndre={setLogo} />
        <input type="hidden" name="logoUrl" value={logo} />
      </div>

      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 4 }}>{fejl}</p>}
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" type="submit" disabled={gemmer}>
          <Icon name="plus" size={18} />{gemmer ? 'Opretter …' : 'Opret kunde og lav adgang'}
        </button>
      </div>
    </form>
  )
}

function Felt({ navn, label, type = 'text', ph, required, onChange }) {
  return (
    <div className="field">
      <label htmlFor={'n-' + navn}>{label}</label>
      <input id={'n-' + navn} name={navn} type={type} placeholder={ph} required={required}
             onChange={onChange} />
    </div>
  )
}

function Kvittering({ kunde, onLuk, onÅbn }) {
  const [kopieret, setKopieret] = useState(false)
  const link = portalLink(kunde.code)
  return (
    <div className="block" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
      <h3>{kunde.firma} er oprettet</h3>
      <p>
        Send koden <b className="code" style={{ color: 'var(--ink)' }}>{kunde.code}</b> til
        {kunde.kontakt ? ' ' + kunde.kontakt : ' kunden'} — eller linket, så slipper de for at taste den.
      </p>
      <div className="linkbox">
        <code>{link}</code>
        <button className="btn btn-quiet" style={{ padding: '7px 12px' }}
                onClick={() => { navigator.clipboard?.writeText(link); setKopieret(true) }}>
          <Icon name={kopieret ? 'check' : 'copy'} size={16} color="currentColor" />
          {kopieret ? 'Kopieret' : 'Kopiér'}
        </button>
      </div>
      <div className="actions" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={onÅbn}>Åbn deres side</button>
        <button className="btn btn-quiet" onClick={onLuk}>Færdig</button>
      </div>
    </div>
  )
}
