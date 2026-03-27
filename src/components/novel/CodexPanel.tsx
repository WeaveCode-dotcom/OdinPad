import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Gem,
  GitCommitHorizontal,
  MapPin,
  Pin,
  PinOff,
  Plus,
  Scroll,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useNovelContext } from "@/contexts/NovelContext";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { CharacterArc, CodexEntry } from "@/types/novel";

const ARC_STAGES: { key: keyof CharacterArc; label: string; placeholder: string }[] = [
  { key: "startingState", label: "Starting state", placeholder: "Who is this character at the beginning?" },
  { key: "incitingWound", label: "Inciting wound", placeholder: "What wound or flaw drives their arc?" },
  { key: "midpointShift", label: "Midpoint shift", placeholder: "What changes at the midpoint?" },
  { key: "climaxChoice", label: "Climax choice", placeholder: "What decision do they face at the climax?" },
  { key: "endingState", label: "Ending state", placeholder: "Who have they become by the end?" },
];

type LegacyType = "character" | "location" | "lore" | "item" | "faction";

const typeIcons: Record<LegacyType, React.ElementType> = {
  character: Users,
  location: MapPin,
  lore: Scroll,
  item: Gem,
  faction: Shield,
};

const typeLabels: Record<LegacyType, string> = {
  character: "Characters",
  location: "Locations",
  lore: "Lore",
  item: "Items",
  faction: "Factions",
};

const types: LegacyType[] = ["character", "location", "lore", "item", "faction"];

export default function CodexPanel({
  onClose,
  pinned = false,
  onTogglePin,
}: {
  onClose: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const { activeNovel, addCodexEntry, updateCodexEntry, deleteCodexEntry } = useNovelContext();
  const { schedule } = useUndoableAction();
  const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);
  const [addingType, setAddingType] = useState<LegacyType | null>(null);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");

  if (!activeNovel) return null;

  const searchQ = search.trim().toLowerCase();
  const grouped = types.reduce(
    (acc, type) => {
      acc[type] = activeNovel.storyWikiEntries.filter((e) => {
        if (e.type !== type) return false;
        if (!searchQ) return true;
        return (
          e.name.toLowerCase().includes(searchQ) ||
          e.description.toLowerCase().includes(searchQ) ||
          e.notes.toLowerCase().includes(searchQ) ||
          e.tags.some((t) => t.toLowerCase().includes(searchQ))
        );
      });
      return acc;
    },
    {} as Record<LegacyType, CodexEntry[]>,
  );

  const codexTotal = activeNovel.storyWikiEntries.length;

  const handleAdd = () => {
    if (!newName.trim() || !addingType) return;
    addCodexEntry(addingType, newName.trim());
    setNewName("");
    setAddingType(null);
  };

  const handleUpdateSelected = (patch: Partial<CodexEntry>) => {
    if (!selectedEntry) return;
    const updated = { ...selectedEntry, ...patch };
    setSelectedEntry(updated);
    updateCodexEntry(selectedEntry.id, patch);
  };

  return (
    <div
      id="novel-codex-panel"
      className={`flex h-full flex-col border-l-2 border-border bg-card/90 ${pinned ? "w-80" : "w-72"}`}
    >
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Codex</h3>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              title={pinned ? "Unpin codex panel" : "Pin codex panel open"}
              aria-label={pinned ? "Unpin codex panel" : "Pin codex panel open"}
              className={`rounded-sm border-2 border-transparent p-1 transition-colors hover:border-border hover:text-foreground ${pinned ? "text-primary" : "text-muted-foreground"}`}
            >
              {pinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close codex panel"
            className="rounded-sm border-2 border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {!selectedEntry && (
        <div className="border-b-2 border-border/50 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search codex…"
              className="h-7 pl-7 text-xs"
              aria-label="Search codex entries"
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedEntry ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-y-auto p-4"
          >
            <button
              onClick={() => setSelectedEntry(null)}
              className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              Back
            </button>
            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const Icon = typeIcons[selectedEntry.type];
                return <Icon className="h-4 w-4 text-primary" />;
              })()}
              <Input
                value={selectedEntry.name}
                onChange={(e) => handleUpdateSelected({ name: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={selectedEntry.description}
                  onChange={(e) => handleUpdateSelected({ description: e.target.value })}
                  rows={4}
                  className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notes
                </label>
                <textarea
                  value={selectedEntry.notes}
                  onChange={(e) => handleUpdateSelected({ notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tags (comma separated)
                </label>
                <Input
                  value={selectedEntry.tags.join(", ")}
                  onChange={(e) =>
                    handleUpdateSelected({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              {/* Character arc worksheet */}
              {selectedEntry.type === "character" && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <GitCommitHorizontal className="h-3.5 w-3.5 text-primary" aria-hidden />
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Character Arc
                    </label>
                  </div>
                  <div className="space-y-2">
                    {ARC_STAGES.map((stage) => (
                      <div key={stage.key}>
                        <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {stage.label}
                        </label>
                        <textarea
                          value={selectedEntry.arc?.[stage.key] ?? ""}
                          onChange={(e) =>
                            handleUpdateSelected({
                              arc: { ...(selectedEntry.arc ?? {}), [stage.key]: e.target.value },
                            })
                          }
                          rows={2}
                          placeholder={stage.placeholder}
                          className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-xs text-foreground shadow-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  const id = selectedEntry.id;
                  setSelectedEntry(null);
                  schedule(() => deleteCodexEntry(id), { message: "Removing codex entry…" });
                }}
                className="w-full rounded-sm border-2 border-destructive/50 px-2 py-1.5 text-xs font-semibold text-destructive shadow-none transition-colors hover:bg-destructive/10"
              >
                Delete entry
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-3"
          >
            {codexTotal === 0 && (
              <div className="mb-4 rounded-md border-2 border-dashed border-border bg-muted/20 p-3 text-center">
                <p className="text-sm font-semibold text-foreground">Your Codex is empty</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Track characters, places, and lore so names and continuity stay consistent in drafts.
                </p>
                <p className="mt-2 text-xs font-medium text-teal-800">
                  Add your first entry with the + next to a category.
                </p>
              </div>
            )}
            {types.map((type) => {
              const Icon = typeIcons[type];
              const entries = grouped[type];
              return (
                <div key={type} className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {typeLabels[type]}
                    </span>
                    <button
                      onClick={() => setAddingType(addingType === type ? null : type)}
                      data-tour={type === "character" ? "codex-add-character" : undefined}
                      className="rounded-sm border-2 border-transparent p-0.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {addingType === type && (
                    <div className="mb-1.5 px-1">
                      <Input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAdd();
                          if (e.key === "Escape") setAddingType(null);
                        }}
                        placeholder={`New ${type}...`}
                        className="h-7 text-xs"
                      />
                    </div>
                  )}

                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="flex w-full items-center gap-2 rounded-sm border-2 border-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                    >
                      <span className="truncate">{entry.name}</span>
                    </button>
                  ))}

                  {entries.length === 0 && addingType !== type && (
                    <p className="px-2 text-[11px] text-text-dim">No entries yet</p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
