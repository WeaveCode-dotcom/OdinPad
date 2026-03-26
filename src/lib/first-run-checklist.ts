import type { UserPreferences } from "@/contexts/AuthContext";

/**
 * ## First-run checklist — analytics event schema
 *
 * Sent via `trackEvent` (dev console + optional `VITE_ANALYTICS_INGEST_URL`).
 *
 * | Event | Payload |
 * |-------|---------|
 * | `checklist_impression` | `source`: `"dashboard"` \| `"stats"`, optional `ms_since_signup` (number) |
 * | `checklist_dismiss` | `source`: `"dashboard"` |
 * | `checklist_step_complete` | `step`: `"novel"` \| `"idea_web"` \| `"write"` |
 * | `checklist_all_complete` | `source`: `"dashboard"` \| `"stats"`, optional `ms_since_signup` |
 *
 * Legacy aliases (same handlers, for older dashboards): none — use names above only.
 */
export const FIRST_RUN_CHECKLIST_EVENTS = {
  IMPRESSION: "checklist_impression",
  DISMISS: "checklist_dismiss",
  STEP_COMPLETE: "checklist_step_complete",
  ALL_COMPLETE: "checklist_all_complete",
} as const;

/** One-time gamification label (separate from Odyssey / word-based ranks). */
export const FOUNDATIONS_TRACK_LABEL = "Foundations";

/** Prioritized product defaults for the 20 clarifying questions (evolution plan). Used for docs / support. */
export const FIRST_RUN_PRODUCT_DEFAULTS = {
  primaryGoal: "activation_and_education",
  audienceThreshold: "show_until_three_wins_done_or_dismissed",
  completionHide: "auto_hide_when_all_server_flags_true_dismiss_local_only",
  dismiss: "permanent_local_remind_me_later",
  crossDeviceDismiss: "localStorage_only",
  stepOrder: "project_then_idea_web_then_write",
  novelStepCountsImport: true,
  ideaWebStep: "visit_inbox_or_capture",
  writeStep: "open_write_once",
  onboardingConflict: "onboarding_may_precomplete_flags",
  emptyNovelsWriteCta: "open_book_when_novel_exists_else_create_first",
  statsParity: "full_progress_card_plus_dashboard_link",
  gamification: "named_foundations_badge_in_preferences_cosmetic_only",
  gamificationVsOdyssey: "cosmetic_only_never_word_ranks",
  analyticsBackend: "console_dev_plus_optional_ingest_url",
  analyticsPrivacy: "non_sensitive_product_events",
  tourRelation: "independent_from_workspace_tour",
  workspaceChecklistRelation: "separate_flags_ui",
  i18n: "english_first_strings_may_grow",
  futureSteps: "prefer_jsonb_onboarding_steps_if_steps_multiply",
} as const;

export type FirstRunStepId = "novel" | "idea_web" | "write";

export function msSinceUserSignup(createdAtIso: string | undefined): number | undefined {
  if (!createdAtIso) return undefined;
  const t = Date.parse(createdAtIso);
  if (!Number.isFinite(t)) return undefined;
  return Math.max(0, Date.now() - t);
}

export function getFirstRunProgress(preferences: UserPreferences | null): {
  completed: number;
  total: number;
  pct: number;
  steps: Record<FirstRunStepId, boolean>;
  allDone: boolean;
} {
  if (!preferences) {
    return {
      completed: 0,
      total: 3,
      pct: 0,
      steps: { novel: false, idea_web: false, write: false },
      allDone: false,
    };
  }
  const novel = Boolean(preferences.first_run_novel_created);
  const idea_web = Boolean(preferences.first_run_idea_web_visited);
  const write = Boolean(preferences.first_run_write_opened);
  const completed = [novel, idea_web, write].filter(Boolean).length;
  return {
    completed,
    total: 3,
    pct: Math.round((completed / 3) * 100),
    steps: { novel, idea_web, write },
    allDone: novel && idea_web && write,
  };
}
