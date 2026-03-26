-- Writing sessions auto-log
-- Records each focus/sprint session for the Stats & Analytics page.

create table if not exists writing_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  novel_id      uuid,               -- null = no active project
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  duration_secs int not null default 0,
  words_written int not null default 0,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists writing_sessions_user_id_idx on writing_sessions (user_id);
create index if not exists writing_sessions_started_at_idx on writing_sessions (user_id, started_at desc);

-- RLS
alter table writing_sessions enable row level security;

create policy "Users manage own sessions"
  on writing_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
