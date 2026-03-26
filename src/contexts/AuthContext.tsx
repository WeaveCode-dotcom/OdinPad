import type { AuthChangeEvent, Session, User as SupaUser } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { buildAuthRedirectUrl, buildPasswordResetRedirectUrl, getOAuthCallbackPath } from "@/lib/auth-redirect";
import { clearRemoteFeatureFlagCache } from "@/lib/remote-feature-flags";
import { mapSupabaseError } from "@/lib/supabase-errors";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  /** ISO timestamp from Supabase Auth (analytics, e.g. checklist `ms_since_signup`). */
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
  signOutAllSessions: () => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error?: string }>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<{ error?: string }>;
  onboardingCompleted: boolean;
  onboardingDeferred: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapUser(su: SupaUser): AuthUser {
  return {
    id: su.id,
    email: su.email ?? "",
    name: su.user_metadata?.full_name || su.user_metadata?.name || su.email?.split("@")[0] || "",
    avatarUrl: su.user_metadata?.avatar_url,
    createdAt: su.created_at,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type PreferenceRow = Tables<"user_preferences">;
type PreferenceUpdate = TablesUpdate<"user_preferences">;

export interface UserPreferences {
  onboarding_step: string;
  onboarding_completed_at: string | null;
  onboarding_deferred: boolean;
  writing_stage: string | null;
  writing_style: string | null;
  genres: string[];
  primary_goal: string | null;
  behavior_pace: string | null;
  behavior_support: string | null;
  default_framework_id: string | null;
  preferred_workspace_mode: string | null;
  theme: string;
  font_family: string;
  font_size: number;
  line_spacing: number;
  typewriter_mode: boolean;
  daily_word_goal: number;
  weekly_word_goal: number;
  pomodoro_minutes: number;
  reminder_daily: boolean;
  reminder_streak: boolean;
  reminder_progress_email: string;
  reminder_push_enabled: boolean;
  gamification_enabled: boolean;
  show_odyssey_ui: boolean;
  seasonal_events_enabled: boolean;
  checklist_opening_scene_done: boolean;
  checklist_character_done: boolean;
  checklist_goal_done: boolean;
  guided_tour_completed_at: string | null;
  first_100_words_at: string | null;
  first_run_novel_created?: boolean;
  first_run_idea_web_visited?: boolean;
  first_run_write_opened?: boolean;
  /** Cosmetic; completing the three first-run flags unlocks this (see Foundations checklist). */
  foundations_badge_unlocked?: boolean;
  onboarding_skip_reason?: string | null;
  /** Idea Web automation (JSON from DB). */
  idea_web_settings?: Record<string, unknown>;
  /** Local calendar day (YYYY-MM-DD) when streak pressure is paused. */
  streak_rest_date?: string | null;
  /** AI companion toggles (daily seed prompt, enrich, stretches). */
  ai_companion?: Record<string, unknown>;
}

function mapPreferences(row: PreferenceRow): UserPreferences {
  return {
    onboarding_step: row.onboarding_step,
    onboarding_completed_at: row.onboarding_completed_at,
    onboarding_deferred: row.onboarding_deferred,
    writing_stage: row.writing_stage,
    writing_style: row.writing_style,
    genres: row.genres ?? [],
    primary_goal: row.primary_goal,
    behavior_pace: row.behavior_pace,
    behavior_support: row.behavior_support,
    default_framework_id: row.default_framework_id,
    preferred_workspace_mode: row.preferred_workspace_mode,
    theme: row.theme,
    font_family: row.font_family,
    font_size: row.font_size,
    line_spacing: row.line_spacing,
    typewriter_mode: row.typewriter_mode,
    daily_word_goal: row.daily_word_goal,
    weekly_word_goal: row.weekly_word_goal,
    pomodoro_minutes: row.pomodoro_minutes,
    reminder_daily: row.reminder_daily,
    reminder_streak: row.reminder_streak,
    reminder_progress_email: row.reminder_progress_email,
    reminder_push_enabled: row.reminder_push_enabled,
    gamification_enabled: row.gamification_enabled ?? true,
    show_odyssey_ui: row.show_odyssey_ui ?? true,
    seasonal_events_enabled: row.seasonal_events_enabled ?? true,
    checklist_opening_scene_done: row.checklist_opening_scene_done,
    checklist_character_done: row.checklist_character_done,
    checklist_goal_done: row.checklist_goal_done,
    guided_tour_completed_at: row.guided_tour_completed_at,
    first_100_words_at: row.first_100_words_at,
    first_run_novel_created: row.first_run_novel_created ?? false,
    first_run_idea_web_visited: row.first_run_idea_web_visited ?? false,
    first_run_write_opened: row.first_run_write_opened ?? false,
    foundations_badge_unlocked: row.foundations_badge_unlocked ?? false,
    onboarding_skip_reason: row.onboarding_skip_reason ?? null,
    idea_web_settings:
      row.idea_web_settings != null && typeof row.idea_web_settings === "object"
        ? (row.idea_web_settings as Record<string, unknown>)
        : {},
    streak_rest_date: row.streak_rest_date ?? null,
    ai_companion:
      row.ai_companion != null && typeof row.ai_companion === "object"
        ? (row.ai_companion as Record<string, unknown>)
        : {},
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydratedRef = useRef(false);
  const manualSignOutRef = useRef(false);
  const hadUserRef = useRef(false);

  useEffect(() => {
    hadUserRef.current = Boolean(user);
  }, [user]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, bio")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("OdinPad: failed to fetch profile", error.message);
      return;
    }
    if (data) setProfile(data);
  }, []);

  const fetchPreferences = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      console.warn("OdinPad: failed to fetch preferences", error.message);
      return;
    }
    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from("user_preferences")
        .upsert({ user_id: userId }, { onConflict: "user_id" })
        .select("*")
        .maybeSingle();
      if (insertError) {
        console.warn("OdinPad: failed to initialize preferences", insertError.message);
        return;
      }
      setPreferences(mapPreferences(inserted));
      return;
    }
    setPreferences(mapPreferences(data));
  }, []);

  const applySession = useCallback(
    (session: Session | null) => {
      if (session?.user) {
        const mapped = mapUser(session.user);
        setUser(mapped);
        setTimeout(() => {
          void fetchProfile(session.user.id);
          void fetchPreferences(session.user.id);
        }, 0);
        return;
      }
      setUser(null);
      setProfile(null);
      setPreferences(null);
    },
    [fetchProfile, fetchPreferences],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      switch (event) {
        case "INITIAL_SESSION":
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          applySession(session);
          break;
        case "SIGNED_OUT":
          if (hadUserRef.current && !manualSignOutRef.current) {
            toast({
              title: "Session ended",
              description: "Your session has ended. Please sign in again.",
            });
          }
          manualSignOutRef.current = false;
          applySession(null);
          break;
        default:
          applySession(session);
          break;
      }
      if (!hydratedRef.current) {
        hydratedRef.current = true;
      }
      setIsLoading(false);
    });

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("OdinPad: failed to hydrate auth session", error.message);
      } else {
        applySession(session ?? null);
      }
      hydratedRef.current = true;
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: buildAuthRedirectUrl(getOAuthCallbackPath()),
      },
    });
    if (error) return { error: mapSupabaseError(error) };
    return {};
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) return { error: mapSupabaseError(error) };
    return {};
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthRedirectUrl(getOAuthCallbackPath()),
      },
    });
    if (error) return { error: mapSupabaseError(error) };
    return {};
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: buildPasswordResetRedirectUrl(),
    });
    if (error) return { error: mapSupabaseError(error) };
    return {};
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: mapSupabaseError(error) };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    manualSignOutRef.current = true;
    const { error } = await supabase.auth.signOut();
    if (error) {
      manualSignOutRef.current = false;
      return { error: mapSupabaseError(error) };
    }
    clearRemoteFeatureFlagCache();
    setUser(null);
    setProfile(null);
    return {};
  }, []);

  const signOutAllSessions = useCallback(async () => {
    manualSignOutRef.current = true;
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      manualSignOutRef.current = false;
      return { error: mapSupabaseError(error) };
    }
    clearRemoteFeatureFlagCache();
    setUser(null);
    setProfile(null);
    return {};
  }, []);

  const deleteAccount = useCallback(async () => {
    manualSignOutRef.current = true;
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      manualSignOutRef.current = false;
      return { error: mapSupabaseError(error) };
    }
    clearRemoteFeatureFlagCache();
    setUser(null);
    setProfile(null);
    return {};
  }, []);

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!user) return { error: "Not authenticated" };
      const { error } = await supabase.from("profiles").update(data).eq("user_id", user.id);
      if (error) return { error: mapSupabaseError(error) };
      await fetchProfile(user.id);
      return {};
    },
    [user, fetchProfile],
  );

  const updatePreferences = useCallback(
    async (data: Partial<UserPreferences>) => {
      if (!user) return { error: "Not authenticated" };
      const payload: PreferenceUpdate = data as PreferenceUpdate;
      const { data: updated, error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            ...payload,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) return { error: mapSupabaseError(error) };
      setPreferences(mapPreferences(updated));
      return {};
    },
    [user],
  );

  const onboardingCompleted = Boolean(preferences?.onboarding_completed_at);
  const onboardingDeferred = Boolean(preferences?.onboarding_deferred);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        preferences,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        requestPasswordReset,
        updatePassword,
        signOut,
        signOutAllSessions,
        deleteAccount,
        updateProfile,
        updatePreferences,
        onboardingCompleted,
        onboardingDeferred,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
