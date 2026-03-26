/**
 * IndexedDB queue for Idea Web captures when offline. Flushes when the
 * browser reports `online` and on manual retry.
 */

import { createIdeaWebEntry } from "@/lib/idea-web/service";

const DB_NAME = "odinpad_offline_v1";
const STORE = "idea_captures";
const DB_VERSION = 1;

type QueuedCapture = {
  id?: number;
  userId: string;
  title: string;
  body: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function isOfflineCapable(): boolean {
  return typeof navigator !== "undefined" && "indexedDB" in window;
}

export async function getPendingCaptureCount(): Promise<number> {
  if (!isOfflineCapable()) return 0;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const q = tx.objectStore(STORE).count();
      q.onsuccess = () => {
        db.close();
        resolve(q.result);
      };
      q.onerror = () => {
        db.close();
        reject(q.error);
      };
    });
  } catch {
    return 0;
  }
}

export async function enqueueIdeaCapture(payload: Omit<QueuedCapture, "id" | "createdAt">): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ ...payload, tags: payload.tags ?? [], createdAt: Date.now() });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function drainAll(): Promise<void> {
  const db = await openDb();
  const rows = await new Promise<QueuedCapture[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedCapture[]);
    req.onerror = () => reject(req.error);
  });

  for (const row of rows) {
    if (!row.id) continue;
    try {
      await createIdeaWebEntry({
        userId: row.userId,
        novelId: null,
        title: row.title.trim() || "Untitled",
        body: row.body,
        tags: row.tags ?? [],
        ideaType: "misc",
        metadata: row.metadata,
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(row.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      break;
    }
  }
  db.close();
}

export async function flushOfflineIdeaQueue(): Promise<void> {
  if (!navigator.onLine) return;
  await drainAll();
}
