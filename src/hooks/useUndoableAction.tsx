import { useCallback, useEffect, useRef, useState } from "react";

import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";

const DEFAULT_MS = 7000;

type Options = {
  /** Delay before committing (ms). */
  delayMs?: number;
  message: string;
  undoLabel?: string;
};

/**
 * Schedules a destructive action and shows a toast with Undo that cancels before the delay elapses.
 * While an action is pending, Ctrl+Z / Cmd+Z also triggers undo.
 */
export function useUndoableAction() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRef = useRef<(() => void | Promise<void>) | null>(null);
  const dismissRef = useRef<(() => void) | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const cancelScheduled = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    actionRef.current = null;
    dismissRef.current?.();
    dismissRef.current = null;
    setHasPending(false);
  }, []);

  // Ctrl+Z / Cmd+Z cancels the pending action while the toast is visible
  useEffect(() => {
    if (!hasPending) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        // Only intercept if the editor textarea is not focused (let textarea handle its own undo)
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return;
        e.preventDefault();
        cancelScheduled();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasPending, cancelScheduled]);

  const schedule = useCallback(
    (commit: () => void | Promise<void>, options: Options) => {
      cancelScheduled();
      const delay = options.delayMs ?? DEFAULT_MS;
      actionRef.current = commit;
      setHasPending(true);
      const { dismiss } = toast({
        title: options.message,
        action: (
          <ToastAction
            altText={options.undoLabel ?? "Undo"}
            onClick={() => {
              cancelScheduled();
            }}
          >
            {options.undoLabel ?? "Undo"}
          </ToastAction>
        ),
        duration: delay + 500,
      });
      dismissRef.current = dismiss;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const fn = actionRef.current;
        actionRef.current = null;
        dismissRef.current = null;
        setHasPending(false);
        void Promise.resolve(fn?.()).finally(() => dismiss());
      }, delay);
    },
    [cancelScheduled],
  );

  return { schedule, cancelScheduled, hasPending };
}
