# Security notes (OdinPad)

## Client bundle (`VITE_*`)

- **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** are **public** by design (anon key). They are required for the browser client.
- **Never** put the Supabase **service role** key, **Groq** API keys, or other secrets in `VITE_*` variables — they would ship to every user’s browser.

## Groq / Edge Functions

- `GROQ_API_KEY` and optional `GROQ_MODEL` are configured as **Supabase Edge Function secrets** (Dashboard → Edge Functions → Secrets, or CLI).
- The app calls `idea-web-groq` and `daily-quote` with the user’s JWT; the Edge runtime holds Groq credentials server-side.
- **Remote kill-switches:** table `app_remote_config` (see migration `20260328140000_app_remote_config.sql`) — set `ai_groq_editorial` or `ai_daily_quote_groq` to `false` to disable AI without redeploying the SPA. Edge Functions enforce the same flags when the table exists.

## Content sanitization

- User- and model-visible strings from Groq flows are passed through **`sanitizeUserFacingPlainText`** (`src/lib/sanitize-html.ts`, DOMPurify with no HTML tags) before display where responses are shown in rich contexts.

## Dependency audits

- Run **`npm audit`** locally and in CI; address high/critical issues or document accepted risk.
- **Dependabot:** [.github/dependabot.yml](../.github/dependabot.yml) opens weekly grouped npm updates (enable in GitHub repo settings if needed).

## Production headers (CSP)

- See [documentation/csp-production.md](./csp-production.md) and repo **`vercel.json`** / **`public/_headers`**. Tighten `connect-src` when you add new API origins (e.g. analytics).

## OAuth redirects

- See [documentation/oauth-redirects.md](./oauth-redirects.md) for Supabase URL allowlists and Google OAuth.

## Account security UX

- **Account security** modal (`AccountSecurityModal`): password reset email, **sign out this device**, **sign out all sessions** (`signOut({ scope: 'global' })`), and account deletion. Per-device session listing is not exposed by Supabase to the browser; the modal explains that and shows the current session expiry.

## Logging / PII

- Edge Functions log **status codes and short error slices** only — avoid logging full Groq error bodies or user content. Client code should not log access tokens or passwords; prefer `console.warn` with non-sensitive identifiers only.

## File uploads

- Client-side size limits are enforced in **`src/lib/file-upload-policy.ts`** for JSON novel import, Markdown idea import, and Word import. Treat as defense in depth; server-side limits apply if uploads move to Edge/Storage.

## HTTPS and cookies

- Serve the production app **only over HTTPS** so `Secure` cookies and HSTS (if configured at the CDN) apply.
- Supabase JS stores the session in **localStorage** by default (not a first-party HTTP cookie). Hosting should still enforce HTTPS for the app origin and for `*.supabase.co` traffic.

## GDPR / portability

- Users can download a JSON export of their data from **Settings → Privacy → Download my data**, implemented via `fetchUserDataBundle` in `src/lib/user-data-export.ts`.

## Session

- Supabase Auth handles refresh tokens; the app shows a toast on forced sign-out. Active scene text is also mirrored to `localStorage` under `odinpad_scene_draft_<novelId>_<sceneId>` as a local backup (see `WriteView`).
