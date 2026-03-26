import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { parseAiCompanionSettings } from "@/lib/ai-companion-settings";
import { fetchDailySeedPrompt } from "@/lib/idea-web-companion-client";
import { featureFlags } from "@/lib/feature-flags";
import { getLocalISODate } from "@/lib/user-stats-daily";

const FALLBACK = "What's one image, scene, or feeling in your head today?";

export function useDailySeedPrompt(writingStreakDays: number) {
  const { user, preferences } = useAuth();
  const ai = parseAiCompanionSettings(preferences?.ai_companion);
  const [prompt, setPrompt] = useState(FALLBACK);
  const [anchors, setAnchors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !featureFlags.aiEditorial || !ai.daily_prompt_enabled) {
      setPrompt(FALLBACK);
      setAnchors([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchDailySeedPrompt({ writingStreakDays, promptDate: getLocalISODate() })
      .then((r) => {
        if (cancelled) return;
        setPrompt((r.prompt ?? "").trim() || FALLBACK);
        setAnchors(Array.isArray(r.anchors_used) ? r.anchors_used : []);
      })
      .catch(() => {
        if (!cancelled) {
          setPrompt(FALLBACK);
          setAnchors([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, ai.daily_prompt_enabled, writingStreakDays]);

  return { prompt, anchors, loading, fallbackText: FALLBACK };
}
