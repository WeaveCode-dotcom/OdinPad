import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Trash2, GripVertical, ChevronRight } from 'lucide-react';
import { useNovelContext } from '@/contexts/NovelContext';
import { BrainstormNote } from '@/types/novel';

export default function BrainstormView() {
  const { activeNovel, addBrainstormNote, updateBrainstormNote, deleteBrainstormNote } = useNovelContext();
  const [activeNote, setActiveNote] = useState<string | null>(null);

  if (!activeNovel) return null;

  const notes = activeNovel.brainstormNotes || [];
  const current = notes.find(n => n.id === activeNote);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full"
    >
      {/* Sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-r-2 border-border bg-card/40">
        <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Brainstorm</span>
          </div>
          <button
            onClick={() => {
              addBrainstormNote();
            }}
            className="rounded-sm border-2 border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:bg-accent/10 hover:text-foreground"
            title="New note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {notes.length === 0 && (
            <div className="mt-12 flex flex-col items-center text-center px-4">
              <Zap className="mb-3 h-8 w-8 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">No brainstorm notes yet.</p>
              <button
                onClick={addBrainstormNote}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Create your first note
              </button>
            </div>
          )}
          <AnimatePresence>
            {notes.map(note => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={() => setActiveNote(note.id)}
                className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-sm border-2 border-transparent px-3 py-2.5 transition-colors ${
                  activeNote === note.id
                    ? 'border-border bg-accent/10 text-foreground'
                    : 'text-muted-foreground hover:border-border hover:bg-accent/5 hover:text-foreground'
                }`}
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${note.color.split(' ')[0]}`} />
                <span className="flex-1 truncate text-sm">{note.title || 'Untitled'}</span>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        {!current ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <Zap className="mb-4 h-12 w-12 text-muted-foreground/20" />
            <h3 className="mb-2 text-lg font-semibold font-serif text-foreground">Brainstorm freely</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create notes for themes, character arcs, world-building ideas, or anything that doesn't fit elsewhere.
            </p>
            <button
              onClick={addBrainstormNote}
              className="mt-6 flex items-center gap-2 rounded-sm border-2 border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-none transition-colors hover:-translate-x-px hover:-translate-y-px hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Note
            </button>
          </div>
        ) : (
          <NoteEditor
            key={current.id}
            note={current}
            onUpdate={updateBrainstormNote}
            onDelete={(id) => {
              deleteBrainstormNote(id);
              setActiveNote(null);
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

const NOTE_COLORS = [
  { label: 'Amber', cls: 'bg-primary/10 border-primary/20' },
  { label: 'Violet', cls: 'bg-violet-500/10 border-violet-500/20' },
  { label: 'Emerald', cls: 'bg-emerald-500/10 border-emerald-500/20' },
  { label: 'Rose', cls: 'bg-rose-500/10 border-rose-500/20' },
  { label: 'Sky', cls: 'bg-sky-500/10 border-sky-500/20' },
];

function NoteEditor({
  note,
  onUpdate,
  onDelete,
}: {
  note: BrainstormNote;
  onUpdate: (id: string, patch: Partial<BrainstormNote>) => void;
  onDelete: (id: string) => void;
}) {
  const colorInfo = NOTE_COLORS.find(c => c.cls.startsWith(note.color.split(' ')[0])) || NOTE_COLORS[0];

  return (
    <div className="w-full max-w-none p-4 sm:p-6 lg:px-10">
      {/* Title + actions */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          value={note.title}
          onChange={e => onUpdate(note.id, { title: e.target.value })}
          placeholder="Note title…"
          className="flex-1 bg-transparent text-2xl font-bold font-serif text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          {/* Color picker */}
          <div className="flex gap-1">
            {NOTE_COLORS.map(c => (
              <button
                key={c.cls}
                onClick={() => onUpdate(note.id, { color: c.cls })}
                title={c.label}
                className={`h-4 w-4 rounded-full border-2 transition-all ${c.cls} ${
                  note.color === c.cls ? 'scale-125' : 'opacity-50 hover:opacity-100'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => onDelete(note.id)}
            className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content editor */}
      <div className={`min-h-96 rounded-sm border-2 border-border p-5 shadow-none ${note.color}`}>
        <textarea
          value={note.content}
          onChange={e => onUpdate(note.id, { content: e.target.value })}
          placeholder="Start writing your brainstorm here… Use bullet points, stream of consciousness, questions, connections — anything goes."
          className="min-h-80 w-full resize-none bg-transparent text-sm text-foreground leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>

      <p className="mt-3 text-right text-[10px] text-muted-foreground/50">
        {note.content.split(/\s+/).filter(Boolean).length} words · {note.content.length} chars
      </p>
    </div>
  );
}
