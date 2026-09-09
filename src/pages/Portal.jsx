import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../lib/icons'
import { sektionerFor, infoFieldsFor, infoUdfyldt } from '../lib/model'
import { danskDato, dageTil, kr } from '../lib/format'
import { fakturaUdfyldt } from '../lib/cvr'
import { hentKunde, gemInfo, opdaterKunde } from '../lib/data'
import { showtimeStatus } from '../lib/showtime'
import PortalSheet from '../components/PortalSheet'
import TemaKnap from '../components/TemaKnap'
import LogoVaelger from '../components/LogoVaelger'

/* Kundens egen side. Åbnes med /p/<seks cifre>. */

export default function Portal({ adminKode }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const [søgeord] = useSearchParams()

  /* Preview: vi kigger med kundens øjne. Vores egne knapper — showtime-linket,
     »ret vores folk«, logo-skift — skal VÆK, ikke bare være uden virkning:
     man kan ikke godkende en side, hvis man ser en anden side end kunden. */
  const preview = søgeord.get('preview') === '1'
  const somAdmin = !!adminKode && !preview

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

  // Spørgsmålene afhænger af hvad kunden har købt, så både tælleren og
  // »MANGLER«-mærket skal regne på DEM — ikke på en fast liste.
  const felter = infoFieldsFor(kunde)
  const udfyldt = infoUdfyldt({ ...kunde, info })
  const dage = dageTil(kunde.eventDate)
  const pct = felter.length ? Math.round((udfyldt / felter.length) * 100) : 100

  return (
    <div className="page">
      {preview && (
        <div className="preview-bar">
          <span><b>Preview</b> · sådan ser kunden siden</span>
          <button className="ghost-btn" onClick={() => navigate(`/p/${code}`)}>Afslut preview</button>
        </div>
      )}
      <div className="wrap">
        <div className="brand">
          <span className="brand-mark"><Icon name="flag" size={15} /></span>
          <span className="brand-name">EventDay</span>
          <span className="brand-spacer" />
          <TemaKnap />
          <button className="ghost-btn" onClick={() => navigate(`/p/${code}/print`)}>Print</button>
          {somAdmin && (
            <>
              <button className="ghost-btn" onClick={() => navigate(`/p/${code}?preview=1`)}>Preview</button>
              <button className="ghost-btn" onClick={() => navigate('/admin')}>← Alle kunder</button>
            </>
          )}
        </div>

        <div className="hero">
          <div className="hero-top">
            <div>
              <KundeLogo kunde={kunde} adminKode={somAdmin ? adminKode : ''}
                         onRettet={k => setKunde(k)} />
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
              <span><b>{udfyldt}</b> af {felter.length}</span>
            </div>
            <div className="rail-track">
              <div className="rail-fill" style={{ width: Math.max(pct, 3) + '%' }} />
            </div>
          </div>
        </div>

        <div className="grid">
          {sektionerFor(kunde, somAdmin).map(s => (
            <button className="tile" key={s.key} onClick={() => setSektion(s.key)}>
              {s.key === 'info' && (udfyldt < felter.length
                ? <span className="tile-dot">Mangler</span>
                : <span className="tile-check"><Icon name="check" size={18} color="rgba(255,255,255,.9)" /></span>)}
              <span className="tile-icon"><Icon name={s.icon} size={46} /></span>
              <span className="tile-body">
                <span className="tile-label">{s.label}</span>
                <span className="tile-status">{status(s.key, kunde, udfyldt, felter.length, somAdmin, info)}</span>
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
          adminKode={somAdmin ? adminKode : ''} onKundeRettet={k => setKunde(k)}
        />
      )}
    </div>
  )
}

/**
 * Kundens eget mærke øverst på deres side.
 *
 * Er der ikke noget logo, står der INTET hos kunden — en tom firkant med et
 * ødelagt billede er værre end ingenting. Vi ser derimod en stiplet plads,
 * så det er tydeligt, at der mangler et logo, netop dér hvor man opdager det.
 */
function KundeLogo({ kunde, adminKode, onRettet }) {
  const [åben, setÅben] = useState(false)
  const [valgt, setValgt] = useState(kunde.logoUrl || '')
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [dødt, setDødt] = useState(false)
  const admin = !!adminKode

  // To ting, ikke én: hvad der STÅR på kunden, og om det kan tegnes lige nu.
  // Blandes de sammen, ser et gemt logo med en død adresse ud PRÆCIS som
  // intet logo — og så tror man, gemningen ikke virkede.
  const gemtLogo = kunde.logoUrl || ''
  const kanVises = !!gemtLogo && !dødt
  const ændret = valgt !== gemtLogo

  // Et nyt logo er en ny chance. Uden det ville én død adresse skjule også
  // den adresse, man lagde op bagefter.
  useEffect(() => { setDødt(false) }, [gemtLogo])

  // Kunden ser aldrig et ødelagt mærke — men admin skal kunne se, at der
  // ligger et logo, også når det ikke kan hentes.
  if (!kanVises && !admin) return null

  async function gem() {
    setGemmer(true); setFejl(null)
    try {
      onRettet?.(await opdaterKunde(adminKode, kunde.code, { logoUrl: valgt }))
      setDødt(false)
      setÅben(false)
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally {
      setGemmer(false)
    }
  }

  return (
    <div className="hero-logo">
      {kanVises
        ? <span className="logo-plade"><img src={gemtLogo} alt={kunde.firma || ''} onError={() => setDødt(true)} /></span>
        : <span className={'logo-plade tom' + (gemtLogo ? ' død' : '')} aria-hidden="true">
            <Icon name={gemtLogo ? 'form' : 'plus'} size={18} color="currentColor" />
          </span>}
      {admin && (
        <>
          <button className="ghost-btn" onClick={() => { setValgt(kunde.logoUrl || ''); setÅben(true) }}>
            {gemtLogo ? 'Skift logo' : 'Tilføj logo'}
          </button>
          {gemtLogo && !kanVises && (
            <span className="logo-død-note">Logoet er gemt, men adressen svarer ikke. Kunden ser intet mærke.</span>
          )}
        </>
      )}

      {åben && (
        <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) setÅben(false) }}>
          <div className="sheet" style={{ maxWidth: 460 }} role="dialog" aria-modal="true" aria-label="Kundens logo">
            <div className="sheet-head">
              <span className="tile-icon"><Icon name="form" size={20} /></span>
              <div className="sheet-title">
                <h2>Kundens logo</h2>
                <span>{kunde.firma}</span>
              </div>
              <button className="x-btn" onClick={() => setÅben(false)} aria-label="Luk">
                <Icon name="close" size={18} color="currentColor" />
              </button>
            </div>
            <div className="sheet-body">
              <LogoVaelger firma={kunde.firma} værdi={valgt} onÆndre={setValgt} kode={kunde.code} />
              {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8 }}>{fejl}</p>}
              {/* Gem er slukket, når der ikke er noget at gemme. Et forslag man
                  kan SE, er ikke et forslag man har VALGT — og trykker man Gem
                  uden at have trykket på et, skrev vi før et tomt logo og lukkede
                  vinduet, som om det gik godt. At fjerne et logo tæller stadig
                  som en ændring, så den vej ud er der endnu. */}
              {!ændret && (
                <p className="hint" style={{ marginTop: 10 }}>
                  {valgt ? 'Logoet er allerede gemt.' : 'Tryk på et af forslagene, eller læg en fil op — så kan det gemmes.'}
                </p>
              )}
              <div className="actions" style={{ marginTop: 14 }}>
                <button className="btn btn-primary" onClick={gem} disabled={gemmer || !ændret}>
                  {gemmer ? 'Gemmer …' : 'Gem'}
                </button>
                <button className="btn btn-quiet" onClick={() => setÅben(false)}>Fortryd</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function status(key, kunde, udfyldt, antal, admin, info) {
  if (key === 'opgave') return kunde.eventTitle || 'Jeres event'
  if (key === 'info') return `${udfyldt} af ${antal} udfyldt`
  if (key === 'location') return (kunde.sted || 'Ikke sat').split(',')[0]
  if (key === 'okonomi') return kunde.betalt ? 'Betalt' : !fakturaUdfyldt(info && info.faktura) ? 'Mangler fakturaoplysninger' : kr(kunde.pris)
  if (key === 'tidslinje') return (kunde.program || []).length ? 'Start ' + (kunde.startTime || '—') : 'Kommer snart'
  // Ingen navne på flisen: hvem der er på, kan skifte til det sidste, og
  // et navn på forsiden er et løfte. Navnene står inde i arket.
  if (key === 'kontakt') return 'Hvem I skal tale med'
  if (key === 'showtime') return showtimeStatus(kunde, admin)
  return ''
}

function Besked({ titel, tekst, knap }) {
  return (
    <div className="page">
      <TemaKnap klasse="tema-hjørne" />
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
