import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../lib/icons'
import { opdaterKunde } from '../lib/data'
import { rensShowtimeUrl, erVoresLink, showtimeUrl, showtimeKlar } from '../lib/showtime'

/**
 * »Showtime« — billederne og resultatlisten fra dagen.
 *
 * Kunden møder ÉT valg, ikke en side: se det, eller del det. Delingen er
 * skilt ud som sit eget skridt, fordi det er dér der sker noget uigenkalde-
 * ligt — et link til billeder af navngivne mennesker, der ryger videre i en
 * mailtråd. Se-knappen åbner showet INDE i portalen med en tilbageknap; det
 * er stadig deres egen side, ikke et fremmed sted de er blevet sendt hen.
 */
export default function Showtime({ kunde, adminKode, onRettet, onLuk }) {
  const navigate = useNavigate()
  const [visDel, setVisDel] = useState(false)
  const url = showtimeUrl(kunde)
  const klar = showtimeKlar(kunde)
  const admin = !!adminKode

  return (
    <>
      {klar ? (
        visDel
          ? <Del url={url} onTilbage={() => setVisDel(false)} />
          : (
            <>
              <p className="lede">
                Billederne og resultaterne fra jeres dag ligger klar. Se dem her,
                eller del linket med dem der var med.
              </p>
              <div className="st-valg">
                <button className="st-kort" onClick={() => { onLuk?.(); navigate(`/p/${kunde.code}/showtime`) }}>
                  <span className="st-kort-ikon"><Icon name="showtime" size={30} /></span>
                  <span className="st-kort-tekst">
                    <b>Se showtime</b>
                    <span>Åbner her på siden — I kan gå tilbage når som helst</span>
                  </span>
                </button>
                <button className="st-kort" onClick={() => setVisDel(true)}>
                  <span className="st-kort-ikon"><Icon name="copy" size={26} /></span>
                  <span className="st-kort-tekst">
                    <b>Del showtime</b>
                    <span>Få linket, så I kan sende det videre</span>
                  </span>
                </button>
              </div>
            </>
          )
      ) : (
        <p className="lede">
          {admin
            ? 'Kunden kan ikke se showtime endnu. Sæt linket herunder, og tænd for det når showet er klar.'
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
function Del({ url, onTilbage }) {
  const [forstået, setForstået] = useState(false)
  const [kopieret, setKopieret] = useState(false)

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
   Adminpanelet — kun for os.

   To knapper der IKKE er den samme: »Gem« sætter linket, og kontakten
   nedenunder tænder for kundens adgang. Billederne er ofte klar før nogen
   har set dem igennem, og et show der åbner sig selv i det sekund linket
   bliver sat, er præcis dét vi ikke vil have.
----------------------------------------------------------------*/
function AdminPanel({ kunde, adminKode, onRettet }) {
  const [tekst, setTekst] = useState(kunde.showtimeUrl || '')
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  const gemt = showtimeUrl(kunde)
  const aktiv = !!kunde.showtimeAktiv

  async function skriv(patch, besked) {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      const ny = await opdaterKunde(adminKode, kunde.code, patch)
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
    skriv({ showtimeUrl: ren }, 'Linket er gemt')
  }

  function slet() {
    setTekst('')
    // Slukker OGSÅ for kunden: et tændt showtime uden link ville give en
    // knap, der åbner en tom skærm.
    skriv({ showtimeUrl: '', showtimeAktiv: false }, 'Linket er slettet')
  }

  const ren = rensShowtimeUrl(tekst)
  const fremmed = ren && !erVoresLink(ren)

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

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="st-url">Link til showtime</label>
        <input
          id="st-url" type="url" inputMode="url" autoComplete="off"
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
          {gemmer ? 'Gemmer …' : gemt ? 'Gem ændring' : 'Gem link'}
        </button>
        {gemt && (
          <button className="btn btn-quiet" onClick={slet} disabled={gemmer}>Slet link</button>
        )}
      </div>

      <div className="st-tænd">
        <div>
          <b>Vis showtime for kunden</b>
          <span>
            {gemt
              ? (aktiv ? 'Knappen står på kundens side nu.' : 'Kunden kan ikke se knappen endnu.')
              : 'Sæt et link først.'}
          </span>
        </div>
        <button
          type="button" role="switch" aria-checked={aktiv} aria-label="Vis showtime for kunden"
          className={'kontakt-knap' + (aktiv ? ' på' : '')}
          disabled={!gemt || gemmer}
          onClick={() => skriv({ showtimeAktiv: !aktiv }, !aktiv ? 'Kunden kan se showtime nu' : 'Skjult for kunden igen')}
        >
          <span />
        </button>
      </div>
    </div>
  )
}
