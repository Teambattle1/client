import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Admin from './pages/Admin'
import Portal from './pages/Portal'

const ADMIN_NØGLE = 'ed_admin'

/* Admin-koden holdes i sessionStorage, ikke localStorage: lukker man fanen,
   er man ude igen. Den er ikke en adgangsbillet i sig selv — hvert opslag
   sender koden med, og databasen afgør om den er rigtig. */
function læsAdmin() {
  try { return sessionStorage.getItem(ADMIN_NØGLE) || '' } catch { return '' }
}

export default function App() {
  const [adminKode, setAdminKode] = useState(læsAdmin)

  function logInd(kode) {
    setAdminKode(kode)
    try { sessionStorage.setItem(ADMIN_NØGLE, kode) } catch { /* privat vindue */ }
  }
  function logUd() {
    setAdminKode('')
    try { sessionStorage.removeItem(ADMIN_NØGLE) } catch { /* privat vindue */ }
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing onAdmin={logInd} />} />
        <Route path="/p/:code" element={<Portal erAdmin={Boolean(adminKode)} />} />
        <Route
          path="/admin"
          element={adminKode
            ? <Admin adminKode={adminKode} onLogUd={logUd} />
            : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
