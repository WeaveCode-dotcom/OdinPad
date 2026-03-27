-- OdinPad seed data for local development
-- Run automatically by `npx supabase db reset` after all migrations.
-- Creates a demo user and sample novels so contributors can explore immediately.

-- ─── Demo user ────────────────────────────────────────────────────────────────
-- Password: DemoPass123!
-- To sign in locally: email=demo@odinpad.dev, password=DemoPass123!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'demo@odinpad.dev',
  crypt('DemoPass123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Demo Writer"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'demo@odinpad.dev',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo@odinpad.dev"}',
  'email',
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- ─── User profile ─────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, display_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Writer',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- ─── User preferences ─────────────────────────────────────────────────────────
INSERT INTO public.user_preferences (
  user_id, daily_word_goal, weekly_word_goal, font_size, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  500,
  3500,
  1.0,
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;

-- ─── Sample novels ────────────────────────────────────────────────────────────
-- Two novels: one in-progress draft and one complete short story.
INSERT INTO public.novels (id, user_id, data, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id": "10000000-0000-0000-0000-000000000001",
    "title": "The Obsidian Throne",
    "author": "Demo Writer",
    "genre": "Fantasy",
    "premise": "A disgraced general must reclaim a stolen throne using only the power of stories passed down through generations.",
    "targetWordCount": 90000,
    "wordCountPreset": "novel",
    "status": "drafting",
    "wordCount": 4820,
    "frameworkId": "hero-journey",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-03-20T14:30:00.000Z",
    "acts": [
      {
        "id": "act-001",
        "title": "Act I — The Ordinary World",
        "order": 0,
        "chapters": [
          {
            "id": "ch-001",
            "title": "Prologue",
            "order": 0,
            "scenes": [
              {
                "id": "sc-001",
                "title": "The Fall of General Maren",
                "order": 0,
                "status": "complete",
                "content": "The last torch in the war-camp guttered out at dawn. General Maren Solvaas stood at the edge of the retreat and did not weep — she had run out of tears somewhere around the third burning village.\n\nThe empire had not lost the battle. She had lost it. That was the story they would tell, and story was all that remained.",
                "wordCount": 52,
                "summary": "Maren witnesses the aftermath of her decisive defeat."
              }
            ]
          },
          {
            "id": "ch-002",
            "title": "Chapter One — Ten Years Later",
            "order": 1,
            "scenes": [
              {
                "id": "sc-002",
                "title": "The Archivist",
                "order": 0,
                "status": "in-progress",
                "content": "The Archive of Vell housed forty thousand scrolls and one disgraced general. Maren had catalogued 6,211 of them. She was beginning to suspect there was no end.",
                "wordCount": 31,
                "summary": "Maren's life as a royal archivist, ten years after her disgrace."
              }
            ]
          }
        ]
      }
    ],
    "storyWikiEntries": [
      {
        "id": "codex-001",
        "name": "Maren Solvaas",
        "type": "character",
        "description": "Former Imperial General, now royal archivist. Mid-40s. Tactical genius, terrible at politics.",
        "tags": ["protagonist", "military"]
      },
      {
        "id": "codex-002",
        "name": "The Archive of Vell",
        "type": "location",
        "description": "A vast underground repository beneath the capital city. Built by the third dynasty.",
        "tags": ["setting", "recurring"]
      }
    ],
    "ideas": [],
    "brainstormNotes": [],
    "reviewAnnotations": []
  }',
  '2026-01-15T10:00:00.000Z',
  '2026-03-20T14:30:00.000Z'
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '{
    "id": "10000000-0000-0000-0000-000000000002",
    "title": "Salt and Static",
    "author": "Demo Writer",
    "genre": "Literary Fiction",
    "premise": "A lighthouse keeper''s radio picks up voices from the future on the anniversary of a shipwreck.",
    "targetWordCount": 7500,
    "wordCountPreset": "short-story",
    "status": "complete",
    "wordCount": 7512,
    "frameworkId": "three-act",
    "createdAt": "2025-11-01T09:00:00.000Z",
    "updatedAt": "2026-02-10T11:00:00.000Z",
    "acts": [
      {
        "id": "act-ss-001",
        "title": "Act I",
        "order": 0,
        "chapters": [
          {
            "id": "ch-ss-001",
            "title": "The Anniversary",
            "order": 0,
            "scenes": [
              {
                "id": "sc-ss-001",
                "title": "The Radio",
                "order": 0,
                "status": "complete",
                "content": "Every November 14th, the radio in Lighthouse Seven broadcast signals that did not exist.",
                "wordCount": 14,
                "summary": "First manifestation of the anomaly."
              }
            ]
          }
        ]
      }
    ],
    "storyWikiEntries": [],
    "ideas": [],
    "brainstormNotes": [],
    "reviewAnnotations": []
  }',
  '2025-11-01T09:00:00.000Z',
  '2026-02-10T11:00:00.000Z'
) ON CONFLICT (id) DO NOTHING;

