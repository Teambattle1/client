import { useRef, useState } from 'react'
import Icon from '../lib/icons'
import { danskDato, dageTil, initialer } from '../lib/format'

/**
 * Én kunde i listen — og det lange tryk, der fjerner den.
 *
 * HVORFOR ET LANGT TRYK OG IKKE EN KNAP: rækken er lille, og en rød knap på
 * hver linje ville sidde en tommelfinger fra den række, man egentlig ville
 * åbne. Et hold er to bevidste handlinger i sig selv — man rammer den ikke
 * ved et uheld — og det er DEN ENESTE vej til at fjerne en kunde; der er
 * ingen sletteknap andre steder i portalen.
 *
 * Fire ting gør gestussen brugbar frem for irriterende:
 *  · den ANNONCERES synligt under listen (en tooltip er usynlig på en telefon)
 *  · den afbrydes, hvis fingeren FLYTTER SIG — ellers ville det at rulle i
 *    listen åbne dialoger
 *  · trykket der følger efter et hold, sluges, så rækken ikke også åbner
 *  · iOS' egen »Kopier«-boble slås fra på rækken; ellers lægger den sig oven
 *    på vores dialog, præcis som på en almindelig tekst
 */

const HOLD_MS = 650
const FLYT_GRÆNSE = 10   // px — over det er det en rulning, ikke et hold

export default function KundeRaekke({ kunde, onÅbn, onFjern, onGendan }) {
  const [holder, setHolder] = useState(false)
  const timer = useRef(null)
  const start = useRef(null)
  const fyret = useRef(false)

  const dage = dageTil(kunde.eventDate)
  const skjult = !!kunde.skjult

  function stop() {
    clearTimeout(timer.current)
    timer.current = null
    setHolder(false)
  }

  function ned(e) {
    if (e.button != null && e.button !== 0) return   // højreklik har sin egen vej
    fyret.current = false
    start.current = { x: e.clientX, y: e.clientY }
    setHolder(true)
    timer.current = setTimeout(() => {
      fyret.current = true
      setHolder(false)
      skjult ? onGendan?.(kunde) : onFjern?.(kunde)
    }, HOLD_MS)
  }

  function bevæg(e) {
    if (!timer.current || !start.current) return
    const væk = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y)
    if (væk > FLYT_GRÆNSE) stop()
  }

  return (
    <button
      className={'crow' + (holder ? ' holder' : '') + (skjult ? ' skjult' : '')}
      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
      onPointerDown={ned}
      onPointerMove={bevæg}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={e => { e.preventDefault(); skjult ? onGendan?.(kunde) : onFjern?.(kunde) }}
      onClick={() => { if (fyret.current) { fyret.current = false; return } onÅbn(kunde) }}
    >
      <span className="crow-mark">{initialer(kunde.firma)}</span>
      <span className="crow-main">
        <b>
          {kunde.firma || 'Uden navn'}
          {skjult && <span className="crow-mærke">skjult</span>}
        </b>
        <span>{kunde.eventTitle || 'Event ikke navngivet'} · {danskDato(kunde.eventDate)}</span>
      </span>
      <span className="crow-side">
        <span className="code">{kunde.code}</span>
        <span>{skjult ? 'hold for at gendanne' : (dage !== null && dage >= 0 ? `om ${dage} dage` : 'afholdt')}</span>
      </span>
      {holder && <span className="crow-hold" aria-hidden="true" />}
    </button>
  )
}

/**
 * Advarslen. Den fortæller hvad der SKER — ikke bare »er du sikker?«.
 *
 * Tre ting skal stå der, fordi de er hele forskellen på en tryg og en utryg
 * knap: kundens link holder op med at virke, deres egne svar bliver liggende,
 * og vi kan hente dem tilbage. Det sidste er grunden til, at knappen ikke er
 * skræmmende rød med store bogstaver: det ER til at fortryde.
 */
export function FjernKundeDialog({ kunde, arbejder, fejl, onFjern, onLuk }) {
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <div className="sheet" style={{ maxWidth: 440 }} role="dialog" aria-modal="true"
           aria-label={'Fjern ' + (kunde.firma || 'kunden')}>
        <div className="sheet-head">
          <span className="tile-icon fare"><Icon name="close" size={20} /></span>
          <div className="sheet-title">
            <h2>Fjern {kunde.firma || 'kunden'}?</h2>
            <span>Kode {kunde.code}</span>
          </div>
          <button className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>
        <div className="sheet-body">
          <div className="advarsel">
            <p><b>Kundens link holder op med at virke.</b> Taster de deres kode, får de
              samme svar som ved en forkert kode.</p>
            <p>Kunden forsvinder fra listen her, men <b>intet bliver slettet</b> — deres
              svar, kontakter og aktivitet bliver liggende.</p>
            <p>Du kan hente kunden tilbage: tryk <b>vis fjernede</b> nederst i listen
              og hold på rækken igen.</p>
          </div>
          {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 10 }}>{fejl}</p>}
          <div className="actions">
            <button className="btn btn-fare" onClick={onFjern} disabled={arbejder}>
              {arbejder ? 'Fjerner …' : 'Fjern kunden'}
            </button>
            <button className="btn btn-quiet" onClick={onLuk}>Fortryd</button>
          </div>
        </div>
      </div>
    </div>
  )
}
