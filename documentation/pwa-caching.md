# PWA caching (OdinPad)

## What is cached

- **App shell (precache):** Static assets matched by Workbox `globPatterns` in `vite.config.ts` — JavaScript, CSS, HTML, icons, fonts, and other build outputs. These power offline startup and fast repeat visits.

- **Supabase API (`*.supabase.co`):** Configured with **NetworkOnly** in Workbox `runtimeCaching`. Authenticated REST and realtime traffic are **not** written to the precache or a stale cache; each request goes to the network. That avoids serving another user’s data from cache or showing stale auth state.

## Updates

- **Register type:** `autoUpdate` — when you deploy a new build, the service worker updates in the background and activates on the next full page load (or when all tabs are closed, depending on browser). Users typically see the new shell after a refresh.

- **If something looks stale:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or clear site data for the origin. Data always comes from Supabase on the network for API calls.

## Local development

Service worker registration runs from `main.tsx` via `virtual:pwa-register`. Use production-like testing (`npm run build` + `npm run preview`) to validate caching behavior; `npm run dev` may not mirror Workbox exactly.
