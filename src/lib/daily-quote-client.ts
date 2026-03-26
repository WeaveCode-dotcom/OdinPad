import { supabase } from "@/integrations/supabase/client";
import { assertDailyQuoteAiEnabled } from "@/lib/remote-feature-flags";
import { sanitizeUserFacingPlainText } from "@/lib/sanitize-html";
import { getLocalISODate } from "@/lib/user-stats-daily";

export type DailyQuoteResult = {
  quote: string;
  character: string;
  work: string;
  quoteDate: string;
  cached?: boolean;
};

export async function fetchDailyQuote(quoteDate = getLocalISODate()): Promise<DailyQuoteResult> {
  const { data, error } = await supabase.functions.invoke("daily-quote", {
    body: { quoteDate },
  });

  const payload = data as Record<string, unknown> | null;
  if (payload && typeof payload.error === "string") {
    throw new Error(payload.error);
  }

  if (error) {
    throw new Error(error.message ?? "Failed to load daily quote");
  }

  if (!payload || typeof payload.quote !== "string") {
    throw new Error("Invalid response from daily-quote");
  }

  return {
    quote: sanitizeUserFacingPlainText(payload.quote),
    character: sanitizeUserFacingPlainText(String(payload.character ?? "Unknown")),
    work: sanitizeUserFacingPlainText(String(payload.work ?? "Unknown work")),
    quoteDate: String(payload.quoteDate ?? quoteDate),
    cached: Boolean(payload.cached),
  };
}
