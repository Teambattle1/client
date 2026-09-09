import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import PlacerKort from './PlacerKort'
import { søgAdresse } from '../lib/address'
import {
  gemVenue, opretVenue, konferenceKontakt, medKontakt, venueRedigerUrl,
  STATUS_TEKST, STATUS_VALG,
} from '../lib/venues'

/**
 * Ret et sted — eller opret et nyt — uden at forlade kundeoprettelsen.
 *
 * Det er den SAMME tabel venue.eventday.dk bruger, så det, man retter her,
 * står også dér. Vi viser kun de felter, der betyder noget for et event:
 * navn, adresse, nålen, status, den ene kontakt kunden må se, og hvordan
 * man kommer ind. Alt det andet (CRM-noter, afstande, hvornår vi sidst
 * ringede) hører til i venue-appen, og der er en knap hen til det.
 *
 * `venue` = null betyder »opret nyt«. Når det er gemt, kaldes `onGemt` med
 * rækken som den ser ud nu, så listen bagved kan følge med.
 */
export default function VenueRet({ venue, onLuk, onGemt, startTekst = '' }) {
  const ny = !venue
  const kontakt = konferenceKontakt(venue) || {}
  const [f, setF] = useState({
    name: venue?.name || startTekst || '',
    address: venue?.address || '',
    postal_code: venue?.postal_code || '',
    city: venue?.city || '',
    lat: venue?.lat ?? null,
    lon: venue?.lon ?? null,
    crm_status: venue?.crm_status && STATUS_VALG.includes(venue.crm_status) ? venue.crm_status : 'lead',
    adgang_note: venue?.adgang_note || '',
    phone: venue?.phone || '',
    kName: kontakt.name || '',
    kTitle: kontakt.title || '',
    kEmail: kontakt.email || '',
    kMobile: kontakt.mobile || '',
  })
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [forslag, setForslag] = useState([])
  const [søger, setSøger] = useState(false)
  const timer = useRef(null)
  const afbryd = useRef(null)
  const navnRef = useRef(null)

  useEffect(() => { navnRef.current?.focus() }, [])
  useEffect(() => () => { clearTimeout(timer.current); afbryd.current?.abort() }, [])

  function sæt(patch) { setF(x => ({ ...x, ...patch })); if (fejl) setFejl(null) }

  function skrivAdresse(tekst) {
    sæt({ address: tekst })
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

  function vælgAdresse(a) {
    setForslag([])
    // DAWA svarer »Vej 1, 4000 By« — vejen er dét før postnummeret. Postnr
    // og by har vi hver for sig, så de går i deres egne felter.
    const post = [a.postnr, a.by].filter(Boolean).join(' ')
    let vej = a.tekst || ''
    if (post && vej.endsWith(post)) vej = vej.slice(0, -post.length).replace(/[,\s]+$/, '')
    sæt({ address: vej, postal_code: a.postnr || f.postal_code, city: a.by || f.city, lat: a.lat, lon: a.lon })
  }

  async function gem(e) {
    e.preventDefault()
    if (gemmer) return
    if (!f.name.trim()) { setFejl('Stedet skal have et navn.'); return }
    setGemmer(true)
    setFejl(null)
    try {
      const felter = {
        name: f.name, address: f.address, postal_code: f.postal_code, city: f.city,
        lat: f.lat, lon: f.lon, crm_status: f.crm_status, adgang_note: f.adgang_note, phone: f.phone,
        contacts: medKontakt(venue, { name: f.kName, title: f.kTitle, email: f.kEmail, mobile: f.kMobile }),
      }
      const gemt = ny ? await opretVenue(felter) : await gemVenue(venue.id, felter)
      onGemt(gemt)
    } catch (err) {
      setFejl('Stedet blev ikke gemt: ' + err.message)
      setGemmer(false)
    }
  }

  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <form className="sheet" role="dialog" aria-modal="true" aria-label={ny ? 'Opret sted' : 'Ret stedet'}
            onSubmit={gem}>
        <div className="sheet-head">
          <span className="tile-icon"><Icon name="pin" size={20} /></span>
          <div className="sheet-title">
            <h2>{ny ? 'Nyt sted' : f.name || venue.name}</h2>
            <span>{ny ? 'Lægges i vores steder — samme liste som venue-systemet'
                      : 'Rettelsen står også i venue-systemet med det samme'}</span>
          </div>
          <button type="button" className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>

        <div className="sheet-body">
          <div className="field">
            <label htmlFor="vr-navn">Navn</label>
            <input id="vr-navn" ref={navnRef} value={f.name} onChange={e => sæt({ name: e.target.value })}
                   placeholder="Fx Haraldskær Sinatur Hotel" autoComplete="off" />
          </div>

          <div className="field">
            <label htmlFor="vr-adresse">Adresse</label>
            <div className="venue-adr">
              <input id="vr-adresse" value={f.address} onChange={e => skrivAdresse(e.target.value)}
                     placeholder="Begynd at skrive vejnavnet …" autoComplete="off" />
              {forslag.length > 0 && (
                <div className="venue-forslag">
                  {forslag.map((a, i) => (
                    <button type="button" key={i} onClick={() => vælgAdresse(a)}>{a.tekst}</button>
                  ))}
                </div>
              )}
            </div>
            <p className="hint">{søger ? 'Søger …' : 'Vælg et forslag, så følger postnummer, by og nålen med.'}</p>
          </div>

          <div className="vr-to">
            <div className="field">
              <label htmlFor="vr-postnr">Postnr</label>
              <input id="vr-postnr" value={f.postal_code} onChange={e => sæt({ postal_code: e.target.value })}
                     inputMode="numeric" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="vr-by">By</label>
              <input id="vr-by" value={f.city} onChange={e => sæt({ city: e.target.value })} autoComplete="off" />
            </div>
          </div>

          <div className="field">
            <label>Nålen</label>
            <PlacerKort lat={f.lat} lon={f.lon} højde={190} onFlyt={(lat, lon) => sæt({ lat, lon })} />
            <p className="hint">Adressen rammer bygningen. Træk nålen hen, hvor vi faktisk mødes.</p>
          </div>

          <div className="field">
            <label htmlFor="vr-status">Status</label>
            <select id="vr-status" value={f.crm_status} onChange={e => sæt({ crm_status: e.target.value })}>
              {STATUS_VALG.map(s => <option key={s} value={s}>{STATUS_TEKST[s]}</option>)}
            </select>
            <p className="hint">Kun et <b>aktivt</b> sted kan vælges til en kunde uden videre. »På vej« er et sted, vi stadig er ved at få en aftale med.</p>
          </div>

          <div className="sec-label" style={{ marginTop: 6 }}>Kontakt til konference</div>
          <div className="vr-to">
            <div className="field">
              <label htmlFor="vr-knavn">Navn</label>
              <input id="vr-knavn" value={f.kName} onChange={e => sæt({ kName: e.target.value })} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="vr-ktitel">Rolle</label>
              <input id="vr-ktitel" value={f.kTitle} onChange={e => sæt({ kTitle: e.target.value })}
                     placeholder="Konference" autoComplete="off" />
            </div>
          </div>
          <div className="vr-to">
            <div className="field">
              <label htmlFor="vr-kmail">Mail</label>
              <input id="vr-kmail" type="email" value={f.kEmail} onChange={e => sæt({ kEmail: e.target.value })} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="vr-ktlf">Mobil</label>
              <input id="vr-ktlf" type="tel" value={f.kMobile} onChange={e => sæt({ kMobile: e.target.value })} autoComplete="off" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="vr-tlf">Stedets hovednummer</label>
            <input id="vr-tlf" type="tel" value={f.phone} onChange={e => sæt({ phone: e.target.value })} autoComplete="off" />
          </div>

          <div className="field">
            <label htmlFor="vr-adgang">Hvordan kommer man ind?</label>
            <textarea id="vr-adgang" value={f.adgang_note} onChange={e => sæt({ adgang_note: e.target.value })}
                      placeholder="Fx: kør forbi første indkørsel og ind ad næste · mødes i receptionen" />
            <p className="hint">Det her får kunden at se under »location«, så de ved, hvor de skal hen.</p>
          </div>

          {fejl && <p className="hint" style={{ color: 'var(--red)', marginBottom: 12 }}>{fejl}</p>}

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={gemmer}>
              <Icon name="check" size={18} />{gemmer ? 'Gemmer …' : ny ? 'Opret stedet' : 'Gem rettelserne'}
            </button>
            <button type="button" className="btn btn-quiet" onClick={onLuk}>Fortryd</button>
            {!ny && (
              <a className="btn btn-quiet" href={venueRedigerUrl(venue.id)} target="_blank" rel="noopener noreferrer">
                <Icon name="udad" size={16} color="currentColor" />Alt om stedet i venue-systemet
              </a>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
