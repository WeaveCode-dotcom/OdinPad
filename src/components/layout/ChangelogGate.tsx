import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "odinpad_seen_changelog_items";

type ChangelogFile = {
  version: string;
  date: string;
  items: string[];
};

function loadSeenItems(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeenItems(seen: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

export function ChangelogGate() {
  const [items, setItems] = useState<string[]>([]);
  const [version, setVersion] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/changelog.json", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as ChangelogFile;
        const seen = loadSeenItems();
        const newItems = data.items.filter((item) => !seen.has(item));
        if (newItems.length === 0 || cancelled) return;
        setVersion(data.version);
        setDate(data.date);
        setItems(newItems);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissItem = (item: string) => {
    const seen = loadSeenItems();
    seen.add(item);
    saveSeenItems(seen);
    setItems((prev) => prev.filter((i) => i !== item));
  };

  const dismissAll = () => {
    const seen = loadSeenItems();
    items.forEach((item) => seen.add(item));
    saveSeenItems(seen);
    setItems([]);
  };

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => (
          <motion.div
            key={item}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 30, delay: i * 0.06 }}
            className="pointer-events-auto flex w-[min(92vw,360px)] items-start gap-3 rounded-sm border-2 border-neutral-900 bg-white px-3 py-2.5 shadow-[4px_4px_0_0_rgb(0_0_0_/_0.12)]"
          >
            {i === 0 && (
              <div className="shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">v{version}</p>
                <p className="text-[9px] text-muted-foreground/70">{date}</p>
              </div>
            )}
            <p className="min-w-0 flex-1 text-xs font-medium text-neutral-800">{item}</p>
            <button
              type="button"
              onClick={() => dismissItem(item)}
              aria-label="Dismiss changelog item"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </motion.div>
        ))}

        {items.length > 1 && (
          <motion.button
            key="dismiss-all"
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            type="button"
            onClick={dismissAll}
            className="pointer-events-auto text-[10px] font-semibold text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Dismiss all
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
