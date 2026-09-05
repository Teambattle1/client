import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../lib/icons'
import { opdaterKunde } from '../lib/data'
import { rensShowtimeUrl, erVoresLink } from '../lib/showtime'
import { showtimesFor, synligeShowtimes, showtimeFelter } from '../lib/aktivitetsplan'

/**
 * »Showtime« — billederne og resultatlisten fra dagen.
 *
 * ET SHOW PR. AKTIVITET. Har kunden købt to ting, ligger billederne to
 * steder — det er to forskellige apps, der har afviklet dem — og de skal
 * kunne tændes hver for sig: den ene er ofte klar dagen efter, den anden
 * først når nogen har set videoklippene igennem.
 *
 * Kunden møder ÉT valg, ikke en side: se det, eller del det. Delingen er
 * skilt ud som sit eget skridt, fordi det er dér der sker noget uigenkalde-
 * ligt — et link til billeder af navngivne mennesker, der ryger videre i en
 * mailtråd. Se-knappen åbner showet INDE i portalen med en tilbageknap; det
 * er stadig deres egen side, ikke et fremmed sted de er blevet sendt hen.
 */
export default function Showtime({ kunde, adminKode, onRettet, onLuk }) {
  const navigate = useNavigate()
  const [delId, setDelId] = useState(null)     // showet vi deler lige nu
  const synlige = synligeShowtimes(kunde)
  const admin = !!adminKode

  const deles = synlige.find(s => s.aktivitetId === delId) || null

  return (
    <>
      {deles ? (
        <Del show={deles} flere={synlige.length > 1} onTilbage={() => setDelId(null)} />
      ) : synlige.length ? (
        <>
          <p className="lede">
            {synlige.length > 1
              ? 'Der er et show for hver aktivitet. Se dem her, eller del linket med dem der var med.'
              : 'Billederne og resultaterne fra jeres dag ligger klar. Se dem her, eller del linket med dem der var med.'}
          </p>
          {synlige.map(s => (
            <div className="st-gruppe" key={s.aktivitetId || s.url}>
              {synlige.length > 1 && <div className="st-gruppe-navn">{s.navn}</div>}
              <div className="st-valg">
                <button className="st-kort" onClick={() => {
                  onLuk?.()
                  navigate(`/p/${kunde.code}/showtime` + (s.aktivitetId ? `?akt=${encodeURIComponent(s.aktivitetId)}` : ''))
                }}>
                  <span className="st-kort-ikon"><Icon name="showtime" size={30} /></span>
                  <span className="st-kort-tekst">
                    <b>Se showtime</b>
                    <span>Åbner her på siden — I kan gå tilbage når som helst</span>
                  </span>
                </button>
                <button className="st-kort" onClick={() => setDelId(s.aktivitetId)}>
                  <span className="st-kort-ikon"><Icon name="copy" size={26} /></span>
                  <span className="st-kort-tekst">
                    <b>Del showtime</b>
                    <span>Få linket, så I kan sende det videre</span>
                  </span>
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <p className="lede">
          {admin
            ? 'Kunden kan ikke se showtime endnu. Sæt et link herunder, og tænd for det når showet er klar.'
            : 'Showtime er ikke klar endnu. Vi lægger billeder og resultater ind kort efter jeres event.'}
        </p>
      )}

      {admin && <AdminPanel kunde={kunde} adminKode={adminKode} onRettet={onRettet} />}
    </>
  )
}

/* ---------------------------------------------------------------
   Del — GDPR FØRST, link bagefter.

   Rækkefølgen er hele pointen. En advarsel UNDER et link, der allerede er
   kopieret, er en advarsel ingen læser. Det er også derfor der er et tryk
   imellem: det koster to sekunder, og det er dét sekund hvor nogen kommer
   i tanke om, at der er en praktikant på billede fire, der ikke har sagt ja.

   Vi skriver ikke jura for dem. Vi minder om, at det er DERES politik der
   gælder, når det er deres medarbejdere på billederne.
----------------------------------------------------------------*/
function Del({ show, flere, onTilbage }) {
  const [forstået, setForstået] = useState(false)
  const [kopieret, setKopieret] = useState(false)
  const url = show.url

  async function kopiér() {
    try {
      await navigator.clipboard.writeText(url)
      setKopieret(true)
      setTimeout(() => setKopieret(false), 2500)
    } catch {
      // Uden adgang til udklipsholderen: marker teksten, så et langt tryk
      // stadig kan kopiere den. Bedre end en knap der intet gør.
      const felt = document.getElementById('st-link')
      if (felt) { felt.focus(); felt.select() }
    }
  }

  async function del() {
    try { await navigator.share({ title: 'Showtime', url }) } catch { /* fortrudt */ }
  }

  return (
    <>
      {flere && <div className="st-gruppe-navn" style={{ marginBottom: 10 }}>{show.navn}</div>}
      <div className="gdpr">
        <div className="gdpr-top">
          <span className="gdpr-ikon"><Icon name="users" size={18} /></span>
          <h3>Husk jeres egen GDPR-politik</h3>
        </div>
        <p>
          Showtime indeholder billeder af jeres deltagere. Deler I linket videre —
          internt, i en nyhedsmail eller på sociale medier — er det jer, der er
          ansvarlige for at have samtykke fra dem, der er på billederne, og for at
          delingen følger jeres egen persondatapolitik.
        </p>
        <p>Er I i tvivl, så del kun internt.</p>
      </div>

      {!forstået ? (
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setForstået(true)}>
            <Icon name="check" size={17} />Jeg har forstået — vis linket
          </button>
          <button className="btn btn-quiet" onClick={onTilbage}>Tilbage</button>
        </div>
      ) : (
        <>
          <div className="linkbox" style={{ marginTop: 4 }}>
            <code id="st-link">{url}</code>
            <button className="ghost-btn" onClick={kopiér}>{kopieret ? 'Kopieret' : 'Kopiér'}</button>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="btn btn-primary" onClick={del}>
                <Icon name="copy" size={16} />Del …
              </button>
            )}
            <a className="btn btn-quiet" href={'mailto:?subject=' + encodeURIComponent('Billeder fra vores event') +
              '&body=' + encodeURIComponent('Her er billederne og resultaterne fra dagen:\n\n' + url)}>
              <Icon name="mail" size={16} color="currentColor" />Send som mail
            </a>
            <button className="btn btn-quiet" onClick={onTilbage}>Tilbage</button>
          </div>
        </>
      )}
    </>
  )
}

