/**
 * Convenience hook that returns the current user's preferences and the
 * `updatePreferences` mutator without exposing the full AuthContext shape.
 *
 * Prefer this over calling `useAuth()` when a component only needs preferences.
 */
import { useAuth } from "@/contexts/AuthContext";

export function usePreferences() {
  const { preferences, updatePreferences } = useAuth();
  return { preferences, updatePreferences } as const;
}
