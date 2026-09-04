-- ---------------------------------------------------------------
-- Kontakter på en kunde: eventplanner og leadinstruktør
--
-- Kør ÉN gang i Supabase → SQL Editor, efter 001. Kan køres igen uden skade.
--
-- HVORFOR EN NY FUNKTION:
-- Kunden kan i forvejen skrive i sin egen `info` (portal_save_info). Men
-- HVEM af vores folk der er på opgaven, må kunden ikke kunne ændre — så
-- ville de kunne skrive en anden instruktør på deres eget event. Derfor en
-- selvstændig vej ind, der kræver adminkoden, og som kun må røre de felter
-- der står i listen herunder. Alt andet i rækken lades urørt.
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
    'beskrivelse', 'gamemaster', 'program', 'inkluderet'
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
