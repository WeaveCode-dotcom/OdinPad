/**
 * Core business logic — framework-independent, no Supabase calls.
 * Includes novel metrics, story structure, book lifecycle, and feature flags.
 */
export * from "@/lib/novel-metrics";
export * from "@/lib/story-frameworks";
export * from "@/lib/book-creation";
export * from "@/lib/book-metadata";
export * from "@/lib/writer-stats";
export * from "@/lib/feature-flags";
export * from "@/lib/remote-feature-flags";
export * from "@/lib/onboarding-gate";
export * from "@/lib/personalization";
export * from "@/lib/notifications";
export * from "@/lib/analytics";
export * from "@/lib/routes";
export * from "@/lib/manuscript-export";
export * from "@/lib/word-import";
