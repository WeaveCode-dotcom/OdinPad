# OdinPad Product Documentation (Non-Technical)

## What OdinPad Is

OdinPad is a writing operating system for fiction authors. It supports writers from idea stage to final revision inside one guided workspace.

It is designed for:
- plotters,
- pantsers,
- hybrid writers.

## Current Product Experience

### Entry and Authentication

- Users can sign up/sign in with email/password or Google.
- Password reset and secure account actions are built in.
- Sessions are account-backed and survive normal refresh/login cycles.

### New User Onboarding (V2)

On first login, users go through a guided onboarding flow (with skip option):

1. Personalization quiz
2. Profile completion modals (name/bio, theme/font, daily goal)
3. Extensive in-app workspace tour
4. First project creation after tour

The flow is intentionally short, action-focused, and designed to move users quickly to first writing value.
The in-app tour overlay now covers more feature surfaces (planning, writing, codex, settings, review, and dashboard return).
If a user skips the tour from onboarding, they are sent to the dashboard. If they skip while already in the workspace, they stay on the current page.

### Personalized Writer Dashboard

After onboarding, users see a personalized dashboard with:

- stage/style/goal context,
- checklist progress,
- project library and quick actions.

Each account has a private project library:

- books created by User A stay with User A,
- books created by User B stay with User B,
- books are not shared across accounts by default.

### Refined Book Creation Experience

Book creation now uses a faster guided flow:

- quick required fields first (title, genre, template),
- optional advanced fields (premise, target word count),
- smart template suggestions based on your preferences and genre,
- input recovery if the creation dialog is closed and reopened.

This keeps creation fast for new users while still giving power users richer setup controls.

### Command Center: Profile & Settings

A global settings area gives writers one place to manage:

- account identity details,
- writing/editor preferences,
- goals and reminders,
- stats and exports,
- project management visibility,
- security and privacy controls.

## Why This Matters to Writers

- Reduced setup friction for new users.
- Better template and workflow recommendations based on writing style and stage.
- Stronger motivation through milestone feedback and checklist progress.
- Better control over privacy, preferences, and account data.
- Strong project privacy: one account cannot access another account's books.

## Current Strengths

1. End-to-end auth and security foundation is significantly stronger.
2. Onboarding now captures writer intent and personalizes experience.
3. Refined book creation balances speed, guidance, and resilience.
4. Settings command center centralizes critical writer controls.
5. Stats and export paths begin supporting accountability workflows.

## Current Limitations

1. Guided tour is now extensive, but can still become more adaptive to user behavior over time.
2. Notifications are preference-ready with queue scaffolding, but production delivery channels are still being deepened.
3. Stats are currently client-first with daily snapshot syncing and will gain deeper server aggregation over time.
4. Collaboration features remain future roadmap scope.

## Product Priorities (Next)

1. Add adaptive branching in the tour so it reacts to user progress in real time.
2. Complete production-grade email/push reminder pipeline.
3. Add deeper trends and streak analytics visualizations.
4. Improve advanced feature discovery without overwhelming new users.
5. Continue tightening testing, rollout guardrails, and documentation parity.
