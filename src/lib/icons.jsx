// Hvide streg-ikoner. Ét sted, så en flise og dens ark altid viser det samme.
// Flag-emoji og lignende bruges bevidst IKKE: Windows har ingen font til dem
// og falder tilbage til bogstaver.

const PATHS = {
  flag:   <><path d="M6 21V3.6" /><path d="M6 4.4h12.2l-2.9 4.1 2.9 4.1H6z" /></>,
  form:   <><path d="M9 4.2h6a1.4 1.4 0 0 1 1.4 1.4v.9H7.6v-.9A1.4 1.4 0 0 1 9 4.2z" /><path d="M16.4 5.8h1.9a1.7 1.7 0 0 1 1.7 1.7v11.3a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 18.8V7.5a1.7 1.7 0 0 1 1.7-1.7h1.9" /><path d="M8.4 11.4h7.2M8.4 15.2h4.6" /></>,
  pin:    <><path d="M12 21.2s7-6.6 7-11.3a7 7 0 1 0-14 0c0 4.7 7 11.3 7 11.3z" /><circle cx="12" cy="9.9" r="2.6" /></>,
  money:  <><rect x="2.9" y="6.2" width="18.2" height="11.6" rx="2.1" /><circle cx="12" cy="12" r="2.6" /><path d="M6.4 12h.1M17.5 12h.1" /></>,
  clock:  <><circle cx="12" cy="12" r="8.6" /><path d="M12 7.3V12l3.3 2" /></>,
  person: <><circle cx="12" cy="8.1" r="3.6" /><path d="M4.7 20.1a7.3 7.3 0 0 1 14.6 0" /></>,
  cal:    <><rect x="3.6" y="5.3" width="16.8" height="15.1" rx="2" /><path d="M8 3.4v3.8M16 3.4v3.8M3.6 10.2h16.8" /></>,
  users:  <><circle cx="9.2" cy="8.4" r="3.2" /><path d="M3.4 19.4a5.8 5.8 0 0 1 11.6 0" /><path d="M16.1 5.6a3.2 3.2 0 0 1 0 5.7M17.4 14.4a5.8 5.8 0 0 1 3.2 5" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.6" /><path d="M15.6 15.6 20.4 20.4" /></>,
  udad:   <><path d="M14.2 4.4h5.4v5.4" /><path d="M19.6 4.4 11.4 12.6" /><path d="M18.1 14.4v4.1a1.6 1.6 0 0 1-1.6 1.6H5.5a1.6 1.6 0 0 1-1.6-1.6V7.5a1.6 1.6 0 0 1 1.6-1.6h4.1" /></>,
  sol:    <><circle cx="12" cy="12" r="4.1" /><path d="M12 2.9v2.2M12 18.9v2.2M2.9 12h2.2M18.9 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></>,
  maane:  <><path d="M20.1 13.4A8.2 8.2 0 0 1 10.6 3.9a8.4 8.4 0 1 0 9.5 9.5z" /></>,
  back:   <><path d="M19.2 12H5.4" /><path d="M11.2 5.6 4.8 12l6.4 6.4" /></>,
  close:  <><path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" /></>,
  check:  <><path d="M4.8 12.6 9.4 17.2 19.2 7.4" /></>,
  copy:   <><rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2" /><path d="M15.6 8.4V6.3a1.9 1.9 0 0 0-1.9-1.9H6.3a1.9 1.9 0 0 0-1.9 1.9v7.4a1.9 1.9 0 0 0 1.9 1.9h2.1" /></>,
  plus:   <><path d="M12 5.4v13.2M5.4 12h13.2" /></>,
  phone:  <><path d="M6.1 4.5h3.1l1.6 3.9-2 1.2a10.6 10.6 0 0 0 5.6 5.6l1.2-2 3.9 1.6v3.1a1.6 1.6 0 0 1-1.7 1.6A15.8 15.8 0 0 1 4.5 6.2a1.6 1.6 0 0 1 1.6-1.7z" /></>,
  // Showtime: et lærred med en afspil-trekant. Billeder OG resultater vises
  // dér, så hverken et fotoapparat eller en pokal ville dække det alene.
  showtime: <><rect x="2.9" y="4.6" width="18.2" height="12.6" rx="2.1" /><path d="M10.2 9.1v3.6l3.3-1.8z" /><path d="M8.2 20.4h7.6" /></>,
  mail:   <><rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2" /><path d="m3.9 6.6 8.1 6 8.1-6" /></>,
}

export default function Icon({ name, size = 24, color = '#fff' }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  )
}
