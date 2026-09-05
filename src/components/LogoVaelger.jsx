import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import { søgLogoer, lægLogoOp } from '../lib/logo'

/**
 * Vælg kundens logo — find det, vi allerede har, eller læg et op.
 *
 * Rækkefølgen er med vilje: vi LEDER først. Firmaet ligger som regel i
 * EventFlow med et logo på, og bruger vi dét, står det samme mærke på
 * tilbuddet og på portalen. Først når der ikke er noget at finde, er det en
 * fil man skal ud at hente.
 *
 * Søgningen kører af sig selv, når firmanavnet er skrevet — ét felt mindre
 * at huske. Den kan ikke fejle højlydt: uden forslag står upload-knappen der
 * bare alene.
 */
export default function LogoVaelger({ firma, værdi, onÆndre, kode }) {
  const [forslag, setForslag] = useState([])
  const [søger, setSøger] = useState(false)
  const [søgt, setSøgt] = useState('')
  const [fejl, setFejl] = useState(null)
  const [lægger, setLægger] = useState(false)
  const [døde, setDøde] = useState({})   // forslag der ikke kunne hentes
  const [dødtValg, setDødtValg] = useState(false)
  const filRef = useRef(null)
  const timer = useRef(null)

  const navn = String(firma || '').trim()

  // Vent til firmanavnet står stille. Ellers søger vi på »N«, »No«, »Nor« …
  useEffect(() => {
    clearTimeout(timer.current)
    if (værdi || navn.length < 3 || navn === søgt) return
    timer.current = setTimeout(async () => {
      setSøger(true)
      const r = await søgLogoer(navn).catch(() => [])
      setForslag(r)
      setSøgt(navn)
      setSøger(false)
    }, 600)
    return () => clearTimeout(timer.current)
  }, [navn, værdi, søgt])

  async function vælgFil(e) {
    const fil = e.target.files?.[0]
    e.target.value = ''
    if (!fil) return
    setLægger(true); setFejl(null)
    try {
      const { url } = await lægLogoOp(fil, kode)
      setDødtValg(false)
      onÆndre(url)
    } catch (err) {
      setFejl(err.message)
    } finally {
      setLægger(false)
    }
  }

  const levende = forslag.filter(f => !døde[f.url])

  return (
    <div className="logo-vælger">
      {værdi ? (
        <div className="logo-valgt">
          {/* Kan billedet ikke hentes lige nu, KASSERER vi ikke valget. En
              dårlig forbindelse er ikke det samme som et forkert logo, og et
              valg der forsvinder af sig selv er værre end et der ikke kan
              tegnes: næste gang siden åbnes, er adressen måske fin igen. */}
          <span className={'logo-plade' + (dødtValg ? ' tom' : '')}>
            {dødtValg
              ? <Icon name="form" size={18} color="currentColor" />
              : <img src={værdi} alt="" onError={() => setDødtValg(true)} />}
          </span>
          <div className="logo-valgt-tekst">
            <b>{dødtValg ? 'Logo valgt, men kan ikke vises' : 'Logo valgt'}</b>
            <span>{dødtValg
              ? 'Adressen er gemt. Tjek den, eller læg en fil op i stedet.'
              : 'Det står øverst på kundens side.'}</span>
          </div>
          <button type="button" className="ghost-btn"
                  onClick={() => { onÆndre(''); setSøgt(''); setDødtValg(false) }}>Fjern</button>
        </div>
      ) : (
        <>
          {søger && <p className="hint">Leder efter {navn}s logo …</p>}

          {!søger && levende.length > 0 && (
            <>
              <div className="logo-forslag">
                {levende.map(f => (
                  <button type="button" key={f.url} className="logo-emne" title={`${f.navn} · ${f.kilde}`}
                          onClick={() => onÆndre(f.url)}>
                    <img src={f.url} alt="" loading="lazy"
                         onError={() => setDøde(d => ({ ...d, [f.url]: true }))} />
                    <span>{f.kilde}</span>
                  </button>
                ))}
              </div>
              <p className="hint">Tryk på det rigtige — eller læg jeres eget op.</p>
            </>
          )}

          {!søger && navn.length >= 3 && levende.length === 0 && (
            <p className="hint">
              Vi har ikke noget logo på {navn}. Læg et op, så står det på deres side.
            </p>
          )}
          {navn.length < 3 && <p className="hint">Skriv firmanavnet, så leder vi efter logoet.</p>}
        </>
      )}

      {fejl && <p style={{ color: 'var(--red)', fontSize: 13.5, marginTop: 6 }}>{fejl}</p>}

      <div className="actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-quiet" disabled={lægger} onClick={() => filRef.current?.click()}>
          <Icon name="plus" size={16} color="currentColor" />
          {lægger ? 'Lægger op …' : værdi ? 'Vælg en anden fil' : 'Læg logo op'}
        </button>
        {!værdi && navn.length >= 3 && !søger && (
          <button type="button" className="ghost-btn" onClick={() => { setSøgt(''); setDøde({}) }}>Søg igen</button>
        )}
      </div>

      <input ref={filRef} type="file" accept="image/*" hidden onChange={vælgFil} />
    </div>
  )
}
