/**
 * Client-side helpers for the edit-groq Supabase Edge Function.
 *
 * Three tasks:
 *   scene_brief      — Developmental pass: AI analyses scene purpose vs. metadata.
 *   line_scan        — Line pass: batch-scan for weak words, passive voice, clichés, etc.
 *   selection_action — Line pass: targeted action on a text selection.
 */
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { assertAiEditorialEnabled } from "@/lib/remote-feature-flags";
import { sanitizeUserFacingPlainText } from "@/lib/sanitize-html";
import { getUserAccessTokenForEdgeFunctions } from "@/lib/supabase-user-access-token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditSelectionAction = "tighten" | "heighten" | "dialogue" | "fewer-words";

export interface SceneBriefPayload {
  sceneTitle: string;
  sceneContent: string;
  sceneSummary: string;
  actTitle: string;
  chapterTitle: string;
  genre?: string;
  audience?: string;
  codexSummary?: string;
}

export interface SceneBriefResult {
  brief: string;
  gap: string | null;
  prompts: string[];
}

export interface LineScanFlag {
  type: "weak-word" | "passive-voice" | "cliche" | "show-dont-tell" | "tense-slip" | "pov-slip" | "rhythm";
  span: string;
  suggestion: string;
  rationale: string;
}

export interface LineScanResult {
  flags: LineScanFlag[];
}

export interface SelectionActionPayload {
  action: EditSelectionAction;
  selectedText: string;
  surroundingContext: string;
  genre?: string;
  audience?: string;
}

export interface SelectionActionResult {
  original: string;
  suggestion: string;
  rationale: string;
}

// ---------------------------------------------------------------------------
// Error helpers (matches idea-web-groq pattern)
// ---------------------------------------------------------------------------

async function messageFromFunctionsError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const j = (await response.json()) as { error?: string; message?: string };
        if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
        if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
      } else {
        const t = await response.text();
        if (t?.trim()) return t.trim().slice(0, 500);
      }
    } catch {
      /* ignore */
    }
    if (response.status === 401) {
      return "Invalid or expired session. Sign out and sign in again.";
    }
    return `Edge Function failed (${response.status}). Deploy \`edit-groq\`, set secret GROQ_API_KEY, and redeploy.`;
  }
  if (error instanceof FunctionsFetchError) {
    return "Could not reach the Edge Function (network). Deploy: npx supabase functions deploy edit-groq.";
  }
  if (error instanceof FunctionsRelayError) {
    return "Supabase could not reach the Edge Function. Confirm it is deployed and try again.";
  }
  if (error instanceof Error) return error.message;
  return "Unknown error calling edit assistant";
}

function isLikelyUserAccessToken(token: string, anonKey: string): boolean {
  if (!token || token === anonKey) return false;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      role?: string;
      sub?: string;
    };
    if (payload.role === "anon" || payload.role === "service_role") return false;
    return Boolean(payload.sub);
  } catch {
    return token.length > 100 && token !== anonKey;
  }
}

async function getToken(): Promise<string> {
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  let token: string;
  try {
    token = await getUserAccessTokenForEdgeFunctions();
  } catch {
    throw new Error("Sign in to use edit assistant.");
  }
  if (!isLikelyUserAccessToken(token, anonKey)) {
    throw new Error("Sign in to use edit assistant.");
  }
  return token;
}

// ---------------------------------------------------------------------------
// Core invoke helper with retry on 429
// ---------------------------------------------------------------------------

async function invokeEditGroq<T>(bodyPayload: Record<string, unknown>): Promise<T> {
  await assertAiEditorialEnabled();
  const token = await getToken();

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase.functions.invoke<{
      result?: T;
      error?: string;
      retry_after_ms?: number;
    }>("edit-groq", {
      body: bodyPayload,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      const msg = await messageFromFunctionsError(error);
      if (attempt < maxAttempts - 1 && /429|rate limit|too many requests/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw new Error(msg);
    }

    if (data && typeof data === "object" && "error" in data && data.error) {
      const errStr = String(data.error);
      if (attempt < maxAttempts - 1 && /rate|429|too many/i.test(errStr)) {
        const wait =
          typeof data.retry_after_ms === "number" ? Math.min(data.retry_after_ms, 30_000) : 1500 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(errStr);
    }

    if (!data?.result) throw new Error("Empty response from edit assistant");
    return data.result;
  }

  throw new Error("Edit assistant unavailable after retries");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Developmental pass: analyse a scene's purpose, return revision prompts. */
export async function invokeSceneBrief(payload: SceneBriefPayload): Promise<SceneBriefResult> {
  const result = await invokeEditGroq<SceneBriefResult>({
    task: "scene_brief",
    scene_brief: payload,
  });
  return {
    brief: sanitizeUserFacingPlainText(result.brief ?? ""),
    gap: result.gap ? sanitizeUserFacingPlainText(result.gap) : null,
    prompts: (result.prompts ?? []).map((p) => sanitizeUserFacingPlainText(p)),
  };
}

/** Line pass: batch-scan a scene for prose issues. */
export async function invokeLineScan(payload: {
  sceneTitle: string;
  sceneContent: string;
  genre?: string;
  defaultPov?: string;
  defaultTense?: string;
}): Promise<LineScanResult> {
  const result = await invokeEditGroq<LineScanResult>({
    task: "line_scan",
    line_scan: payload,
  });
  return {
    flags: (result.flags ?? []).map((f) => ({
      type: f.type,
      span: sanitizeUserFacingPlainText(f.span ?? ""),
      suggestion: sanitizeUserFacingPlainText(f.suggestion ?? ""),
      rationale: sanitizeUserFacingPlainText(f.rationale ?? ""),
    })),
  };
}

/** Line pass: targeted action on selected text (tighten, heighten, dialogue, fewer-words). */
export async function invokeSelectionAction(payload: SelectionActionPayload): Promise<SelectionActionResult> {
  const result = await invokeEditGroq<SelectionActionResult>({
    task: "selection_action",
    selection_action: payload,
  });
  return {
    original: sanitizeUserFacingPlainText(result.original ?? payload.selectedText),
    suggestion: sanitizeUserFacingPlainText(result.suggestion ?? ""),
    rationale: sanitizeUserFacingPlainText(result.rationale ?? ""),
  };
}
