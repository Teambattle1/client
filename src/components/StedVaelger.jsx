import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import PlacerKort from './PlacerKort'
import { hentVenues, venueAdresse, erAktiv, venueRedigerUrl } from '../lib/venues'
import { søgAdresse } from '../lib/address'

/**
 * Stedet, sat af OS — med opslag i vores egne venues.
 *
 * Tre veje ind, i den rækkefølge de bruges:
 *  1. SLÅ OP: stedet ligger som regel allerede i venue-systemet med adresse
 *     og position. Så skal vi ikke skrive det af — vi vælger det, og alt
 *     følger med. Det er også dét, der holder de to systemer enige.
 *  2. ADRESSE: er det kundens egen adresse, slås den op mens man skriver,
 *     og positionen kommer med.
 *  3. NÅLEN: en adresse rammer bygningen, ikke mødestedet. Den sidste
 *     justering sker på kortet.
 *
 * Vi ser ALLE steder her, også dem der ikke er meldt aktive endnu — det er
 * os, og et sted vi er i gang med at få en aftale med, er tit netop dét,
 * eventet skal ligge på.
 */
export default function StedVaelger({ værdi, onÆndre }) {
  const v = værdi || {}
  const [visVenues, setVisVenues] = useState(false)
  const [venues, setVenues] = useState([])
  const [tilstand, setTilstand] = useState('venter')   // venter | klar | fejl
  const [søg, setSøg] = useState('')

  // Et sted vi endnu ikke har gjort færdigt.
  const [uafklaret, setUafklaret] = useState(null)
  const [forslag, setForslag] = useState([])
  const [søger, setSøger] = useState(false)
  const timer = useRef(null)
  const afbryd = useRef(null)

  function sæt(patch) { onÆndre({ ...v, ...patch }) }

  function vælgVenue(x) {
    setVisVenues(false)
    setForslag([])
    setUafklaret(null)
    sæt({
      venueId: x.id,
      // Navn OG adresse: det er navnet, folk kender stedet på, og adressen
      // de skal køre efter.
      sted: [x.name, venueAdresse(x)].filter(Boolean).join(', '),
      lat: x.lat ?? null, lon: x.lon ?? null,
    })
  }

  useEffect(() => {
    if (!visVenues || tilstand === 'klar') return
    let død = false
    hentVenues({ alle: true })
      .then(l => { if (!død) { setVenues(l); setTilstand('klar') } })
      .catch(() => { if (!død) setTilstand('fejl') })
    return () => { død = true }
  }, [visVenues, tilstand])

  useEffect(() => () => { clearTimeout(timer.current); afbryd.current?.abort() }, [])

  function skrivAdresse(tekst) {
    // Positionen nulstilles IKKE med det samme: skriver man et hus­nummer om,
    // skal nålen ikke forsvinde, før der er en ny at sætte i stedet.
    sæt({ sted: tekst, venueId: '' })
    clearTimeout(timer.current)
    afbryd.current?.abort()
    if (tekst.trim().length < 3) { setForslag([]); setSøger(false); return }
    setSøger(true)
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController()
      afbryd.current = ctrl
      const r = await søgAdresse(tekst, ctrl.signal)
      if (ctrl.signal.aborted) return
      setForslag(r)
      setSøger(false)
    }, 350)
  }

  const q = søg.toLowerCase().trim()
  const listen = venues.filter(x => !q || `${x.name || ''} ${venueAdresse(x)}`.toLowerCase().includes(q))

  return (
    <div className="sted-vælger">
      <div className="sted-række">
        <input
          id="n-sted"
          value={v.sted || ''}
          onChange={e => skrivAdresse(e.target.value)}
          placeholder="Dokk1, Hack Kampmanns Plads 2, 8000 Aarhus C"
          autoComplete="off"
          aria-label="Sted"
        />
        <button type="button" className="ghost-btn" onClick={() => setVisVenues(x => !x)}>
          <Icon name="search" size={15} color="currentColor" />
          {visVenues ? 'Luk' : 'Slå op'}
        </button>
      </div>

      {forslag.length > 0 && (
        <div className="venue-forslag" style={{ position: 'static', marginTop: 6 }}>
          {forslag.map((f, i) => (
            <button type="button" key={i} onClick={() => {
              setForslag([])
              sæt({ sted: f.tekst, lat: f.lat, lon: f.lon, venueId: '' })
            }}>{f.tekst}</button>
          ))}
        </div>
      )}
      {søger && <p className="hint">Søger …</p>}

      {visVenues && (
        <div className="sted-venues">
          {tilstand === 'venter' && <p className="hint">Henter vores steder …</p>}
          {tilstand === 'fejl' && (
            <p className="hint" style={{ color: 'var(--red)' }}>
              Stederne kunne ikke hentes. Skriv adressen i stedet — den kan slås op.
            </p>
          )}
          {tilstand === 'klar' && (
            <>
              <input type="search" className="venue-soeg" value={søg} onChange={e => setSøg(e.target.value)}
                     placeholder="Søg efter sted eller by" aria-label="Søg i vores steder" />
              <div className="venue-liste">
                {listen.slice(0, 40).map(x => (
                  <button type="button" key={x.id}
                          className={'venue-row' + (x.id === v.venueId ? ' valgt' : '') + (erAktiv(x) ? '' : ' uafklaret')}
                          onClick={() => {
                            // Et sted der ikke er meldt aktivt, må ikke bare
                            // glide ind på en kundes side: så står der en
                            // adresse, ingen har bekræftet.
                            if (!erAktiv(x)) { setUafklaret(x); return }
                            vælgVenue(x)
                          }}>
                    <span className="venue-row-navn">
                      {x.name}
                      {!erAktiv(x) && <span className="venue-mærke">ikke aktiv</span>}
                    </span>
                    <span className="venue-row-adr">{venueAdresse(x) || 'Adresse følger'}</span>
                  </button>
                ))}
                {!listen.length && <p className="hint">Ingen af vores steder passer på det ord.</p>}
              </div>
            </>
          )}
        </div>
      )}

      {uafklaret && (
        <UafklaretVenue venue={uafklaret} onLuk={() => setUafklaret(null)}
                        onVælgAlligevel={() => vælgVenue(uafklaret)} />
      )}

      <PlacerKort lat={v.lat} lon={v.lon} onFlyt={(lat, lon) => sæt({ lat, lon })} />

      {(v.lat || v.lon) && (
        <button type="button" className="ghost-btn" style={{ marginTop: 6 }}
                onClick={() => sæt({ lat: null, lon: null })}>
          Fjern nålen
        </button>
      )}
    </div>
  )
}

