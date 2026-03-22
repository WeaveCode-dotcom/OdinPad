export function shouldRouteToOnboarding(
  isAuthenticated: boolean,
  onboardingCompleted: boolean,
  onboardingDeferred: boolean,
  flagEnabled: boolean,
): boolean {
  return flagEnabled && isAuthenticated && !onboardingCompleted && !onboardingDeferred;
}
