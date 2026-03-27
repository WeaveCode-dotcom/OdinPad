import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteSnapshot, diffLines, loadSnapshots, saveSnapshot, type SceneSnapshot } from "@/lib/scene-snapshots";
import { cn } from "@/lib/utils";

interface SceneSnapshotPanelProps {
  sceneId: string;
  currentContent: string;
  onClose: () => void;
  onRestore: (content: string) => void;
}

export function SceneSnapshotPanel({ sceneId, currentContent, onClose, onRestore }: SceneSnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<SceneSnapshot[]>(() => loadSnapshots(sceneId));
  const [viewing, setViewing] = useState<SceneSnapshot | null>(null);

  useEffect(() => {
    setSnapshots(loadSnapshots(sceneId));
    setViewing(null);
  }, [sceneId]);

  const handleSave = () => {
    const snap = saveSnapshot(sceneId, currentContent);
    setSnapshots((prev) => [snap, ...prev].slice(0, 10));
  };

  const handleDelete = (snapId: string) => {
    deleteSnapshot(sceneId, snapId);
    setSnapshots((prev) => prev.filter((s) => s.id !== snapId));
    if (viewing?.id === snapId) setViewing(null);
  };

  const diff = viewing ? diffLines(viewing.content, currentContent) : [];

  return (
    <div className="flex h-full flex-col border-l border-border bg-card/90 w-72">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        {viewing ? (
          <button
            onClick={() => setViewing(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Back
          </button>
        ) : (
          <h3 className="text-sm font-semibold text-foreground">Scene History</h3>
        )}
        <button
          onClick={onClose}
          aria-label="Close snapshot panel"
          className="rounded-sm border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewing ? (
          <motion.div
            key="diff"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="border-b border-border/50 px-4 py-2">
              <p className="text-xs font-semibold text-foreground">{viewing.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {viewing.wordCount.toLocaleString()} words in snapshot
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onRestore(viewing.content)}
                >
                  Restore this version
                </Button>
              </div>
              <div className="mt-2 flex gap-3 text-[10px]">
                <span className="flex items-center gap-0.5 text-emerald-700">
                  <span className="inline-block h-2 w-2 rounded-sm bg-emerald-200 border border-emerald-500" />
                  Added
                </span>
                <span className="flex items-center gap-0.5 text-rose-700">
                  <span className="inline-block h-2 w-2 rounded-sm bg-rose-100 border border-rose-400" />
                  Removed
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-5">
              {diff.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-1 whitespace-pre-wrap break-words",
                    line.kind === "add" && "bg-emerald-50 text-emerald-900",
                    line.kind === "del" && "bg-rose-50 text-rose-900 line-through opacity-70",
                    line.kind === "eq" && "text-muted-foreground",
                  )}
                >
                  {line.kind === "add" ? "+ " : line.kind === "del" ? "- " : "  "}
                  {line.text || " "}
                </div>
              ))}
              {diff.length === 0 && (
                <p className="text-xs text-muted-foreground">No differences — snapshot matches current content.</p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="border-b border-border/50 px-4 py-3">
              <Button
                type="button"
                size="sm"
                className="w-full gap-1.5 border border-border bg-primary text-white hover:bg-primary/90"
                onClick={handleSave}
              >
                <Camera className="h-3.5 w-3.5" aria-hidden />
                Save snapshot now
              </Button>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Stores up to 10 snapshots per scene in browser storage.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {snapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No snapshots yet. Save one to track changes over time.</p>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-start justify-between gap-2 rounded-sm border-2 border-border/70 bg-background/60 px-3 py-2"
                  >
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setViewing(snap)}>
                      <p className="text-xs font-medium text-foreground truncate">{snap.label}</p>
                      <p className="text-[10px] text-muted-foreground">{snap.wordCount.toLocaleString()} words</p>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete snapshot"
                      onClick={() => handleDelete(snap.id)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
