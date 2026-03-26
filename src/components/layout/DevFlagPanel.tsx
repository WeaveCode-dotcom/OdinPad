import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { clearAllDevOverrides, DEV_FLAG_CHANGE_EVENT, getDevOverrides, setDevOverride } from "@/lib/dev-flag-overrides";
import { featureFlags } from "@/lib/feature-flags";

const FLAG_KEYS = Object.keys(featureFlags) as (keyof typeof featureFlags)[];

/**
 * Dev-only floating panel for toggling feature flags at runtime.
 * Open / close with Ctrl+Shift+F. Overrides persist in localStorage.
 * Rendered only when import.meta.env.DEV is true (tree-shaken in production).
 */
export function DevFlagPanel() {
  const [open, setOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(getDevOverrides);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setOpen((x) => !x);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Sync overrides from other hooks/tabs
  useEffect(() => {
    const handler = () => setOverrides(getDevOverrides());
    window.addEventListener(DEV_FLAG_CHANGE_EVENT, handler);
    return () => window.removeEventListener(DEV_FLAG_CHANGE_EVENT, handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Dev: Feature flag overrides"
      className="fixed bottom-4 right-4 z-[9999] w-72 rounded-lg border-2 border-neutral-900 bg-white p-4 shadow-[6px_6px_0_0_rgb(0_0_0_/_0.15)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-neutral-900">Feature Flags</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
            DEV
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
            onClick={() => {
              clearAllDevOverrides();
              setOverrides({});
            }}
          >
            Reset all
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-neutral-400 hover:text-neutral-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {FLAG_KEYS.map((key) => {
          const base = featureFlags[key];
          const hasOverride = key in overrides;
          const effective = hasOverride ? overrides[key] : base;

          return (
            <li key={key} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-xs font-medium text-neutral-800">{key}</span>
                {hasOverride && <span className="text-[10px] text-amber-600">overriding default: {String(base)}</span>}
              </div>
              <Switch
                checked={effective}
                onCheckedChange={(checked) => {
                  setDevOverride(key, checked);
                  setOverrides(getDevOverrides());
                }}
                aria-label={`Toggle ${key}`}
              />
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] text-neutral-400">Ctrl+Shift+F to toggle · Reload for route-guard changes</p>
    </div>
  );
}
