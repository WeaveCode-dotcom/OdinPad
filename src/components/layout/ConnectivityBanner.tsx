import { RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useNovelContext } from "@/contexts/NovelContext";
import { flushOfflineIdeaQueue, getPendingCaptureCount } from "@/lib/idea-web/offline-queue";

export function ConnectivityBanner() {
  const navigate = useNavigate();
  const { refetchIdeaWeb, novelSyncStatus } = useNovelContext();
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshPending = useCallback(() => {
    void getPendingCaptureCount().then(setPending);
  }, []);

  useEffect(() => {
    refreshPending();
    const id = window.setInterval(refreshPending, 6000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshPending]);

  useEffect(() => {
    if (!online) return;
    setFlushing(true);
    void flushOfflineIdeaQueue()
      .then(() => refetchIdeaWeb())
      .finally(() => {
        setFlushing(false);
        refreshPending();
      });
  }, [online, refetchIdeaWeb, refreshPending]);

  const showOffline = !online;
  const showPending = pending > 0;
  const showSyncErr = novelSyncStatus === "error";

  if (!showOffline && !showPending && !showSyncErr) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-800/40 bg-amber-950/90 px-3 py-2 text-xs text-amber-50"
    >
      <div className="flex flex-wrap items-center gap-2">
        {showOffline && (
          <span className="inline-flex items-center gap-1.5 font-medium">
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            You&apos;re offline. Edits stay on this device until you reconnect.
          </span>
        )}
        {showPending && (
          <span>
            {pending} idea capture{pending === 1 ? "" : "s"} queued — will sync when online.
          </span>
        )}
        {showSyncErr && <span className="text-rose-200">Manuscript sync failed. Check your connection and retry.</span>}
      </div>
      <div className="flex items-center gap-2">
        {(showPending || showSyncErr) && online && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 gap-1 border border-amber-700/50 bg-amber-900/50 text-amber-50 hover:bg-amber-800/60"
            disabled={flushing}
            onClick={() => {
              setFlushing(true);
              void flushOfflineIdeaQueue()
                .then(() => refetchIdeaWeb())
                .finally(() => {
                  setFlushing(false);
                  refreshPending();
                });
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${flushing ? "animate-spin" : ""}`} />
            Retry sync
          </Button>
        )}
        {showPending && (
          <Button
            type="button"
            size="sm"
            variant="link"
            className="h-7 text-amber-200"
            onClick={() => navigate("/inbox")}
          >
            Pending queue
          </Button>
        )}
      </div>
    </div>
  );
}
