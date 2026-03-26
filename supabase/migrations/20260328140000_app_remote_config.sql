-- Remote feature flags (read-only for authenticated users; change values via SQL or Dashboard)
create table if not exists public.app_remote_config (
  key text primary key,
  value jsonb not null default 'true'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_remote_config (key, value) values
  ('ai_groq_editorial', 'true'::jsonb),
  ('ai_daily_quote_groq', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.app_remote_config enable row level security;

create policy "app_remote_config_select_authenticated"
  on public.app_remote_config
  for select
  to authenticated
  using (true);

comment on table public.app_remote_config is 'Kill-switch style flags for AI features; set value to false to disable without client redeploy.';
