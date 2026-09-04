import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../lib/icons'
import { SECTIONS, INFO_FIELDS, infoUdfyldt } from '../lib/model'
import { danskDato, dageTil, kr } from '../lib/format'
import { hentKunde, gemInfo } from '../lib/data'
import PortalSheet from '../components/PortalSheet'

/* Kundens egen side. Åbnes med /p/<seks cifre>. */

export default function Portal({ erAdmin }) {
  const { code } = useParams()
  const navigate = useNavigate()

  const [tilstand, setTilstand] = useState('indlæser') // indlæser | klar | ukendt | fejl
  const [kunde, setKunde] = useState(null)
  const [info, setInfo] = useState({})
  const [sektion, setSektion] = useState(null)
  const [gemStatus, setGemStatus] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    let afbrudt = false
    setTilstand('indlæser')
    hentKunde(code)
      .then(k => {
        if (afbrudt) return
        if (!k) { setTilstand('ukendt'); return }
        setKunde(k)
        setInfo(k.info || {})
        setTilstand('klar')
      })
      .catch(() => { if (!afbrudt) setTilstand('fejl') })
    return () => { afbrudt = true }
  }, [code])

  useEffect(() => () => clearTimeout(timer.current), [])

  function ændreInfo(nøgle, værdi) {
    const næste = { ...info, [nøgle]: værdi }
    setInfo(næste)
    setGemStatus('gemmer')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      gemInfo(code, næste)
        .then(() => setGemStatus('gemt'))
        .catch(() => setGemStatus('fejl'))
    }, 700)
  }

  if (tilstand === 'indlæser') return <Besked titel="Henter jeres side …" />
  if (tilstand === 'ukendt') return (
    <Besked titel="Vi kan ikke finde et projekt med den kode"
            tekst="Tjek koden i den besked I har fået fra os — den er på seks cifre. Passer den, så ring til os, så finder vi den frem."
            knap={{ tekst: 'Prøv en anden kode', gør: () => navigate('/') }} />
  )
  if (tilstand === 'fejl') return (
    <Besked titel="Vi kan ikke få fat i jeres side lige nu"
            tekst="Det er ikke jeres kode, der er noget galt med — forbindelsen driller. Prøv igen om et øjeblik."
            knap={{ tekst: 'Prøv igen', gør: () => window.location.reload() }} />
  )

  const udfyldt = infoUdfyldt({ info })
  const dage = dageTil(kunde.eventDate)
  const pct = Math.round((udfyldt / INFO_FIELDS.length) * 100)

  return (
    <div className="page">
      <div className="wrap">
        <div className="brand">
          <span className="brand-mark"><Icon name="flag" size={15} /></span>
          <span className="brand-name">EventDay</span>
          <span className="brand-spacer" />
          {erAdmin && (
            <button className="ghost-btn" onClick={() => navigate('/admin')}>← Alle kunder</button>
          )}
        </div>

        <div className="hero">
          <div className="hero-top">
            <div>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Jeres event</div>
              <h1>{kunde.eventTitle || 'Jeres event'}</h1>
              <div className="hero-firma">
                {kunde.firma}{kunde.kontakt ? ' · ' + kunde.kontakt : ''}
              </div>
            </div>
            {dage !== null && dage >= 0 && (
              <div className="countdown">
                <div className="countdown-n">{dage}</div>
                <div className="countdown-l">{dage === 1 ? 'dag til' : 'dage til'}</div>
              </div>
            )}
          </div>

          <div className="facts">
            <span className="fact"><Icon name="cal" size={16} color="currentColor" />{danskDato(kunde.eventDate)}</span>
            {kunde.startTime && (
              <span className="fact">
                <Icon name="clock" size={16} color="currentColor" />
                {kunde.startTime}{kunde.endTime ? '–' + kunde.endTime : ''}
              </span>
            )}
            {kunde.deltagere && (
              <span className="fact"><Icon name="users" size={16} color="currentColor" />{kunde.deltagere} deltagere</span>
            )}
          </div>

          <div className="rail">
            <div className="rail-head">
              <span>Jeres oplysninger</span>
              <span><b>{udfyldt}</b> af {INFO_FIELDS.length}</span>
            </div>
            <div className="rail-track">
              <div className="rail-fill" style={{ width: Math.max(pct, 3) + '%' }} />
            </div>
          </div>
        </div>

        <div className="grid">
          {SECTIONS.map(s => (
            <button className="tile" key={s.key} onClick={() => setSektion(s.key)}>
              {s.key === 'info' && (udfyldt < INFO_FIELDS.length
                ? <span className="tile-dot">Mangler</span>
                : <span className="tile-check"><Icon name="check" size={18} color="rgba(255,255,255,.9)" /></span>)}
              <span className="tile-icon"><Icon name={s.icon} size={22} /></span>
              <span className="tile-body">
                <span className="tile-label">{s.label}</span>
                <span className="tile-status">{status(s.key, kunde, udfyldt)}</span>
              </span>
            </button>
          ))}
        </div>

        {kunde.demo && (
          <p className="note">
            Det her er en eksempelkunde, så I kan se hvordan portalen ser ud.
            Opret en rigtig kunde for at få et link, der hører til et bestemt event.
          </p>
        )}
      </div>

      {sektion && (
        <PortalSheet
          sektion={sektion} kunde={kunde} info={info}
          gemStatus={gemStatus} onInfo={ændreInfo} onLuk={() => setSektion(null)}
        />
      )}
    </div>
  )
}

function status(key, kunde, udfyldt) {
  if (key === 'opgave') return kunde.eventTitle || 'Jeres event'
  if (key === 'info') return `${udfyldt} af ${INFO_FIELDS.length} udfyldt`
  if (key === 'location') return (kunde.sted || 'Ikke sat').split(',')[0]
  if (key === 'okonomi') return kunde.betalt ? 'Betalt' : kr(kunde.pris)
  if (key === 'tidslinje') return (kunde.program || []).length ? 'Start ' + (kunde.startTime || '—') : 'Kommer snart'
  if (key === 'kontakt') return (kunde.gamemaster && kunde.gamemaster.navn) || 'Vi finder en'
  return ''
}

function Besked({ titel, tekst, knap }) {
  return (
    <div className="page">
      <div className="wrap">
        <div className="gate">
          <div className="gate-mark"><Icon name="flag" size={26} /></div>
          <h1>{titel}</h1>
          {tekst && <p>{tekst}</p>}
          {knap && <button className="btn btn-primary" onClick={knap.gør}>{knap.tekst}</button>}
        </div>
      </div>
    </div>
  )
}
