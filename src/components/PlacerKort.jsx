import { useEffect, useRef, useState } from 'react'

/**
 * Kortet man SÆTTER nålen på.
 *
 * En adresse er ikke altid mødestedet. »Dokk1, Hack Kampmanns Plads 2«
 * lander midt i en bygning på 30.000 m²; vi skal stå ved trappen mod
 * havnen. Derfor kan nålen flyttes med fingeren, og det er dét, der er
 * gemt — adressen er bare den hurtige vej til at komme i nærheden.
 *
 * Leaflet hentes først når kortet skal tegnes (~150 KB), præcis som på
 * kundens side, og nålen er en divIcon frem for Leaflets eget billede: en
 * bundler flytter billedfilen, og så står der et hul i stedet for en nål.
 */
export default function PlacerKort({ lat, lon, onFlyt, højde = 220 }) {
  const [el, setEl] = useState(null)     // state-backet: findes ikke i første render
  const kort = useRef(null)
  const nål = useRef(null)
  const flyt = useRef(onFlyt)
  const [fejl, setFejl] = useState(false)
  flyt.current = onFlyt

  const gyldig = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))

  useEffect(() => {
    if (!el) return
    let død = false

    ;(async () => {
      try {
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')
        if (død || !el.isConnected) return

        const start = gyldig ? [Number(lat), Number(lon)] : [56.15, 10.21]  // Danmark
        const k = L.map(el, { center: start, zoom: gyldig ? 16 : 7, zoomControl: true, attributionControl: true })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '© OpenStreetMap',
        }).addTo(k)

        const m = L.marker(start, {
          draggable: true,
          icon: L.divIcon({ className: 'kort-naal placer', iconSize: [22, 22], iconAnchor: [11, 11] }),
          opacity: gyldig ? 1 : 0,
        }).addTo(k)

        // To veje til at sætte nålen: træk i den, eller tryk et sted på
        // kortet. Den anden er den man opdager af sig selv på en telefon.
        m.on('dragend', () => { const p = m.getLatLng(); flyt.current?.(p.lat, p.lng) })
        k.on('click', e => {
          m.setLatLng(e.latlng)
          m.setOpacity(1)
          flyt.current?.(e.latlng.lat, e.latlng.lng)
        })

        kort.current = k
        nål.current = m
        // Panelet folder sig ud efter kortet er lavet; uden det her tegner
        // Leaflet kun den del af flisen, den troede der var plads til.
        setTimeout(() => { if (!død && kort.current) kort.current.invalidateSize() }, 60)
      } catch {
        if (!død) setFejl(true)
      }
    })()

    return () => {
      død = true
      if (kort.current) { kort.current.remove(); kort.current = null; nål.current = null }
    }
    // Kortet laves ÉN gang. Nye koordinater flytter nålen i effekten nedenfor
    // — bygger man kortet om ved hvert tal, mister man zoom og position midt
    // i at nogen sidder og finder mødestedet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el])

  useEffect(() => {
    if (!kort.current || !nål.current || !gyldig) return
    const p = [Number(lat), Number(lon)]
    nål.current.setLatLng(p)
    nål.current.setOpacity(1)
    // Flyt KUN billedet, hvis nålen er havnet uden for det, man kigger på.
    // Ellers ville kortet hoppe på plads under fingeren, hver gang man
    // trækker nålen en centimeter — og så kan man ikke ramme noget.
    const synlig = kort.current.getBounds().contains(p)
    if (!synlig) kort.current.setView(p, Math.max(kort.current.getZoom(), 16))
  }, [lat, lon, gyldig])

  if (fejl) {
    return (
      <p className="hint" style={{ marginTop: 8 }}>
        Kortet kunne ikke hentes lige nu. Adressen er gemt — den er ikke afhængig af kortet.
      </p>
    )
  }

  return (
    <>
      <div ref={setEl} className="kort placer-kort" style={{ height: højde }} />
      <p className="hint" style={{ marginTop: 6 }}>
        {gyldig
          ? 'Tryk på kortet eller træk i nålen, hvis mødestedet ligger et andet sted end adressen.'
          : 'Søg en adresse ovenfor, eller tryk direkte på kortet for at sætte nålen.'}
      </p>
    </>
  )
}
