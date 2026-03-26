type ParseMsg = { id: number; text: string };

self.onmessage = (e: MessageEvent<ParseMsg>) => {
  const { id, text } = e.data;
  try {
    const parsed = JSON.parse(text) as unknown;
    (self as unknown as Worker).postMessage({ id, ok: true as const, parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    (self as unknown as Worker).postMessage({ id, ok: false as const, error: message });
  }
};
