
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- enums
create type public.service_type as enum ('water','milk','tiffin','newspaper');
create type public.delivery_status as enum ('pending','delivered','skipped','missed');
create type public.bill_status as enum ('pending','partial','paid');
create type public.water_request_status as enum ('pending','accepted','declined','completed');

-- clients (a business)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  phone text not null,
  email text,
  balance_paise integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "owner all clients" on public.clients for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- client_services (each service a business runs)
create table public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_type public.service_type not null,
  unique_code text not null unique,
  areas text[] not null default '{}',
  pricing jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, service_type)
);
alter table public.client_services enable row level security;
create policy "owner all services" on public.client_services for all
  using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

-- helper to generate unique code
create or replace function public.generate_service_code(svc public.service_type)
returns text language plpgsql as $$
declare
  prefix text;
  code text;
  exists_count int;
begin
  prefix := case svc
    when 'water' then 'WS'
    when 'milk' then 'MK'
    when 'tiffin' then 'TF'
    when 'newspaper' then 'NP'
  end;
  loop
    code := prefix || '-' || lpad(floor(random()*9000+1000)::text, 4, '0');
    select count(*) into exists_count from public.client_services where unique_code = code;
    exit when exists_count = 0;
  end loop;
  return code;
end;
$$;

-- subscribers
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references public.client_services(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  area text,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  joined_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
create policy "owner all subscribers" on public.subscribers for all
  using (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ));

-- deliveries
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  client_service_id uuid not null references public.client_services(id) on delete cascade,
  delivery_date date not null default current_date,
  status public.delivery_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  unique (subscriber_id, delivery_date)
);
alter table public.deliveries enable row level security;
create policy "owner all deliveries" on public.deliveries for all
  using (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ));

-- bills
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  client_service_id uuid not null references public.client_services(id) on delete cascade,
  period_month date not null, -- first day of month
  total_paise integer not null default 0,
  paid_paise integer not null default 0,
  status public.bill_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (subscriber_id, period_month)
);
alter table public.bills enable row level security;
create policy "owner all bills" on public.bills for all
  using (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ));

-- water_requests
create table public.water_requests (
  id uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references public.client_services(id) on delete cascade,
  requester_name text not null,
  requester_phone text,
  address text,
  area text,
  water_type text default 'regular',
  notes text,
  status public.water_request_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.water_requests enable row level security;
create policy "owner all water requests" on public.water_requests for all
  using (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.client_services cs
    join public.clients c on c.id = cs.client_id
    where cs.id = client_service_id and c.owner_id = auth.uid()
  ));

create index on public.client_services (client_id);
create index on public.subscribers (client_service_id);
create index on public.deliveries (client_service_id, delivery_date);
create index on public.bills (client_service_id, period_month);
create index on public.water_requests (client_service_id, status);
