create table if not exists public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  user_agent text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_notifications (
  id bigserial primary key,
  title text not null,
  body text not null,
  url text not null default '/?source=pwa',
  tag text not null default 'laker-global',
  source text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.push_delivery_logs (
  id bigserial primary key,
  push_notification_id bigint references public.push_notifications(id) on delete set null,
  title text not null,
  body text not null,
  url text not null default '/?source=pwa',
  tag text not null default 'laker-global',
  sent integer not null default 0,
  total integer not null default 0,
  skipped integer not null default 0,
  warning text,
  results jsonb not null default '[]'::jsonb,
  source text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.security_rate_limits (
  scope text not null,
  key text not null,
  hits integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, key)
);

create table if not exists public.security_audit_logs (
  id bigserial primary key,
  scope text not null,
  action text not null,
  status text not null default 'ok',
  ip text not null default 'unknown',
  user_agent text,
  subject text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists push_notifications_created_at_idx
  on public.push_notifications (created_at desc);

create index if not exists push_delivery_logs_created_at_idx
  on public.push_delivery_logs (created_at desc);

create index if not exists security_rate_limits_blocked_until_idx
  on public.security_rate_limits (blocked_until desc);

create index if not exists security_rate_limits_updated_at_idx
  on public.security_rate_limits (updated_at desc);

create index if not exists security_audit_logs_created_at_idx
  on public.security_audit_logs (created_at desc);

create index if not exists security_audit_logs_scope_idx
  on public.security_audit_logs (scope, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_notifications enable row level security;
alter table public.push_delivery_logs enable row level security;
alter table public.security_rate_limits enable row level security;
alter table public.security_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'block_push_subscriptions_public'
  ) then
    create policy block_push_subscriptions_public
      on public.push_subscriptions
      for all
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_notifications'
      and policyname = 'block_push_notifications_public'
  ) then
    create policy block_push_notifications_public
      on public.push_notifications
      for all
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_delivery_logs'
      and policyname = 'block_push_delivery_logs_public'
  ) then
    create policy block_push_delivery_logs_public
      on public.push_delivery_logs
      for all
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'security_rate_limits'
      and policyname = 'block_security_rate_limits_public'
  ) then
    create policy block_security_rate_limits_public
      on public.security_rate_limits
      for all
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'security_audit_logs'
      and policyname = 'block_security_audit_logs_public'
  ) then
    create policy block_security_audit_logs_public
      on public.security_audit_logs
      for all
      using (false)
      with check (false);
  end if;
end $$;
