import { describe, expect, it, vi } from "vitest";

import { enqueueNotification, flushNotificationQueue } from "@/lib/notifications";

describe("notifications queue", () => {
  it("queues and flushes notifications", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    localStorage.removeItem("odinpad_notification_queue");

    await enqueueNotification("in_app", { title: "Hello", body: "World" });
    await flushNotificationQueue();

    expect(localStorage.getItem("odinpad_notification_queue")).toBe("[]");
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
