-- ---------------------------------------------------------------
-- Kundeportalen på client.eventday.dk
--
-- Kør ÉN gang i Supabase → SQL Editor. Den er skrevet så den kan køres
-- igen uden at ødelægge noget (if not exists / or replace).
--
-- HVORFOR DET SER SÅDAN HER UD:
-- Portalen har ingen login. Browseren har kun den offentlige anon-nøgle,
-- og den nøgle ligger i enhver besøgendes browser. Derfor må tabellerne
-- IKKE kunne læses direkte: så kunne enhver hente hele kundelisten med
-- telefonnumre og priser. I stedet er der ingen adgangsregler på
-- tabellerne overhovedet (RLS slået til, nul policies = lukket land), og
-- al adgang går gennem funktionerne herunder, som selv bestemmer hvad de
-- svarer på. Kunden kan kun hente NETOP den kode de har. Alt der rører
-- kundelisten kræver admin-koden, og den tjekkes HER — ikke i browseren.
-- ---------------------------------------------------------------

-- ---------- tabeller ----------

create table if not exists public.portal_config (
  key   text primary key,
  value text not null
);

create table if not exists public.portal_clients (
  code       text primary key check (code ~ '^[0-9]{6}$'),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sorteres på event-datoen i admin-listen.
create index if not exists portal_clients_event_date_idx
  on public.portal_clients ((data ->> 'eventDate'));

alter table public.portal_config  enable row level security;
alter table public.portal_clients enable row level security;

-- Ingen policies = ingen direkte adgang for anon. Med vilje.
-- Tilføj ALDRIG en "anon kan læse alt"-policy her.

-- Admin-koden. Skift den ved at køre linjen igen med en anden værdi.
insert into public.portal_config (key, value)
values ('admin_code', '100408')
on conflict (key) do nothing;

-- ---------- kundens egen adgang ----------

-- Hent ét projekt ud fra koden. Svarer null hvis koden ikke findes.
-- Kan kun hente den ene kode der spørges om — aldrig en liste.
create or replace function public.portal_client_by_code(p_code text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.data || jsonb_build_object('code', c.code)
  from public.portal_clients c
  where c.code = p_code
    and p_code ~ '^[0-9]{6}$';
$$;

-- Gem det kunden selv udfylder. Rører KUN info-delen, så et gem fra
-- kunden aldrig kan overskrive pris, program eller kontaktperson.
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
   where code = p_code;
end;
$$;

-- ---------- vores egen adgang ----------

create or replace function public.portal_admin_check(p_code text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.portal_config
    where key = 'admin_code' and value = p_code
  );
$$;

create or replace function public.portal_admin_list(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.portal_admin_check(p_code) then
    raise exception 'Forkert adminkode';
  end if;

  return coalesce(
    (select jsonb_agg(c.data || jsonb_build_object('code', c.code)
                      order by c.data ->> 'eventDate' nulls last)
       from public.portal_clients c),
    '[]'::jsonb
  );
end;
$$;

-- Opretter kunden OG finder en ledig kode. Koden laves her, ikke i
-- browseren: to der opretter samtidig ville ellers kunne ramme samme tal,
-- og den sidste ville overskrive den første.
create or replace function public.portal_admin_create(p_code text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kode  text;
  v_admin text;
  i       int := 0;
begin
  if not public.portal_admin_check(p_code) then
    raise exception 'Forkert adminkode';
  end if;

  select value into v_admin from public.portal_config where key = 'admin_code';

  loop
    i := i + 1;
    v_kode := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');

    -- Admin-koden må aldrig blive en kundekode: så ville kunden lande i
    -- kundelisten i stedet for på sin egen side.
    if v_kode is distinct from v_admin
       and not exists (select 1 from public.portal_clients where code = v_kode) then
      exit;
    end if;

    if i > 200 then
      raise exception 'Kunne ikke finde en ledig kode';
    end if;
  end loop;

  insert into public.portal_clients (code, data)
  values (v_kode, coalesce(p_payload, '{}'::jsonb) - 'code');

  return (select c.data || jsonb_build_object('code', c.code)
            from public.portal_clients c where c.code = v_kode);
end;
$$;

-- ---------- hvem må kalde hvad ----------

revoke all on function public.portal_client_by_code(text) from public;
revoke all on function public.portal_save_info(text, jsonb) from public;
revoke all on function public.portal_admin_check(text)      from public;
revoke all on function public.portal_admin_list(text)       from public;
revoke all on function public.portal_admin_create(text, jsonb) from public;

grant execute on function public.portal_client_by_code(text)    to anon, authenticated;
grant execute on function public.portal_save_info(text, jsonb)  to anon, authenticated;
grant execute on function public.portal_admin_check(text)       to anon, authenticated;
grant execute on function public.portal_admin_list(text)        to anon, authenticated;
grant execute on function public.portal_admin_create(text, jsonb) to anon, authenticated;
