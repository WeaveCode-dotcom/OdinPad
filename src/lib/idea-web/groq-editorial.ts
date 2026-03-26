import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { assertAiEditorialEnabled } from "@/lib/remote-feature-flags";
import { getUserAccessTokenForEdgeFunctions } from "@/lib/supabase-user-access-token";
import { sanitizeUserFacingPlainText } from "@/lib/sanitize-html";
import type { IdeaWebEntry } from "@/types/idea-web";

export type EditorialTask =
  | "what_if"
  | "combine"
  | "expand"
  | "character_sparring"
  | "map_editorial"
  | "continuity_scan";

export type EditorialIdea = { title: string; body: string };

/**
 * Reads JSON/text body from a failed Edge Function response so the UI shows
 * `{ "error": "..." }` instead of a generic "non-2xx" message.
 */
async function messageFromFunctionsError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const j = (await response.json()) as {
          error?: string;
          message?: string;
          msg?: string;
        };
        if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
        if (typeof j.msg === "string" && j.msg.trim()) return j.msg.trim();
        if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
      } else {
        const t = await response.text();
        if (t?.trim()) return t.trim().slice(0, 500);
      }
    } catch {
      /* ignore parse errors */
    }
    if (response.status === 401) {
      return (
        "Invalid or expired session. Sign out and sign in again. " +
        "If you changed VITE_SUPABASE_URL, clear site data so your token matches this project."
      );
    }
    return `Edge Function failed (${response.status}). Deploy \`idea-web-groq\`, set secret GROQ_API_KEY, and redeploy.`;
  }

  if (error instanceof FunctionsFetchError) {
    return (
      "Could not reach the Edge Function (network). Deploy: npx supabase functions deploy idea-web-groq. " +
      "Confirm VITE_SUPABASE_URL matches your Supabase project and you are online."
    );
  }

  if (error instanceof FunctionsRelayError) {
    return "Supabase could not reach your Edge Function. Confirm it is deployed and try again.";
  }

  if (error instanceof Error) return error.message;
  return "Unknown error calling editorial assistant";
}

/** True if this looks like a logged-in user JWT (not the anon key fallback). */
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

/**
 * Calls Supabase Edge Function `idea-web-groq` (Groq chat, editorial prompts only).
 * Refreshes the session first so fetchWithAuth never falls back to sending the anon key as Bearer
 * (which the Edge gateway rejects as "Invalid JWT").
 */
export type CharacterSparringPayload = {
  name: string;
  description: string;
  notes: string;
  userMessage: string;
};

export type MapEditorialPayload = {
  nodesSummary: string;
};

export type ContinuityScanPayload = {
  codex: { name: string; type: string; description: string }[];
  scenes: { id: string; title: string; summary: string; characters: string[] }[];
};

/** Per-idea metadata sent to the Edge function for tailored editorial prompts. */
export type IdeaWebGroqContext = {
  status: string;
  ideaType: string;
  category: string | null;
  tags: string[];
  mood: string | null;
  sourceType: string;
  novelTitle?: string | null;
};

export function buildIdeaWebGroqContexts(
  entries: IdeaWebEntry[],
  novels: { id: string; title: string }[],
): IdeaWebGroqContext[] {
  return entries.map((e) => ({
    status: e.status,
    ideaType: e.ideaType,
    category: e.category,
    tags: e.tags,
    mood: e.mood,
    sourceType: typeof e.sourceType === "string" ? e.sourceType : "original",
    novelTitle: e.novelId ? (novels.find((n) => n.id === e.novelId)?.title ?? null) : null,
  }));
}

async function readGroqSseStream(body: ReadableStream<Uint8Array>, onDelta?: (chunk: string) => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta?.(delta);
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }
  return full;
}

export async function streamIdeaWebGroq(
  task: "what_if" | "combine" | "expand",
  ideas: EditorialIdea[],
  options: {
    contextPerIdea?: IdeaWebGroqContext[];
    onDelta?: (chunk: string) => void;
  } = {},
): Promise<string> {
  await assertAiEditorialEnabled();
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  let token: string;
  try {
    token = await getUserAccessTokenForEdgeFunctions();
  } catch {
    throw new Error(
      "Sign in to use editorial prompts. If the problem persists, sign out, clear site data for this origin, and sign in again.",
    );
  }
  if (!isLikelyUserAccessToken(token, anonKey)) {
    throw new Error(
      "Sign in to use editorial prompts. If the problem persists, sign out, clear site data for this origin, and sign in again.",
    );
  }

  const body = JSON.stringify({
    task,
    ideas,
    stream: true,
    contextPerIdea: options.contextPerIdea,
  });

  let res = await fetch(`${supabaseUrl}/functions/v1/idea-web-groq`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body,
  });

  if (res.status === 429 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await fetch(`${supabaseUrl}/functions/v1/idea-web-groq`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body,
    });
  }

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.slice(0, 500) || `Stream failed (${res.status})`);
  }
  if (!res.body) {
    throw new Error("Empty stream body");
  }
  const raw = await readGroqSseStream(res.body, options.onDelta);
  return sanitizeUserFacingPlainText(raw);
}

export async function invokeIdeaWebGroq(
  task: EditorialTask,
  ideas: EditorialIdea[],
  extra?: {
    character?: CharacterSparringPayload;
    map?: MapEditorialPayload;
    continuity?: ContinuityScanPayload;
    contextPerIdea?: IdeaWebGroqContext[];
  },
): Promise<{ text: string }> {
  await assertAiEditorialEnabled();
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  let token: string;
  try {
    token = await getUserAccessTokenForEdgeFunctions();
  } catch {
    throw new Error(
      "Sign in to use editorial prompts. If the problem persists, sign out, clear site data for this origin, and sign in again.",
    );
  }
  if (!isLikelyUserAccessToken(token, anonKey)) {
    throw new Error(
      "Sign in to use editorial prompts. If the problem persists, sign out, clear site data for this origin, and sign in again.",
    );
  }

  const ideaBody =
    extra?.contextPerIdea && extra.contextPerIdea.length > 0
      ? { task, ideas, contextPerIdea: extra.contextPerIdea }
      : { task, ideas };

  const invokeBody =
    task === "character_sparring" && extra?.character
      ? { task, character: extra.character }
      : task === "map_editorial" && extra?.map
        ? { task, map: extra.map }
        : task === "continuity_scan" && extra?.continuity
          ? { task, continuity: extra.continuity }
          : ideaBody;

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase.functions.invoke<{
      text?: string;
      error?: string;
      retry_after_ms?: number;
    }>("idea-web-groq", {
      body: invokeBody,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      const msg = await messageFromFunctionsError(error);
      if (attempt < maxAttempts - 1 && (/429|rate limit|too many requests/i.test(msg) || msg.includes("429"))) {
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

    const text = data?.text;
    if (!text) {
      throw new Error("Empty response from editorial assistant");
    }

    return { text: sanitizeUserFacingPlainText(text) };
  }

  throw new Error("Editorial assistant unavailable after retries");
}
