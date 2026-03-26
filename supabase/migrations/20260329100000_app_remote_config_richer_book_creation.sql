-- Optional kill-switch for multi-step book creation + rich metadata (defaults on).
insert into public.app_remote_config (key, value) values
  ('richer_book_creation', 'true'::jsonb)
on conflict (key) do nothing;
