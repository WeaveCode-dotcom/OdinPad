export type EventPayload = Record<string, string | number | boolean | null | undefined>;

export { DASHBOARD_GAMIFICATION_ANSWERS } from "@/lib/dashboard-gamification-defaults";
export { FIRST_RUN_CHECKLIST_EVENTS, FIRST_RUN_PRODUCT_DEFAULTS } from "@/lib/first-run-checklist";

/**
 * Product analytics. In development, events log to the console.
 * Optionally set `VITE_ANALYTICS_INGEST_URL` to POST JSON payloads to your own ingest endpoint
 * (e.g. Edge Function, PostHog HTTP API, or internal collector). Failures are swallowed.
 */
export function trackEvent(eventName: string, payload: EventPayload = {}): void {
  const body = { event: eventName, ...payload, ts: Date.now() };

  if (import.meta.env.DEV) {
    console.info("[analytics]", eventName, payload);
  }

  const url = import.meta.env.VITE_ANALYTICS_INGEST_URL as string | undefined;
  if (!url || typeof fetch === "undefined") return;

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    mode: "cors",
    keepalive: true,
  }).catch((err: unknown) => {
    if (import.meta.env.DEV) {
      console.warn("[analytics] Failed to send event:", eventName, err);
    }
  });
}
