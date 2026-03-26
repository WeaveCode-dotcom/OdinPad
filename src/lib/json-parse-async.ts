/** Above this size, JSON.parse runs in a worker to avoid blocking the main thread during large imports. */
const WORKER_PARSE_THRESHOLD = 120_000;

let worker: Worker | null = null;
let nextId = 1;

function getParseWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/json-parse.worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

export async function parseJsonStringAsync(text: string): Promise<unknown> {
  if (text.length < WORKER_PARSE_THRESHOLD) {
    return JSON.parse(text) as unknown;
  }
  const w = getParseWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<{ id: number; ok: boolean; parsed?: unknown; error?: string }>) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      if (e.data.ok) resolve(e.data.parsed);
      else reject(new Error(e.data.error ?? "JSON parse failed"));
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, text });
  });
}
