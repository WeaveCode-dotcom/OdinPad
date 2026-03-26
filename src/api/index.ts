/**
 * API layer: thin, typed wrappers around Supabase (and Edge) calls.
 * Prefer adding new data access here instead of scattering `supabase.from` across UI.
 *
 * Existing modules (e.g. `src/lib/novel-store.ts`, `src/lib/idea-web/service.ts`) can be migrated incrementally.
 */
export { supabase } from "@/integrations/supabase/client";

// Domain API modules — use these for new DB access instead of calling supabase.from() directly.
export * from "./novels";
export * from "./idea-web";
export * from "./series";
export * from "./stats";
export * from "./writing-sessions";

// Zod validation schemas for API boundary
export * from "./schemas";