/**
 * De fire apps, der laver et showtime. Rækkefølgen er den, vi bruger dem i.
 * Værten er hele adressen — der er med vilje ingen dyb sti: vi kender kun
 * Tracks eget mønster, og et gæt på de andre ville lande på en tom side i
 * stedet for på forsiden, hvor man selv kan finde spillet.
 */
const APPS = [
  { navn: 'Track', vært: 'track.eventday.dk' },
  { navn: 'Taste', vært: 'taste.eventday.dk' },
  { navn: 'Play', vært: 'play.eventday.dk' },
  { navn: 'LoQuiz', vært: 'loquiz.eventday.dk' },
]

/* ---------------------------------------------------------------
   Adminpanelet — kun for os. Ét felt pr. aktivitet.

   To knapper der IKKE er den samme: »Gem« sætter linket, og kontakten
   nedenunder tænder for kundens adgang. Billederne er ofte klar før nogen
   har set dem igennem, og et show der åbner sig selv i det sekund linket
   bliver sat, er præcis dét vi ikke vil have.
----------------------------------------------------------------*/
function AdminPanel({ kunde, adminKode, onRettet }) {
  const shows = showtimesFor(kunde)

  return (
    <div className="block" style={{ marginTop: 18 }}>
      <h3>Showtime-link (kun os)</h3>

      {/* Vejen HEN til linket. Man står her med kundens side åben og skal
          bruge et link, der ligger inde i den app, eventet blev afviklet i —
          så knapperne åbner appen i et nyt vindue, og portalen bliver stående
          i det gamle, klar til at få linket sat ind. */}
      <div className="st-apps">
        {APPS.map(a => (
          <a key={a.vært} className="st-app" href={`https://${a.vært}/`}
             target="_blank" rel="noopener noreferrer"
             title={`Åbn ${a.navn} i et nyt vindue`}>
            <b>{a.navn}</b>
            <span>{a.vært}</span>
          </a>
        ))}
      </div>
      <p className="hint" style={{ marginTop: -2, marginBottom: 12 }}>
        Åbn appen, find showtime på spillet, kopiér linket — og sæt det ind herunder.
      </p>

      {shows.length
        ? shows.map(s => (
            <EtShow key={s.aktivitetId || s.navn} show={s} flere={shows.length > 1}
                    kunde={kunde} adminKode={adminKode} onRettet={onRettet} />
          ))
        : <p className="hint">Vælg en aktivitet på kunden først — showtime hører til en aktivitet.</p>}
    </div>
  )
}

