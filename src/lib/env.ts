/**
 * Validates public Supabase env vars before the app imports the Supabase client.
 * Keep this separate from `integrations/supabase/client.ts` so codegen can overwrite that file safely.
 */

export type EnvIssue = { key: string; message: string };

function trim(s: string | undefined): string {
  return typeof s === "string" ? s.trim() : "";
}

function validateSupabaseUrl(url: string): string | null {
  if (!url) return "Missing value";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "Must start with https:// (or http:// for local dev)";
    if (!u.hostname) return "Invalid hostname";
    return null;
  } catch {
    return "Not a valid URL";
  }
}

export function getEnvIssues(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const url = trim(import.meta.env.VITE_SUPABASE_URL);
  const key = trim(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  const urlErr = validateSupabaseUrl(url);
  if (urlErr) issues.push({ key: "VITE_SUPABASE_URL", message: urlErr });

  if (!key) {
    issues.push({ key: "VITE_SUPABASE_PUBLISHABLE_KEY", message: "Missing value" });
  } else if (key.length < 20) {
    issues.push({ key: "VITE_SUPABASE_PUBLISHABLE_KEY", message: "Value looks too short" });
  }

  return issues;
}

export function isSupabaseConfigured(): boolean {
  return getEnvIssues().length === 0;
}

export function getPublicEnvSummary(): { supabaseUrl: string } {
  return { supabaseUrl: trim(import.meta.env.VITE_SUPABASE_URL) };
}
