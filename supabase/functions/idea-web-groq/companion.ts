/**
 * AI companion modes (daily seed prompt, enrichment, stretches, digest, streak nudge).
 * Generative "stretch" modes use a different contract than editorial question-only tasks.
 */
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type CompanionMode =
  | "daily_prompt"
  | "enrich_entry"
  | "stretch_idea"
  | "weekly_digest"
  | "streak_nudge"
  | "spark_sort_ideas";

const FALLBACK_PROMPT = "What's one image, scene, or feeling in your head today?";

const VALID_STATUSES = new Set(["seed", "sprouting", "growing", "dormant"]);

type Cors = Record<string, string>;

type AiCompanionPrefs = {
  daily_prompt_enabled: boolean;
  auto_enrich_enabled: boolean;
  use_context_enabled: boolean;
  stretch_variants_enabled: boolean;
};

function parseAiCompanion(raw: unknown): AiCompanionPrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    daily_prompt_enabled: o.daily_prompt_enabled !== false,
    auto_enrich_enabled: o.auto_enrich_enabled !== false,
    use_context_enabled: o.use_context_enabled !== false,
    stretch_variants_enabled: o.stretch_variants_enabled !== false,
  };
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function groqChat(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  jsonObject?: boolean;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    max_tokens: params.maxTokens,
    temperature: params.temperature,
  };
  if (params.jsonObject) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 400);
    try {
      const j = JSON.parse(errText) as { error?: { message?: string } };
      if (j?.error?.message) detail = j.error.message;
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, detail };
  }
  const groqJson = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = groqJson.choices?.[0]?.message?.content?.trim() ?? "";
  return { ok: true, text };
}

function clip(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n) + "…";
}

async function loadPrefs(supabase: SupabaseClient, userId: string): Promise<AiCompanionPrefs> {
  const { data } = await supabase.from("user_preferences").select("ai_companion").eq("user_id", userId).maybeSingle();
  return parseAiCompanion(data?.ai_companion);
}

type NovelRow = { id: string; title: string; data: Record<string, unknown> | null };

