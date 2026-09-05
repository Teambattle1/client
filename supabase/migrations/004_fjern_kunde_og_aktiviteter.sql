-- ---------------------------------------------------------------
-- Fjern en kunde, flere aktiviteter, og et showtime til hver
--
-- Kør ÉN gang i Supabase → SQL Editor, efter 003. Kan køres igen uden skade.
--
-- HVORFOR »SKJUL« OG IKKE »SLET«:
-- Et tryk på en telefon kan ramme forkert, og en kunderække indeholder ting
-- vi ikke kan skaffe igen: hvad kunden selv har svaret, hvem de er, hvad de
-- har købt. Derfor sætter »fjern« et mærke (`skjult`) i stedet for at slette
-- rækken. Set fra begge sider ER kunden væk — de forsvinder fra vores liste,
-- og deres kode holder op med at åbne noget — men rækken ligger der, og et
-- tryk på »gendan« henter den tilbage. En rigtig sletning hører hjemme i
-- Supabase' egen tabel-editor, hvor man ikke kommer forbi ved et uheld.
--
-- MED KOMMER OGSÅ tre felter til flere aktiviteter på samme event:
-- `aktiviteter` (listen), `showtimes` (ét link pr. aktivitet) og `grupper`
-- (dem deltagerne deles i, når to ting kører samtidig). De gamle enkeltfelter
-- bliver stående og holdes i sync med den første aktivitet, så alt der er
-- oprettet før i dag ser præcis ud som før.
--
-- OG tre til stedet: `venueId` (hvis det er et af vores egne steder),
-- `stedLat`/`stedLon` (nålen på kortet). Uden dem kan et sted vi selv sætter
-- kun være en tekst — og en tekst kan man ikke tegne et kort ud fra.
--
-- Tre ting flyttes:
--  1. `skjult` kommer på hvidlisten, så knappen overhovedet kan sætte den
--  2. kundens eget opslag svarer INTET for en skjult kunde (linket dør)
--  3. kunden kan heller ikke gemme svar på en skjult kunde (en åben fane
--     på en telefon skal ikke kunne skrive videre bagefter)
-- Vores egen liste får dem stadig med — ellers kunne de ikke gendannes.
-- ---------------------------------------------------------------

-- 1) Hvidlisten ---------------------------------------------------
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
    'showtimeUrl', 'showtimeAktiv', 'logoUrl',
    'skjult', 'aktiviteter', 'showtimes', 'grupper',
    'venueId', 'stedLat', 'stedLon'
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

-- 2) Kundens eget opslag ------------------------------------------
-- En skjult kunde svarer som en kode, der ikke findes. Portalen viser
-- allerede den rigtige besked for dét ("vi kan ikke finde et projekt med
-- den kode"), så der skal ikke en ny skærm til.
create or replace function public.portal_client_by_code(p_code text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.data || jsonb_build_object('code', c.code)
  from public.portal_clients c
  where c.code = p_code
    and p_code ~ '^[0-9]{6}$'
    and coalesce(c.data ->> 'skjult', 'false') <> 'true';
$$;

-- 3) Kundens egne svar --------------------------------------------
create or replace function public.portal_save_info(p_code text, p_info jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_code !~ '^[0-9]{6}$' then
    raise exception 'Ugyldig kode';
  end if;
  if jsonb_typeof(p_info) is distinct from 'object' then
    raise exception 'info skal være et objekt';
  end if;

  update public.portal_clients
     set data = jsonb_set(data, '{info}', p_info, true),
         updated_at = now()
   where code = p_code
     and coalesce(data ->> 'skjult', 'false') <> 'true';
end;
$$;

revoke all on function public.portal_admin_update(text, text, jsonb) from public;
revoke all on function public.portal_client_by_code(text) from public;
revoke all on function public.portal_save_info(text, jsonb) from public;

grant execute on function public.portal_admin_update(text, text, jsonb) to anon, authenticated;
grant execute on function public.portal_client_by_code(text)  to anon, authenticated;
grant execute on function public.portal_save_info(text, jsonb) to anon, authenticated;
