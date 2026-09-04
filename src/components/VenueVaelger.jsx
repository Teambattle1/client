import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import MiniKort from './MiniKort'
import { hentVenues, venueAdresse, erAktiv, venueRedigerUrl } from '../lib/venues'
import { søgAdresse } from '../lib/address'

/**
 * »Hvor skal det foregå?« — ét spørgsmål med to svar.
 *
 * ET AF VORES STEDER: kunden vælger fra listen, og resten er udfyldt på
 * forhånd — adresse, kort, og en konferencekonsulent vi selv tager fat i.
 * De skal ikke aftale noget med stedet.
 *
 * JERES EGEN LOCATION: adressen slås op, sættes på kortet, og så ét felt
 * mere: hvordan kommer vi ind. Det er dét spørgsmål der ellers bliver
 * ringet om klokken syv om morgenen — »vi står ved en låst port«.
 *
 * Svaret er ét objekt: { valg, venueId, adresse, lat, lon, adgang }.
 */

export default function VenueVaelger({ værdi, onÆndre, admin }) {
  const v = værdi || {}
  const [venues, setVenues] = useState([])
  const [tilstand, setTilstand] = useState('venter')  // venter | klar | fejl
  const [søg, setSøg] = useState('')
  // Et sted vi endnu ikke har gjort færdigt. Sat, når VI vælger et af dem.
  const [uafklaret, setUafklaret] = useState(null)

  // Adressesøgning
  const [adrTekst, setAdrTekst] = useState(v.adresse || '')
  const [forslag, setForslag] = useState([])
  const [søger, setSøger] = useState(false)
  const afbryd = useRef(null)
  const timer = useRef(null)
  const valgtSelv = useRef(!!v.adresse)

  function sæt(patch) { onÆndre({ ...v, ...patch }) }

  useEffect(() => {
    let død = false
    hentVenues({ alle: !!admin })
      .then(liste => { if (!død) { setVenues(liste); setTilstand('klar') } })
      .catch(() => { if (!død) setTilstand('fejl') })
    return () => { død = true }
  }, [admin])

  useEffect(() => () => { clearTimeout(timer.current); afbryd.current?.abort() }, [])

  function skrivAdresse(tekst) {
    setAdrTekst(tekst)
    valgtSelv.current = false
    sæt({ adresse: tekst, lat: null, lon: null })
    clearTimeout(timer.current)
    afbryd.current?.abort()
    if (tekst.trim().length < 3) { setForslag([]); setSøger(false); return }
    setSøger(true)
    // Vent til de holder op med at taste: DAWA svarer på et opslag pr.
    // tastetryk, og en halvskrevet adresse giver alligevel ingen forslag.
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController()
      afbryd.current = ctrl
      const r = await søgAdresse(tekst, ctrl.signal)
      if (ctrl.signal.aborted) return
      setForslag(r)
      setSøger(false)
    }, 350)
  }

  function vælgForslag(f) {
    valgtSelv.current = true
    setAdrTekst(f.tekst)
    setForslag([])
    sæt({ adresse: f.tekst, lat: f.lat, lon: f.lon })
  }

  const valgtVenue = venues.find(x => x.id === v.venueId) || null
  const q = søg.toLowerCase().trim()
  const listen = venues.filter(x => !q ||
    `${x.name || ''} ${venueAdresse(x)}`.toLowerCase().includes(q))

  return (
    <div className="venue">
      <div className="venue-valg">
        <button
          type="button"
          className={'venue-knap' + (v.valg === 'vores' ? ' valgt' : '')}
          onClick={() => sæt({ valg: 'vores' })}
        >
          <Icon name="pin" size={18} color="currentColor" />
          Et sted vi har
        </button>
        <button
          type="button"
          className={'venue-knap' + (v.valg === 'egen' ? ' valgt' : '')}
          onClick={() => sæt({ valg: 'egen' })}
        >
          <Icon name="marker" size={18} color="currentColor" />
          Vores egen location
        </button>
      </div>

      {/* ---------- et af vores steder ---------- */}
      {v.valg === 'vores' && (
        <div className="venue-panel">
          {tilstand === 'venter' && <p className="hint">Henter stederne …</p>}

          {tilstand === 'fejl' && (
            <p className="hint" style={{ color: 'var(--red)' }}>
              Listen over steder kunne ikke hentes lige nu. Prøv igen om lidt —
              eller vælg »vores egen location« og skriv adressen.
            </p>
          )}

          {tilstand === 'klar' && !venues.length && (
            <p className="hint">
              Der er ingen steder på listen endnu. Vælg »vores egen location«, eller ring til os.
            </p>
          )}

          {tilstand === 'klar' && venues.length > 0 && (
            <>
              {venues.length > 6 && (
                <input
                  type="search"
                  className="venue-soeg"
                  value={søg}
                  onChange={e => setSøg(e.target.value)}
                  placeholder="Søg efter sted eller by"
                />
              )}
              <div className="venue-liste">
                {listen.map(x => (
                  <button
                    type="button"
                    key={x.id}
                    className={'venue-row' + (x.id === v.venueId ? ' valgt' : '') + (erAktiv(x) ? '' : ' uafklaret')}
                    onClick={() => {
                      // Et sted der ikke er meldt aktivt, må ikke bare glide
                      // ind på en kundes side: så står der en adresse, ingen
                      // har bekræftet. Vi sendes hen for at gøre det færdigt.
                      if (!erAktiv(x)) { setUafklaret(x); return }
                      sæt({ venueId: x.id, adresse: '', lat: null, lon: null })
                    }}
                  >
                    <span className="venue-row-navn">
                      {x.name}
                      {!erAktiv(x) && <span className="venue-mærke">ikke aktiv</span>}
                    </span>
                    <span className="venue-row-adr">{venueAdresse(x) || 'Adresse følger'}</span>
                  </button>
                ))}
                {!listen.length && <p className="hint">Ingen steder passer på det ord.</p>}
              </div>
            </>
          )}

          {valgtVenue && (
            <div className="venue-valgt">
              <b>{valgtVenue.name}</b>
              <span>{venueAdresse(valgtVenue)}</span>
              <MiniKort lat={valgtVenue.lat} lon={valgtVenue.lon} højde={150} />
              <p className="hint" style={{ marginTop: 10 }}>
                I skal ikke aftale noget med stedet — vi tager fat i dem og
                arrangerer det praktiske. I finder deres kontaktperson under Location.
              </p>
            </div>
          )}
        </div>
      )}

      {uafklaret && (
        <UafklaretVenue
          venue={uafklaret}
          onLuk={() => setUafklaret(null)}
          onVælgAlligevel={() => {
            sæt({ venueId: uafklaret.id, adresse: '', lat: null, lon: null })
            setUafklaret(null)
          }}
        />
      )}

      {/* ---------- kundens egen location ---------- */}
      {v.valg === 'egen' && (
        <div className="venue-panel">
          <label className="venue-label" htmlFor="venue-adresse">Adresse</label>
          <div className="venue-adr">
            <input
              id="venue-adresse"
              type="text"
              autoComplete="off"
              value={adrTekst}
              onChange={e => skrivAdresse(e.target.value)}
              placeholder="Begynd at skrive vejnavnet …"
            />
            {forslag.length > 0 && (
              <div className="venue-forslag">
                {forslag.map((f, i) => (
                  <button type="button" key={i} onClick={() => vælgForslag(f)}>{f.tekst}</button>
                ))}
              </div>
            )}
          </div>
          <p className="hint">
            {søger ? 'Søger …'
              : v.lat ? 'Adressen er sat på kortet.'
              : 'Vælg et forslag, så vi er sikre på at vi kører det rigtige sted hen.'}
          </p>

          <MiniKort lat={v.lat} lon={v.lon} højde={170} />

          <label className="venue-label" htmlFor="venue-adgang" style={{ marginTop: 14 }}>
            Hvordan kommer vi ind?
          </label>
          <textarea
            id="venue-adgang"
            value={v.adgang || ''}
            onChange={e => sæt({ adgang: e.target.value })}
            placeholder="Fx: mødes i receptionen · kør til Port 2 og ring på · nøglekort hentes hos vagten"
          />
          <p className="hint">
            Vi ankommer 45 minutter før med udstyr. Skriv hvor vi holder, og hvem vi spørger efter.
          </p>
        </div>
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
            og meld det aktivt, så kan det vælges — også af kunderne selv.
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
            Vælger du det alligevel, kan kunden se adressen med det samme — men
            stedet mangler stadig at blive gjort færdigt.
          </p>
        </div>
      </div>
    </div>
  )
}
