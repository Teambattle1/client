import { useEffect, useState } from 'react'
import Icon from '../lib/icons'
import { opdaterKunde } from '../lib/data'
import { hentTidslinjeRammer } from '../lib/activities'
import { aktiviteterFor, bygProgram, plusMinutter, afviklingFor, standardGrupper } from '../lib/aktivitetsplan'
import { AfviklingValg } from './AktivitetsVaelger'

/**
 * Tidslinjen som VI bygger den — kun for os.
 *
 * DEN NORMALE DAG: to aktiviteter, deltagerne delt i to grupper, og de to
 * ting kører SAMTIDIG i to omgange, så grupperne bytter undervejs. Derfor er
 * »lav rundeplan« ikke en genvej ved siden af redigeringen — det er den vej,
 * de fleste dage bliver bygget på. Man trykker én gang, og retter bagefter i
 * det, der ikke passer.
 *
 * En række er enten ÉN ting for alle, eller en blok med et spor pr. gruppe.
 * Man skifter mellem de to på selve rækken, så man ikke skal beslutte sig
 * på forhånd.
 */
export default function TidslinjeRet({ kunde, adminKode, onRettet, onLuk }) {
  const akt = aktiviteterFor(kunde)
  const [rækker, setRækker] = useState(() => JSON.parse(JSON.stringify(kunde.program || [])))
  const [grupper, setGrupper] = useState(() =>
    (kunde.grupper && kunde.grupper.length ? kunde.grupper : standardGrupper(akt.length)))
  const [afvikling, setAfvikling] = useState(() => afviklingFor(kunde))
  const [rammer, setRammer] = useState({})
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)

  useEffect(() => {
    let død = false
    hentTidslinjeRammer().then(r => { if (!død) setRammer(r) })
    return () => { død = true }
  }, [])

  function ret(i, patch) {
    setRækker(r => r.map((x, j) => j === i ? { ...x, ...patch } : x))
  }
  function retSpor(i, j, patch) {
    setRækker(r => r.map((x, k) => k !== i ? x
      : { ...x, spor: x.spor.map((s, m) => m === j ? { ...s, ...patch } : s) }))
  }
  function tilføj() {
    const sidste = rækker[rækker.length - 1]
    setRækker(r => [...r, { tid: plusMinutter(sidste?.tid || kunde.startTime || '13.00', 30) || '', titel: '', note: '' }])
  }
  function fjern(i) { setRækker(r => r.filter((_, j) => j !== i)) }
  function flyt(i, retning) {
    setRækker(r => {
      const j = i + retning
      if (j < 0 || j >= r.length) return r
      const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n
    })
  }
  function skiftForm(i) {
    setRækker(r => r.map((x, j) => {
      if (j !== i) return x
      if (x.spor) { const { spor: _spor, ...rest } = x; return { ...rest, titel: rest.titel || '' } }
      return { ...x, titel: x.titel || 'Omgang', spor: grupper.map((g, n) => ({ gruppe: g, titel: akt[n]?.navn || '' })) }
    }))
  }

  function lavRundeplan() {
    const { program } = bygProgram({ aktiviteter: akt, grupper, start: kunde.startTime || '13.00', afvikling, rammer })
    if (!program.length) {
      setFejl('Der skal være mindst én aktivitet og en starttid på kunden.')
      return
    }
    setFejl(null)
    setRækker(program)
  }

  async function gem() {
    setGemmer(true); setFejl(null)
    try {
      const rene = rækker
        .filter(r => (r.tid || '').trim() || (r.titel || '').trim() || r.spor)
        .map(r => r.spor
          ? { tid: r.tid || '', titel: r.titel || '', note: r.note || '',
              spor: r.spor.filter(s => (s.gruppe || '').trim() || (s.titel || '').trim()) }
          : { tid: r.tid || '', titel: r.titel || '', note: r.note || '' })
      // Gemt med hånden: fra nu af bygger vi den ikke om af os selv.
      onRettet?.(await opdaterKunde(adminKode, kunde.code, { program: rene, grupper, afvikling, programAuto: false }))
      onLuk()
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally { setGemmer(false) }
  }

  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Ret tidslinjen">
        <div className="sheet-head">
          <span className="tile-icon"><Icon name="clock" size={20} /></span>
          <div className="sheet-title">
            <h2>Ret tidslinjen</h2>
            <span>{kunde.firma}</span>
          </div>
          <button className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>

        <div className="sheet-body">
          {akt.length > 0 && (
            <div className="block">
              <h3>Byg dagen forfra</h3>
              <p>
                Af starttiden {kunde.startTime || '13.00'} og aktiviteternes tider fra kataloget
                ({akt.map(a => `${a.navn} ${a.minutter || '—'} min`).join(' · ')}).
              </p>
              {akt.length > 1 && (
                <div style={{ marginTop: 10 }}>
                  <AfviklingValg værdi={afvikling} onÆndre={setAfvikling} />
                  {afvikling === 'parallel' && (
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor="tl-grupper">Grupper</label>
                      <input id="tl-grupper" value={grupper.join(', ')}
                             onChange={e => setGrupper(e.target.value.split(',').map(x => x.trim()).filter(Boolean))}
                             placeholder="Gruppe 1, Gruppe 2" />
                    </div>
                  )}
                </div>
              )}
              <div className="actions" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={lavRundeplan}>
                  <Icon name="clock" size={16} />Byg tidslinjen
                </button>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>
                Den overskriver det, der står nu — men først når du trykker Gem nederst.
              </p>
            </div>
          )}

          <div className="tl-ret">
            {rækker.map((r, i) => (
              <div className={'tl-række' + (r.spor ? ' parallel' : '')} key={i}>
                <div className="tl-række-top">
                  <input className="tl-tid" value={r.tid || ''} onChange={e => ret(i, { tid: e.target.value })}
                         placeholder="13.00" aria-label="Tidspunkt" />
                  <input value={r.titel || ''} onChange={e => ret(i, { titel: e.target.value })}
                         placeholder={r.spor ? 'Overskrift, fx Omgang 1' : 'Hvad sker der?'} aria-label="Titel" />
                  <div className="tl-knapper">
                    <button className="tl-mini" onClick={() => flyt(i, -1)} aria-label="Flyt op" disabled={i === 0}>↑</button>
                    <button className="tl-mini" onClick={() => flyt(i, 1)} aria-label="Flyt ned" disabled={i === rækker.length - 1}>↓</button>
                    <button className="tl-mini fjern" onClick={() => fjern(i)} aria-label="Fjern rækken">
                      <Icon name="close" size={13} color="currentColor" />
                    </button>
                  </div>
                </div>

                {r.spor ? (
                  <div className="tl-spor">
                    {r.spor.map((s, j) => (
                      <div className="tl-spor-linje" key={j}>
                        <input value={s.gruppe || ''} onChange={e => retSpor(i, j, { gruppe: e.target.value })}
                               placeholder="Gruppe 1" aria-label="Gruppe" />
                        <select value={s.titel || ''} onChange={e => retSpor(i, j, { titel: e.target.value })}
                                aria-label="Aktivitet">
                          <option value="">Vælg …</option>
                          {akt.map(a => <option key={a.id || a.navn} value={a.navn}>{a.navn}</option>)}
                          {s.titel && !akt.some(a => a.navn === s.titel) && <option value={s.titel}>{s.titel}</option>}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <input className="tl-note" value={r.note || ''} onChange={e => ret(i, { note: e.target.value })}
                         placeholder="Note (valgfri)" aria-label="Note" />
                )}

                <button className="tl-form" onClick={() => skiftForm(i)}>
                  {r.spor ? 'Gør det til én ting for alle' : 'Kør flere ting samtidig her'}
                </button>
              </div>
            ))}
          </div>

          <div className="actions" style={{ marginTop: 4 }}>
            <button className="btn btn-quiet" onClick={tilføj}>
              <Icon name="plus" size={16} color="currentColor" />Tilføj række
            </button>
          </div>

          {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 10 }}>{fejl}</p>}

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
              {gemmer ? 'Gemmer …' : 'Gem tidslinjen'}
            </button>
            <button className="btn btn-quiet" onClick={onLuk}>Fortryd</button>
          </div>
        </div>
      </div>
    </div>
  )
}
