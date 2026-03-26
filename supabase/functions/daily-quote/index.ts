/**
 * Generates one inspirational line per user per day via Groq (original voice, not verbatim quotes).
 * Secrets: GROQ_API_KEY, GROQ_MODEL (optional)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Restrict CORS to the configured frontend origin; fall back to * only in local dev.
const frontendOrigin = Deno.env.get("FRONTEND_URL") ?? "*";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": frontendOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type QuoteJson = {
  quote: string;
  character: string;
  work: string;
  genre?: string;
};

function extractJsonObject(raw: string): QuoteJson | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as QuoteJson;
    if (
      typeof parsed.quote === "string" &&
      typeof parsed.character === "string" &&
      typeof parsed.work === "string" &&
      parsed.quote.trim().length > 0
    ) {
      return {
        quote: parsed.quote.trim().slice(0, 500),
        character: parsed.character.trim().slice(0, 200),
        work: parsed.work.trim().slice(0, 200),
        genre: typeof parsed.genre === "string" ? parsed.genre.slice(0, 80) : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

// Per-process burst limiter: max 5 quote requests per user per 60-second window.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isRateLimited(user.id)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  const { data: dqFlagRow, error: dqFlagErr } = await supabase
    .from("app_remote_config")
    .select("value")
    .eq("key", "ai_daily_quote_groq")
    .maybeSingle();
  if (dqFlagErr) {
    console.error("app_remote_config read", dqFlagErr.message);
  } else if (dqFlagRow?.value === false) {
    return new Response(JSON.stringify({ error: "Daily quote AI is disabled." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { quoteDate?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const quoteDate =
    body.quoteDate && /^\d{4}-\d{2}-\d{2}$/.test(body.quoteDate)
      ? body.quoteDate
      : new Date().toISOString().slice(0, 10);

  const { data: existing, error: selErr } = await supabase
    .from("user_daily_quotes")
    .select("quote_text, character_name, work_title, quote_date")
    .eq("user_id", user.id)
    .eq("quote_date", quoteDate)
    .maybeSingle();

  if (selErr) {
    console.error("daily-quote select", selErr.code ?? selErr.message);
    return new Response(JSON.stringify({ error: selErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existing) {
    return new Response(
      JSON.stringify({
        quote: existing.quote_text,
        character: existing.character_name,
        work: existing.work_title,
        quoteDate: existing.quote_date,
        cached: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: prints, error: fpErr } = await supabase
    .from("user_quote_fingerprints")
    .select("fingerprint")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(120);

  if (fpErr) {
    console.error("daily-quote fingerprints", fpErr.code ?? fpErr.message);
    return new Response(JSON.stringify({ error: fpErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const forbidden = (prints ?? []).map((p) => p.fingerprint).filter(Boolean);

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server missing GROQ_API_KEY" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const model = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

  const system =
    "You help writers stay inspired. Output ONLY valid JSON, no markdown, no prose outside JSON. " +
    'Schema: {"quote":"string","character":"string","work":"string","genre":"string"}. ' +
    "The quote must be ONE short original inspirational line (max 220 characters) in the voice of a fictional character " +
    "from a named work of fiction (novel, play, film, comic, myth, legend)—any genre or era. " +
    "Do NOT copy verbatim text from copyrighted works; evoke tone and wisdom in new words. " +
    "character = character name. work = title of the work. genre = e.g. Fantasy, Tragedy, Memoir. " +
    "Pick a different character and work than typical clichés when possible.";

  const forbiddenBlock = forbidden.length
    ? `\n\nForbidden content fingerprints (SHA-256 of prior quotes you must not repeat or paraphrase closely): ${forbidden.slice(0, 80).join(", ")}`
    : "";

  const userMsg =
    `Calendar date for this quote: ${quoteDate}.` + forbiddenBlock + "\n\nGenerate a fresh JSON object as specified.";

  let parsed: QuoteJson | null = null;
  let lastRaw = "";

  for (let attempt = 0; attempt < 5 && !parsed; attempt++) {
    const temp = attempt > 0 ? 0.88 + attempt * 0.03 : 0.75;
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: userMsg + (attempt > 0 ? `\n\nRetry ${attempt}: vary character and work substantially.` : ""),
          },
        ],
        max_tokens: 400,
        temperature: temp,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq daily-quote", groqRes.status, errText?.slice(0, 120));
      return new Response(JSON.stringify({ error: errText.slice(0, 400) || "Groq request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqJson = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    lastRaw = groqJson.choices?.[0]?.message?.content?.trim() ?? "";
    parsed = extractJsonObject(lastRaw);
  }

  if (!parsed) {
    return new Response(JSON.stringify({ error: "Could not parse model JSON", raw: lastRaw.slice(0, 200) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fp = await sha256Hex(
    `${parsed.quote.toLowerCase()}|${parsed.character.toLowerCase()}|${parsed.work.toLowerCase()}`,
  );

  const { data: dup } = await supabase
    .from("user_quote_fingerprints")
    .select("id")
    .eq("user_id", user.id)
    .eq("fingerprint", fp)
    .maybeSingle();

  if (dup) {
    return new Response(JSON.stringify({ error: "Duplicate quote generated; try again." }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: insQ } = await supabase.from("user_daily_quotes").insert({
    user_id: user.id,
    quote_date: quoteDate,
    quote_text: parsed.quote,
    character_name: parsed.character,
    work_title: parsed.work,
  });

  if (insQ) {
    console.error("insert daily quote", insQ);
    return new Response(JSON.stringify({ error: insQ.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: insF } = await supabase.from("user_quote_fingerprints").insert({
    user_id: user.id,
    fingerprint: fp,
  });

  if (insF) {
    console.warn("insert fingerprint", insF);
  }

  return new Response(
    JSON.stringify({
      quote: parsed.quote,
      character: parsed.character,
      work: parsed.work,
      quoteDate,
      cached: false,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
