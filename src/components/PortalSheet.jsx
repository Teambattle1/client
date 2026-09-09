import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'
import { SECTIONS, infoFieldsFor, feltUdfyldt, PRAKTISK, praktiskFor } from '../lib/model'
import { kr, initialer } from '../lib/format'
import { hentVenue, venueAdresse, konferenceKontakt, ankomstNote } from '../lib/venues'
import { hentAktivitet, hentAktiviteter, hentTidslinjeRammer, aktivitetTekst, grundtekst, gemGrundtekst, varighed } from '../lib/activities'
import { aktiviteterFor, aktivitetsFelter, programRækker, programFelter, afviklingFor, miljøTekst } from '../lib/aktivitetsplan'
import AktivitetsVaelger, { AfviklingValg } from './AktivitetsVaelger'
import TidslinjeRet from './TidslinjeRet'
import StedVaelger from './StedVaelger'
import { hentMedarbejdere, planlæggerGrupper, somKontakt } from '../lib/crew'
import { opdaterKunde } from '../lib/data'
import Showtime from './Showtime'
import VenueVaelger from './VenueVaelger'
import MiniKort from './MiniKort'
import { slåOpCvr, fakturaUdfyldt } from '../lib/cvr'

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
    okonomi: <Okonomi kunde={kunde} info={info} gemStatus={gemStatus} onInfo={onInfo} adminKode={adminKode} onRettet={onKundeRettet} />,
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
        ? liste.map((a, i) => (
            <EnAktivitet key={a.id || i} valgt={a} kunde={kunde} nummer={liste.length > 1 ? i + 1 : 0}
                         adminKode={adminKode} onRettet={onRettet} />
          ))
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
function EnAktivitet({ valgt, kunde, nummer, adminKode, onRettet }) {
  const [akt, setAkt] = useState(null)
  const [retter, setRetter] = useState(false)

  useEffect(() => {
    if (!valgt.id) return
    let død = false
    hentAktivitet(valgt.id)
      .then(a => { if (!død) setAkt(a) })
      .catch(() => { /* kataloget svarer ikke — vi viser det vi selv har */ })
    return () => { død = true }
  }, [valgt.id])

  const navn = (akt && akt.name) || valgt.navn || kunde.eventTitle || ''
  // Kundens egen tekst til NETOP denne aktivitet vinder; den gamle
  // fælles beskrivelse gælder stadig for den første, som før.
  const tekst = aktivitetTekst(akt, valgt.tekst || (nummer <= 1 ? kunde.beskrivelse : ''))
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

      <p className="lede" style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>
        {tekst || 'Beskrivelsen lægges ind her, når den er på plads.'}
      </p>

      {adminKode && !retter && (
        <div className="actions" style={{ marginBottom: 14 }}>
          <button className="btn btn-quiet" onClick={() => setRetter(true)}>
            <Icon name="pen" size={15} color="currentColor" />
            {valgt.tekst ? 'Ret teksten' : 'Skriv tekst til kunden'}
          </button>
          {valgt.tekst
            ? <span className="akt-tekst-kilde" style={{ alignSelf: 'center' }}>Kundens egen tekst</span>
            : grundtekst(akt)
              ? <span className="akt-tekst-kilde" style={{ alignSelf: 'center' }}>Grundtekst fra kataloget</span>
              : null}
        </div>
      )}
      {retter && (
        <RetAktivitetsTekst valgt={valgt} akt={akt} kunde={kunde} adminKode={adminKode}
                            onRettet={k => { onRettet?.(k); setRetter(false) }}
                            onGrundtekst={t => setAkt(a => a ? { ...a, long_description: t } : a)}
                            onLuk={() => setRetter(false)} />
      )}

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

/**
 * Teksten om aktiviteten — kun for os.
 *
 * GRUNDTEKSTEN ligger i EventFlows katalog og er den, alle kunder ser.
 * »Kopiér grundteksten« lægger den over på kunden, hvor den kan rettes
 * til netop deres dag — uden at grundteksten røres. Skal grundteksten selv
 * rettes, er der en knap til det, og den siger tydeligt, at det gælder
 * alle.
 */
function RetAktivitetsTekst({ valgt, akt, kunde, adminKode, onRettet, onGrundtekst, onLuk }) {
  const grund = grundtekst(akt)
  const [tekst, setTekst] = useState(valgt.tekst || '')
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)

  async function gemHosKunden() {
    setGemmer(true); setFejl(null)
    try {
      const liste = aktiviteterFor(kunde).map(a => a.id === valgt.id ? { ...a, tekst } : a)
      onRettet?.(await opdaterKunde(adminKode, kunde.code, aktivitetsFelter(liste)))
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message); setGemmer(false)
    }
  }

  async function gemSomGrund() {
    if (!valgt.id) return
    if (!window.confirm('Det her retter grundteksten i kataloget — for ALLE kunder med ' + (valgt.navn || 'aktiviteten') + '. Fortsæt?')) return
    setGemmer(true); setFejl(null)
    try {
      await gemGrundtekst(valgt.id, tekst)
      onGrundtekst?.(tekst)
      // Kundens egen kopi fjernes: nu ER teksten grundteksten.
      const liste = aktiviteterFor(kunde).map(a => a.id === valgt.id ? { ...a, tekst: '' } : a)
      onRettet?.(await opdaterKunde(adminKode, kunde.code, aktivitetsFelter(liste)))
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message); setGemmer(false)
    }
  }

  return (
    <div className="akt-tekst-ret">
      <span className="akt-tekst-kilde">{tekst ? 'Kundens egen tekst' : 'Ingen egen tekst endnu'}</span>
      <textarea value={tekst} onChange={e => setTekst(e.target.value)}
                placeholder={grund ? 'Tryk »Kopiér grundteksten« og ret i den herunder.' : 'Der er ingen grundtekst i kataloget endnu. Skriv den her — og gem den som grundtekst, hvis den skal gælde alle.'}
                aria-label={'Tekst om ' + (valgt.navn || 'aktiviteten')} />
      {fejl && <p className="hint" style={{ color: 'var(--red)' }}>{fejl}</p>}
      <div className="actions">
        {grund && (
          <button className="btn btn-quiet" onClick={() => setTekst(grund)} disabled={gemmer}>
            <Icon name="copy" size={15} color="currentColor" />Kopiér grundteksten
          </button>
        )}
        <button className="btn btn-primary" onClick={gemHosKunden} disabled={gemmer}>
          <Icon name="check" size={16} />{gemmer ? 'Gemmer …' : 'Gem for ' + (kunde.firma || 'kunden')}
        </button>
        <button className="btn btn-quiet" onClick={gemSomGrund} disabled={gemmer || !tekst.trim() || !valgt.id}>
          Gem som grundtekst (alle kunder)
        </button>
        <button className="btn btn-quiet" onClick={onLuk} disabled={gemmer}>Fortryd</button>
      </div>
      <p className="hint">
        Det du gemmer for kunden, ser kun de. Grundteksten ligger i EventFlows katalog og bruges,
        hvor kunden ikke har sin egen. Tøm feltet og gem, så er kunden tilbage på grundteksten.
      </p>
    </div>
  )
}

