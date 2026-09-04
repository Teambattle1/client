import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../lib/icons'
import { erKodeFormat, tjekAdminKode, hentKunde, demoTilstand } from '../lib/data'
import { DEMO } from '../lib/model'

/* Forsiden på client.eventday.dk. Ét felt: seks cifre.
   Kundens kode åbner deres eget projekt. Admin-koden åbner kundelisten. */

export default function Landing({ onAdmin }) {
  const navigate = useNavigate()
  const feltRef = useRef(null)
  const [kode, setKode] = useState('')
  const [tjekker, setTjekker] = useState(false)
  const [fejl, setFejl] = useState(null)

  useEffect(() => { feltRef.current?.focus() }, [])

  async function prøv(k) {
    if (tjekker) return
    setTjekker(true)
    setFejl(null)
    try {
      if (await tjekAdminKode(k)) {
        onAdmin(k)
        navigate('/admin')
        return
      }
      const kunde = await hentKunde(k)
      if (kunde) { navigate('/p/' + k); return }
      setFejl({ art: 'ukendt', tekst: 'Vi kan ikke finde et projekt med den kode. Tjek den lige en gang til.' })
    } catch {
      setFejl({ art: 'fejl', tekst: 'Vi kan ikke få fat i systemet lige nu. Prøv igen om et øjeblik — koden fejler ikke noget.' })
    } finally {
      setTjekker(false)
    }
  }

  function ændre(v) {
    const rent = v.replace(/\D/g, '').slice(0, 6)
    setKode(rent)
    if (fejl) setFejl(null)
    if (rent.length === 6) prøv(rent)
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="gate">
          <div className="gate-mark"><Icon name="flag" size={26} /></div>
          <h1>Jeres event hos EventDay</h1>
          <p>Tast de seks cifre I har fået fra os, så åbner jeres egen side.</p>

          <form onSubmit={e => { e.preventDefault(); if (erKodeFormat(kode)) prøv(kode) }}>
            <input
              ref={feltRef}
              className="code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Jeres sekscifrede kode"
              placeholder="000000"
              value={kode}
              disabled={tjekker}
              onChange={e => ændre(e.target.value)}
            />
          </form>

          <div className="gate-msg" role="status" aria-live="polite">
            {tjekker && <span style={{ color: 'var(--muted)' }}>Slår op …</span>}
            {fejl && <span style={{ color: fejl.art === 'fejl' ? 'var(--red)' : 'var(--muted)' }}>{fejl.tekst}</span>}
          </div>

          <p className="gate-help">
            Kan I ikke finde koden? Den står i bekræftelsen fra os. Ellers ring på 40 27 40 27,
            så finder vi jeres side frem.
          </p>

          {demoTilstand && (
            <p className="note" style={{ textAlign: 'center' }}>
              Demo-tilstand: der er ingen database koblet på endnu.
              Prøv koden {DEMO.code} for at se en kundes side.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
