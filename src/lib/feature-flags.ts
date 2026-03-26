function envFlag(name: string, fallback = true): boolean {
  const raw = import.meta.env[name] as string | undefined;
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const featureFlags = {
  onboardingV2: envFlag("VITE_FF_ONBOARDING_V2", false),
  settingsCommandCenter: envFlag("VITE_FF_SETTINGS_COMMAND_CENTER", true),
  guidedTour: envFlag("VITE_FF_GUIDED_TOUR", true),
  /** Groq editorial + sandbox AI; can be remotely overridden via `app_remote_config.ai_groq_editorial`. */
  aiEditorial: envFlag("VITE_FF_AI_EDITORIAL", true),
  /** Rich book creation wizard + series metadata; remote key `richer_book_creation`. */
  richerBookCreation: envFlag("VITE_FF_RICHER_BOOK_CREATION", true),
};
