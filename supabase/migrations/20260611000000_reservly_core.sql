create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create schema if not exists reservly_private;

create or replace function reservly_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null,
  city text not null default '',
  whatsapp_number text not null default '',
  booking_page_language text not null default 'Both',
  timezone text not null default 'Indian/Mauritius',
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  booking_limit_monthly integer default 15 check (booking_limit_monthly is null or booking_limit_monthly > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_label text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  opens_at time not null default '09:00',
  closes_at time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, day_of_week),
  check (opens_at < closes_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_phone text not null check (char_length(customer_phone) between 5 and 40),
  customer_language text not null default 'Both',
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  source text not null default 'public' check (source in ('public', 'dashboard')),
  notes text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text not null default 'whatsapp',
  provider text not null default 'twilio',
  provider_message_id text,
  message_type text,
  recipient_phone text,
  body text not null,
  status text not null default 'queued',
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses(owner_id);
create index if not exists businesses_slug_idx on public.businesses(slug);
create index if not exists services_business_id_idx on public.services(business_id);
create index if not exists availability_business_id_idx on public.availability(business_id);
create index if not exists bookings_business_start_idx on public.bookings(business_id, start_at);
create index if not exists bookings_phone_created_idx on public.bookings(customer_phone, created_at desc);
create index if not exists message_events_business_idx on public.message_events(business_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_no_overlapping_active_slots'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_no_overlapping_active_slots
      exclude using gist (
        business_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      )
      where (status in ('pending', 'confirmed'));
  end if;
end;
$$;

create or replace function reservly_private.enforce_booking_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
  v_limit integer;
  v_timezone text;
  v_duration integer;
  v_month_count integer;
  v_local_start timestamp;
  v_local_end timestamp;
  v_open boolean;
begin
  select b.plan, coalesce(b.booking_limit_monthly, 15), b.timezone, s.duration_minutes
    into v_plan, v_limit, v_timezone, v_duration
  from public.businesses b
  join public.services s on s.business_id = b.id
  where b.id = new.business_id
    and s.id = new.service_id
    and s.active = true;

  if not found then
    raise exception 'Booking service is unavailable';
  end if;

  new.end_at = new.start_at + make_interval(mins => v_duration);

  if new.start_at <= now() then
    raise exception 'Past booking times are not allowed';
  end if;

  v_local_start = timezone(v_timezone, new.start_at);
  v_local_end = timezone(v_timezone, new.end_at);

  select exists (
    select 1
    from public.availability a
    where a.business_id = new.business_id
      and a.day_of_week = extract(dow from v_local_start)::integer
      and a.is_open = true
      and v_local_start::time >= a.opens_at
      and v_local_end::time <= a.closes_at
  ) into v_open;

  if not v_open then
    raise exception 'Selected time is outside availability';
  end if;

  if v_plan = 'free' and new.status in ('pending', 'confirmed') then
    select count(*)
      into v_month_count
    from public.bookings existing
    where existing.business_id = new.business_id
      and existing.status in ('pending', 'confirmed')
      and (tg_op = 'INSERT' or existing.id <> new.id)
      and date_trunc('month', timezone(v_timezone, existing.start_at)) =
          date_trunc('month', timezone(v_timezone, new.start_at));

    if v_month_count >= v_limit then
      raise exception 'Free plan booking limit reached for this month';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_booking_rules on public.bookings;
create trigger enforce_booking_rules
before insert or update of business_id, service_id, start_at, status
on public.bookings
for each row execute function reservly_private.enforce_booking_rules();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function reservly_private.touch_updated_at();

drop trigger if exists touch_businesses_updated_at on public.businesses;
create trigger touch_businesses_updated_at
before update on public.businesses
for each row execute function reservly_private.touch_updated_at();

drop trigger if exists touch_services_updated_at on public.services;
create trigger touch_services_updated_at
before update on public.services
for each row execute function reservly_private.touch_updated_at();

drop trigger if exists touch_availability_updated_at on public.availability;
create trigger touch_availability_updated_at
before update on public.availability
for each row execute function reservly_private.touch_updated_at();

drop trigger if exists touch_bookings_updated_at on public.bookings;
create trigger touch_bookings_updated_at
before update on public.bookings
for each row execute function reservly_private.touch_updated_at();

drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at
before update on public.subscriptions
for each row execute function reservly_private.touch_updated_at();

drop function if exists public.handle_new_user_profile();

create or replace function reservly_private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_reservly_profile on auth.users;
create trigger on_auth_user_created_reservly_profile
after insert on auth.users
for each row execute function reservly_private.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.message_events enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Owners can read own profile" on public.profiles;
create policy "Owners can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Owners can update own profile" on public.profiles;
create policy "Owners can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Owners manage own businesses" on public.businesses;
create policy "Owners manage own businesses"
on public.businesses for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Public can read booking businesses" on public.businesses;
create policy "Public can read booking businesses"
on public.businesses for select
to anon, authenticated
using (true);

drop policy if exists "Owners manage own services" on public.services;
create policy "Owners manage own services"
on public.services for all
to authenticated
using (exists (
  select 1 from public.businesses b
  where b.id = services.business_id and b.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.businesses b
  where b.id = services.business_id and b.owner_id = auth.uid()
));

drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services"
on public.services for select
to anon, authenticated
using (active = true);

drop policy if exists "Owners manage own availability" on public.availability;
create policy "Owners manage own availability"
on public.availability for all
to authenticated
using (exists (
  select 1 from public.businesses b
  where b.id = availability.business_id and b.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.businesses b
  where b.id = availability.business_id and b.owner_id = auth.uid()
));

drop policy if exists "Public can read availability" on public.availability;
create policy "Public can read availability"
on public.availability for select
to anon, authenticated
using (true);

drop policy if exists "Owners read own bookings" on public.bookings;
create policy "Owners read own bookings"
on public.bookings for select
to authenticated
using (exists (
  select 1 from public.businesses b
  where b.id = bookings.business_id and b.owner_id = auth.uid()
));

drop policy if exists "Owners update own bookings" on public.bookings;
create policy "Owners update own bookings"
on public.bookings for update
to authenticated
using (exists (
  select 1 from public.businesses b
  where b.id = bookings.business_id and b.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.businesses b
  where b.id = bookings.business_id and b.owner_id = auth.uid()
));

drop policy if exists "Owners create manual bookings" on public.bookings;
create policy "Owners create manual bookings"
on public.bookings for insert
to authenticated
with check (
  source = 'dashboard'
  and exists (
    select 1 from public.businesses b
    where b.id = bookings.business_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "Public can create booking requests" on public.bookings;
create policy "Public can create booking requests"
on public.bookings for insert
to anon, authenticated
with check (
  source = 'public'
  and status = 'pending'
  and exists (
    select 1
    from public.services s
    where s.id = bookings.service_id
      and s.business_id = bookings.business_id
      and s.active = true
  )
);

drop policy if exists "Public can read taken booking slots" on public.bookings;
create policy "Public can read taken booking slots"
on public.bookings for select
to anon
using (status in ('pending', 'confirmed'));

drop policy if exists "Owners read own message events" on public.message_events;
create policy "Owners read own message events"
on public.message_events for select
to authenticated
using (exists (
  select 1 from public.businesses b
  where b.id = message_events.business_id and b.owner_id = auth.uid()
));

drop policy if exists "Owners read own subscriptions" on public.subscriptions;
create policy "Owners read own subscriptions"
on public.subscriptions for select
to authenticated
using (exists (
  select 1 from public.businesses b
  where b.id = subscriptions.business_id and b.owner_id = auth.uid()
));

revoke all on public.profiles from anon, authenticated;
revoke all on public.businesses from anon, authenticated;
revoke all on public.services from anon, authenticated;
revoke all on public.availability from anon, authenticated;
revoke all on public.bookings from anon, authenticated;
revoke all on public.message_events from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses to authenticated;
grant select on public.businesses to anon;
grant select, insert, update, delete on public.services to authenticated;
grant select on public.services to anon;
grant select, insert, update, delete on public.availability to authenticated;
grant select on public.availability to anon;
grant select, insert, update on public.bookings to authenticated;
grant select (id, business_id, service_id, start_at, end_at, status), insert on public.bookings to anon;
grant select on public.message_events to authenticated;
grant select on public.subscriptions to authenticated;
