import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { type DailyQuoteResult, fetchDailyQuote } from "@/lib/daily-quote-client";
import { getLocalISODate } from "@/lib/user-stats-daily";

const FALLBACK: DailyQuoteResult = {
  quote: "One true scene beats a hundred vague plans.",
  character: "Writing desk",
  work: "OdinPad",
  quoteDate: "",
};

export function useDailyQuote() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DailyQuoteResult>(() => ({
    ...FALLBACK,
    quoteDate: getLocalISODate(),
  }));

  useEffect(() => {
    if (!user?.id) {
      setData({ ...FALLBACK, quoteDate: getLocalISODate() });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const result = await fetchDailyQuote();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) {
          setData({ ...FALLBACK, quoteDate: getLocalISODate() });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { ...data, loading };
}
