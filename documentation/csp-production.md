# Content-Security-Policy (production)

Production hosts should send a **Content-Security-Policy** that matches how the app loads assets and talks to Supabase.

## Repo references

- **Vercel:** [vercel.json](../vercel.json) — `headers` for all routes.
- **Netlify:** [public/\_headers](../public/_headers) — copied to the build output.

## Adjusting `connect-src`

The policy allows:

- `https://*.supabase.co` and `wss://*.supabase.co` — REST, Auth, Realtime, and Edge Functions.

If you add a **custom analytics ingest** (`VITE_ANALYTICS_INGEST_URL`) or other third-party APIs, append their origins to `connect-src` in both files.

## Strictness

- `script-src 'self'` — assumes no inline scripts in the production bundle (Vite emits hashed files). If you add a third-party script tag, update the policy or use nonces.
- `style-src` includes `'unsafe-inline'` for compatibility with Radix/Tailwind runtime styles; tightening further may require a nonce strategy.

## Verification

After deploy, confirm the response in DevTools → Network → document → Response Headers, and fix any CSP console violations.
