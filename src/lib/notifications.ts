import { supabase } from "@/integrations/supabase/client";
import { getUserAccessTokenForEdgeFunctions } from "@/lib/supabase-user-access-token";

export type NotificationChannel = "in_app" | "email" | "push";

export interface NotificationMessage {
  title: string;
  body: string;
  url?: string;
}

// ── Push subscription helpers ──────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

/** Register the service worker if it hasn't been registered yet. */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/**
 * Returns the current push subscription state for this browser.
 * "unsupported" — browser doesn't support Push API.
 * "denied"       — user has blocked notifications.
 * "subscribed"   — active subscription exists.
 * "unsubscribed" — supported but no active subscription.
 */
export async function getPushSubscriptionState(): Promise<"unsupported" | "denied" | "subscribed" | "unsubscribed"> {
  if (!("PushManager" in window)) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await ensureServiceWorker();
  if (!reg) return "unsupported";
  const existing = await reg.pushManager.getSubscription();
  return existing ? "subscribed" : "unsubscribed";
}

/**
 * Requests browser push permission, creates a subscription, and saves it to
 * Supabase `push_subscriptions`. Returns the new state.
 */
export async function subscribeToPush(userId: string): Promise<"subscribed" | "denied" | "unsupported" | "error"> {
  if (!("PushManager" in window) || !VAPID_PUBLIC_KEY) return "unsupported";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";

  try {
    const reg = await ensureServiceWorker();
    if (!reg) return "unsupported";
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh ?? "";
    const auth = json.keys?.auth ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as unknown as { from: (t: string) => any };
    await db.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "user_id,endpoint" },
    );
    return "subscribed";
  } catch {
    return "error";
  }
}

/**
 * Unsubscribes from push notifications and removes the subscription from Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg) return;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as unknown as { from: (t: string) => any };
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
}

/**
 * Sends a push notification to all subscriptions for the current user
 * via the `push-notify` Edge Function.
 */
export async function sendPushToSelf(message: NotificationMessage): Promise<void> {
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  let token: string;
  try {
    token = await getUserAccessTokenForEdgeFunctions();
  } catch {
    return;
  }
  try {
    await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify(message),
    });
  } catch {
    /* fire-and-forget */
  }
}

// ── In-app queue (kept for backward compat) ───────────────────────────────────

interface QueueItem {
  id: string;
  channel: NotificationChannel;
  message: NotificationMessage;
  createdAt: string;
}

const QUEUE_KEY = "odinpad_notification_queue";

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // no-op
  }
}

export async function enqueueNotification(channel: NotificationChannel, message: NotificationMessage): Promise<void> {
  const queue = loadQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    channel,
    message,
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
}

export async function flushNotificationQueue(): Promise<void> {
  const queue = loadQueue();
  if (queue.length === 0) return;
  for (const item of queue) {
    if (import.meta.env.DEV) {
      console.info("[notification-dispatch]", item.channel, item.message);
    }
  }
  saveQueue([]);
}

export async function sendNotificationPreview(
  channel: NotificationChannel,
  message: NotificationMessage,
): Promise<void> {
  await enqueueNotification(channel, message);
  await flushNotificationQueue();
}