/** Ret listen bagefter — kun for os. Samme vælger som ved oprettelsen. */
function RetAktiviteter({ kunde, adminKode, onRettet }) {
  const [katalog, setKatalog] = useState([])
  const [valgte, setValgte] = useState(() => aktiviteterFor(kunde))
  const [afvikling, setAfvikling] = useState(() => afviklingFor(kunde))
  const [rammer, setRammer] = useState({})
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  useEffect(() => {
    let død = false
    hentAktiviteter().then(a => { if (!død) setKatalog(a) }).catch(() => setFejl('Kataloget kunne ikke hentes.'))
    hentTidslinjeRammer().then(r => { if (!død) setRammer(r) })
    return () => { død = true }
  }, [])

  // Tidslinjen bygges om, når aktiviteterne ændrer sig — men KUN så længe
  // den er vores eget gæt. Har nogen rettet i den med hånden, står den.
  const bygOm = !!kunde.programAuto || !(kunde.program || []).length

  async function gem() {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      const felter = { ...aktivitetsFelter(valgte), afvikling }
      if (bygOm) Object.assign(felter, programFelter({ ...kunde, ...felter }, { rammer }))
      onRettet?.(await opdaterKunde(adminKode, kunde.code, felter))
      setKvittering(bygOm && felter.program ? 'Gemt — tidslinjen er bygget om' : 'Gemt')
      setTimeout(() => setKvittering(null), 2600)
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally { setGemmer(false) }
  }

  return (
    <div className="block" style={{ marginTop: 18 }}>
      <h3>Ret aktiviteterne (kun os)</h3>
      <AktivitetsVaelger aktiviteter={katalog} valgte={valgte} onÆndre={setValgte} />
      {valgte.length > 1 && <AfviklingValg værdi={afvikling} onÆndre={setAfvikling} />}
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8 }}>{fejl}</p>}
      {kvittering && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 8 }}>{kvittering}</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer …' : 'Gem aktiviteter'}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        {bygOm
          ? 'Tidslinjen bygges om af sig selv, når du gemmer — af starttiden og aktiviteternes tider fra kataloget.'
          : 'Tidslinjen er rettet i hånden, så den står som den er. Byg den om under »Tidslinje«, hvis dagen skal laves forfra.'}
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
      {felter.map(f => {
        const mangler = !!f.skal && !feltUdfyldt(f, info[f.key], kunde)
        return (
        <div className={'field' + (mangler ? ' mangler' : '')} key={f.key}>
          {f.type === 'venue'
            ? <span className="felt-titel">{f.label}{mangler && <em className="skal-mærke">Skal udfyldes</em>}</span>
            : <label htmlFor={'f-' + f.key}>{f.label}{mangler && <em className="skal-mærke">Skal udfyldes</em>}</label>}
          {f.type === 'venue' ? (
            <VenueVaelger værdi={info[f.key]} onÆndre={v => onInfo(f.key, v)} admin={admin}
                          voresSted={{ sted: kunde.sted || '', lat: kunde.stedLat ?? null, lon: kunde.stedLon ?? null,
                                       venueId: kunde.venueId || '', modested: kunde.modested || '' }} />
          ) : f.type === 'kontakt' ? (
            <KontaktFelt k={info[f.key]} onÆndre={v => onInfo(f.key, v)} navnId={'f-' + f.key} />
          ) : f.type === 'textarea' ? (
            <textarea id={'f-' + f.key} value={info[f.key] || ''} placeholder={f.ph || ''}
                      onChange={e => onInfo(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <Valg felt={f} værdi={info[f.key] || ''} onÆndre={v => onInfo(f.key, v)} firma={kunde.firma} />
          ) : (
            <input id={'f-' + f.key} type="text" value={info[f.key] || ''} placeholder={f.ph || ''}
                   onChange={e => onInfo(f.key, e.target.value)} />
          )}
          {f.hint && <p className="hint">{f.hint}</p>}
        </div>
        )
      })}
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
function Valg({ felt, værdi, onÆndre, firma }) {
  const muligheder = [...felt.options]
  if (værdi && !muligheder.includes(værdi)) muligheder.push(værdi)
  const tekst = o => String((felt.visning && felt.visning[o]) || o).replace('{firma}', String(firma || '').trim() || 'I')

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
          {tekst(o)}
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
  const logistik = (info && info.logistik) || ''

  return (
    <>
      <div className="block">
        <h3>{venue ? venue.name : egen ? 'Jeres location' : 'Mødested'}</h3>
        <p>{adresse || 'Stedet er ikke sat endnu — vælg det under »info fra jer«.'}</p>
        {/* Mødestedet PÅ stedet — »lokale A«, »ved receptionen« — gælder
            også, når stedet er et af vores: det er dét, der skal stå. */}
        {!egen && kunde.modested && (
          <p style={{ marginTop: 8, color: 'var(--ink)', fontWeight: 600 }}>Vi mødes: {kunde.modested}</p>
        )}
        <MiniKort lat={lat} lon={lon} højde={170} />
        {(lat || lon) && (
          <p className="kort-note">
            Vi vil – efter aftale med location – være på det røde spot, men aftal evt.
            nærmere med jeres instruktør.
          </p>
        )}
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

      {!egen && (
        <dl style={{ margin: '0 0 16px' }}>
          {PRAKTISK.map(f => <Rk key={f.key} t={f.label} v={praktiskFor(kunde, venue)[f.key] || '—'} />)}
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

      {adminKode && <RetSted kunde={kunde} adminKode={adminKode} onRettet={onRettet} venue={venue} />}
    </>
  )
}

/** Sæt eller ret stedet — kun for os. Samme opslag som ved oprettelsen. */
function RetSted({ kunde, adminKode, onRettet, venue }) {
  const [værdi, setVærdi] = useState({
    sted: kunde.sted || '', venueId: kunde.venueId || '',
    lat: kunde.stedLat ?? null, lon: kunde.stedLon ?? null,
  })
  const [modested, setModested] = useState(kunde.modested || '')
  // Felterne står udfyldt med det, kunden ser lige nu — så retter man i
  // dét, frem for at skrive det hele forfra.
  const [praktisk, setPraktisk] = useState(() => praktiskFor(kunde, venue))
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  async function gem() {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      const rene = {}
      for (const f of PRAKTISK) rene[f.key] = String(praktisk[f.key] || '').trim()
      onRettet?.(await opdaterKunde(adminKode, kunde.code, {
        sted: værdi.sted || '', venueId: værdi.venueId || '',
        stedLat: værdi.lat ?? null, stedLon: værdi.lon ?? null,
        modested: modested.trim(),
        praktisk: rene,
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
      {værdi.sted && !værdi.venueId && (
        <p className="hint" style={{ marginTop: 8, color: 'var(--gold)' }}>
          Stedet står som en adresse, ikke som et af VORES steder. Så får kunden spørgsmålene om
          adgang og ankomst — vælg stedet fra listen (»Slå op«), hvis det er et af vores.
        </p>
      )}
      <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
        <label htmlFor="rs-modested">Hvor på stedet mødes vi?</label>
        <input id="rs-modested" value={modested} onChange={e => setModested(e.target.value)}
               placeholder="Fx lokale A · ved receptionen · i parken bag hovedbygningen" autoComplete="off" />
        <p className="hint">Kunden ser det under »Hvor skal det foregå?« og under Location. Bogstav eller lokale, hvis stedet bruger det.</p>
      </div>
      <div className="sec-label" style={{ marginTop: 14, marginBottom: 6 }}>Det praktiske på stedet</div>
      {PRAKTISK.map(f => (
        <div className="field" key={f.key} style={{ marginBottom: 10 }}>
          <label htmlFor={'rs-' + f.key}>{f.label}</label>
          <input id={'rs-' + f.key} value={praktisk[f.key] || ''} autoComplete="off"
                 onChange={e => setPraktisk(x => ({ ...x, [f.key]: e.target.value }))} />
        </div>
      ))}
      <p className="hint" style={{ marginTop: -2, marginBottom: 8 }}>
        Står udfyldt med det, kunden ser nu. Ret i det, der ikke passer — fx »Ja, i Ridesalen (C)« under ly for regn, når det er aftalt.
      </p>
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8 }}>{fejl}</p>}
      {kvittering && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 8 }}>{kvittering}</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer …' : 'Gem stedet'}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Er stedet et af vores, skjules kundens egne spørgsmål om adgang — stedets egen ankomst-info står der i stedet.
        Vælger kunden selv et sted under »info fra jer«, er det deres valg, der vises.
      </p>
    </div>
  )
}

/**
 * Økonomi — det kunden skal vide, og det ENE de skal gøre: fortælle os
 * hvem fakturaen skal til.
 *
 * Momsen regnes ud og vises, så tallet på fakturaen ikke kommer som en
 * overraskelse. Prisen, momssatsen og betalingsfristen sætter VI (nederst,
 * kun for os); fakturaoplysningerne skriver kunden selv, og de gemmer sig
 * løbende ligesom resten af »info fra jer«.
 */
export function økonomiFor(kunde) {
  const pris = Number(kunde.pris || 0)
  const momsPct = Number.isFinite(Number(kunde.momsPct)) && kunde.momsPct !== '' && kunde.momsPct !== null ? Number(kunde.momsPct) : 25
  const moms = Math.round(pris * momsPct) / 100
  const dage = Number(kunde.betalingsdage) > 0 ? Number(kunde.betalingsdage) : 8
  return { pris, momsPct, moms, total: pris + moms, dage }
}

function Okonomi({ kunde, info, gemStatus, onInfo, adminKode, onRettet }) {
  const ø = økonomiFor(kunde)
  const fakt = (info && info.faktura && typeof info.faktura === 'object') ? info.faktura : {}
  const udfyldt = fakturaUdfyldt(fakt)
  const [åben, setÅben] = useState(false)

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {kunde.betalt
          ? <span className="pill pill-green"><Icon name="check" size={13} color="currentColor" />Betalt</span>
          : <span className="pill pill-gold">Faktura sendt</span>}
      </div>
      <dl style={{ margin: 0 }}>
        <Rk t={`Aktivitet, ${kunde.deltagere || '—'} deltagere`} v={kr(ø.pris)} />
        <Rk t={`Moms ${ø.momsPct} %`} v={kr(ø.moms)} />
        <Rk t="Betaling" v={`${ø.dage} dage netto`} />
      </dl>
      <div className="total"><span>I alt inkl. moms</span><b>{kr(ø.total)}</b></div>
      <p className="note" style={{ marginBottom: 14 }}>
        {kr(ø.pris)} ekskl. moms. Ændrer antallet af deltagere sig mere end 10 %, retter vi fakturaen efter det endelige tal.
      </p>

      {/* Faktureres til: det ene kunden skal gøre her. Mangler det, LYSER
          det — det er dét, der gør, at fakturaen kommer det rigtige sted hen. */}
      <div className={'block' + (!udfyldt && !åben ? ' mangler-blok' : '')}>
        <h3>Faktureres til{!udfyldt && <em className="skal-mærke">Mangler</em>}</h3>
        {udfyldt && !åben ? (
          <>
            <p style={{ color: 'var(--ink)' }}>
              <b>{fakt.firma || '—'}</b>{fakt.adresse ? <><br />{fakt.adresse}</> : null}
            </p>
            <dl style={{ margin: '8px 0 0' }}>
              {fakt.cvr && <Rk t="CVR" v={fakt.cvr} />}
              {fakt.ean && <Rk t="EAN" v={fakt.ean} />}
              {fakt.po && <Rk t="PO / rekvisition" v={fakt.po} />}
              {fakt.mail && <Rk t="Fakturamail" v={fakt.mail} />}
            </dl>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn btn-quiet" onClick={() => setÅben(true)}>
                <Icon name="pen" size={15} color="currentColor" />Ret oplysningerne
              </button>
            </div>
          </>
        ) : åben ? (
          <FakturaForm fakt={fakt} gemStatus={gemStatus} onÆndre={v => onInfo('faktura', v)} onLuk={() => setÅben(false)} />
        ) : (
          <>
            <p>Vi mangler at vide, hvem fakturaen skal sendes til — CVR eller EAN, og en mail den kan sendes til.</p>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" onClick={() => setÅben(true)}>
                <Icon name="form" size={17} />Udfyld fakturaoplysninger
              </button>
            </div>
          </>
        )}
      </div>

      <div className="block">
        <h3>Betalingsbetingelser</h3>
        <p style={{ color: 'var(--ink)' }}>
          Vi har <b>{ø.dage} dages betalingsfrist</b> og håber, I vil respektere det — det er et lille firma, og
          det betyder meget for os. Er det svært i jeres system, er betaling med kreditkort en mulighed,
          hvis det aftales <b>før</b> opgaven.
        </p>
      </div>

      {adminKode && <RetOkonomi kunde={kunde} adminKode={adminKode} onRettet={onRettet} />}
    </>
  )
}

/**
 * Fakturaoplysningerne — kundens egne.
 *
 * CVR slås op, når der står otte cifre, og fylder navn og adresse ud. Det
 * er en hjælp, ikke en sandhed: registret staver ikke altid som fakturaen
 * skal, så alt kan rettes bagefter. Gemmer løbende, ligesom »info fra jer«.
 */
function FakturaForm({ fakt, gemStatus, onÆndre, onLuk }) {
  const [f, setF] = useState({ cvr: '', firma: '', adresse: '', ean: '', po: '', mail: '', ...fakt })
  const [slårOp, setSlårOp] = useState(false)
  const [opslag, setOpslag] = useState(null)   // 'fundet' | 'ikke' | null
  const afbryd = useRef(null)

  useEffect(() => () => afbryd.current?.abort(), [])

  function sæt(patch) {
    const næste = { ...f, ...patch }
    setF(næste)
    onÆndre(næste)
  }

  async function skrivCvr(v) {
    const rent = v.replace(/\D/g, '').slice(0, 8)
    sæt({ cvr: rent })
    setOpslag(null)
    afbryd.current?.abort()
    if (rent.length !== 8) return
    const ctrl = new AbortController()
    afbryd.current = ctrl
    setSlårOp(true)
    const svar = await slåOpCvr(rent, ctrl.signal)
    if (ctrl.signal.aborted) return
    setSlårOp(false)
    if (svar) {
      setOpslag('fundet')
      // Kun tomme felter fyldes: har de allerede skrevet noget, er det deres.
      sæt({ cvr: rent, firma: f.firma || svar.navn, adresse: f.adresse || svar.adresse, mail: f.mail || svar.mail })
    } else {
      setOpslag('ikke')
    }
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="fa-cvr">CVR-nummer</label>
        <input id="fa-cvr" inputMode="numeric" value={f.cvr} onChange={e => skrivCvr(e.target.value)} placeholder="8 cifre" autoComplete="off" />
        <p className="hint">
          {slårOp ? 'Slår op i CVR …'
            : opslag === 'fundet' ? 'Fundet — tjek at navn og adresse passer, og ret hvis ikke.'
            : opslag === 'ikke' ? 'Vi kunne ikke slå nummeret op. Skriv navn og adresse selv.'
            : 'Vi slår nummeret op og udfylder navn og adresse for jer.'}
        </p>
      </div>
      <div className="field">
        <label htmlFor="fa-firma">Firmanavn på fakturaen</label>
        <input id="fa-firma" value={f.firma} onChange={e => sæt({ firma: e.target.value })} autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="fa-adresse">Adresse</label>
        <input id="fa-adresse" value={f.adresse} onChange={e => sæt({ adresse: e.target.value })} autoComplete="off" />
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="fa-ean">EAN-nummer</label>
          <input id="fa-ean" inputMode="numeric" value={f.ean} onChange={e => sæt({ ean: e.target.value.replace(/\D/g, '').slice(0, 13) })} placeholder="Kun offentlige" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="fa-po">PO / rekvisitionsnr.</label>
          <input id="fa-po" value={f.po} onChange={e => sæt({ po: e.target.value })} placeholder="Hvis I bruger det" autoComplete="off" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="fa-mail">Fakturamail</label>
        <input id="fa-mail" type="email" value={f.mail} onChange={e => sæt({ mail: e.target.value })} placeholder="faktura@firma.dk" autoComplete="email" />
        <p className="hint">Den adresse fakturaen skal sendes til — tit en anden end jeres egen.</p>
      </div>
      <div className="actions" style={{ alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={onLuk}><Icon name="check" size={16} />Færdig</button>
        <span className="saved">
          {gemStatus === 'gemmer' ? 'Gemmer …' : gemStatus === 'gemt' ? <><Icon name="check" size={14} color="currentColor" />Gemt</> : gemStatus === 'fejl' ? 'Kunne ikke gemme — prøv igen' : ''}
        </span>
      </div>
    </div>
  )
}

/** Pris, moms og betalingsfrist — kun for os. */
function RetOkonomi({ kunde, adminKode, onRettet }) {
  const ø = økonomiFor(kunde)
  const [pris, setPris] = useState(kunde.pris ?? '')
  const [momsPct, setMomsPct] = useState(ø.momsPct)
  const [dage, setDage] = useState(ø.dage)
  const [betalt, setBetalt] = useState(!!kunde.betalt)
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [kvittering, setKvittering] = useState(null)

  async function gem() {
    setGemmer(true); setFejl(null); setKvittering(null)
    try {
      onRettet?.(await opdaterKunde(adminKode, kunde.code, {
        pris: pris === '' ? null : Number(pris),
        momsPct: Number(momsPct),
        betalingsdage: Number(dage) || 8,
        betalt,
      }))
      setKvittering('Gemt')
      setTimeout(() => setKvittering(null), 2600)
    } catch (e) {
      setFejl('Kunne ikke gemme: ' + e.message)
    } finally { setGemmer(false) }
  }

  return (
    <div className="block" style={{ marginTop: 18 }}>
      <h3>Ret økonomien (kun os)</h3>
      <div className="row2">
        <div className="field">
          <label htmlFor="ro-pris">Pris ekskl. moms</label>
          <input id="ro-pris" inputMode="numeric" value={pris} onChange={e => setPris(e.target.value.replace(/[^\d]/g, ''))} />
        </div>
        <div className="field">
          <label htmlFor="ro-moms">Moms i %</label>
          <input id="ro-moms" inputMode="decimal" value={momsPct} onChange={e => setMomsPct(e.target.value.replace(',', '.'))} />
        </div>
        <div className="field">
          <label htmlFor="ro-dage">Betalingsfrist (dage)</label>
          <input id="ro-dage" inputMode="numeric" value={dage} onChange={e => setDage(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="field">
          <label htmlFor="ro-betalt">Status</label>
          <select id="ro-betalt" value={betalt ? 'ja' : 'nej'} onChange={e => setBetalt(e.target.value === 'ja')}>
            <option value="nej">Faktura sendt</option>
            <option value="ja">Betalt</option>
          </select>
        </div>
      </div>
      <p className="hint" style={{ marginTop: -4, marginBottom: 8 }}>
        Kunden ser: {kr(Number(pris || 0))} + {momsPct} % moms = <b>{kr(Number(pris || 0) + Math.round(Number(pris || 0) * Number(momsPct || 0)) / 100)}</b>
      </p>
      {fejl && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: 8 }}>{fejl}</p>}
      {kvittering && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 8 }}>{kvittering}</p>}
      <div className="actions">
        <button className="btn btn-primary" onClick={gem} disabled={gemmer}>{gemmer ? 'Gemmer …' : 'Gem'}</button>
      </div>
    </div>
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
