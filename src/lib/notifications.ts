export type NotificationChannel = 'in_app' | 'email' | 'push_placeholder';

export interface NotificationMessage {
  title: string;
  body: string;
}

interface QueueItem {
  id: string;
  channel: NotificationChannel;
  message: NotificationMessage;
  createdAt: string;
}

const QUEUE_KEY = 'odinpad_notification_queue';

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
      console.info('[notification-dispatch]', item.channel, item.message);
    }
  }
  saveQueue([]);
}

export async function sendNotificationPreview(channel: NotificationChannel, message: NotificationMessage): Promise<void> {
  await enqueueNotification(channel, message);
  await flushNotificationQueue();
}