function EtShow({ show, flere, kunde, adminKode, onRettet }) {
  const [tekst, setTekst] = useState(show.url || '')
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  async function skriv(patch, besked) {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      const ny = await opdaterKunde(adminKode, kunde.code, showtimeFelter(kunde, show.aktivitetId, patch))
      onRettet?.(ny)
      setKvittering(besked)
      setTimeout(() => setKvittering(null), 2600)
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally {
      setGemmer(false)
    }
  }

  function gem() {
    const ren = rensShowtimeUrl(tekst)
    if (!ren) {
      setFejl('Det ser ikke ud som et link. Indsæt hele adressen — fx play.eventday.dk/showtime/abc123')
      return
    }
    setTekst(ren)
    skriv({ url: ren }, 'Linket er gemt')
  }

  function slet() {
    setTekst('')
    // Slukker OGSÅ for kunden: et tændt showtime uden link ville give en
    // knap, der åbner en tom skærm.
    skriv({ url: '', aktiv: false }, 'Linket er slettet')
  }

  const ren = rensShowtimeUrl(tekst)
  const fremmed = ren && !erVoresLink(ren)
  const felt = 'st-url-' + (show.aktivitetId || 'ene')

  return (
    <div className={flere ? 'st-show' : ''}>
      {flere && <div className="st-gruppe-navn">{show.navn}</div>}
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor={felt}>Link til showtime</label>
        <input
          id={felt} type="url" inputMode="url" autoComplete="off"
          value={tekst} onChange={e => { setTekst(e.target.value); setFejl(null) }}
          placeholder="play.eventday.dk/showtime/…"
        />
        <p className="hint">
          Det er dét, appen kalder »del showtime« — adressen kunden må se.
        </p>
      </div>

      {fremmed && (
        <p className="hint" style={{ marginTop: -4, marginBottom: 10, color: 'var(--gold)' }}>
          Linket peger uden for vores egne sider. Det kan godt bruges, men mange
          sider tillader ikke at blive vist inde i en anden — tjek at det virker,
          før du tænder for det.
        </p>
      )}
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 8 }}>{fejl}</p>}
      {kvittering && <p style={{ color: 'var(--green)', fontSize: 14, marginBottom: 8 }}>{kvittering}</p>}

      <div className="actions">
        <button className="btn btn-primary" onClick={gem} disabled={gemmer || !tekst.trim()}>
          {gemmer ? 'Gemmer …' : show.url ? 'Gem ændring' : 'Gem link'}
        </button>
        {show.url && (
          <button className="btn btn-quiet" onClick={slet} disabled={gemmer}>Slet link</button>
        )}
      </div>

      <div className="st-tænd">
        <div>
          <b>Vis for kunden</b>
          <span>
            {show.url
              ? (show.aktiv ? 'Showet står på kundens side nu.' : 'Kunden kan ikke se det endnu.')
              : 'Sæt et link først.'}
          </span>
        </div>
        <button
          type="button" role="switch" aria-checked={show.aktiv}
          aria-label={'Vis ' + show.navn + ' for kunden'}
          className={'kontakt-knap' + (show.aktiv ? ' på' : '')}
          disabled={!show.url || gemmer}
          onClick={() => skriv({ aktiv: !show.aktiv }, !show.aktiv ? 'Kunden kan se showet nu' : 'Skjult for kunden igen')}
        >
          <span />
        </button>
      </div>
    </div>
  )
}
