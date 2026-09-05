import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Icon from '../lib/icons'
import MiniKort from '../components/MiniKort'
import { hentKunde } from '../lib/data'
import { hentVenue, venueAdresse, konferenceKontakt, ankomstNote } from '../lib/venues'
import { hentAktivitet, aktivitetTekst, varighed } from '../lib/activities'
import { infoFieldsFor } from '../lib/model'
import { aktivitetsNavne, programRækker, aktiviteterFor, miljøTekst } from '../lib/aktivitetsplan'
import { danskDato } from '../lib/format'
import '../styles/print.css'

/**
 * Én A4-side til at have i hånden på dagen — eller til at sende til den,
 * der står i receptionen.
 *
 * ØKONOMI ER IKKE MED. Med vilje: sedlen bliver lagt fra sig på et bord,
 * fotograferet og sendt videre til folk der ikke skal se, hvad eventet
 * kostede. Alt andet på kundens side er med.
 *
 * Browserens egen »gem som PDF« gør arbejdet. Det giver skarp tekst frem
 * for et billede af tekst, og appen slipper for et halvt megabyte
 * PDF-kode, der kun bruges her.
 */
export default function PrintSide() {
  const { code } = useParams()
  const [tilstand, setTilstand] = useState('indlæser')
  const [kunde, setKunde] = useState(null)
  const [venue, setVenue] = useState(null)
  const [akt, setAkt] = useState(null)

  useEffect(() => {
    let død = false
    hentKunde(code)
      .then(async k => {
        if (død) return
        if (!k) { setTilstand('ukendt'); return }
        setKunde(k)
        setTilstand('klar')
        // De to opslag må gerne fejle hver for sig: en side uden kort er
        // stadig værd at printe, en side uden noget er ikke.
        const sted = (k.info && k.info.sted) || {}
        const vid = (sted.valg === 'vores' && sted.venueId) || (!sted.adresse && k.venueId) || ''
        if (vid) hentVenue(vid).then(v => { if (!død) setVenue(v) }).catch(() => {})
        if (k.aktivitetId) {
          hentAktivitet(k.aktivitetId).then(a => { if (!død) setAkt(a) }).catch(() => {})
        }
      })
      .catch(() => { if (!død) setTilstand('fejl') })
    return () => { død = true }
  }, [code])

  if (tilstand === 'indlæser') return <Besked tekst="Henter siden …" />
  if (tilstand === 'ukendt') return <Besked tekst="Vi kan ikke finde et projekt med den kode." />
  if (tilstand === 'fejl') return <Besked tekst="Siden kunne ikke hentes. Prøv igen om et øjeblik." />

  const info = kunde.info || {}
  const sted = info.sted || {}
  const egen = sted.valg === 'egen'
  const adresse = venue ? venueAdresse(venue) : egen ? (sted.adresse || '') : (kunde.sted || '')
  const lat = venue ? venue.lat : (egen ? sted.lat : (kunde.stedLat ?? null))
  const lon = venue ? venue.lon : (egen ? sted.lon : (kunde.stedLon ?? null))
  const konsulent = venue ? konferenceKontakt(venue) : null
  const gm = kunde.gamemaster || {}
  const lead = kunde.leadInstruktor || (gm.navn ? { navn: gm.navn, mail: gm.email, tlf: gm.telefon } : null)
  const program = programRækker(kunde)
  // Har de købt to ting, skal begge stå der — sedlen er dét, der ligger på
  // bordet, når nogen spørger »hvad er det egentlig, vi skal?«.
  const aktNavn = aktivitetsNavne(kunde) || (akt && akt.name) || kunde.eventTitle || 'Jeres event'
  const spilletid = varighed(akt && (akt.activity_minutes || akt.duration_minutes))
  const tekst = aktivitetTekst(akt, kunde.beskrivelse)
  // Eget afsnit på arket: inde/ude og noten er dét, folk læser inden de
  // pakker tasken — og de skal kunne findes uden at læse hele beskrivelsen.
  const forhold = aktiviteterFor(kunde).filter(a => a.miljø || a.note)

  // Kun de svar der betyder noget på dagen — ikke hele formularen igen.
  const svar = infoFieldsFor(kunde)
    .filter(f => ['deltagere', 'hold', 'ankomst', 'allergi', 'logistik', 'bemaerk'].includes(f.key))
    .map(f => [f.kort || f.label, info[f.key]])
    .filter(([, v]) => v && String(v).trim())

  return (
    <>
      <div className="p-værktøj">
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="check" size={18} />Print eller gem som PDF
        </button>
        <span className="hint">Vælg A4 og »baggrundsgrafik« slået til, så kortet kommer med.</span>
      </div>

      <div className="print-side">
        <div className="p-top">
          <div>
            <h1>{kunde.eventTitle || aktNavn}</h1>
            <p className="p-firma">{kunde.firma}{kunde.kontakt ? ' · ' + kunde.kontakt : ''}</p>
          </div>
          <div className="p-mærke">
            <span className="p-mærke-ikon"><Icon name="flag" size={16} /></span>
            <span className="p-mærke-navn">EventDay</span>
          </div>
        </div>

        <dl className="p-fakta">
          <div><dt>Dato</dt><dd>{kortDato(kunde.eventDate)}<small>{ugedag(kunde.eventDate)}</small></dd></div>
          <div><dt>Tid</dt><dd>{kunde.startTime || '—'}{kunde.endTime ? '–' + kunde.endTime : ''}
            <small>{spilletid ? spilletid + ' aktivitet' : 'Varighed følger'}</small></dd></div>
          <div><dt>Aktivitet</dt><dd style={{ fontSize: '11pt' }}>{aktNavn}</dd></div>
          <div><dt>Deltagere</dt><dd>{info.deltagere || kunde.deltagere || '—'}</dd></div>
        </dl>

        <div className="p-kolonner">
          <div>
            <section className="p-blok">
              <h2>Location</h2>
              <MiniKort lat={lat} lon={lon} højde="52mm" zoom={15} klasse="p-kort" nålKlasse="p-naal" />
              <p className="p-adresse">{adresse || 'Stedet er ikke sat endnu'}</p>
              {venue && <p className="p-dæmpet">{venue.name}</p>}
              {kunde.modested && !egen && <p>{kunde.modested}</p>}
              {venue && ankomstNote(venue)
                ? <p style={{ marginTop: '2mm' }}><b>Sådan kommer I frem:</b> {ankomstNote(venue)}</p>
                : sted.adgang
                  ? <p style={{ marginTop: '2mm' }}><b>Sådan kommer vi ind:</b> {sted.adgang}</p>
                  : null}
              {kunde.parkering && <p className="p-dæmpet">Parkering: {kunde.parkering}</p>}
            </section>

            {tekst && (
              <section className="p-blok">
                <h2>Hvad de skal lave</h2>
                <p>{tekst}</p>
              </section>
            )}

            {forhold.length > 0 && (
              <section className="p-blok">
                <h2>Inde eller ude</h2>
                {forhold.map((a, i) => (
                  <div className="p-forhold" key={a.id || i}>
                    <b>{a.navn || 'Aktiviteten'}</b>
                    {a.miljø && <span className="p-forhold-mærke">{miljøTekst(a.miljø, true)}</span>}
                    {a.note && <span className="p-forhold-note">{a.note}</span>}
                  </div>
                ))}
              </section>
            )}

            {svar.length > 0 && (
              <section className="p-blok">
                <h2>Fra kunden</h2>
                <dl className="p-svar">
                  {svar.map(([navn, værdi]) => (
                    <Rk key={navn} navn={navn} værdi={værdi} />
                  ))}
                </dl>
              </section>
            )}
          </div>

          <div>
            <section className="p-blok">
              <h2>Tidslinje</h2>
              {program.length ? (
                <ul className="p-tid">
                  {program.map((x, i) => (
                    <li key={i}>
                      <time>{x.tid}</time>
                      <span>
                        <b>{x.titel}</b>
                        {x.note ? <span>{x.note}</span> : null}
                        {x.spor && x.spor.map((s, j) => (
                          <span key={j} className="p-spor"><b>{s.gruppe}</b> {s.titel}</span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-dæmpet">Programmet er ikke lagt endnu.</p>}
            </section>

            <section className="p-blok">
              <h2>Kontakter</h2>
              <Kontakt k={kunde.eventplanner} rolle="Eventplanner, EventDay" />
              <Kontakt k={lead} rolle="Leadinstruktør på dagen" />
              <Kontakt k={info.kontaktOpgave} rolle="Kunden — opgaven" />
              <Kontakt k={info.kontaktDagen} rolle="Kunden — på dagen" />
              {konsulent && (
                <Kontakt k={{ navn: konsulent.name, mail: konsulent.email, tlf: konsulent.mobile }}
                         rolle={[venue.name, konsulent.title].filter(Boolean).join(' · ')} />
              )}
            </section>
          </div>
        </div>

        <div className="p-fod">
          <span>{kunde.firma} · kode {kunde.code}</span>
          <span>Printet {danskDato(new Date().toISOString().slice(0, 10))}</span>
        </div>
      </div>
    </>
  )
}

function Kontakt({ k, rolle }) {
  if (!k || !(k.navn || k.tlf || k.mail)) return null
  return (
    <div className="p-kontakt">
      <span className="p-kontakt-navn"><b>{k.navn || '—'}</b><span>{rolle}</span></span>
      <span className="p-kontakt-num">
        {k.tlf && <b>{k.tlf}</b>}
        {k.mail && <span>{k.mail}</span>}
      </span>
    </div>
  )
}

/** En værdi kan være en tekst eller en kontakt — begge skal kunne stå her. */
function Rk({ navn, værdi }) {
  const v = værdi && typeof værdi === 'object'
    ? [værdi.navn, værdi.tlf].filter(Boolean).join(' · ')
    : String(værdi)
  return <><dt>{navn}</dt><dd>{v}</dd></>
}

function kortDato(iso) {
  if (!iso) return '—'
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d)) return '—'
  const m = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${d.getDate()}. ${m[d.getMonth()]}`
}
function ugedag(iso) {
  if (!iso) return ''
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d)) return ''
  return ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'][d.getDay()]
}

function Besked({ tekst }) {
  return <div className="page"><div className="wrap"><div className="gate"><h1>{tekst}</h1></div></div></div>
}
