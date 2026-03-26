import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Postgres changes for a Sandbox map (nodes/edges) for lightweight multi-tab sync.
 * Requires `sandbox_map_nodes` / `sandbox_map_edges` in the `supabase_realtime` publication on the project.
 */
const DEBOUNCE_MS = 280;

export function useSandboxMapRealtime(mapId: string | null, onChange: () => void): void {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mapId) return;
    const schedule = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        cbRef.current();
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`sandbox-map-${mapId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sandbox_map_nodes", filter: `map_id=eq.${mapId}` },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sandbox_map_edges", filter: `map_id=eq.${mapId}` },
        schedule,
      )
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [mapId]);
}
