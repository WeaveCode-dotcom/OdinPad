import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { featureFlags } from "@/lib/feature-flags";

const CACHE_MS = 3 * 60 * 1000;
let cache: { at: number; map: Map<string, boolean> } | null = null;

function jsonToEnabled(v: Json): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "enabled" in v &&
    typeof (v as { enabled?: unknown }).enabled === "boolean"
  ) {
    return (v as { enabled: boolean }).enabled;
  }
  return true;
}

async function loadRemoteMap(): Promise<Map<string, boolean>> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.map;
  }
  const { data, error } = await supabase.from("app_remote_config").select("key, value");
  if (error || !data) {
    cache = { at: Date.now(), map: new Map() };
    return cache.map;
  }
  const map = new Map<string, boolean>();
  for (const row of data) {
    map.set(row.key, jsonToEnabled(row.value));
  }
  cache = { at: Date.now(), map };
  return map;
}

/** Remote kill-switch for Groq-backed editorial flows (Idea Web, Sandbox). */
export async function assertAiEditorialEnabled(): Promise<void> {
  if (!featureFlags.aiEditorial) {
    throw new Error("AI editorial features are disabled in this environment.");
  }
  const map = await loadRemoteMap();
  if (map.get("ai_groq_editorial") === false) {
    throw new Error("AI editorial features are temporarily disabled.");
  }
}

export function clearRemoteFeatureFlagCache(): void {
  cache = null;
}

/**
 * When false (or remote `richer_book_creation` is false), product code may hide multi-step creation.
 * Defaults to true if the remote key is absent.
 */
export async function isRicherBookCreationEnabled(): Promise<boolean> {
  if (!featureFlags.richerBookCreation) return false;
  const map = await loadRemoteMap();
  if (map.has("richer_book_creation")) return map.get("richer_book_creation") !== false;
  return true;
}

/** Remote kill-switch for dashboard daily quote Edge Function. */
export async function assertDailyQuoteAiEnabled(): Promise<void> {
  if (!featureFlags.aiEditorial) {
    throw new Error("Daily quote (AI) is disabled in this environment.");
  }
  const map = await loadRemoteMap();
  if (map.get("ai_daily_quote_groq") === false) {
    throw new Error("Daily quote (AI) is temporarily disabled.");
  }
}
