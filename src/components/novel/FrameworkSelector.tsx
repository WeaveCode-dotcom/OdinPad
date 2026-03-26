import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Circle, Layers, Search, Triangle, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getCoreFrameworks, getUnlockableFrameworks, STORY_FRAMEWORKS, StoryFramework } from "@/lib/story-frameworks";

const vizIcons: Record<string, React.ElementType> = {
  linear: ArrowRight,
  circle: Circle,
  pyramid: Triangle,
};

interface FrameworkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFrameworkId?: string;
  onSelect: (framework: StoryFramework) => void;
}

export default function FrameworkSelector({
  open,
  onOpenChange,
  currentFrameworkId,
  onSelect,
}: FrameworkSelectorProps) {
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const core = getCoreFrameworks();
  const unlockable = getUnlockableFrameworks();

  const filterFn = (f: StoryFramework) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.shortName.toLowerCase().includes(q) ||
      f.bestFor.some((t) => t.toLowerCase().includes(q))
    );
  };

  const filteredCore = core.filter(filterFn);
  const filteredUnlockable = unlockable.filter(filterFn);
  const previewFramework = previewId ? STORY_FRAMEWORKS.find((f) => f.id === previewId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Story Framework Selector
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search frameworks (Hero, Save, Kisho...)"
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
          <AnimatePresence mode="wait">
            {previewFramework ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => setPreviewId(null)}
                  className="flex items-center gap-1 mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowRight className="h-3 w-3 rotate-180" /> Back to list
                </button>
                <h3 className="text-lg font-semibold text-foreground mb-1">{previewFramework.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{previewFramework.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {previewFramework.bestFor.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Beat list */}
                <div className="space-y-2">
                  {previewFramework.beats.map((beat, i) => (
                    <div
                      key={beat.id}
                      className="flex items-start gap-3 rounded-sm border-2 border-border/70 bg-card/80 px-4 py-3 shadow-none"
                    >
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-sm border border-primary/30 bg-primary/15 text-xs font-bold font-mono text-primary">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{beat.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">~{beat.percentage}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{beat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={() => {
                      onSelect(previewFramework);
                      onOpenChange(false);
                    }}
                    className="flex-1 gap-2"
                  >
                    <Check className="h-4 w-4" /> Apply Framework
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewId(null)}>
                    Back
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Core */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Core Frameworks ({filteredCore.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredCore.map((f) => {
                      const VizIcon = vizIcons[f.visualization];
                      const isCurrent = f.id === currentFrameworkId;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setPreviewId(f.id)}
                          className={`group relative rounded-sm border-2 p-4 text-left shadow-none transition-colors ${
                            isCurrent
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/70 bg-card/80 hover:border-primary/30"
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute top-2 right-2 text-[10px] text-primary font-medium">Current</span>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <VizIcon className="h-4 w-4 text-primary/70" />
                            <span className="font-semibold text-sm text-foreground">{f.shortName}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                              {f.beatCount} beats
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{f.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {f.bestFor.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-sm border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unlockable */}
                {filteredUnlockable.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Additional Frameworks ({filteredUnlockable.length})
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredUnlockable.map((f) => {
                        const VizIcon = vizIcons[f.visualization];
                        return (
                          <button
                            key={f.id}
                            onClick={() => setPreviewId(f.id)}
                            className="group rounded-sm border-2 border-border/70 bg-card/80 p-4 text-left shadow-none transition-colors hover:border-primary/30"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <VizIcon className="h-4 w-4 text-primary/70" />
                              <span className="font-semibold text-sm text-foreground">{f.shortName}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                                {f.beatCount} beats
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
