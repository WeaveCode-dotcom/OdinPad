/**
 * Database / Supabase utilities.
 * Re-exports modules that deal directly with Supabase data access.
 * New DB helpers should live here or in src/api/ (preferred for new code).
 *
 * Incremental migration: files still live in src/lib/ while callers migrate
 * to @/lib/db imports. Once a file is fully migrated, move it under src/lib/db/.
 */
export * from "@/lib/novel-store";
export * from "@/lib/series-service";
export * from "@/lib/user-stats-daily";
export * from "@/lib/supabase-errors";
export * from "@/lib/supabase-user-access-token";
export * from "@/lib/novel-cover";
export * from "@/lib/cover-storage";
export * from "@/lib/scene-snapshots";
