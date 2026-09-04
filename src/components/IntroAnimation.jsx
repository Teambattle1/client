import { useEffect, useRef, useState } from 'react'
import '../styles/intro.css'

/**
 * Husets intro — samme som TeamTracks og EventFlows, i EventDays farver.
 *
 * Den kører ÉN gang pr. fane (sessionStorage), ikke ved hver navigation:
 * portalen er noget kunden åbner igen og igen for at tjekke en detalje, og
 * en femsekunders skærm hver gang ville blive til noget man skynder sig
 * forbi frem for noget man lægger mærke til.
 *
 * Tre veje udenom, og de er der med vilje:
 *  · et tryk (eller Enter/mellemrum) springer over — den er ALDRIG en dør
 *    man skal vente ved
 *  · ?skip_intro=1 i adressen, til demoer og skærmbilleder
 *  · beder enheden om mindre bevægelse, springes den helt over: en kunde
 *    der får kvalme af animationer skal ikke sidde igennem den for at nå
 *    sit program
 */

const SESSION_KEY = 'ed_intro_seen'
const TOTAL_MS = 5200

// Håndlagt spredning, samme som i TeamTrack — jævnt fordelt uden at ligne
// et gitter. To varigheder pr. partikel: drift og blink.
const PARTICLES = [
  { left: '10%', top: '80%', delay: '0s,.2s',    dur: '9s,2.4s' },
  { left: '18%', top: '65%', delay: '1.1s,.7s',  dur: '11s,1.8s' },
  { left: '25%', top: '45%', delay: '.4s,1.3s',  dur: '10s,2.9s' },
  { left: '32%', top: '72%', delay: '2s,.5s',    dur: '12s,2.2s' },
  { left: '40%', top: '30%', delay: '.9s,1.8s',  dur: '9.5s,2.6s' },
  { left: '48%', top: '85%', delay: '1.6s,.3s',  dur: '10.5s,1.9s' },
  { left: '55%', top: '55%', delay: '.2s,2.1s',  dur: '11.5s,2.7s' },
  { left: '62%', top: '22%', delay: '2.4s,1s',   dur: '9.8s,2.3s' },
  { left: '70%', top: '78%', delay: '.6s,.4s',   dur: '10.8s,2.1s' },
  { left: '78%', top: '40%', delay: '1.3s,1.6s', dur: '11.2s,2.8s' },
  { left: '85%', top: '68%', delay: '.1s,.9s',   dur: '9.3s,2s' },
  { left: '90%', top: '25%', delay: '1.9s,1.4s', dur: '10.2s,2.5s' },
  { left: '5%',  top: '35%', delay: '1.5s,.6s',  dur: '11.8s,2.3s' },
  { left: '50%', top: '15%', delay: '.7s,1.1s',  dur: '9.6s,2.7s' },
  { left: '75%', top: '90%', delay: '2.2s,1.9s', dur: '10.6s,2s' },
]

/** Skal den overhovedet vises? Afgøres FØR første tegning, så skærmen
 *  aldrig når at blinke sort på en tur hvor intro'en er sprunget over. */
export function shouldPlayIntro(search, storage, reducedMotion, sti) {
  try {
    // Print-siden er en OPGAVE, ikke en ankomst. Og værre: intro'en er et
    // fuldskærmslag, så trykker man print mens den kører, kan den ende med
    // at blive den første side i PDF'en.
    if (/\/print\/?$/.test(String(sti || ''))) return false
    if (new URLSearchParams(search || '').has('skip_intro')) return false
    if (reducedMotion) return false
    return storage?.getItem(SESSION_KEY) !== '1'
  } catch {
    // Privat vindue uden lager: vis den, men husk den så ikke. Bedre end
    // at skjule husets intro på grund af en browserindstilling.
    return true
  }
}

export default function IntroAnimation({ onDone }) {
  const [gone, setGone] = useState(() => !shouldPlayIntro(
    typeof window === 'undefined' ? '' : window.location.search,
    typeof window === 'undefined' ? null : window.sessionStorage,
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    typeof window === 'undefined' ? '' : window.location.pathname,
  ))
  const doneRef = useRef(gone)

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* privat vindue */ }
    setGone(true)
    onDone?.()
  }

  useEffect(() => {
    if (gone) { onDone?.(); return }
    const t = window.setTimeout(finish, TOTAL_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null

  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''

  return (
    <div
      className="intro-overlay"
      role="button"
      tabIndex={0}
      aria-label="Spring introen over"
      onClick={finish}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish() }
      }}
    >
      <div className="intro-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="intro-particle"
            style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur }}
          />
        ))}
      </div>

      <div className="intro-skip">Tryk for at springe over</div>

      <div className="intro-logo">
        <span className="w">EVENT</span><span className="o">DAY</span>
      </div>
      <div className="intro-sub">
        <span className="by">by </span>
        <span className="w">TEAM</span><span className="o">BATTLE</span>
      </div>
      <div className="intro-line" />

      {version && <div className="intro-version" aria-label={`Version ${version}`}>v{version}</div>}
    </div>
  )
}
