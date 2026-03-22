import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Plus, Trash2, Pin, PinOff, Sparkles } from 'lucide-react';
import { useNovelContext } from '@/contexts/NovelContext';
import { Idea } from '@/types/novel';

const CATEGORIES: { value: Idea['category']; label: string; color: string }[] = [
  { value: 'plot', label: 'Plot', color: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'character', label: 'Character', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'world', label: 'World', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'theme', label: 'Theme', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { value: 'misc', label: 'Misc', color: 'bg-muted text-muted-foreground border-border' },
];

export default function IdeasView() {
  const { activeNovel, addIdea, updateIdea, deleteIdea } = useNovelContext();
  const [filter, setFilter] = useState<Idea['category'] | 'all'>('all');

  if (!activeNovel) return null;

  const ideas = activeNovel.ideas || [];
  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.category === filter);
  const pinned = filtered.filter(i => i.pinned);
  const unpinned = filtered.filter(i => !i.pinned);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-none p-3 sm:p-4"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-bold font-serif text-foreground">Ideas</h2>
            <p className="text-xs text-muted-foreground">{ideas.length} idea{ideas.length !== 1 ? 's' : ''} captured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => addIdea(cat.value)}
              title={`Add ${cat.label} idea`}
              className="flex items-center gap-1 rounded-sm border-2 border-border/70 bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-none transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex w-fit items-center gap-1 rounded-sm border-2 border-border bg-secondary/50 p-0.5 shadow-none">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === 'all' ? 'bg-accent/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({ideas.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = ideas.filter(i => i.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === cat.value ? 'bg-accent/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Sparkles className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No ideas yet. Capture your first spark above.</p>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Pinned</p>
          <div className="space-y-2">
            <AnimatePresence>
              {pinned.map(idea => (
                <IdeaCard key={idea.id} idea={idea} onUpdate={updateIdea} onDelete={deleteIdea} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* All ideas */}
      <div className="space-y-2">
        <AnimatePresence>
          {unpinned.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onUpdate={updateIdea} onDelete={deleteIdea} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function IdeaCard({
  idea,
  onUpdate,
  onDelete,
}: {
  idea: Idea;
  onUpdate: (id: string, patch: Partial<Idea>) => void;
  onDelete: (id: string) => void;
}) {
  const cat = CATEGORIES.find(c => c.value === idea.category) || CATEGORIES[4];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      className="group relative rounded-sm border-2 border-border/70 bg-card/80 p-3 shadow-none transition-colors hover:border-border"
    >
      <div className="flex items-start gap-3">
        {/* Category badge */}
        <select
          value={idea.category}
          onChange={e => onUpdate(idea.id, { category: e.target.value as Idea['category'] })}
          className={`shrink-0 cursor-pointer appearance-none rounded-sm border-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors bg-transparent shadow-none ${cat.color}`}
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {/* Content */}
        <textarea
          value={idea.content}
          onChange={e => onUpdate(idea.id, { content: e.target.value })}
          placeholder="Write your idea here…"
          rows={idea.content.split('\n').length || 1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
        />

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onUpdate(idea.id, { pinned: !idea.pinned })}
            className={`rounded p-1 transition-colors ${idea.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title={idea.pinned ? 'Unpin' : 'Pin'}
          >
            {idea.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onDelete(idea.id)}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
