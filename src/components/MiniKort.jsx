import { useEffect, useRef, useState } from 'react'

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
export default function MiniKort({ lat, lon, højde = 180, zoom = 15, klasse = 'kort', nålKlasse = 'kort-naal' }) {
  const [el, setEl] = useState(null)   // state-backet: elementet findes ikke i første render
  const kortRef = useRef(null)
  const [fejl, setFejl] = useState(false)

  const gyldig = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))

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
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: false,   // kortet ligger i et ark der scroller
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
  }, [el, lat, lon, zoom, gyldig, nålKlasse])

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
