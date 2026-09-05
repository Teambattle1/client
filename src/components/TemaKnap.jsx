import { useEffect, useState } from 'react'
import Icon from '../lib/icons'
import { gemtValg, gemValg, systemErMørk, aktivtTema, næsteValg, anvendTema } from '../lib/tema'

/**
 * Knappen der skifter mellem lyst og mørkt. Står øverst på hver skærm.
 *
 * Ikonet viser, hvad man FÅR ved at trykke — ikke hvad man har. En måne i
 * en lys side betyder »tryk her for mørkt«; det er den læsning, folk har
 * med fra alle andre apps, og en knap der viser sin egen tilstand bliver
 * læst forkert hver gang.
 *
 * Har man ikke trykket endnu, følger siden enheden — og bliver ved med det,
 * også hvis telefonen skifter til mørk til aften mens siden står åben.
 */
export default function TemaKnap({ klasse = '' }) {
  const [valg, setValg] = useState(() => gemtValg(typeof window === 'undefined' ? null : window.localStorage))
  const [mørkSystem, setMørkSystem] = useState(() => systemErMørk(typeof window === 'undefined' ? null : window))

  // Enheden kan skifte, mens siden er åben (solnedgangs-indstillingen på
  // iOS). Uden det her ville ikonet love det modsatte af, hvad et tryk gør.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const lyt = e => setMørkSystem(e.matches)
    mq.addEventListener?.('change', lyt)
    return () => mq.removeEventListener?.('change', lyt)
  }, [])

  useEffect(() => { anvendTema(valg, document) }, [valg])

  const mørkt = aktivtTema(valg, mørkSystem) === 'dark'
  const skiftTil = næsteValg(valg, mørkSystem) === 'dark' ? 'mørk' : 'lys'

  return (
    <button
      type="button"
      className={'tema-knap ' + klasse}
      aria-label={'Skift til ' + skiftTil + ' baggrund'}
      title={'Skift til ' + skiftTil + ' baggrund'}
      onClick={() => {
        const næste = næsteValg(valg, mørkSystem)
        setValg(næste)
        gemValg(næste, window.localStorage)
        anvendTema(næste, document)
      }}
    >
      <Icon name={mørkt ? 'sol' : 'maane'} size={17} color="currentColor" />
    </button>
  )
}
