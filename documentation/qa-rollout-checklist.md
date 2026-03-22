# Onboarding/Profile QA and Rollout Checklist

## Automated Validation

- Run `npm run build`
- Run `npm run test -- --run`
- Confirm new tests pass:
  - `src/test/onboarding-gate.test.ts`
  - `src/test/personalization.test.ts`
  - `src/test/writer-stats.test.ts`
  - `src/test/notifications.test.ts`

## Manual Flow Validation

1. New user signup/signin routes to `/onboarding`.
2. Skip path (`I'll explore myself`) returns to dashboard and keeps deferred state.
3. Quiz answers persist after refresh.
4. First project creation seeds initial structure and selects recommended framework.
5. Guided tour overlay highlights:
   - write mode tab
   - codex toggle
   - settings button
6. Completing guided actions unlocks advanced workspace mode visibility.
7. First 100 words trigger celebration toast and persist timestamp.
8. `/settings` autosaves profile and preferences.
9. Stats tab exports CSV and print-PDF view.
10. Notification preview queue flushes in dev logs.

## Supabase Checks

- `user_preferences` row exists for new users.
- `user_stats_daily` snapshot rows upsert for active writing users.
- RLS own-row access is enforced on:
  - `profiles`
  - `user_preferences`
  - `user_stats_daily`

## Rollout Guardrails

- Keep feature flags enabled gradually:
  - `VITE_FF_ONBOARDING_V2`
  - `VITE_FF_SETTINGS_COMMAND_CENTER`
  - `VITE_FF_GUIDED_TOUR`
- Canary recommendation:
  - Enable in staging first.
  - Enable for a limited production subset.
  - Monitor onboarding completion rate and error logs for 24h.
  - Expand to full rollout after stability window.

## Rollback Steps

1. Disable onboarding/settings/tour feature flags.
2. Keep auth and core workspace flow active.
3. Preserve database migrations (non-destructive rollback path).
4. Re-enable feature flags after patch validation.
