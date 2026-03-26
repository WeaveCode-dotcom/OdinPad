/**
 * App route paths — use these instead of string literals so links and redirects stay consistent.
 */
export const ROUTES = {
  home: "/",
  library: "/library",
  odyssey: "/odyssey",
  stats: "/stats",
  inbox: "/inbox",
  settings: "/settings",
  help: "/help",
  accessibility: "/accessibility",
  series: (id: string) => `/series/${encodeURIComponent(id)}`,
  /** Legacy: `/sandbox` redirects to home; `/sandbox/:id` opens that project in Sandbox (see SandboxRedirect). */
  sandbox: "/sandbox",
  sandboxNovel: (novelId: string) => `/sandbox/${encodeURIComponent(novelId)}`,
  onboarding: "/onboarding",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  authCallback: "/auth/callback",
  authUpdatePassword: "/auth/update-password",
} as const;

/** Nested `<Route>` segments under the studio layout (relative paths, no leading slash). */
export const ROUTE_SEGMENTS = {
  library: "library",
  odyssey: "odyssey",
  stats: "stats",
  inbox: "inbox",
  settings: "settings",
  help: "help",
  accessibility: "accessibility",
} as const;
