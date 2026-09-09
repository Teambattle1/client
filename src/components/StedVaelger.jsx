import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import PlacerKort from './PlacerKort'
import VenueRet from './VenueRet'
import {
  hentVenues, venueAdresse, erAktiv, venueRedigerUrl, matchVenues, konferenceKontakt, STATUS_TEKST,
} from '../lib/venues'
import { søgAdresse } from '../lib/address'

/**
 * Stedet, sat af OS — med opslag i vores egne venues.
 *
 * Tre veje ind, i den rækkefølge de bruges:
 *  1. VORES STEDER: stedet ligger som regel allerede i venue-systemet med
 *     adresse og position. Så skal vi ikke skrive det af — det dukker op
 *     ØVERST, mens man taster, og alt følger med, når man vælger det. Det
 *     er også dét, der holder de to systemer enige. »Slå op« åbner hele
 *     listen, hvis man hellere vil bladre.
 *  2. ADRESSE: er det kundens egen adresse, slås den op mens man skriver,
 *     og positionen kommer med.
 *  3. NÅLEN: en adresse rammer bygningen, ikke mødestedet. Den sidste
 *     justering sker på kortet.
 *
 * Et sted kan RETTES herfra — og et nyt kan oprettes — uden at forlade
 * kundeoprettelsen. Det skriver i samme tabel som venue.eventday.dk.
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
  // Arket der retter/opretter: { venue } eller { venue: null } for nyt.
  const [retter, setRetter] = useState(null)
  const [forslag, setForslag] = useState([])
  const [søger, setSøger] = useState(false)
  const [skriver, setSkriver] = useState(false)   // forslag vises kun mens man taster
  const timer = useRef(null)
  const afbryd = useRef(null)

  function sæt(patch) { onÆndre({ ...v, ...patch }) }

  function vælgVenue(x) {
    setVisVenues(false)
    setForslag([])
    setSkriver(false)
    setUafklaret(null)
    sæt({
      venueId: x.id,
      // Navn OG adresse: det er navnet, folk kender stedet på, og adressen
      // de skal køre efter.
      sted: [x.name, venueAdresse(x)].filter(Boolean).join(', '),
      lat: x.lat ?? null, lon: x.lon ?? null,
    })
  }

  // Stederne hentes med det samme: de skal ligge klar, når man begynder
  // at taste, ikke først når man klikker »Slå op«.
  useEffect(() => {
    let død = false
    hentVenues({ alle: true })
      .then(l => { if (!død) { setVenues(l); setTilstand('klar') } })
      .catch(() => { if (!død) setTilstand('fejl') })
    return () => { død = true }
  }, [])

  useEffect(() => () => { clearTimeout(timer.current); afbryd.current?.abort() }, [])

  function skrivAdresse(tekst) {
    // Positionen nulstilles IKKE med det samme: skriver man et hus­nummer om,
    // skal nålen ikke forsvinde, før der er en ny at sætte i stedet.
    sæt({ sted: tekst, venueId: '' })
    setSkriver(true)
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

  /** Efter et sted er gemt: listen følger med, og er det dét valgte, følger
   *  navn, adresse og nål også med ud i kundens felt. */
  function stedGemt(x) {
    setVenues(l => {
      const findes = l.some(y => y.id === x.id)
      const ny = findes ? l.map(y => y.id === x.id ? x : y) : [...l, x]
      return ny.sort((a, b) => String(a.name).localeCompare(String(b.name), 'da'))
    })
    setRetter(null)
    setUafklaret(null)
    if (retter && (retter.vælgEfter || x.id === v.venueId)) vælgVenue(x)
  }

  const valgt = v.venueId ? venues.find(x => x.id === v.venueId) : null
  // Står stedet som ren tekst, men hedder det det samme som et af vores?
  // Så er det formentlig skrevet ind, før man kunne vælge fra listen — og
  // ét tryk kobler det til, så kontakt og ankomst følger med.
  const stedTekst = String(v.sted || '').trim().toLowerCase()
  const gæt = !v.venueId && stedTekst.length >= 4
    ? venues.find(x => { const n = String(x.name || '').toLowerCase(); return n.length >= 4 && (stedTekst.startsWith(n) || n.startsWith(stedTekst)) })
    : null
  const kontakt = valgt ? konferenceKontakt(valgt) : null

  // Vores steder, mens man taster — kun når feltet ikke allerede peger på ét.
  const egne = skriver && !v.venueId ? matchVenues(venues, v.sted) : []
  const viserForslag = egne.length > 0 || forslag.length > 0

  const q = søg.toLowerCase().trim()
  const listen = venues.filter(x => !q || `${x.name || ''} ${venueAdresse(x)}`.toLowerCase().includes(q))

  return (
    <div className="sted-vælger">
      <div className="sted-række">
        <input
          id="n-sted"
          value={v.sted || ''}
          onChange={e => skrivAdresse(e.target.value)}
          onBlur={() => setTimeout(() => setSkriver(false), 150)}
          onFocus={() => { if (!v.venueId && (v.sted || '').length >= 2) setSkriver(true) }}
          placeholder="Skriv stedets navn eller en adresse"
          autoComplete="off"
          aria-label="Sted"
        />
        <button type="button" className="ghost-btn" onClick={() => setVisVenues(x => !x)}>
          <Icon name="search" size={15} color="currentColor" />
          {visVenues ? 'Luk' : 'Slå op'}
        </button>
      </div>

      {viserForslag && (
        <div className="venue-forslag" style={{ position: 'static', marginTop: 6 }}>
          {egne.length > 0 && <div className="forslag-sektion">Vores steder</div>}
          {egne.map(x => (
            <button type="button" key={x.id} className="forslag-venue"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { if (!erAktiv(x)) { setUafklaret(x); setSkriver(false); return } vælgVenue(x) }}>
              <span className="venue-row-navn">
                {x.name}
                {!erAktiv(x) && <span className="venue-mærke">{STATUS_TEKST[x.crm_status] || 'ikke aktiv'}</span>}
              </span>
              <span className="venue-row-adr">{venueAdresse(x) || 'Adresse følger'}</span>
            </button>
          ))}
          {forslag.length > 0 && egne.length > 0 && <div className="forslag-sektion">Adresser</div>}
          {forslag.map((f, i) => (
            <button type="button" key={i} onMouseDown={e => e.preventDefault()} onClick={() => {
              setForslag([])
              setSkriver(false)
              sæt({ sted: f.tekst, lat: f.lat, lon: f.lon, venueId: '' })
            }}>{f.tekst}</button>
          ))}
        </div>
      )}
      {søger && <p className="hint">Søger …</p>}
      {skriver && !søger && !viserForslag && (v.sted || '').trim().length >= 3 && tilstand === 'klar' && (
        <p className="hint">
          Ikke et af vores steder.{' '}
          <button type="button" className="link-btn" onMouseDown={e => e.preventDefault()}
                  onClick={() => setRetter({ venue: null, vælgEfter: true })}>
            Opret »{v.sted.trim()}« som nyt sted
          </button>
        </p>
      )}

      {gæt && !skriver && (
        <div className="sted-valgt sted-gaet">
          <div className="sted-valgt-tekst">
            <b>Er det {gæt.name}?</b>
            <span>Stedet står som tekst — kobl det til vores sted, så følger kontakt og ankomst med.</span>
          </div>
          <button type="button" className="ghost-btn" onClick={() => { if (!erAktiv(gæt)) { setUafklaret(gæt); return } vælgVenue(gæt) }}>
            <Icon name="check" size={14} color="currentColor" />Kobl til
          </button>
        </div>
      )}

      {valgt && (
        <div className="sted-valgt">
          <div className="sted-valgt-tekst">
            <b>
              {valgt.name}
              {!erAktiv(valgt) && <span className="venue-mærke">{STATUS_TEKST[valgt.crm_status] || 'ikke aktiv'}</span>}
            </b>
            <span>{venueAdresse(valgt) || 'Adresse mangler'}</span>
            <span>{kontakt ? `${kontakt.name}${kontakt.mobile ? ' · ' + kontakt.mobile : ''}` : 'Ingen kontaktperson endnu'}</span>
          </div>
          <button type="button" className="ghost-btn" onClick={() => setRetter({ venue: valgt })}>
            <Icon name="pen" size={14} color="currentColor" />Ret stedet
          </button>
        </div>
      )}

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
                {listen.slice(0, 60).map(x => (
                  <div key={x.id}
                       className={'venue-row' + (x.id === v.venueId ? ' valgt' : '') + (erAktiv(x) ? '' : ' uafklaret')}>
                    <button type="button" className="venue-row-vaelg"
                            onClick={() => {
                              // Et sted der ikke er meldt aktivt, må ikke bare
                              // glide ind på en kundes side: så står der en
                              // adresse, ingen har bekræftet.
                              if (!erAktiv(x)) { setUafklaret(x); return }
                              vælgVenue(x)
                            }}>
                      <span className="venue-row-navn">
                        {x.name}
                        {!erAktiv(x) && <span className="venue-mærke">{STATUS_TEKST[x.crm_status] || 'ikke aktiv'}</span>}
                      </span>
                      <span className="venue-row-adr">{venueAdresse(x) || 'Adresse følger'}</span>
                    </button>
                    <button type="button" className="venue-row-ret" aria-label={'Ret ' + x.name}
                            title="Ret stedet" onClick={() => setRetter({ venue: x })}>
                      <Icon name="pen" size={15} color="currentColor" />
                    </button>
                  </div>
                ))}
                {!listen.length && <p className="hint">Ingen af vores steder passer på det ord.</p>}
              </div>
              <button type="button" className="ghost-btn" style={{ marginTop: 9 }}
                      onClick={() => setRetter({ venue: null, startTekst: q ? søg.trim() : '', vælgEfter: true })}>
                <Icon name="plus" size={14} color="currentColor" />Opret nyt sted
              </button>
            </>
          )}
        </div>
      )}

      {uafklaret && (
        <UafklaretVenue venue={uafklaret} onLuk={() => setUafklaret(null)}
                        onRet={() => { setRetter({ venue: uafklaret, vælgEfter: true }); setUafklaret(null) }}
                        onVælgAlligevel={() => vælgVenue(uafklaret)} />
      )}

      {retter && (
        <VenueRet venue={retter.venue} startTekst={retter.startTekst ?? (v.venueId ? '' : (v.sted || ''))}
                  onLuk={() => setRetter(null)} onGemt={stedGemt} />
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
 * åbner stedet til rettelse lige her, hvor det kan gøres færdigt og sættes
 * aktivt. »Vælg alligevel« findes, fordi man nogle gange VED at aftalen er
 * på plads og bare mangler at blive skrevet ind; så skal en halvfærdig
 * række i et CRM ikke stå i vejen for at få kunden videre.
 */
function UafklaretVenue({ venue, onLuk, onRet, onVælgAlligevel }) {
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <div className="sheet" style={{ maxWidth: 460 }} role="dialog" aria-modal="true"
           aria-label="Stedet er ikke aktivt endnu">
        <div className="sheet-head">
          <span className="tile-icon"><Icon name="pin" size={20} /></span>
          <div className="sheet-title">
            <h2>{venue.name}</h2>
            <span>Stedet er {STATUS_TEKST[venue.crm_status]?.toLowerCase() || 'ikke aktivt'} — ikke meldt aktivt endnu</span>
          </div>
          <button className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>
        <div className="sheet-body">
          <p className="lede">
            Det her sted står stadig som et emne i venue-systemet. Gør det færdigt
            og sæt status til aktiv, så det er en rigtig aftale.
          </p>
          <div className="block">
            <h3>Det plejer at mangle</h3>
            <p>Adresse og placering på kort, kontaktperson til konference, og at status sættes til aktiv.</p>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={onRet}>
              <Icon name="pen" size={18} />Gør det færdigt her
            </button>
            <button className="btn btn-quiet" onClick={onVælgAlligevel}>Vælg alligevel</button>
            <a className="btn btn-quiet" href={venueRedigerUrl(venue.id)} target="_blank" rel="noopener noreferrer">
              <Icon name="udad" size={16} color="currentColor" />Venue-systemet
            </a>
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