/**
 * Stedet er ikke meldt aktivt endnu.
 *
 * Popup'en er ikke en advarsel man klikker væk — den er en genvej: knappen
 * fører direkte hen til netop det sted i venue-systemet, hvor det kan gøres
 * færdigt og sættes aktivt. »Vælg alligevel« findes, fordi man nogle gange
 * VED at aftalen er på plads og bare mangler at blive skrevet ind; så skal
 * en halvfærdig række i et CRM ikke stå i vejen for at få kunden videre.
 */
function UafklaretVenue({ venue, onLuk, onVælgAlligevel }) {
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <div className="sheet" style={{ maxWidth: 460 }} role="dialog" aria-modal="true"
           aria-label="Stedet er ikke aktivt endnu">
        <div className="sheet-head">
          <span className="tile-icon"><Icon name="pin" size={20} /></span>
          <div className="sheet-title">
            <h2>{venue.name}</h2>
            <span>Stedet er ikke meldt aktivt endnu</span>
          </div>
          <button className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>
        <div className="sheet-body">
          <p className="lede">
            Det her sted står stadig som et emne i venue-systemet. Gør det færdigt
            og meld det aktivt, så det er en rigtig aftale.
          </p>
          <div className="block">
            <h3>Det plejer at mangle</h3>
            <p>Adresse og placering på kort, kontaktperson til konference, og at status sættes til aktiv.</p>
          </div>
          <div className="actions">
            <a className="btn btn-primary" href={venueRedigerUrl(venue.id)} target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={18} />Åbn stedet i venue-systemet
            </a>
            <button className="btn btn-quiet" onClick={onVælgAlligevel}>Vælg alligevel</button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            Vælger du det alligevel, står adressen på kundens side med det samme — men
            stedet mangler stadig at blive gjort færdigt.
          </p>
        </div>
      </div>
    </div>
  )
}
