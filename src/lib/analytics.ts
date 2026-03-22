type EventPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(eventName: string, payload: EventPayload = {}): void {
  if (import.meta.env.DEV) {
    console.info('[analytics]', eventName, payload);
  }
}
