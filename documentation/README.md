# OdinPad Documentation Index

This folder contains the authoritative project documentation for technical and non-technical readers.

## Files

- `technical-documentation.md`
  - System architecture and route gates
  - Auth, onboarding, preferences, and stats data models
  - Supabase migration and RLS posture
  - Module responsibilities and rollout strategy

- `non-technical-documentation.md`
  - Product narrative and user journey
  - Onboarding and personalization behavior
  - Writer profile/settings command-center value
  - Priorities, risks, and success metrics

- `qa-rollout-checklist.md`
  - Build/test validation commands
  - Manual onboarding/settings verification steps
  - Canary rollout and rollback guardrails

## Latest Additions Covered

- Auth hardening updates (session handling, callback flow, password reset flow, account security actions)
- Supabase-backed novel persistence with import bridge
- Onboarding V2 (quiz, profile modals, extensive workspace tour, post-tour project creation)
- Expanded guided tour overlay coverage with skip behavior rules
- Refined book creation flow (shared validation contract, quick+advanced UX, recommendation ranking, draft recovery)
- Profile & Settings command center (all six tabs)
- Personalized dashboard/checklist and milestone celebration flow
- Hybrid stats path (client-first calculations + daily snapshot sync)
- Feature flag and analytics event foundations

## Last Updated Scope

Documentation now reflects all implementation work completed through:

- `20260226091000_profiles_select_own_only.sql`
- `20260226094000_add_delete_my_account_function.sql`
- `20260226103000_onboarding_preferences_stats.sql`
