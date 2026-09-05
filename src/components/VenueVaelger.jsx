import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import MiniKort from './MiniKort'
import { søgAdresse } from '../lib/address'

/**
 * »Hvor skal det foregå?« — kundens halvdel af spørgsmålet.
 *
 * HAR VI SAT STEDET, ER DET IKKE ET SPØRGSMÅL. Så står adressen og kortet
 * der som en oplysning, og der er ingen knap, der lader kunden vælge noget
 * andet. Det er ikke for at holde dem udenfor: vi kører ud med udstyr,
 * ruter og opgaver, der er bundet til netop dét sted, og en ændring er en
 * aftale, vi skal have taget sammen — ikke et tryk på en telefon aftenen
 * før. Derfor står nummeret i stedet for en knap.
 *
 * HAR VI IKKE SAT NOGET (kunden holder det selv hjemme), slår de deres egen
 * adresse op, og vi spørger om det ene, kun de ved: hvordan kommer vi ind.
 *
 * Kunden vælger ALDRIG mellem vores venues. Den liste er vores
 * arbejdsredskab og rummer steder, vi endnu kun forhandler med.
 *
 * Svaret er ét objekt: { valg, venueId, adresse, lat, lon, adgang }. `valg`
 * og `venueId` skrives ikke længere herfra, men LÆSES stadig: kunder der
 * nåede at vælge et af vores steder, før vi lavede det om, skal stadig se
 * deres eget svar.
 */

export default function VenueVaelger({ værdi, onÆndre, voresSted }) {
  const v = værdi || {}
  const vores = voresSted && String(voresSted.sted || '').trim() ? voresSted : null

  const [adrTekst, setAdrTekst] = useState(v.adresse || '')
  const [forslag, setForslag] = useState([])
  const [søger, setSøger] = useState(false)
  const afbryd = useRef(null)
  const timer = useRef(null)

  function sæt(patch) { onÆndre({ ...v, ...patch }) }

  useEffect(() => () => { clearTimeout(timer.current); afbryd.current?.abort() }, [])

  function skrivAdresse(tekst) {
    setAdrTekst(tekst)
    sæt({ valg: 'egen', adresse: tekst, lat: null, lon: null, venueId: '' })
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

  /* ---------- stedet er sat af os: kun kort og adresse ---------- */
  if (vores) {
    return (
      <div className="venue">
        <div className="vores-sted">
          <span className="vores-sted-ikon"><Icon name="pin" size={18} /></span>
          <div>
            <b>{vores.sted}</b>
            <span>Stedet er aftalt — I skal ikke gøre mere her.</span>
          </div>
        </div>
        <MiniKort lat={vores.lat} lon={vores.lon} højde={150} />
        <p className="hint" style={{ marginTop: 8 }}>
          Skal mødestedet flyttes, så ring til os på 40 27 40 27 — så retter vi det.
          Udstyr, ruter og opgaver hænger sammen med stedet, så det skal vi vide i god tid.
        </p>

        {/* Er stedet ET AF VORES, aftaler vi det praktiske med dem selv. Er
            det derimod kundens eget hus, ved KUN de, hvordan vi kommer ind. */}
        {!vores.venueId && <Adgang v={v} sæt={sæt} />}
      </div>
    )
  }

  /* ---------- kundens egen location ---------- */
  return (
    <div className="venue">
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
                <button type="button" key={i} onClick={() => {
                  setAdrTekst(f.tekst)
                  setForslag([])
                  sæt({ valg: 'egen', adresse: f.tekst, lat: f.lat, lon: f.lon, venueId: '' })
                }}>{f.tekst}</button>
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

        <Adgang v={v} sæt={sæt} />
      </div>
    </div>
  )
}

/** Det ene spørgsmål kun kunden kan svare på. */
function Adgang({ v, sæt }) {
  return (
    <>
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
    </>
  )
}
