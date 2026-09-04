import { useEffect } from 'react'
import Icon from '../lib/icons'
import { SECTIONS, INFO_FIELDS } from '../lib/model'
import { kr, initialer } from '../lib/format'

/* Arket der åbner, når kunden trykker på en af de seks knapper. */

export default function PortalSheet({ sektion, kunde, info, gemStatus, onInfo, onLuk }) {
  useEffect(() => {
    function tast(e) { if (e.key === 'Escape') onLuk() }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [onLuk])

  const s = SECTIONS.find(x => x.key === sektion)
  if (!s) return null

  const indhold = {
    opgave: <Opgave kunde={kunde} />,
    info: <Info info={info} gemStatus={gemStatus} onInfo={onInfo} />,
    location: <Location kunde={kunde} />,
    okonomi: <Okonomi kunde={kunde} />,
    tidslinje: <Tidslinje kunde={kunde} />,
    kontakt: <Kontakt kunde={kunde} />,
  }[s.key]

  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onLuk() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={s.label}>
        <div className="sheet-head">
          <span className="tile-icon"><Icon name={s.icon} size={20} /></span>
          <div className="sheet-title">
            <h2>{s.label}</h2>
            <span>{s.sub}</span>
          </div>
          <button className="x-btn" onClick={onLuk} aria-label="Luk">
            <Icon name="close" size={18} color="currentColor" />
          </button>
        </div>
        <div className="sheet-body">{indhold}</div>
      </div>
    </div>
  )
}

function Opgave({ kunde }) {
  const med = kunde.inkluderet || []
  return (
    <>
      <p className="lede">
        {kunde.beskrivelse || 'Beskrivelsen af jeres aktivitet lægges ind her, når den er på plads.'}
      </p>
      <div className="block">
        <h3>Det er med i prisen</h3>
        {med.length
          ? <div className="chips">{med.map(x => <span className="chip" key={x}>{x}</span>)}</div>
          : <p>Vi udfylder listen sammen med tilbuddet.</p>}
      </div>
      <dl style={{ margin: 0 }}>
        <Rk t="Varighed" v={`${kunde.startTime || '—'}${kunde.endTime ? '–' + kunde.endTime : ''}`} />
        <Rk t="Deltagere" v={kunde.deltagere || '—'} />
        <Rk t="Fysisk niveau" v="Almindelig gang" />
        <Rk t="Vejret" v="Vi gennemfører i alt vejr" />
      </dl>
    </>
  )
}

