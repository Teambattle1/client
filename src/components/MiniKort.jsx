import { useEffect, useRef, useState } from 'react'

/** null, undefined og '' er IKKE koordinater — Number('') er 0, og 0,0
 *  ligger i Atlanterhavet. Uden det her viste kortet hav, når stedet manglede. */
function erKoordinat(x) {
  return x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x))
}

/**
 * Et lille kort med ét punkt på. Bruges til at VISE hvor mødestedet ligger —
 * ikke til at navigere efter, det klarer knappen til kortappen.
 *
 * Leaflet hentes først når kortet faktisk skal tegnes. Det er ~150 KB, og de
 * fleste besøg i portalen er en kunde der lige tjekker en dato — de skal
 * ikke betale for et kort, de ikke åbner.
 *
 * Nålen er en divIcon, ikke Leaflets eget billede: standard-markøren peger på
 * en billedfil, som en bundler flytter, og så står der et hul i stedet for en
 * nål. Vores er ren CSS og kan ikke gå i stykker.
 */
export default function MiniKort({ lat, lon, højde = 180, zoom = 15, klasse = 'kort', nålKlasse = 'kort-naal', kanForstørres = true }) {
  const [stor, setStor] = useState(false)
  const gyldig = erKoordinat(lat) && erKoordinat(lon)

  // Luk det store kort på Escape — det er en overlejring, og den skal kunne
  // forlades uden at lede efter krydset.
  useEffect(() => {
    if (!stor) return
    const luk = e => { if (e.key === 'Escape') setStor(false) }
    window.addEventListener('keydown', luk)
    return () => window.removeEventListener('keydown', luk)
  }, [stor])

  if (!gyldig) return null
  if (!kanForstørres) return <Kort lat={lat} lon={lon} højde={højde} zoom={zoom} klasse={klasse} nålKlasse={nålKlasse} />

  return (
    <>
      {/* Et tryk på det lille kort åbner det store: zoomet ind og centreret
          på nålen, så man kan se præcis hvor vi står — ikke bare hvilken by. */}
      <div className="kort-lille" role="button" tabIndex={0} aria-label="Åbn stort kort"
           onClick={() => setStor(true)}
           onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStor(true) } }}>
        <Kort lat={lat} lon={lon} højde={højde} zoom={zoom} klasse={klasse} nålKlasse={nålKlasse} />
        <span className="kort-forstoer" aria-hidden="true">Tryk for stort kort</span>
      </div>
      {stor && (
        <div className="kort-stor-back" onClick={e => { if (e.target === e.currentTarget) setStor(false) }}>
          <div className="kort-stor" role="dialog" aria-modal="true" aria-label="Kort over mødestedet">
            <Kort lat={lat} lon={lon} højde="100%" zoom={Math.max(zoom, 17)} klasse="kort kort-fuld"
                  nålKlasse={nålKlasse} interaktiv />
            <button type="button" className="kort-luk" onClick={() => setStor(false)} aria-label="Luk kortet">✕</button>
          </div>
        </div>
      )}
    </>
  )
}

/** Selve kortet. Det store er det samme kort, bare interaktivt og zoomet ind. */
function Kort({ lat, lon, højde, zoom, klasse, nålKlasse, interaktiv = false }) {
  const [el, setEl] = useState(null)   // state-backet: elementet findes ikke i første render
  const kortRef = useRef(null)
  const [fejl, setFejl] = useState(false)

  const gyldig = erKoordinat(lat) && erKoordinat(lon)

  useEffect(() => {
    if (!el || !gyldig) return
    let død = false
    let kort = null

    ;(async () => {
      try {
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')
        if (død || !el.isConnected) return

        kort = L.map(el, {
          center: [Number(lat), Number(lon)],
          zoom,
          zoomControl: interaktiv,
          attributionControl: true,
          scrollWheelZoom: interaktiv,   // det lille kort ligger i et ark der scroller
          dragging: interaktiv,
          touchZoom: interaktiv,
          doubleClickZoom: interaktiv,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(kort)
        L.marker([Number(lat), Number(lon)], {
          icon: L.divIcon({ className: nålKlasse, iconSize: [18, 18], iconAnchor: [9, 9] }),
          keyboard: false,
        }).addTo(kort)

        kortRef.current = kort
        // Arket folder sig ud efter kortet er lavet; uden det her tegner
        // Leaflet kun den del af flisen den troede der var plads til.
        setTimeout(() => { if (!død && kortRef.current) kortRef.current.invalidateSize() }, 60)
      } catch {
        if (!død) setFejl(true)
      }
    })()

    return () => {
      død = true
      if (kortRef.current) { kortRef.current.remove(); kortRef.current = null }
    }
  }, [el, lat, lon, zoom, gyldig, nålKlasse, interaktiv])

  if (!gyldig) return null

  if (fejl) {
    return (
      <p className="hint" style={{ marginTop: 8 }}>
        Kortet kunne ikke hentes. Adressen er gemt — den er ikke afhængig af kortet.
      </p>
    )
  }

  return <div ref={setEl} className={klasse} style={{ height: højde }} aria-hidden="true" />
}