-- ─── Sample Idea Web entries ───────────────────────────────────────────────────
INSERT INTO public.idea_web_entries (
  id, user_id, title, body, status, category, tags, pinned, novel_id, created_at, updated_at
) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'The Last Cartographer',
  'A woman who maps territories that no longer exist — she is hired to make a map of a city that burned down fifty years ago, using only survivor accounts.',
  'sprouting',
  'plot',
  ARRAY['premise', 'mystery', 'historical'],
  true,
  NULL,
  now() - interval '14 days',
  now() - interval '2 days'
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Villain who cries at funerals',
  'The antagonist always weeps at funerals — even funerals of people they killed. Not guilt. They weep for the loss of potential. They believe death is the only true waste.',
  'growing',
  'character',
  ARRAY['antagonist', 'psychology', 'theme'],
  false,
  NULL,
  now() - interval '7 days',
  now() - interval '1 day'
),
(
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Silence as a weapon',
  'A culture where silence is legally used as punishment — you are not imprisoned, you are simply never spoken to again. Explore what that does to a person over years.',
  'seed',
  'world',
  ARRAY['worldbuilding', 'social', 'punishment'],
  false,
  NULL,
  now() - interval '3 days',
  now()
),
(
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Overheard: "We don''t forgive, we reassign blame"',
  'Overheard at a coffee shop. Could be a politician, a parent, a god. Feels like a villain motto.',
  'seed',
  'theme',
  ARRAY['dialogue', 'overheard', 'theme'],
  false,
  NULL,
  now() - interval '1 day',
  now()
) ON CONFLICT (id) DO NOTHING;

-- ─── Sample daily writing stats ───────────────────────────────────────────────
INSERT INTO public.user_daily_stats (user_id, date_key, words_written, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', to_char(now() - interval '6 days', 'YYYY-MM-DD'), 320, now()),
  ('00000000-0000-0000-0000-000000000001', to_char(now() - interval '5 days', 'YYYY-MM-DD'), 0,   now()),
  ('00000000-0000-0000-0000-000000000001', to_char(now() - interval '4 days', 'YYYY-MM-DD'), 750, now()),
  ('00000000-0000-0000-0000-000000000001', to_char(now() - interval '3 days', 'YYYY-MM-DD'), 512, now()),
  ('00000000-0000-0000-0000-000000000001', to_char(now() - interval '2 days', 'YYYY-MM-DD'), 1203,now()),
  ('00000000-0000-0000-0000-000000000001', to_char(now() - interval '1 day',  'YYYY-MM-DD'), 88,  now()),
  ('00000000-0000-0000-0000-000000000001', to_char(now(),                      'YYYY-MM-DD'), 340, now())
ON CONFLICT (user_id, date_key) DO UPDATE SET words_written = EXCLUDED.words_written;
