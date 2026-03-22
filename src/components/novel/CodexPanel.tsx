import { useState } from 'react';
import { useNovelContext } from '@/contexts/NovelContext';
import { Users, MapPin, Scroll, Gem, Shield, Plus, X, ChevronRight } from 'lucide-react';
import { CodexEntry } from '@/types/novel';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons: Record<CodexEntry['type'], React.ElementType> = {
  character: Users,
  location: MapPin,
  lore: Scroll,
  item: Gem,
  faction: Shield,
};

const typeLabels: Record<CodexEntry['type'], string> = {
  character: 'Characters',
  location: 'Locations',
  lore: 'Lore',
  item: 'Items',
  faction: 'Factions',
};

const types: CodexEntry['type'][] = ['character', 'location', 'lore', 'item', 'faction'];

export default function CodexPanel({ onClose }: { onClose: () => void }) {
  const { activeNovel, addCodexEntry, updateCodexEntry, deleteCodexEntry } = useNovelContext();
  const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);
  const [addingType, setAddingType] = useState<CodexEntry['type'] | null>(null);
  const [newName, setNewName] = useState('');

  if (!activeNovel) return null;

  const grouped = types.reduce((acc, type) => {
    acc[type] = activeNovel.codexEntries.filter(e => e.type === type);
    return acc;
  }, {} as Record<CodexEntry['type'], CodexEntry[]>);

  const handleAdd = () => {
    if (!newName.trim() || !addingType) return;
    addCodexEntry(addingType, newName.trim());
    setNewName('');
    setAddingType(null);
  };

  const handleUpdateSelected = (patch: Partial<CodexEntry>) => {
    if (!selectedEntry) return;
    const updated = { ...selectedEntry, ...patch };
    setSelectedEntry(updated);
    updateCodexEntry(selectedEntry.id, patch);
  };

  return (
    <div className="flex h-full w-72 flex-col border-l-2 border-border bg-card/90">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Codex</h3>
        <button onClick={onClose} className="rounded-sm border-2 border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

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
              {(() => { const Icon = typeIcons[selectedEntry.type]; return <Icon className="h-4 w-4 text-primary" />; })()}
              <Input
                value={selectedEntry.name}
                onChange={e => handleUpdateSelected({ name: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={selectedEntry.description}
                  onChange={e => handleUpdateSelected({ description: e.target.value })}
                  rows={4}
                  className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
                <textarea
                  value={selectedEntry.notes}
                  onChange={e => handleUpdateSelected({ notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
                <Input
                  value={selectedEntry.tags.join(', ')}
                  onChange={e =>
                    handleUpdateSelected({
                      tags: e.target.value
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <button
                onClick={() => {
                  deleteCodexEntry(selectedEntry.id);
                  setSelectedEntry(null);
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
            {types.map(type => {
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
                      data-tour={type === 'character' ? 'codex-add-character' : undefined}
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
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAdd();
                          if (e.key === 'Escape') setAddingType(null);
                        }}
                        placeholder={`New ${type}...`}
                        className="h-7 text-xs"
                      />
                    </div>
                  )}

                  {entries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="flex w-full items-center gap-2 rounded-sm border-2 border-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground"
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
