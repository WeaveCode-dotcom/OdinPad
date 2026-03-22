const DEFAULT_CALLBACK_PATH = "/auth/callback";
const DEFAULT_PASSWORD_UPDATE_PATH = "/auth/update-password";

function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildAuthRedirectUrl(path = DEFAULT_CALLBACK_PATH): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;
  if (configured && configured.trim()) return configured.trim();
  const origin = getAppOrigin();
  return `${origin}${normalizePath(path)}`;
}

export function buildPasswordResetRedirectUrl(): string {
  return buildAuthRedirectUrl(DEFAULT_PASSWORD_UPDATE_PATH);
}

export function getOAuthCallbackPath(): string {
  return DEFAULT_CALLBACK_PATH;
}