function Info({ info, gemStatus, onInfo }) {
  return (
    <>
      <p className="lede">
        Jo før vi har det her, jo mindre skal I tage stilling til på dagen.
        Det gemmer sig selv, og I kan komme tilbage senere.
      </p>
      {INFO_FIELDS.map(f => (
        <div className="field" key={f.key}>
          <label htmlFor={'f-' + f.key}>{f.label}</label>
          {f.type === 'textarea' ? (
            <textarea id={'f-' + f.key} value={info[f.key] || ''} placeholder={f.ph || ''}
                      onChange={e => onInfo(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <select id={'f-' + f.key} value={info[f.key] || ''} onChange={e => onInfo(f.key, e.target.value)}>
              <option value="">Vælg …</option>
              {f.options.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input id={'f-' + f.key} type="text" value={info[f.key] || ''} placeholder={f.ph || ''}
                   onChange={e => onInfo(f.key, e.target.value)} />
          )}
          {f.hint && <p className="hint">{f.hint}</p>}
        </div>
      ))}
      <div className="saved">
        {gemStatus === 'gemmer' && <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Gemmer …</span>}
        {gemStatus === 'gemt' && <><Icon name="check" size={16} color="currentColor" />Gemt</>}
        {gemStatus === 'fejl' && <span style={{ color: 'var(--red)' }}>Kunne ikke gemme — prøv igen om lidt</span>}
      </div>
    </>
  )
}

function Location({ kunde }) {
  const adr = kunde.sted || 'Adressen er ikke sat endnu'
  return (
    <>
      <div className="block">
        <h3>Mødested</h3>
        <p>{adr}</p>
        {kunde.modested && (
          <p style={{ marginTop: 8, color: 'var(--ink)', fontWeight: 600 }}>{kunde.modested}</p>
        )}
      </div>
      <dl style={{ margin: '0 0 16px' }}>
        <Rk t="Parkering" v={kunde.parkering || '—'} />
        <Rk t="Toiletter" v="Ved mødestedet" />
        <Rk t="Ly for regn" v="Ja, indendørs samlingssted" />
      </dl>
      {kunde.sted && (
        <div className="actions">
          <a className="btn btn-primary" target="_blank" rel="noopener noreferrer"
             href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(kunde.sted)}>
            <Icon name="pin" size={18} />Vis på kort
          </a>
        </div>
      )}
    </>
  )
}

function Okonomi({ kunde }) {
  const pris = Number(kunde.pris || 0)
  const stk = Number(kunde.deltagere || 0)
  const pr = stk > 0 && pris > 0 ? Math.round(pris / stk) : null
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {kunde.betalt
          ? <span className="pill pill-green"><Icon name="check" size={13} color="currentColor" />Betalt</span>
          : <span className="pill pill-gold">Faktura sendt</span>}
      </div>
      <dl style={{ margin: 0 }}>
        <Rk t={`Aktivitet, ${kunde.deltagere || '—'} deltagere`} v={kr(pris)} />
        {pr && <Rk t="Pris pr. deltager" v={kr(pr)} />}
        <Rk t="Moms" v="Tillægges" />
        <Rk t="Betaling" v="8 dage netto" />
        <Rk t="Faktureres til" v={kunde.faktura || '—'} />
      </dl>
      <div className="total"><span>I alt ekskl. moms</span><b>{kr(pris)}</b></div>
      <p className="note">
        Ændrer antallet af deltagere sig mere end 10 %, retter vi fakturaen efter det endelige tal.
      </p>
    </>
  )
}

function Tidslinje({ kunde }) {
  const p = kunde.program || []
  if (!p.length) return <p className="lede">Programmet lægges her, så snart tiderne er faldet på plads.</p>
  return (
    <>
      <p className="lede">
        Sådan ser dagen ud lige nu. Skal noget flyttes, så sig til — det er nemmest inden ugen før.
      </p>
      <ul className="tl">
        {p.map((x, i) => (
          <li key={i}>
            <span className="tl-dot" />
            <span className="tl-time">{x.tid}</span>
            <span className="tl-txt"><strong>{x.titel}</strong>{x.note && <span>{x.note}</span>}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Kontakt({ kunde }) {
  const g = kunde.gamemaster || {}
  return (
    <>
      <div className="person">
        <div className="avatar">{initialer(g.navn || 'EventDay')}</div>
        <div>
          <b>{g.navn || 'Vi sætter navn på snarest'}</b>
          <span>{g.rolle || 'Gamemaster på jeres event'}</span>
        </div>
      </div>
      <p className="lede">Ring endelig — også om småting. Det er bedre end at gætte på dagen.</p>
      <div className="actions">
        {g.telefon && (
          <a className="btn btn-primary" href={'tel:' + String(g.telefon).replace(/\s/g, '')}>
            <Icon name="phone" size={18} />{g.telefon}
          </a>
        )}
        {g.email && (
          <a className="btn btn-quiet" href={'mailto:' + g.email}>
            <Icon name="mail" size={18} color="currentColor" />Skriv til os
          </a>
        )}
      </div>
      <div className="block" style={{ marginTop: 18 }}>
        <h3>På selve dagen</h3>
        <p>
          Vi er på plads 45 minutter før jeres starttid. Kan I ikke finde os, så ring —
          vi står altid det sted, der står under Location.
        </p>
      </div>
    </>
  )
}

function Rk({ t, v }) {
  return <div className="kv"><dt>{t}</dt><dd>{v}</dd></div>
}
