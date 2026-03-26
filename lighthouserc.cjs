/** @type {import('lighthouse').LH.Config} */
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 4173",
      startServerReadyPattern: "Local",
      url: ["http://127.0.0.1:4173/", "http://127.0.0.1:4173/library"],
    },
    assert: {
      assertions: {
        // Performance score ≥ 0.8 — error to block CI on regression
        "categories:performance": ["error", { minScore: 0.8 }],
        // LCP < 2500 ms (WCAG "good" threshold)
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        // TBT < 200 ms (keeps main thread responsive)
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
        // CLS < 0.1 (no jarring layout shifts)
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        // Accessibility score ≥ 0.9
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        // Best practices score ≥ 0.85
        "categories:best-practices": ["warn", { minScore: 0.85 }],
      },
    },
  },
};
