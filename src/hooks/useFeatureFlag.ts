import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { DEV_FLAG_CHANGE_EVENT, getDevOverrides } from "@/lib/dev-flag-overrides";
import { featureFlags } from "@/lib/feature-flags";

type LocalFlagKey = keyof typeof featureFlags;

const CACHE_MS = 3 * 60 * 1000;
let remoteCache: { at: number; map: Map<string, boolean> } | null = null;
let inflightPromise: Promise<Map<string, boolean>> | null = null;

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

function fetchRemoteMap(): Promise<Map<string, boolean>> {
  if (remoteCache && Date.now() - remoteCache.at < CACHE_MS) {
    return Promise.resolve(remoteCache.map);
  }
  if (inflightPromise) return inflightPromise;

  inflightPromise = Promise.resolve(supabase.from("app_remote_config").select("key, value"))
    .then(({ data, error }) => {
      inflightPromise = null;
      const map = new Map<string, boolean>();
      if (!error && data) {
        for (const row of data) {
          map.set(row.key, jsonToEnabled(row.value));
        }
      }
      remoteCache = { at: Date.now(), map };
      return map;
    })
    .catch(() => {
      inflightPromise = null;
      const map = new Map<string, boolean>();
      remoteCache = { at: Date.now(), map };
      return map;
    });

  return inflightPromise;
}

/**
 * Returns `[enabled, loading]`.
 *
 * Resolution order:
 * 1. While the remote fetch is in-flight, returns the local env flag value with `loading: true`.
 * 2. If the remote config has an explicit value for `remoteKey`, that overrides the local flag.
 * 3. Falls back to the local `featureFlags[localKey]` value.
 *
 * Pass only `localKey` to skip the remote lookup entirely.
 */
function resolveEnabled(
  localKey: LocalFlagKey,
  remoteKey: string | undefined,
  remoteMap: Map<string, boolean> | null,
): boolean {
  const devOverrides = getDevOverrides();
  if (import.meta.env.DEV && localKey in devOverrides) {
    return devOverrides[localKey];
  }
  const localValue = featureFlags[localKey];
  if (remoteMap && remoteKey && remoteMap.has(remoteKey)) {
    return remoteMap.get(remoteKey) !== false;
  }
  return localValue;
}

export function useFeatureFlag(localKey: LocalFlagKey, remoteKey?: string): [boolean, boolean] {
  const localValue = featureFlags[localKey];
  const [enabled, setEnabled] = useState<boolean>(() => resolveEnabled(localKey, remoteKey, null));
  const [loading, setLoading] = useState<boolean>(remoteKey !== undefined);

  useEffect(() => {
    if (!remoteKey) {
      setEnabled(resolveEnabled(localKey, remoteKey, null));
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchRemoteMap().then((map) => {
      setEnabled(resolveEnabled(localKey, remoteKey, map));
      setLoading(false);
    });
  }, [localKey, localValue, remoteKey]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handler = () => {
      setEnabled((prev) => {
        const next = resolveEnabled(localKey, remoteKey, null);
        return next !== prev ? next : prev;
      });
    };
    window.addEventListener(DEV_FLAG_CHANGE_EVENT, handler);
    return () => window.removeEventListener(DEV_FLAG_CHANGE_EVENT, handler);
  }, [localKey, remoteKey]);

  return [enabled, loading];
}
