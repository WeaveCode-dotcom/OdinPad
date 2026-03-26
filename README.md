# OdinPad

**Product name:** OdinPad (user-facing). The npm package name is `odinpad` (lowercase); localStorage keys use the `odinpad_` prefix intentionally for stable client data across renames.

OdinPad is a fiction-writing workspace built for plotters, pantsers, and hybrid writers.  
It combines planning, drafting, codex/worldbuilding, review workflows, onboarding personalization, and a writer-focused settings command center.

## Current Status

Implemented and active:

- Supabase-backed auth and novel persistence
- Auth callback + password reset completion routes
- Account security actions (global sign out, account deletion)
- Onboarding V2 (quiz, first project setup, guided activation, final preferences)
- Profile & Settings command center (`/settings`)
- Personalized dashboard checklist + first-100-words milestone feedback
- Hybrid stats foundation with CSV/PDF export path

## Documentation

- Technical docs: [`documentation/technical-documentation.md`](documentation/technical-documentation.md)
- Product docs: [`documentation/non-technical-documentation.md`](documentation/non-technical-documentation.md)
- Documentation index: [`documentation/README.md`](documentation/README.md)

## Stack

- React 18 + TypeScript
- Vite 5
- Tailwind + shadcn/ui
- Framer Motion
- Supabase (Auth + Postgres + RLS)
- Vitest

## Local Development

```sh
npm install
npm run dev
```

The app runs on `http://localhost:8080`.

## Environment Variables

Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_FF_ONBOARDING_V2`
- `VITE_FF_SETTINGS_COMMAND_CENTER`
- `VITE_FF_GUIDED_TOUR`

## Verification Commands

```sh
npm run build
npm run test -- --run
```
