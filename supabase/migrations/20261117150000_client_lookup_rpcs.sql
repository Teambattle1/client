-- ---------------------------------------------------------------
-- RUN ON MAIN (CrewControlCenter, ilbjytyukicbssqftmma) — NOT APPLIED YET.
--
-- Medarbejdere og steder hentes gennem funktioner, ikke direkte fra tabellerne
--
-- Kør i Supabase → SQL Editor, efter 004. Kan køres igen uden skade
-- (create or replace).
--
-- SKAL KØRES FØR `employees` og `locations` lukkes for anon-nøglen.
-- Den nye udgave af portalen kalder kun funktionerne herunder; den gamle
-- læste tabellerne direkte og holder op med at virke, når de lukkes.
--
-- HVORFOR:
-- `employees` og `locations` lukkes, så kun vores egne folk (med platformens
-- SSO-token) kan læse dem. Portalen har intet login — kun den offentlige
-- anon-nøgle — så den skal gennem samme slags dør som kundedataene i 001:
-- en funktion der selv tjekker koden og kun svarer med det, der skal bruges.
--
--  * KUNDEN (kundekode) får ÉT sted: det, der hører til netop deres projekt.
--    Aldrig en liste. Og kun navn, adresse, nål, ankomst-note og stedets ene
--    konferencekontakt — ikke CRM-status, noter eller resten af husets folk.
--    Kunden har ikke brug for medarbejderlisten overhovedet: eventplanner og
--    leadinstruktør står allerede på kunderækken (navn/mail/tlf), sat af os.
--  * OS (adminkoden) får listerne: aktive medarbejdere (kun id/navn/email/
--    telefon) og alle steder undtagen »rejected« — og kan rette/oprette steder.
--
-- Adminkoden tjekkes med `portal_admin_check` fra 001, kundekoden på samme
-- måde som `portal_client_by_code` (6 cifre, findes, ikke skjult).
-- ---------------------------------------------------------------

-- ---------- kundens eget sted ----------

