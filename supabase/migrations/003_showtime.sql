-- ---------------------------------------------------------------
-- Showtime-linket, om kunden må se det, og kundens logo
--
-- Kør ÉN gang i Supabase → SQL Editor, efter 001. Kan køres igen uden skade.
--
-- DEN HER ERSTATTER 002. Filen indeholder hele funktionen, ikke kun
-- tilføjelsen, så har du ikke kørt 002 endnu, er det nok at køre DEN HER.
-- Har du allerede kørt 002, skal du køre den her ovenpå — ellers kan
-- showtime-linket ikke gemmes.
--
-- HVORFOR DE TO NYE FELTER STÅR HER OG IKKE I KUNDENS EGNE SVAR:
-- `showtimeUrl` peger på en side med billeder af deltagerne, og
-- `showtimeAktiv` afgør om kunden overhovedet kan åbne den. Begge dele er
-- VORES beslutning: kunne kunden selv skrive linket, kunne de pege deres
-- egen portal på hvad som helst — og kunne de selv tænde for det, ville de
-- kunne åbne et show, vi ikke har set igennem endnu. `logoUrl` er samme
-- slags: firmaets eget mærke øverst på siden, sat af os.
-- ---------------------------------------------------------------

create or replace function public.portal_admin_update(p_code text, p_admin text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ren jsonb := '{}'::jsonb;
  v_nøgle text;
begin
  if not public.portal_admin_check(p_admin) then
    raise exception 'Forkert adminkode';
  end if;
  if p_code !~ '^[0-9]{6}$' then
    raise exception 'Ugyldig kode';
  end if;
  if jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'Rettelsen skal være et objekt';
  end if;

  -- Hvidliste. En rettelse kan ALDRIG nå kundens egne svar (`info`), koden
  -- eller noget andet i rækken: det der ikke står her, bliver ikke skrevet.
  foreach v_nøgle in array array[
    'eventplanner', 'leadInstruktor',
    'aktivitetId', 'aktivitetNavn',
    'eventDate', 'startTime', 'endTime',
    'sted', 'modested', 'parkering',
    'deltagere', 'pris', 'betalt', 'faktura',
    'beskrivelse', 'gamemaster', 'program', 'inkluderet',
    'showtimeUrl', 'showtimeAktiv', 'logoUrl'
  ]
  loop
    if p_patch ? v_nøgle then
      v_ren := v_ren || jsonb_build_object(v_nøgle, p_patch -> v_nøgle);
    end if;
  end loop;

  if v_ren = '{}'::jsonb then
    raise exception 'Intet at rette';
  end if;

  update public.portal_clients
     set data = data || v_ren,
         updated_at = now()
   where code = p_code;

  return (select c.data || jsonb_build_object('code', c.code)
            from public.portal_clients c where c.code = p_code);
end;
$$;

revoke all on function public.portal_admin_update(text, text, jsonb) from public;
grant execute on function public.portal_admin_update(text, text, jsonb) to anon, authenticated;
