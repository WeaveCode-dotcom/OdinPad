import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { fetchSandboxStats } from "@/lib/sandbox/service";

export function SandboxInsightsCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    sessionCount: number;
    braindumpWords: number;
    listItems: number;
    promptsUsed: number;
    mapNodes: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    void fetchSandboxStats(user.id, since)
      .then(setStats)
      .catch(() => setStats(null));
  }, [user?.id]);

  if (!stats) return null;

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">This week in Sandbox:</span> {stats.braindumpWords} braindump
      words · {stats.listItems} list lines · {stats.promptsUsed} prompts logged · {stats.mapNodes} map nodes ·{" "}
      {stats.sessionCount} braindump sessions touched
    </div>
  );
}
