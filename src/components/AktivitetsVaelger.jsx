import Icon from '../lib/icons'
import { MILJØER, AFVIKLING } from '../lib/aktivitetsplan'

/**
 * Vælg aktivitet — én eller flere — og sæt det, kunden skal vide om hver.
 *
 * De fleste events er ÉN ting, og så skal det være ét valg i en liste. Men
 * to aktiviteter på samme dag er almindeligt nok (deltagerne deles i to
 * grupper og bytter undervejs), og dét må ikke kræve to kunder i systemet.
 *
 * Til hver aktivitet hører to ting, kunden faktisk spørger om:
 *  · INDE ELLER UDE — det afgør, hvad man tager på, og det er det første,
 *    der bliver spurgt om, når vejrudsigten ser tvivlsom ud
 *  · EN NOTE — den ene sætning, der ikke står i katalogteksten: »tag fladt
 *    fodtøj på«, »I skal ikke spise inden«
 * Begge dele står på kundens side og på printarket i deres eget afsnit.
 *
 * Rækkefølgen er den, man vælger i — den første aktivitet er den, der
 * repræsenterer eventet alle de steder, hvor der kun er plads til én.
 */
export default function AktivitetsVaelger({ aktiviteter, valgte, onÆndre, id }) {
  const valgteIder = new Set(valgte.map(a => a.id))
  const rest = (aktiviteter || []).filter(a => !valgteIder.has(a.id))

  function tilføj(valgtId) {
    const a = (aktiviteter || []).find(x => x.id === valgtId)
    // Tiderne tages med fra kataloget NU: det er dem, tidslinjen bygges af,
    // og de skal blive hos kunden, også hvis kataloget rettes i morgen.
    if (a) onÆndre([...valgte, {
      id: a.id, navn: a.name || a.navn || '', miljø: '', note: '', tekst: '',
      minutter: a.activity_minutes || a.duration_minutes || null,
      opsætning: a.setup_minutes || null,
    }])
  }
  function ret(i, patch) {
    onÆndre(valgte.map((a, j) => j === i ? { ...a, ...patch } : a))
  }

  return (
    <div className="akt-vælger">
      {valgte.map((a, i) => (
        <div className="akt-kort-ret" key={a.id || i}>
          <div className="akt-kort-top">
            <b>
              {valgte.length > 1 && <span className="akt-kort-nr">{i + 1}</span>}
              {a.navn || 'Uden navn'}
            </b>
            <button type="button" className="akt-fjern" aria-label={'Fjern ' + (a.navn || 'aktiviteten')}
                    onClick={() => onÆndre(valgte.filter((_, j) => j !== i))}>
              <Icon name="close" size={14} color="currentColor" />
            </button>
          </div>

          <div className="miljø-valg" role="group" aria-label={'Inde eller ude — ' + (a.navn || '')}>
            {MILJØER.map(m => (
              <button type="button" key={m.værdi}
                      className={'miljø-knap' + (a.miljø === m.værdi ? ' valgt' : '')}
                      aria-pressed={a.miljø === m.værdi}
                      // Et tryk på den, der allerede er valgt, slår den fra
                      // igen: »ikke sat« skal kunne fortrydes, ellers bliver
                      // et fejltryk til et løfte, vi ikke kan tage tilbage.
                      onClick={() => ret(i, { miljø: a.miljø === m.værdi ? '' : m.værdi })}>
                {m.kort}
              </button>
            ))}
          </div>

          <input
            className="akt-note"
            value={a.note || ''}
            onChange={e => ret(i, { note: e.target.value })}
            placeholder="Note kunden ser — fx »tag fladt fodtøj på«"
            aria-label={'Note til ' + (a.navn || 'aktiviteten')}
          />
        </div>
      ))}

      <select
        id={id}
        value=""
        onChange={e => { tilføj(e.target.value); e.target.value = '' }}
        aria-label="Vælg aktivitet"
      >
        <option value="">
          {valgte.length ? 'Tilføj en aktivitet mere …' : 'Vælg aktivitet …'}
        </option>
        {rest.map(a => <option key={a.id} value={a.id}>{a.name || a.navn}</option>)}
      </select>
    </div>
  )
}

/**
 * »Hvordan afvikles de?« — spørgsmålet der dukker op, når der er valgt
 * aktivitet nummer to. Samme knapper som inde/ude, så det ligner noget,
 * man har set før.
 */
export function AfviklingValg({ værdi, onÆndre, id }) {
  return (
    <div className="field" id={id}>
      <label>Hvordan afvikles de?</label>
      <div className="afvikling-valg" role="group" aria-label="Hvordan afvikles aktiviteterne">
        {AFVIKLING.map(a => (
          <button type="button" key={a.værdi}
                  className={'afvikling-knap' + (værdi === a.værdi ? ' valgt' : '')}
                  aria-pressed={værdi === a.værdi}
                  onClick={() => onÆndre(a.værdi)}>
            <b>{a.kort}</b>
            <span>{a.lang}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
