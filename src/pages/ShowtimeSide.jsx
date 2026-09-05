import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../lib/icons'
import { hentKunde } from '../lib/data'
import { showtimesFor, synligeShowtimes } from '../lib/aktivitetsplan'
import TemaKnap from '../components/TemaKnap'
import { kanFuldskærm, erFuldskærm, startFuldskærm, stopFuldskærm, lytFuldskærm } from '../lib/fuldskaerm'

/**
 * Showtime vist INDE i portalen.
 *
 * Hele pointen er tilbageknappen. Sendte vi kunden videre til et andet
 * domæne, ville deres vej tilbage være browserens egen pil — og på en
 * telefon, hvor linket typisk åbnes fra en besked, findes den pil ikke
 * altid. Derfor en fast bjælke øverst, der aldrig scroller væk.
 *
 * VI kan åbne siden selv om den ikke er tændt for kunden endnu: det er
 * sådan man ser efter, om linket virker, FØR man tænder for det.
 */
export default function ShowtimeSide({ adminKode }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const [søgeord] = useSearchParams()
  const ønsket = søgeord.get('akt') || ''
  const [tilstand, setTilstand] = useState('indlæser')
  const [kunde, setKunde] = useState(null)
  const [længe, setLænge] = useState(false)
  const [fuld, setFuld] = useState(false)
  const [anbefal, setAnbefal] = useState(false)
  const [kan, setKan] = useState(false)      // kan browseren fuld skærm?
  const rod = useRef(null)
  const prøvet = useRef(false)

  useEffect(() => {
    let død = false
    hentKunde(code)
      .then(k => {
        if (død) return
        if (!k) { setTilstand('ukendt'); return }
        setKunde(k)
        // Vi må gerne se et show, der ikke er tændt for kunden endnu — det
        // er sådan man tjekker linket, FØR man tænder.
        const kan = adminKode ? showtimesFor(k).some(x => x.url) : synligeShowtimes(k).length > 0
        setTilstand(kan ? 'klar' : 'ikke-klar')
      })
      .catch(() => { if (!død) setTilstand('fejl') })
    return () => { død = true }
  }, [code, adminKode])

  /* Fuld skærm, hvis browseren vil.
     Forsøget sker ÉN gang og kun her: turen hertil begyndte med et tryk på
     »se showtime«, og den tilladelse holder et par sekunder. Siger browseren
     nej — eller er det en iPhone, hvor svaret altid er nej — viser vi i
     stedet anbefalingen. Vi lægger HELE siden i fuld skærm, ikke rammen:
     lagde vi kun showet, ville tilbageknappen forsvinde med den. */
  useEffect(() => {
    if (tilstand !== 'klar' || prøvet.current || !rod.current) return
    prøvet.current = true
    const el = rod.current
    const duer = kanFuldskærm(el)
    setKan(duer)
    if (!duer) { setAnbefal(true); return }
    startFuldskærm(el).then(gik => { setFuld(gik); if (!gik) setAnbefal(true) })
  }, [tilstand])

  useEffect(() => lytFuldskærm(document, () => {
    const nu = erFuldskærm(document)
    setFuld(nu)
    if (nu) setAnbefal(false)
  }), [])

  // Et site kan nægte at blive vist inde i et andet, og det sker uden en
  // fejl vi kan se — rammen bliver bare hvid. Efter et par sekunder tilbyder
  // vi derfor vejen udenom, i stedet for at lade kunden sidde og kigge på
  // ingenting.
  useEffect(() => {
    if (tilstand !== 'klar') return
    const t = setTimeout(() => setLænge(true), 4000)
    return () => clearTimeout(t)
  }, [tilstand])

  // Hvilket show? Adressen kan pege på én bestemt aktivitet; ellers tages
  // det første, der har et link.
  const muligheder = kunde
    ? (adminKode ? showtimesFor(kunde).filter(s => s.url) : synligeShowtimes(kunde))
    : []
  const vist = muligheder.find(s => s.aktivitetId === ønsket) || muligheder[0] || null
  const url = vist ? vist.url : null
  const tilbage = () => navigate(`/p/${code}`)

  return (
    <div className="st-side" ref={rod}>
      <div className="st-bar">
        <button className="st-tilbage" onClick={tilbage}>
          <Icon name="back" size={16} color="currentColor" />
          <span>Tilbage<span className="kun-bred"> til jeres side</span></span>
        </button>
        <span className="st-bar-titel">{(muligheder.length > 1 && vist && vist.navn) || 'Showtime'}</span>
        {tilstand === 'klar' && kan && (
          <button className="ghost-btn" onClick={() => {
            if (fuld) stopFuldskærm(document)
            else startFuldskærm(rod.current).then(gik => { setFuld(gik); if (!gik) setAnbefal(true) })
          }}>{fuld ? 'Luk fuld skærm' : 'Fuld skærm'}</button>
        )}
        <TemaKnap />
        {/* Ikon alene på en telefon: fire tekstknapper i én bjælke bryder
            over to linjer og æder 40 px af showet. */}
        {url && (
          <a className="ghost-btn st-eget" href={url} target="_blank" rel="noopener noreferrer"
             title="Åbn showtime i sit eget vindue" aria-label="Åbn showtime i sit eget vindue">
            <Icon name="udad" size={15} color="currentColor" />
            <span className="kun-bred">Eget vindue</span>
          </a>
        )}
      </div>

      {anbefal && tilstand === 'klar' && (
        <div className="st-anbefal">
          <span>Showtime er bedst i <b>fuld skærm</b> — på en telefon: drej den på tværs og slå
            fuldskærm til i browserens menu. På en storskærm: tryk F11.</span>
          <button className="ghost-btn" onClick={() => setAnbefal(false)}>OK</button>
        </div>
      )}

      {tilstand === 'klar' && url ? (
        <div className="st-ramme">
          <iframe
            src={url}
            title="Showtime"
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {længe && (
            <p className="st-nød">
              Kan I ikke se noget? Nogle sider vil ikke vises inde i en anden —
              <a href={url} target="_blank" rel="noopener noreferrer"> åbn showtime i sit eget vindue</a>.
            </p>
          )}
        </div>
      ) : (
        <div className="wrap">
          <div className="gate">
            <div className="gate-mark"><Icon name="showtime" size={26} /></div>
            <h1>{{
              indlæser: 'Henter showtime …',
              ukendt: 'Vi kan ikke finde et projekt med den kode',
              fejl: 'Vi kan ikke få fat i siden lige nu',
              'ikke-klar': 'Showtime er ikke klar endnu',
            }[tilstand]}</h1>
            {tilstand === 'ikke-klar' && (
              <p>Vi lægger billeder og resultater ind kort efter jeres event. I får besked, når det er klar.</p>
            )}
            {tilstand === 'fejl' && <p>Det er ikke jeres link, der er noget galt med — forbindelsen driller.</p>}
            <button className="btn btn-primary" onClick={tilbage}>Tilbage til jeres side</button>
          </div>
        </div>
      )}
    </div>
  )
}
