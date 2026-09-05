import { useEffect, useState } from 'react'
import Icon from '../lib/icons'
import { SECTIONS, infoFieldsFor } from '../lib/model'
import { kr, initialer } from '../lib/format'
import { hentVenue, venueAdresse, konferenceKontakt, ankomstNote } from '../lib/venues'
import { hentAktivitet, hentAktiviteter, aktivitetTekst, varighed } from '../lib/activities'
import { aktiviteterFor, aktivitetsFelter, programRækker, miljøTekst } from '../lib/aktivitetsplan'
import AktivitetsVaelger from './AktivitetsVaelger'
import TidslinjeRet from './TidslinjeRet'
import StedVaelger from './StedVaelger'
import { hentMedarbejdere, planlæggerGrupper, somKontakt } from '../lib/crew'
import { opdaterKunde } from '../lib/data'
import Showtime from './Showtime'
import VenueVaelger from './VenueVaelger'
import MiniKort from './MiniKort'

/* Arket der åbner, når kunden trykker på en af knapperne. */

export default function PortalSheet({ sektion, kunde, info, gemStatus, onInfo, onLuk, adminKode, onKundeRettet }) {
  useEffect(() => {
    function tast(e) { if (e.key === 'Escape') onLuk() }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  }, [onLuk])

  const s = SECTIONS.find(x => x.key === sektion)
  if (!s) return null

  const indhold = {
    opgave: <Opgave kunde={kunde} adminKode={adminKode} onRettet={onKundeRettet} />,
    info: <Info felter={infoFieldsFor(kunde)} info={info} gemStatus={gemStatus} onInfo={onInfo}
                 admin={!!adminKode} kunde={kunde} />,
    location: <Location kunde={kunde} info={info} adminKode={adminKode} onRettet={onKundeRettet} />,
    okonomi: <Okonomi kunde={kunde} />,
    tidslinje: <Tidslinje kunde={kunde} adminKode={adminKode} onRettet={onKundeRettet} />,
    kontakt: <Kontakter kunde={kunde} info={info} adminKode={adminKode} onRettet={onKundeRettet} />,
    showtime: <Showtime kunde={kunde} adminKode={adminKode} onRettet={onKundeRettet} onLuk={onLuk} />,
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

/**
 * »Hvad skal I lave« — aktiviteten fra kataloget, ikke en tekst vi har
 * tastet ind på kunden.
 *
 * Kataloget har billeder og tider, men `long_description` er tom på alle
 * rækker endnu, og `short_description` er importstøj (»TeamChallenge fra
 * OCC«). Derfor: rigtig beskrivelse hvis den findes, ellers den vi selv
 * skrev på kunden. Der står hellere ingen tekst end en, kunden ikke kan
 * bruge til noget.
 */
function Opgave({ kunde, adminKode, onRettet }) {
  const liste = aktiviteterFor(kunde)
  const med = kunde.inkluderet || []

  return (
    <>
      {liste.length > 1 && (
        <p className="lede">
          I har købt {liste.length} aktiviteter. Se tidslinjen for, hvornår I laver hvad —
          som regel deles I i grupper og bytter undervejs.
        </p>
      )}

      {liste.length
        ? liste.map((a, i) => <EnAktivitet key={a.id || i} valgt={a} kunde={kunde} nummer={liste.length > 1 ? i + 1 : 0} />)
        : (
          <p className="lede">
            Beskrivelsen af jeres aktivitet lægges ind her, når den er på plads.
            Ring endelig, hvis I vil vide mere allerede nu.
          </p>
        )}

      <div className="block">
        <h3>Det er med i prisen</h3>
        {med.length
          ? <div className="chips">{med.map(x => <span className="chip" key={x}>{x}</span>)}</div>
          : <p>Vi udfylder listen sammen med tilbuddet.</p>}
      </div>

      <dl style={{ margin: 0 }}>
        <Rk t="I er i gang" v={`${kunde.startTime || '—'}${kunde.endTime ? '–' + kunde.endTime : ''}`} />
        <Rk t="Deltagere" v={kunde.deltagere ? `${kunde.deltagere} deltagere` : '—'} />
        <Rk t="Vejret" v="Vi gennemfører i alt vejr" />
      </dl>

      {adminKode && <RetAktiviteter kunde={kunde} adminKode={adminKode} onRettet={onRettet} />}
    </>
  )
}

/**
 * Én aktivitet, hentet fra kataloget.
 *
 * Hver aktivitet henter sig selv. Det er ét opslag mere pr. aktivitet, men
 * det holder fejlen lokal: svarer kataloget ikke på den ene, står den anden
 * der stadig med sit billede og sin tekst.
 */
function EnAktivitet({ valgt, kunde, nummer }) {
  const [akt, setAkt] = useState(null)

  useEffect(() => {
    if (!valgt.id) return
    let død = false
    hentAktivitet(valgt.id)
      .then(a => { if (!død) setAkt(a) })
      .catch(() => { /* kataloget svarer ikke — vi viser det vi selv har */ })
    return () => { død = true }
  }, [valgt.id])

  const navn = (akt && akt.name) || valgt.navn || kunde.eventTitle || ''
  const tekst = aktivitetTekst(akt, nummer <= 1 ? kunde.beskrivelse : '')
  const spilletid = varighed(akt && (akt.activity_minutes || akt.duration_minutes))
  const spænd = akt && (akt.min_participants || akt.max_participants)
    ? [akt.min_participants, akt.max_participants].filter(Boolean).join('–') + ' deltagere'
    : ''

  return (
    <div className={nummer ? 'akt-kort' : ''}>
      {akt && akt.cover_image_url && (
        <img src={akt.cover_image_url} alt="" loading="lazy" className="akt-billede"
             onError={e => { e.currentTarget.style.display = 'none' }} />
      )}

      {navn && (
        <h3 className="akt-navn">
          {nummer ? <span className="akt-nr">{nummer}</span> : null}{navn}
          {spilletid && <span className="akt-tid">{spilletid}</span>}
          {valgt.miljø && <span className="miljø-mærke">{miljøTekst(valgt.miljø, true)}</span>}
        </h3>
      )}

      {/* Vores egen note står FØR katalogteksten: det er den ene sætning,
          der gælder netop deres dag, og den skal ikke ligge under et afsnit,
          man måske ikke læser til ende. */}
      {valgt.note && <p className="akt-note-vis">{valgt.note}</p>}

      <p className="lede" style={{ marginBottom: 12 }}>
        {tekst || 'Beskrivelsen lægges ind her, når den er på plads.'}
      </p>

      {/* Deltagerspændet hører til AKTIVITETEN, ikke til dagen: to
          aktiviteter kan have hvert sit, og et enkelt tal nederst kunne
          derfor kun være rigtigt for den ene. */}
      {spænd && <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>{spænd}</p>}

      {akt && akt.venue_requirements && (
        <div className="block">
          <h3>Det kræver stedet</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{akt.venue_requirements}</p>
        </div>
      )}

      {akt && akt.external_pdf_url && (
        <div className="actions" style={{ marginBottom: 14 }}>
          <a className="btn btn-quiet" href={akt.external_pdf_url} target="_blank" rel="noopener noreferrer">
            Læs mere om {navn || 'aktiviteten'}
          </a>
        </div>
      )}
    </div>
  )
}

/** Ret listen bagefter — kun for os. Samme vælger som ved oprettelsen. */
function RetAktiviteter({ kunde, adminKode, onRettet }) {
  const [katalog, setKatalog] = useState([])
  const [valgte, setValgte] = useState(() => aktiviteterFor(kunde))
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  useEffect(() => {
    let død = false
    hentAktiviteter().then(a => { if (!død) setKatalog(a) }).catch(() => setFejl('Kataloget kunne ikke hentes.'))
    return () => { død = true }
  }, [])

  async function gem() {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      onRettet?.(await opdaterKunde(adminKode, kunde.code, aktivitetsFelter(valgte)))
      setKvittering('Gemt')
      setTimeout(() => setKvittering(null), 2600)
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally { setGemmer(false) }
  }

  return (
    <div className="block" style={{ marginTop: 18 }}>
      <h3>Ret aktiviteterne (kun os)</h3>
      <AktivitetsVaelger aktiviteter={katalog} valgte={valgte} onÆndre={setValgte} />
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8 }}>{fejl}</p>}
      {kvittering && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 8 }}>{kvittering}</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer …' : 'Gem aktiviteter'}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Hver aktivitet får sit eget showtime, og tidslinjen kan køre dem samtidig i grupper.
      </p>
    </div>
  )
}