-- Svarer null, hvis koden ikke findes/er skjult, eller hvis stedet ikke hører
-- til kunden. Et sted hører til kunden, når:
--   a) VI har sat det (`data.venueId`) — uanset stedets status, eller
--   b) kunden valgte det i sine gamle svar (`info.sted.valg = 'vores'` og
--      `info.sted.venueId`) — men KUN hvis stedet er aktivt. `info` kan kunden
--      selv skrive i (portal_save_info), så uden det krav kunne de skrive et
--      vilkårligt id ind og læse et sted, vi kun forhandler med.
create or replace function public.portal_venue_by_code(p_code text, p_venue_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_data    jsonb;
  v_loc     public.locations;
  v_kontakt jsonb;
begin
  if p_code is null or p_code !~ '^[0-9]{6}$' or coalesce(p_venue_id, '') = '' then
    return null;
  end if;

  select c.data into v_data
    from public.portal_clients c
   where c.code = p_code
     and coalesce(c.data ->> 'skjult', 'false') <> 'true';
  if v_data is null then
    return null;
  end if;

  select * into v_loc from public.locations l where l.id::text = p_venue_id;
  if not found then
    return null;
  end if;

  if not (
       coalesce(v_data ->> 'venueId', '') = p_venue_id
    or (    v_data #>> '{info,sted,valg}' = 'vores'
        and v_data #>> '{info,sted,venueId}' = p_venue_id
        and v_loc.crm_status::text = 'active')
  ) then
    return null;
  end if;

  -- Stedets ÉN konferencekontakt — samme regel som `konferenceKontakt` i
  -- src/lib/venues.js: første titel der matcher i rækkefølgen konference,
  -- booking, salg, koordinator, prim; ellers den første med navn og mail
  -- eller nummer. Kun de fire felter kunden ser; aldrig noter.
  select k.kontakt into v_kontakt
    from (
      select jsonb_build_object(
               'name',   e ->> 'name',
               'title',  coalesce(e ->> 'title', ''),
               'email',  coalesce(e ->> 'email', ''),
               'mobile', coalesce(e ->> 'mobile', '')
             ) as kontakt,
             t.nr,
             case
               when coalesce(e ->> 'title', '') ~* 'konference'  then 1
               when coalesce(e ->> 'title', '') ~* 'booking'     then 2
               when coalesce(e ->> 'title', '') ~* 'salg'        then 3
               when coalesce(e ->> 'title', '') ~* 'koordinator' then 4
               when coalesce(e ->> 'title', '') ~* 'prim'        then 5
               else 6
             end as prio
        from jsonb_array_elements(
               case when jsonb_typeof(to_jsonb(v_loc.contacts)) = 'array'
                    then to_jsonb(v_loc.contacts) else '[]'::jsonb end
             ) with ordinality as t(e, nr)
       where jsonb_typeof(e) = 'object'
         and coalesce(e ->> 'name', '') <> ''
         and (coalesce(e ->> 'email', '') <> '' or coalesce(e ->> 'mobile', '') <> '')
    ) k
   order by k.prio, k.nr
   limit 1;

  return jsonb_build_object(
    'id',          v_loc.id,
    'name',        v_loc.name,
    'address',     v_loc.address,
    'postal_code', v_loc.postal_code,
    'city',        v_loc.city,
    'lat',         v_loc.lat,
    'lon',         v_loc.lon,
    'adgang_note', v_loc.adgang_note,
    'contacts',    case when v_kontakt is null then '[]'::jsonb else jsonb_build_array(v_kontakt) end
  );
end;
$$;

-- ---------- vores egne lister ----------

-- Aktive medarbejdere til »eventplanner/leadinstruktør«-valget. KUN fire
-- felter: rækken rummer også fødselsdato, lønniveau, kørekort osv.
create or replace function public.portal_admin_employees(p_admin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.portal_admin_check(p_admin) then
    raise exception 'Forkert adminkode';
  end if;

  return coalesce(
    (select jsonb_agg(jsonb_build_object(
                        'id', e.id, 'navn', e.navn, 'email', e.email, 'telefon', e.telefon)
                      order by e.navn)
       from (select id, navn, email, telefon
               from public.employees
              where status::text = 'aktiv'
                and coalesce(navn, '') <> ''
              order by navn
              limit 200) e),
    '[]'::jsonb
  );
end;
$$;

-- Alle steder undtagen dem, der er sagt nej til — til StedVaelger. Samme
-- kolonner som VENUE_KOLONNER i src/lib/venues.js; CRM-noter m.m. bliver.
create or replace function public.portal_admin_venues(p_admin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.portal_admin_check(p_admin) then
    raise exception 'Forkert adminkode';
  end if;

  return coalesce(
    (select jsonb_agg(to_jsonb(v) order by v.name)
       from (select id, name, address, postal_code, city, lat, lon, contacts,
                    venue_type, logo_url, crm_status, adgang_note, phone, website
               from public.locations
              where crm_status::text <> 'rejected'
                and coalesce(name, '') <> ''
              order by name
              limit 400) v),
    '[]'::jsonb
  );
end;
$$;

-- ---------- vores rettelser af steder ----------
--
-- Portalen rettede/oprettede før direkte i tabellen (update/insert + select).
-- Når tabellen lukkes, kan det ikke længere — derfor samme vej som resten.
-- Hvidliste: kun de felter portalen har en formular til. Typerne hentes fra
-- tabellen selv (jsonb_populate_record), så funktionen ikke gætter på dem.

create or replace function public.portal_admin_venue_update(p_admin text, p_id text, p_felter jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  f public.locations;
begin
  if not public.portal_admin_check(p_admin) then
    raise exception 'Forkert adminkode';
  end if;
  if coalesce(p_id, '') = '' then
    raise exception 'Stedet mangler et id';
  end if;
  if jsonb_typeof(p_felter) is distinct from 'object' then
    raise exception 'Rettelsen skal være et objekt';
  end if;
  if p_felter ? 'name' and coalesce(trim(p_felter ->> 'name'), '') = '' then
    raise exception 'Stedet skal have et navn';
  end if;
  if p_felter ? 'crm_status' and (p_felter ->> 'crm_status') not in ('active', 'lead', 'dormant') then
    raise exception 'Ugyldig status';
  end if;

  f := jsonb_populate_record(null::public.locations, p_felter);

  update public.locations l set
    name        = case when p_felter ? 'name'        then f.name        else l.name        end,
    address     = case when p_felter ? 'address'     then f.address     else l.address     end,
    postal_code = case when p_felter ? 'postal_code' then f.postal_code else l.postal_code end,
    city        = case when p_felter ? 'city'        then f.city        else l.city        end,
    lat         = case when p_felter ? 'lat'         then f.lat         else l.lat         end,
    lon         = case when p_felter ? 'lon'         then f.lon         else l.lon         end,
    crm_status  = case when p_felter ? 'crm_status'  then f.crm_status  else l.crm_status  end,
    adgang_note = case when p_felter ? 'adgang_note' then f.adgang_note else l.adgang_note end,
    phone       = case when p_felter ? 'phone'       then f.phone       else l.phone       end,
    website     = case when p_felter ? 'website'     then f.website     else l.website     end,
    contacts    = case when p_felter ? 'contacts'    then f.contacts    else l.contacts    end,
    updated_at  = now()
  where l.id::text = p_id;

  if not found then
    raise exception 'Stedet findes ikke';
  end if;

  return (select to_jsonb(v)
            from (select id, name, address, postal_code, city, lat, lon, contacts,
                         venue_type, logo_url, crm_status, adgang_note, phone, website
                    from public.locations where id::text = p_id) v);
end;
$$;

create or replace function public.portal_admin_venue_create(p_admin text, p_id text, p_felter jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  f public.locations;
begin
  if not public.portal_admin_check(p_admin) then
    raise exception 'Forkert adminkode';
  end if;
  if coalesce(p_id, '') = '' then
    raise exception 'Stedet mangler et id';
  end if;
  if jsonb_typeof(p_felter) is distinct from 'object' then
    raise exception 'Felterne skal være et objekt';
  end if;
  if coalesce(trim(p_felter ->> 'name'), '') = '' then
    raise exception 'Stedet skal have et navn';
  end if;
  if coalesce(p_felter ->> 'crm_status', 'lead') not in ('active', 'lead', 'dormant') then
    raise exception 'Ugyldig status';
  end if;

  -- Nye steder starter som »på vej« og uden kontakter, medmindre andet er sagt.
  f := jsonb_populate_record(
         null::public.locations,
         jsonb_build_object('crm_status', 'lead', 'contacts', '[]'::jsonb)
           || p_felter
           || jsonb_build_object('id', p_id));

  insert into public.locations
    (id, name, address, postal_code, city, lat, lon, crm_status, adgang_note, phone, website, contacts)
  values
    (f.id, f.name, f.address, f.postal_code, f.city, f.lat, f.lon, f.crm_status, f.adgang_note, f.phone, f.website, f.contacts);

  return (select to_jsonb(v)
            from (select id, name, address, postal_code, city, lat, lon, contacts,
                         venue_type, logo_url, crm_status, adgang_note, phone, website
                    from public.locations where id::text = p_id) v);
end;
$$;

-- ---------- hvem må kalde hvad ----------

revoke all on function public.portal_venue_by_code(text, text)              from public;
revoke all on function public.portal_admin_employees(text)                  from public;
revoke all on function public.portal_admin_venues(text)                     from public;
revoke all on function public.portal_admin_venue_update(text, text, jsonb)  from public;
revoke all on function public.portal_admin_venue_create(text, text, jsonb)  from public;

grant execute on function public.portal_venue_by_code(text, text)             to anon, authenticated;
grant execute on function public.portal_admin_employees(text)                 to anon, authenticated;
grant execute on function public.portal_admin_venues(text)                    to anon, authenticated;
grant execute on function public.portal_admin_venue_update(text, text, jsonb) to anon, authenticated;
grant execute on function public.portal_admin_venue_create(text, text, jsonb) to anon, authenticated;
