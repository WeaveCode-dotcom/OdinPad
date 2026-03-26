# OAuth and email redirect URLs (Supabase Auth)

OdinPad uses Supabase Auth with the following **in-app** paths (see `src/lib/auth-redirect.ts`):

| Flow                         | Path                    | `buildAuthRedirectUrl`                           |
| ---------------------------- | ----------------------- | ------------------------------------------------ |
| OAuth (e.g. Google) callback | `/auth/callback`        | `https://<your-app-origin>/auth/callback`        |
| Password reset / magic link  | `/auth/update-password` | `https://<your-app-origin>/auth/update-password` |

## Supabase Dashboard checklist

For **each** environment (local, staging, production):

1. **Authentication → URL configuration**
   - **Site URL:** production app origin (e.g. `https://app.example.com`).
   - **Redirect URLs:** include every origin you use, plus full callback URLs if needed, e.g.  
     `http://localhost:8080/**`, `https://staging.example.com/**`, `https://app.example.com/**`.

2. **Google Cloud Console** (if using Google sign-in)
   - **Authorized redirect URIs** must include Supabase’s OAuth redirect, e.g.  
     `https://<project-ref>.supabase.co/auth/v1/callback`  
     (not your app’s `/auth/callback` — that is the _next_ hop after Supabase).

3. **Optional:** `VITE_AUTH_REDIRECT_URL` in `.env` can override the full redirect target for OAuth/email when the app origin differs from `window.location.origin` (e.g. multi-domain setups). Use the exact URL Supabase lists as allowed.

## Verification

- Sign in with Google in staging and production.
- Trigger “Forgot password” and confirm the link opens the app and completes at `/auth/update-password`.
