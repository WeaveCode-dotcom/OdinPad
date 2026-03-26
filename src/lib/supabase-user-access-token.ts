import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

let refreshInFlight: Promise<void> | null = null;

async function refreshSessionSingleFlight(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn("OdinPad: refreshSession (edge functions):", error.message);
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Returns a user JWT for Edge Functions (not the anon key).
 * Does **not** call refresh on every invocation — that hits GoTrue rate limits and can
 * invalidate the session. Uses the stored session first; refreshes only if missing/anon.
 */
export async function getUserAccessTokenForEdgeFunctions(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throw new Error("Sign in to use AI companion features.");
  }

  let token = session?.access_token;
  if (token && token !== ANON_KEY) {
    return token;
  }

  await refreshSessionSingleFlight();
  const {
    data: { session: s2 },
  } = await supabase.auth.getSession();
  token = s2?.access_token;
  if (!token || token === ANON_KEY) {
    throw new Error("Sign in to use AI companion features.");
  }
  return token;
}