/**
 * »Info fra jer« — de spørgsmål NETOP denne kunde skal svare på.
 *
 * Listen kommer fra `infoFieldsFor`, ikke fra en fast række felter: en
 * byjagt og en madaften har ikke det samme at afklare. Fire felttyper:
 * stedet (sammensat), en kontaktperson (navn + nummer + mail), fritekst og
 * en almindelig linje.
 */
function Info({ felter, info, gemStatus, onInfo, admin, kunde }) {
  return (
    <>
      <p className="lede">
        Jo før vi har det her, jo mindre skal I tage stilling til på dagen.
        Det gemmer sig selv, og I kan komme tilbage senere.
      </p>
      {felter.map(f => (
        <div className="field" key={f.key}>
          {f.type === 'venue'
            ? <span className="felt-titel">{f.label}</span>
            : <label htmlFor={'f-' + f.key}>{f.label}</label>}
          {f.type === 'venue' ? (
            <VenueVaelger værdi={info[f.key]} onÆndre={v => onInfo(f.key, v)} admin={admin}
                          voresSted={{ sted: kunde.sted || '', lat: kunde.stedLat ?? null, lon: kunde.stedLon ?? null,
                                       venueId: kunde.venueId || '' }} />
          ) : f.type === 'kontakt' ? (
            <KontaktFelt k={info[f.key]} onÆndre={v => onInfo(f.key, v)} navnId={'f-' + f.key} />
          ) : f.type === 'textarea' ? (
            <textarea id={'f-' + f.key} value={info[f.key] || ''} placeholder={f.ph || ''}
                      onChange={e => onInfo(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <Valg felt={f} værdi={info[f.key] || ''} onÆndre={v => onInfo(f.key, v)} />
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

/**
 * Et valg med FÅ muligheder — som knapper, ikke som en rulleliste.
 *
 * En <select> på en telefon åbner systemets egen hjul-popup: den dækker
 * halvdelen af skærmen, ser ud som alt andet end vores side, og man kan ikke
 * se mulighederne, før man har trykket. Med to valg er der ingen grund til
 * at gemme dem — så står de bare der, og ét tryk er nok.
 *
 * Et gammelt svar, der ikke længere er en mulighed, får sin egen knap.
 * Ellers ville kunden se et tomt valg og tro, de aldrig fik svaret.
 */
function Valg({ felt, værdi, onÆndre }) {
  const muligheder = [...felt.options]
  if (værdi && !muligheder.includes(værdi)) muligheder.push(værdi)

  return (
    <div className="valg-knapper" role="radiogroup" aria-label={felt.label} id={'f-' + felt.key}>
      {muligheder.map(o => (
        <button
          type="button" key={o} role="radio" aria-checked={værdi === o}
          className={'valg-knap' + (værdi === o ? ' valgt' : '')}
          // Et tryk på det valgte fortryder det: et fejltryk skal kunne
          // tages tilbage uden at man skal vælge noget andet i stedet.
          onClick={() => onÆndre(værdi === o ? '' : o)}
        >
          <span className="valg-prik" aria-hidden="true" />
          {o}
        </button>
      ))}
    </div>
  )
}

/** Navn, mail og telefon i én blok. Tre felter frem for ét frit felt, fordi
 *  »Thomas« uden et nummer ikke er nogen man kan ringe til klokken syv. */
function KontaktFelt({ k, onÆndre, navnId }) {
  const v = k && typeof k === 'object' ? k
    // Ældre svar var én tekstlinje. Den kastes ikke væk — den lander i navnet,
    // så kunden kan se hvad de skrev og selv rette det op.
    : (k ? { navn: String(k) } : {})
  const sæt = patch => onÆndre({ ...v, ...patch })
  return (
    <div className="kontakt-felt">
      <input id={navnId} type="text" value={v.navn || ''} placeholder="Navn"
             onChange={e => sæt({ navn: e.target.value })} />
      <div className="row2">
        <input type="tel" inputMode="tel" value={v.tlf || ''} placeholder="Mobil"
               onChange={e => sæt({ tlf: e.target.value })} />
        <input type="email" inputMode="email" value={v.mail || ''} placeholder="E-mail"
               onChange={e => sæt({ mail: e.target.value })} />
      </div>
    </div>
  )
}

/**
 * Location viser det, kunden har SVARET — ikke det vi gættede da vi oprettede
 * dem. Er der ikke svaret endnu, falder den tilbage på stedet fra tilbuddet,
 * så arket aldrig står tomt.
 *
 * Er det et af vores steder, står stedets egen konferencekonsulent her — med
 * den linje der er hele pointen: kunden skal IKKE selv aftale noget med dem.
 */
function Location({ kunde, info, adminKode, onRettet }) {
  const svar = (info && info.sted) || {}
  const [venue, setVenue] = useState(null)
  const [venueFejl, setVenueFejl] = useState(false)

  // Stedet kan være valgt af kunden (gamle svar) ELLER sat af os. Begge
  // veje ender i den samme række i venue-systemet.
  const venueId = (svar.valg === 'vores' && svar.venueId) || (!svar.adresse && kunde.venueId) || ''

  useEffect(() => {
    if (!venueId) { setVenue(null); return }
    let død = false
    setVenueFejl(false)
    hentVenue(venueId)
      .then(v => { if (!død) setVenue(v) })
      .catch(() => { if (!død) setVenueFejl(true) })
    return () => { død = true }
  }, [venueId])

  const egen = svar.valg === 'egen'
  const adresse = venue ? venueAdresse(venue)
    : egen ? (svar.adresse || '')
    : (kunde.sted || '')
  // Kundens eget svar vinder; ellers står vores egen nål. Det er dét, der
  // gør, at kortet er der fra dag ét — også før kunden har svaret på noget.
  const lat = venue ? venue.lat : (egen ? svar.lat : (kunde.stedLat ?? null))
  const lon = venue ? venue.lon : (egen ? svar.lon : (kunde.stedLon ?? null))
  const konsulent = venue ? konferenceKontakt(venue) : null
  const logistik = (info && info.logistik) || ''

  return (
    <>
      <div className="block">
        <h3>{venue ? venue.name : egen ? 'Jeres location' : 'Mødested'}</h3>
        <p>{adresse || 'Stedet er ikke sat endnu — vælg det under »info fra jer«.'}</p>
        {!egen && !venue && kunde.modested && (
          <p style={{ marginTop: 8, color: 'var(--ink)', fontWeight: 600 }}>{kunde.modested}</p>
        )}
        <MiniKort lat={lat} lon={lon} højde={170} />
      </div>

      {venueFejl && (
        <p className="hint" style={{ color: 'var(--red)', marginBottom: 12 }}>
          Vi kunne ikke hente stedets oplysninger lige nu. Jeres valg er gemt.
        </p>
      )}

      {svar.adgang && (
        <div className="block">
          <h3>Sådan kommer vi ind</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{svar.adgang}</p>
        </div>
      )}

      {/* Er det et af VORES steder, kommer ankomstforholdene derfra —
          skrevet af dem, der kender stedet. Ellers står kundens eget svar. */}
      {venue && ankomstNote(venue) ? (
        <div className="block">
          <h3>Sådan kommer I frem</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{ankomstNote(venue)}</p>
          <p className="hint" style={{ marginTop: 8 }}>Fra stedets egen beskrivelse.</p>
        </div>
      ) : logistik ? (
        <div className="block">
          <h3>Særlige forhold ved ankomst</h3>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{logistik}</p>
        </div>
      ) : null}

      {venue && (
        <p className="hint" style={{ marginBottom: 14 }}>
          Stedets egen kontaktperson står under <b>Kontakter</b>. I skal ikke
          aftale noget med dem — vi gør det.
        </p>
      )}

      {!egen && !venue && (
        <dl style={{ margin: '0 0 16px' }}>
          <Rk t="Parkering" v={kunde.parkering || '—'} />
          <Rk t="Toiletter" v="Ved mødestedet" />
          <Rk t="Ly for regn" v="Ja, indendørs samlingssted" />
        </dl>
      )}

      {adresse && (
        <div className="actions">
          <a className="btn btn-primary" target="_blank" rel="noopener noreferrer"
             href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adresse)}>
            <Icon name="pin" size={18} />Vis på kort
          </a>
        </div>
      )}

      {adminKode && <RetSted kunde={kunde} adminKode={adminKode} onRettet={onRettet} />}
    </>
  )
}

/** Sæt eller ret stedet — kun for os. Samme opslag som ved oprettelsen. */
function RetSted({ kunde, adminKode, onRettet }) {
  const [værdi, setVærdi] = useState({
    sted: kunde.sted || '', venueId: kunde.venueId || '',
    lat: kunde.stedLat ?? null, lon: kunde.stedLon ?? null,
  })
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  async function gem() {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      onRettet?.(await opdaterKunde(adminKode, kunde.code, {
        sted: værdi.sted || '', venueId: værdi.venueId || '',
        stedLat: værdi.lat ?? null, stedLon: værdi.lon ?? null,
      }))
      setKvittering('Gemt')
      setTimeout(() => setKvittering(null), 2600)
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally { setGemmer(false) }
  }

  return (
    <div className="block" style={{ marginTop: 18 }}>
      <h3>Ret stedet (kun os)</h3>
      <StedVaelger værdi={værdi} onÆndre={setVærdi} />
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8 }}>{fejl}</p>}
      {kvittering && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 8 }}>{kvittering}</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer …' : 'Gem stedet'}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Vælger kunden selv et sted under »info fra jer«, er det deres valg, der vises.
      </p>
    </div>
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

function Tidslinje({ kunde, adminKode, onRettet }) {
  const [retter, setRetter] = useState(false)
  const p = programRækker(kunde)
  const admin = !!adminKode

  return (
    <>
      {p.length ? (
        <>
          <p className="lede">
            Sådan ser dagen ud lige nu. Skal noget flyttes, så sig til — det er nemmest inden ugen før.
          </p>
          <ul className="tl">
            {p.map((x, i) => (
              <li key={i} className={x.spor ? 'tl-par' : ''}>
                <span className="tl-dot" />
                <span className="tl-time">{x.tid}</span>
                <span className="tl-txt">
                  <strong>{x.titel}</strong>
                  {x.note && <span>{x.note}</span>}
                  {/* Samtidige spor: hver gruppe sin linje, så man kan se
                      hvad MAN selv skal — ikke bare at der sker to ting. */}
                  {x.spor && (
                    <span className="tl-spor-vis">
                      {x.spor.map((s, j) => (
                        <span key={j}><b>{s.gruppe}</b>{s.titel}</span>
                      ))}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="lede">
          {admin
            ? 'Der er ingen tidslinje endnu. Byg den herunder — har kunden købt to aktiviteter, kan du lave en rundeplan på ét tryk.'
            : 'Programmet lægges her, så snart tiderne er faldet på plads.'}
        </p>
      )}

      {admin && (
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn btn-quiet" onClick={() => setRetter(true)}>Ret tidslinjen</button>
        </div>
      )}

      {retter && (
        <TidslinjeRet kunde={kunde} adminKode={adminKode} onRettet={onRettet}
                      onLuk={() => setRetter(false)} />
      )}
    </>
  )
}


/**
 * Kontakter — alle fire på ét sted, i den rækkefølge kunden får brug for dem.
 *
 *  1. Vores eventplanner: den de aftaler indhold og pris med i ugerne før.
 *  2. Leadinstruktøren: den der står med udstyret på dagen.
 *  3. Deres egen kontakt: den de selv har skrevet under »info fra jer«, så de
 *     kan se hvem VI ringer til — og rette den, hvis det bliver en anden.
 *  4. Stedets kontaktperson, hvis de har valgt et af vores steder.
 *
 * De to første er VORES og kan kun rettes med adminkoden. Åbner en af os
 * kundens side fra kundelisten, står der en lille rette-knap; en kunde ser
 * den aldrig, og databasen afviser rettelsen uanset hvad browseren sender.
 */
function Kontakter({ kunde, info, adminKode, onRettet }) {
  const [venue, setVenue] = useState(null)
  const [retter, setRetter] = useState(false)

  const svar = (info && info.sted) || {}
  useEffect(() => {
    if (svar.valg !== 'vores' || !svar.venueId) { setVenue(null); return }
    let død = false
    hentVenue(svar.venueId).then(v => { if (!død) setVenue(v) }).catch(() => {})
    return () => { død = true }
  }, [svar.valg, svar.venueId])

  const konsulent = venue ? konferenceKontakt(venue) : null
  const gm = kunde.gamemaster || {}
  const planner = kunde.eventplanner
  const lead = kunde.leadInstruktor
    // Er der ingen leadinstruktør sat endnu, står den gamle gamemaster-linje
    // stadig på ældre kunder. Den bruges frem for at vise et tomt felt.
    || (gm.navn ? { navn: gm.navn, mail: gm.email, tlf: gm.telefon } : null)

  return (
    <>
      <p className="lede">
        Er I i tvivl om noget, så ring. Det er altid bedre end at gætte på dagen.
      </p>

      <Person titel="Jeres eventplanner hos os" k={planner}
              rolle="Aftaler indhold, tider og pris med jer"
              tom="Vi sætter navn på snarest." />

      <Person titel="Leadinstruktør på dagen" k={lead}
              rolle="Står klar på stedet 45 minutter før"
              tom="Instruktøren sættes på, når vi er tættere på dagen." />

      <Person titel="Jeres egen kontakt på dagen" k={info && info.kontaktDagen}
              rolle="Den vi ringer til, hvis noget skal afklares"
              tom="Udfyld den under »info fra jer«, så vi ved hvem vi skal ringe til." />

      {konsulent && (
        <>
          <Person titel="Stedets kontaktperson" k={{ navn: konsulent.name, mail: konsulent.email, tlf: konsulent.mobile }}
                  rolle={[venue.name, konsulent.title].filter(Boolean).join(' · ')} />
          <p className="hint" style={{ marginTop: -4, marginBottom: 14 }}>
            <b>I skal ikke aftale noget med stedet.</b> Vi kontakter dem og
            arrangerer det praktiske. Nummeret står her, så I ved hvem vi taler med.
          </p>
        </>
      )}

      {adminKode && (
        <div style={{ marginTop: 6 }}>
          {retter
            ? <RetVoresFolk kunde={kunde} adminKode={adminKode}
                            onLuk={() => setRetter(false)} onRettet={onRettet} />
            : <button className="btn btn-quiet" onClick={() => setRetter(true)}>
                Ret eventplanner og instruktør
              </button>}
        </div>
      )}
    </>
  )
}

/** Én kontakt: navn, hvad de laver, og knapper der ringer eller skriver. */
function Person({ titel, k, rolle, tom }) {
  const har = k && (k.navn || k.mail || k.tlf)
  return (
    <div className="block">
      <h3>{titel}</h3>
      {har ? (
        <>
          <div className="person" style={{ marginBottom: 10 }}>
            <div className="avatar">{initialer(k.navn || '?')}</div>
            <div>
              <b>{k.navn || 'Uden navn'}</b>
              {rolle && <span>{rolle}</span>}
            </div>
          </div>
          <div className="actions">
            {k.tlf && (
              <a className="btn btn-primary" href={'tel:' + String(k.tlf).replace(/\s/g, '')}>
                <Icon name="phone" size={16} />{k.tlf}
              </a>
            )}
            {k.mail && (
              <a className="btn btn-quiet" href={'mailto:' + k.mail}>
                <Icon name="mail" size={16} color="currentColor" />Skriv
              </a>
            )}
          </div>
        </>
      ) : (
        <p>{tom || 'Ikke sat endnu.'}</p>
      )}
    </div>
  )
}

/** Rette-panelet — kun for os. Samme to lister som ved oprettelsen. */
function RetVoresFolk({ kunde, adminKode, onLuk, onRettet }) {
  const [folk, setFolk] = useState([])
  const [planner, setPlanner] = useState((kunde.eventplanner && kunde.eventplanner.id) || '')
  const [lead, setLead] = useState((kunde.leadInstruktor && kunde.leadInstruktor.id) || '')
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)

  useEffect(() => {
    let død = false
    hentMedarbejdere().then(m => { if (!død) setFolk(m) }).catch(() => setFejl('Medarbejderlisten kunne ikke hentes.'))
    return () => { død = true }
  }, [])

  async function gem() {
    setGemmer(true); setFejl(null)
    try {
      const patch = {
        eventplanner: somKontakt(folk.find(m => m.id === planner)),
        leadInstruktor: somKontakt(folk.find(m => m.id === lead)),
      }
      const ny = await opdaterKunde(adminKode, kunde.code, patch)
      onRettet?.(ny)
      onLuk()
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally {
      setGemmer(false)
    }
  }

  const { typiske, øvrige } = planlæggerGrupper(folk)

  return (
    <div className="block">
      <h3>Ret vores folk</h3>
      <div className="field">
        <label htmlFor="ret-planner">Eventplanner</label>
        <select id="ret-planner" value={planner} onChange={e => setPlanner(e.target.value)}>
          <option value="">Ikke sat</option>
          {typiske.length > 0 && (
            <optgroup label="Plejer at være">
              {typiske.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
            </optgroup>
          )}
          <optgroup label="Alle">
            {øvrige.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
          </optgroup>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ret-lead">Leadinstruktør på dagen</label>
        <select id="ret-lead" value={lead} onChange={e => setLead(e.target.value)}>
          <option value="">Ikke sat</option>
          {folk.map(m => <option key={m.id} value={m.id}>{m.navn}</option>)}
        </select>
      </div>
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 8 }}>{fejl}</p>}
      <div className="actions">
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer …' : 'Gem'}
        </button>
        <button className="btn btn-quiet" onClick={onLuk}>Fortryd</button>
      </div>
    </div>
  )
}

function Rk({ t, v }) {
  return <div className="kv"><dt>{t}</dt><dd>{v}</dd></div>
}
