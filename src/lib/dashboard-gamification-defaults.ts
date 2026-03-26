/**
 * Product defaults for dashboard gamification (Writing checklist, Odyssey, Foundations).
 * Maps the evolution plan’s clarifying questions to concrete v1 behavior.
 */
export const DASHBOARD_GAMIFICATION_ANSWERS = {
  /** Q1 — Cadence: local calendar day for daily + Idea Web “today”; checklist rows re-derive each day. */
  checklistCadence: "local_calendar_day",
  /** Q2 — Daily task: stats-backed words today vs daily goal (same as hero). */
  dailyRule: "wordsToday_vs_dailyGoal_from_user_stats_daily",
  /** Q3 — Idea task: any Idea Web entry created or updated today (local date). */
  ideaRule: "entry_touched_today",
  /** Q4 — Open project: active manuscript selected OR first-run write opened (workspace visit signal). */
  openRule: "active_novel_or_first_run_write_opened",
  /** Q5 — Overrides: manual toggle merged with derived; persisted localStorage only. */
  overrides: "localStorage_odinpad_writing_checklist_overrides",
  /** Q6 — Foundations overlap: habit checklist independent; not auto-seeded from first_run_* except open OR write flag. */
  foundationsOverlap: "independent_except_open_uses_write_opened",
  /** Q7 — Odyssey on dashboard: rank/progress from primary manuscript (active, else most recent). */
  odysseyPrimaryBook: "active_else_sortedNovels_first",
  /** Q8 — Odyssey UI: words to next tier + percent bar within tier. */
  odysseyProgressUi: "words_to_next_and_tier_percent_bar",
  /** Q9 — Empty library: placeholder copy, no fake rank. */
  emptyPrimaryNovel: "placeholder_not_apprentice",
  /** Q10 — v1 scope: derived checklist + primary Odyssey; persistence localStorage overrides only. */
  v1Scope: "phase_a_b_plus_local_overrides",
  /** Q11 — Analytics: trackEvent (ingest when VITE_ANALYTICS_INGEST_URL set). */
  analytics: "checklist_auto_manual_odyssey_rank_change",
  /** Q12 — i18n: English strings; avoid fragile concatenation for future i18n. */
  i18n: "english_v1",
} as const;
