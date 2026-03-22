function envFlag(name: string, fallback = true): boolean {
  const raw = import.meta.env[name] as string | undefined;
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

export const featureFlags = {
  onboardingV2: envFlag('VITE_FF_ONBOARDING_V2', false),
  settingsCommandCenter: envFlag('VITE_FF_SETTINGS_COMMAND_CENTER', true),
  guidedTour: envFlag('VITE_FF_GUIDED_TOUR', false),
};
