# Lighthouse CI (performance budgets)

OdinPad ships a root **`lighthouserc.cjs`** with soft budgets for **LCP** and **CLS** on the marketing shell and the signed-in app shell (preview server).

## Run locally

1. Build and serve the production bundle:

   ```bash
   npm run build && npm run preview
   ```

2. In another terminal (with the preview URL, usually `http://localhost:4173`):

   ```bash
   npx --yes @lhci/cli autorun
   ```

   Or install `@lhci/cli` as a dev dependency and add a script that runs `lhci autorun`.

## Adjusting URLs

Edit `lighthouserc.cjs` → `ci.collect.url` to match your preview host/port. For a static landing-only check, point the first URL at `/` and the second at a route that loads the studio shell (e.g. after auth, you may need a seeded test account or a public dashboard mock — adapt to your QA setup).

## Interpreting failures

- **LCP** — large hero images, slow fonts, or long main-thread work. Mitigations: preconnect (see `index.html` / `main.tsx`), font `display=swap`, code-splitting (`React.lazy` in `App.tsx`).
- **CLS** — reserve space for images and async UI. Marketing pages should set explicit dimensions on `<img>` when assets are added.

Assertions are set to **warn** by default so CI stays informative without blocking merges; tighten to **error** when budgets are stable.