/** Taste-level signals only — no story beats, titles, or bodies — for standalone daily sparks. */
async function gatherWriterContextForDailyPrompt(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: novels } = await supabase
    .from("novels")
    .select("id, title, data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const novelLines =
    (novels as NovelRow[] | null)?.map((n) => {
      const d = (n.data ?? {}) as Record<string, unknown>;
      const genre = typeof d.genre === "string" ? d.genre : "";
      const title = n.title || "Untitled";
      return genre ? `${title} (${genre})` : title;
    }) ?? [];

  const { data: rows } = await supabase
    .from("idea_web_entries")
    .select("category, idea_type, tags")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("status", ["seed", "sprouting", "growing", "dormant"])
    .order("updated_at", { ascending: false })
    .limit(60);

  const tagCounts = new Map<string, number>();
  const catCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  for (const r of rows ?? []) {
    const row = r as { category?: string | null; idea_type?: string | null; tags?: unknown };
    const c = String(row.category ?? "").trim();
    if (c) catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
    const it = String(row.idea_type ?? "").trim();
    if (it) typeCounts.set(it, (typeCounts.get(it) ?? 0) + 1);
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    for (const t of tags) {
      const x = String(t).trim().toLowerCase();
      if (x.length > 1) tagCounts.set(x, (tagCounts.get(x) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([t]) => t);
  const topCats = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);
  const topTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c]) => c);

  return [
    "INFERENCE CONTEXT (tastes and patterns only — not specific ideas to continue):",
    novelLines.length
      ? `Books on your shelf (title + genre only): ${novelLines.join("; ")}`
      : "Books on your shelf: none yet.",
    topTags.length
      ? `Recurring tags across your Idea Web (aggregated): ${topTags.join(", ")}`
      : "Idea Web tags: none yet.",
    topCats.length ? `Categories you use often: ${topCats.join(", ")}` : "Categories: none yet.",
    topTypes.length ? `Idea types you use: ${topTypes.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function handleCompanionRequest(
  supabase: SupabaseClient,
  user: User,
  corsHeaders: Cors,
  body: Record<string, unknown>,
): Promise<Response> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server missing GROQ_API_KEY" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const model = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
  const mode = body.mode as CompanionMode;
  const prefs = await loadPrefs(supabase, user.id);

  switch (mode) {
    case "daily_prompt":
      return dailyPrompt(supabase, user, corsHeaders, apiKey, model, body, prefs);
    case "enrich_entry":
      return enrichEntry(supabase, user, corsHeaders, apiKey, model, body, prefs);
    case "stretch_idea":
      return stretchIdea(corsHeaders, apiKey, model, body, prefs);
    case "weekly_digest":
      return weeklyDigest(supabase, user, corsHeaders, apiKey, model, body, prefs);
    case "streak_nudge":
      return streakNudge(corsHeaders, apiKey, model, body, prefs);
    case "spark_sort_ideas":
      return sparkSortIdeas(corsHeaders, apiKey, model, body);
    default:
      return new Response(JSON.stringify({ error: "Unknown companion mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function dailyPrompt(
  supabase: SupabaseClient,
  user: User,
  corsHeaders: Cors,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  prefs: AiCompanionPrefs,
): Promise<Response> {
  const promptDate =
    typeof body.promptDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.promptDate)
      ? body.promptDate
      : isoDateOnly(new Date());

  if (!prefs.daily_prompt_enabled) {
    return new Response(JSON.stringify({ prompt: FALLBACK_PROMPT, anchors_used: [], cached: false, disabled: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existing } = await supabase
    .from("daily_seed_prompts")
    .select("prompt, anchors_used")
    .eq("user_id", user.id)
    .eq("prompt_date", promptDate)
    .maybeSingle();

  if (existing?.prompt) {
    return new Response(
      JSON.stringify({
        prompt: existing.prompt,
        anchors_used: existing.anchors_used ?? [],
        cached: true,
        promptDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const useContext = prefs.use_context_enabled;
  if (!useContext) {
    await supabase.from("daily_seed_prompts").upsert(
      {
        user_id: user.id,
        prompt_date: promptDate,
        prompt: FALLBACK_PROMPT,
        anchors_used: [],
        context_snapshot: { skipped: "use_context_disabled" },
      },
      { onConflict: "user_id,prompt_date" },
    );
    return new Response(
      JSON.stringify({
        prompt: FALLBACK_PROMPT,
        anchors_used: [],
        cached: false,
        fallback: true,
        promptDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const contextPack = await gatherWriterContextForDailyPrompt(supabase, user.id);
  const streakHint =
    typeof body.writingStreakDays === "number" && body.writingStreakDays >= 0
      ? `Writing streak (words logged): ${body.writingStreakDays} day(s).`
      : "";

  const system =
    "You are a creative writing coach. Output ONLY valid JSON, no markdown fences. " +
    'Schema: {"prompt":"string","anchors_used":["string"]}. ' +
    "CONTEXT is only taste signals: genres, recurring tags, category/idea-type labels. It does NOT list story premises to extend. " +
    "prompt = EXACTLY ONE short question (max 22 words) that sparks a NEW image, moment, or feeling the writer has not necessarily written yet. " +
    "Use CONTEXT to match tone, genre interests, and thematic leanings — NOT to continue, resolve, or build on any specific existing idea or book plot. " +
    "Do NOT name or allude to particular idea titles, character names, or plot beats from the user's vault. " +
    "Do NOT ask the user to extend yesterday's seed or an existing manuscript scene. " +
    "Warm, specific, surprising — never generic like 'What will you write today?'. " +
    "anchors_used = 1-4 short strings naming inferred interests (e.g. 'coastal dread', 'family guilt', 'YA voice') — not book titles or idea names.";

  const userMsg = `Calendar date: ${promptDate}.\n${streakHint}\n\n${clip(contextPack, 8000)}`;

  let parsed: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 3 && !parsed; attempt++) {
    const res = await groqChat({
      apiKey,
      model,
      system: attempt > 0 ? system + " Retry: vary the angle." : system,
      user: userMsg,
      maxTokens: 350,
      temperature: attempt === 0 ? 0.55 : 0.75,
      jsonObject: true,
    });
    if (!res.ok) {
      if (res.status === 429) {
        return new Response(
          JSON.stringify({ error: "Model rate limit reached. Try again shortly.", retry_after_ms: 20_000 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: res.detail }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    parsed = extractJsonObject(res.text);
    if (parsed && typeof parsed.prompt === "string" && parsed.prompt.trim()) break;
    parsed = null;
  }

  const promptText = typeof parsed?.prompt === "string" ? parsed.prompt.trim().slice(0, 500) : "";
  const anchorsRaw = parsed?.anchors_used;
  const anchors_used = Array.isArray(anchorsRaw)
    ? anchorsRaw
        .map((a) => String(a).trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const finalPrompt = promptText || FALLBACK_PROMPT;

  const { error: insErr } = await supabase.from("daily_seed_prompts").upsert(
    {
      user_id: user.id,
      prompt_date: promptDate,
      prompt: finalPrompt,
      anchors_used,
      context_snapshot: { taste_inference: true, preview: clip(contextPack, 800) },
    },
    { onConflict: "user_id,prompt_date" },
  );

  if (insErr) {
    console.error("daily_seed_prompts upsert", insErr.message);
  }

  return new Response(
    JSON.stringify({
      prompt: finalPrompt,
      anchors_used,
      cached: false,
      promptDate,
      modelFallback: !promptText,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function enrichEntry(
  supabase: SupabaseClient,
  user: User,
  corsHeaders: Cors,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  prefs: AiCompanionPrefs,
): Promise<Response> {
  if (!prefs.auto_enrich_enabled) {
    return new Response(JSON.stringify({ enriched: false, reason: "disabled" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const entryId = typeof body.entryId === "string" ? body.entryId : "";
  if (!entryId) {
    return new Response(JSON.stringify({ error: "Missing entryId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: entry, error: fetchErr } = await supabase
    .from("idea_web_entries")
    .select("id, title, body, metadata")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !entry) {
    return new Response(JSON.stringify({ error: "Entry not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = `${String(entry.title ?? "")}\n${String(entry.body ?? "")}`.trim();
  if (!text) {
    return new Response(JSON.stringify({ error: "Empty entry" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const system =
    "Analyze the creative note. Output ONLY valid JSON. " +
    'Schema: {"tags":["string"],"suggested_status":"seed|sprouting|growing|dormant","one_line_summary":"string"}. ' +
    "tags: 3-6 short lowercase tokens (mood, theme, setting). " +
    "one_line_summary: max 14 words.";

  const res = await groqChat({
    apiKey,
    model,
    system,
    user: clip(text, 8000),
    maxTokens: 300,
    temperature: 0.45,
    jsonObject: true,
  });

  if (!res.ok) {
    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Model rate limit reached.", retry_after_ms: 20_000 }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: res.detail }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = extractJsonObject(res.text);
  const tagsRaw = parsed?.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw
        .map((t) => String(t).trim().toLowerCase().slice(0, 40))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  let suggested_status = typeof parsed?.suggested_status === "string" ? parsed.suggested_status.trim() : "";
  if (!VALID_STATUSES.has(suggested_status)) suggested_status = "";

  const one_line_summary = typeof parsed?.one_line_summary === "string" ? clip(parsed.one_line_summary, 200) : "";

  const prevMeta =
    entry.metadata && typeof entry.metadata === "object" ? (entry.metadata as Record<string, unknown>) : {};
  const prevAi = prevMeta.ai && typeof prevMeta.ai === "object" ? (prevMeta.ai as Record<string, unknown>) : {};

  const ai = {
    ...prevAi,
    tags,
    suggested_status: suggested_status || undefined,
    one_line_summary: one_line_summary || undefined,
    enriched_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("idea_web_entries")
    .update({
      metadata: { ...prevMeta, ai },
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      enriched: true,
      tags,
      suggested_status: suggested_status || null,
      one_line_summary: one_line_summary || null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function stretchIdea(
  corsHeaders: Cors,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  prefs: AiCompanionPrefs,
): Promise<Response> {
  if (!prefs.stretch_variants_enabled) {
    return new Response(JSON.stringify({ stretched: false, reason: "disabled" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stretchType = typeof body.stretchType === "string" ? body.stretchType : "";
  const entryContent = typeof body.entryContent === "string" ? body.entryContent : "";
  if (!entryContent.trim() || !["paragraph", "whatifs", "opposite"].includes(stretchType)) {
    return new Response(JSON.stringify({ error: "Missing entryContent or invalid stretchType" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let system = "";
  let jsonObject = false;
  if (stretchType === "paragraph") {
    system =
      "Expand the snippet into a vivid paragraph (60-110 words). Same emotional register. Output plain text only, no title.";
  } else if (stretchType === "whatifs") {
    jsonObject = true;
    system =
      'Output ONLY JSON: {"whatifs":["q1","q2","q3"]} — three specific "what if" questions that extend the idea.';
  } else {
    system = "Write the opposite emotional or situational take (35-70 words). Plain text only.";
  }

  const res = await groqChat({
    apiKey,
    model,
    system,
    user: clip(entryContent, 6000),
    maxTokens: stretchType === "whatifs" ? 350 : 450,
    temperature: 0.78,
    jsonObject,
  });

  if (!res.ok) {
    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Model rate limit reached.", retry_after_ms: 20_000 }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: res.detail }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (stretchType === "whatifs") {
    const parsed = extractJsonObject(res.text);
    const w = parsed?.whatifs;
    const whatifs = Array.isArray(w)
      ? w
          .map((x) => String(x).trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    return new Response(JSON.stringify({ stretchType, whatifs }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ stretchType, text: res.text.trim() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function weeklyDigest(
  supabase: SupabaseClient,
  user: User,
  corsHeaders: Cors,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  prefs: AiCompanionPrefs,
): Promise<Response> {
  if (!prefs.daily_prompt_enabled) {
    return new Response(JSON.stringify({ summary: "", skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const weekStart =
    typeof body.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart)
      ? body.weekStart
      : new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("weekly_digests")
    .select("summary, best_seed_id, best_seed_reason")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existing?.summary) {
    return new Response(
      JSON.stringify({
        summary: existing.summary,
        best_seed_id: existing.best_seed_id,
        best_seed_reason: existing.best_seed_reason,
        cached: true,
        weekStart,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let fromIso: string;
  let toIso: string;
  if (
    typeof body.weekFrom === "string" &&
    typeof body.weekTo === "string" &&
    body.weekFrom.length > 10 &&
    body.weekTo.length > 10
  ) {
    fromIso = body.weekFrom;
    toIso = body.weekTo;
  } else {
    const startIso = `${weekStart}T00:00:00.000Z`;
    const end = new Date(startIso);
    end.setUTCDate(end.getUTCDate() + 7);
    fromIso = startIso;
    toIso = end.toISOString();
  }

  const { data: entries } = await supabase
    .from("idea_web_entries")
    .select("id, title, body, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!entries?.length) {
    return new Response(
      JSON.stringify({
        summary: "No Idea Web captures this week — plant a seed when inspiration strikes.",
        has_entries: false,
        weekStart,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const lines = entries.map((e: { id: string; title?: string; body?: string }, i: number) => {
    const t = String(e.title ?? "").trim() || "Untitled";
    const b = clip(String(e.body ?? ""), 220);
    return `${i + 1}. [${e.id}] ${t}: ${b}`;
  });

  const system =
    "Summarize the writer's week of idea captures. Output ONLY JSON. " +
    'Schema: {"summary":"string","best_index":number,"best_seed_reason":"string"}. ' +
    "summary = one encouraging paragraph, max 90 words. " +
    "best_index = 1-based index of the entry with strongest scene or story potential. " +
    "best_seed_reason = one short sentence (max 22 words).";

  const res = await groqChat({
    apiKey,
    model,
    system,
    user: lines.join("\n\n"),
    maxTokens: 450,
    temperature: 0.55,
    jsonObject: true,
  });

  if (!res.ok) {
    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Model rate limit reached.", retry_after_ms: 20_000 }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: res.detail }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = extractJsonObject(res.text);
  const summary = typeof parsed?.summary === "string" ? parsed.summary.trim().slice(0, 1200) : "";
  const bestIdx = typeof parsed?.best_index === "number" ? Math.floor(parsed.best_index) : 1;
  const best_seed_reason = typeof parsed?.best_seed_reason === "string" ? clip(parsed.best_seed_reason, 300) : "";
  const best = entries[Math.max(0, Math.min(entries.length - 1, bestIdx - 1))] as { id: string };
  const bestId = best?.id ?? (entries[0] as { id: string }).id;

  const { error: insErr } = await supabase.from("weekly_digests").insert({
    user_id: user.id,
    week_start: weekStart,
    summary: summary || "A week of ideas — keep feeding the ones that spark.",
    best_seed_id: bestId,
    best_seed_reason: best_seed_reason || null,
  });

  if (insErr) {
    console.error("weekly_digests insert", insErr.message);
  }

  return new Response(
    JSON.stringify({
      summary: summary || "A week of ideas — keep feeding the ones that spark.",
      best_seed_id: bestId,
      best_seed_reason,
      cached: false,
      weekStart,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

const SPARK_SORT_LANES = new Set(["theme", "character", "plot", "world", "misc"]);

async function sparkSortIdeas(
  corsHeaders: Cors,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const raw = body.ideas;
  if (!Array.isArray(raw) || raw.length === 0) {
    return new Response(JSON.stringify({ assignments: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const items = raw.slice(0, 20).map((x, i) => {
    const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    const id = typeof o.id === "string" ? o.id : `idx-${i}`;
    const title = typeof o.title === "string" ? o.title : "";
    const bodyText = typeof o.body === "string" ? o.body : "";
    return { id, title, body: bodyText };
  });

  const lines = items.map((e, i) => {
    const t = String(e.title ?? "").trim() || "Untitled";
    const b = clip(String(e.body ?? ""), 220);
    return `${i + 1}. [${e.id}] ${t}: ${b}`;
  });

  const system =
    "You classify creative writing ideas into exactly one lane each. Output ONLY JSON, no markdown. " +
    'Schema: {"assignments":[{"id":"string","lane":"theme|character|plot|world|misc"}]}. ' +
    "theme = theme, motif, moral question, metaphor. " +
    "character = character, voice, relationship, role. " +
    "plot = plot, structure, tension, scene, twist. " +
    "world = setting, geography, culture, lore, rules. " +
    "misc = anything that does not fit cleanly (fragment, mood, craft note, etc.). " +
    "Include every id from the list exactly once. Use ids exactly as given.";

  const res = await groqChat({
    apiKey,
    model,
    system,
    user: lines.join("\n\n"),
    maxTokens: 900,
    temperature: 0.25,
    jsonObject: true,
  });

  if (!res.ok) {
    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Model rate limit reached.", retry_after_ms: 20_000 }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: res.detail }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = extractJsonObject(res.text);
  const arr = Array.isArray(parsed?.assignments) ? parsed.assignments : [];
  const byId = new Map<string, string>();
  for (const a of arr) {
    if (!a || typeof a !== "object") continue;
    const rec = a as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    let lane = typeof rec.lane === "string" ? rec.lane.toLowerCase().trim() : "";
    if (!SPARK_SORT_LANES.has(lane)) lane = "misc";
    if (id) byId.set(id, lane);
  }

  const assignments = items.map((e) => ({
    id: e.id,
    lane: byId.get(e.id) ?? "misc",
  }));

  return new Response(JSON.stringify({ assignments }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function streakNudge(
  corsHeaders: Cors,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  prefs: AiCompanionPrefs,
): Promise<Response> {
  if (!prefs.daily_prompt_enabled) {
    return new Response(JSON.stringify({ nudge: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const streakCount = typeof body.streakCount === "number" ? body.streakCount : 0;
  if (streakCount < 1) {
    return new Response(JSON.stringify({ nudge: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const system =
    `The writer has a ${streakCount}-day streak of meeting their word goal. ` +
    "Reply with ONE short encouraging sentence (max 28 words), warm, about showing up — no guilt. Plain text only.";

  const res = await groqChat({
    apiKey,
    model,
    system,
    user: "Generate the sentence.",
    maxTokens: 120,
    temperature: 0.85,
    jsonObject: false,
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ nudge: null, error: res.detail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ nudge: clip(res.text, 280) }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
