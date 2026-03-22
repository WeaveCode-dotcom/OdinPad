import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  GripVertical,
  Layers,
  LayoutList,
  LayoutGrid,
  Circle,
  Triangle,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronsUpDown,
} from 'lucide-react';
import { useNovelContext } from '@/contexts/NovelContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scene, CustomBeat } from '@/types/novel';
import FrameworkSelector from './FrameworkSelector';
import FrameworkVisualization from './FrameworkVisualization';
import { StoryFramework, getFrameworkById, STORY_FRAMEWORKS } from '@/lib/story-frameworks';

const statusColors: Record<Scene['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/20 text-primary',
  complete: 'bg-emerald-500/20 text-emerald-400',
  revision: 'bg-amber-500/20 text-amber-400',
};

type VizMode = 'linear' | 'grid' | 'circle' | 'pyramid';

const vizOptions: { mode: VizMode; icon: React.ElementType; label: string }[] = [
  { mode: 'linear', icon: LayoutList, label: 'Linear' },
  { mode: 'grid', icon: LayoutGrid, label: 'Grid' },
  { mode: 'circle', icon: Circle, label: 'Circle' },
  { mode: 'pyramid', icon: Triangle, label: 'Pyramid' },
];

export default function PlanView() {
  const {
    activeNovel,
    addActToNovel, addChapterToAct, addSceneToChapter,
    setActiveScene, setMode, reorderScene,
    applyFramework, getActiveBeats,
    updateBeat, addCustomBeat, deleteBeat, reorderBeats,
  } = useNovelContext();

  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(activeNovel?.acts.map(a => a.id) || []));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(activeNovel?.acts.flatMap(a => a.chapters.map(c => c.id)) || [])
  );
  const [frameworkOpen, setFrameworkOpen] = useState(false);
  const [vizMode, setVizMode] = useState<VizMode>('linear');
  const [showFrameworkViz, setShowFrameworkViz] = useState(false);
  const [showBeats, setShowBeats] = useState(true);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [beatDrag, setBeatDrag] = useState<number | null>(null);

  // Drag state for scenes
  const [dragInfo, setDragInfo] = useState<{ sceneId: string; chapterId: string } | null>(null);

  if (!activeNovel) return null;

  const beats = getActiveBeats();
  const activeFramework = STORY_FRAMEWORKS.find(f => f.id === activeNovel.frameworkId) || STORY_FRAMEWORKS[0];

  // Build a FrameworkVisualization-compatible object from custom beats
  const vizFramework: StoryFramework = {
    ...activeFramework,
    beats: beats.map(b => ({ id: b.id, title: b.title, description: b.description, percentage: b.percentage, tags: b.tags, optional: b.optional })),
  };

  const toggleAct = (id: string) => setExpandedActs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleChapter = (id: string) => setExpandedChapters(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openScene = (sceneId: string) => { setActiveScene(sceneId); setMode('write'); };

  const handleDragStart = (sceneId: string, chapterId: string) => setDragInfo({ sceneId, chapterId });
  const handleDrop = (targetChapterId: string, targetIndex: number) => {
    if (!dragInfo) return;
    reorderScene(dragInfo.sceneId, dragInfo.chapterId, targetChapterId, targetIndex);
    setDragInfo(null);
  };

  const handleFrameworkSelect = (fw: StoryFramework) => {
    applyFramework(fw.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-none p-3 sm:p-4"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold font-serif text-foreground">Outline</h2>
          <button
            onClick={() => setFrameworkOpen(true)}
            className="flex items-center gap-1.5 rounded-sm border-2 border-border/70 bg-card/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-none transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            {activeFramework.shortName}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBeats(!showBeats)}
            className={`rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${showBeats ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Beats
          </button>
          <button
            onClick={() => setShowFrameworkViz(!showFrameworkViz)}
            className={`rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${showFrameworkViz ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {showFrameworkViz ? 'Hide' : 'Show'} Visual
          </button>
          {showFrameworkViz && (
            <div className="flex items-center gap-0.5 rounded-sm border-2 border-border bg-secondary/50 p-0.5 shadow-none">
              {vizOptions.map(v => (
                <button
                  key={v.mode}
                  onClick={() => setVizMode(v.mode)}
                  className={`rounded p-1.5 transition-colors ${vizMode === v.mode ? 'bg-accent/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title={v.label}
                >
                  <v.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={addActToNovel} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Act
          </Button>
        </div>
      </div>

      {/* Framework visualization */}
      <AnimatePresence>
        {showFrameworkViz && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 rounded-sm border-2 border-border/70 bg-card/30 p-4 shadow-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{activeFramework.name}</h3>
                <p className="text-xs text-muted-foreground">{activeFramework.description}</p>
              </div>
              <div className="flex gap-1">
                {activeFramework.bestFor.map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
            <FrameworkVisualization framework={vizFramework} mode={vizMode} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beats panel */}
      <AnimatePresence>
        {showBeats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 rounded-sm border-2 border-border/70 bg-card/30 shadow-none overflow-hidden"
          >
            <div className="flex items-center justify-between border-b-2 border-border/40 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {activeFramework.shortName} Beats ({beats.length})
              </span>
              <button
                onClick={() => addCustomBeat()}
                className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Beat
              </button>
            </div>
            <div className="divide-y divide-border/20">
              {beats.map((beat, idx) => (
                <BeatRow
                  key={beat.id}
                  beat={beat}
                  index={idx}
                  total={beats.length}
                  isEditing={editingBeatId === beat.id}
                  onStartEdit={() => setEditingBeatId(beat.id)}
                  onStopEdit={() => setEditingBeatId(null)}
                  onUpdate={updateBeat}
                  onDelete={deleteBeat}
                  onAddAfter={() => { addCustomBeat(beat.id); }}
                  onMoveUp={() => idx > 0 && reorderBeats(idx, idx - 1)}
                  onMoveDown={() => idx < beats.length - 1 && reorderBeats(idx, idx + 1)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outline tree */}
      <div className="space-y-2">
        {activeNovel.acts.map(act => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-sm border-2 border-border/70 bg-card/50 shadow-none"
          >
            <button
              onClick={() => toggleAct(act.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-accent/5 transition-colors rounded-sm"
            >
              {expandedActs.has(act.id)
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-semibold text-foreground">{act.title}</span>
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {act.chapters.length} ch · {act.chapters.reduce((s, c) => s + c.scenes.length, 0)} scenes
              </span>
            </button>

            {expandedActs.has(act.id) && (
              <div className="border-t-2 border-border/40 px-2 pb-2">
                {act.chapters.map(chapter => (
                  <div key={chapter.id} className="ml-4 mt-1">
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent/5 transition-colors"
                    >
                      {expandedChapters.has(chapter.id)
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="font-medium text-foreground">{chapter.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">
                        {chapter.scenes.length} scenes
                      </span>
                    </button>

                    {expandedChapters.has(chapter.id) && (
                      <div
                        className="ml-6 space-y-1 pb-2"
                        onDragOver={e => { e.preventDefault(); }}
                        onDrop={e => { e.preventDefault(); handleDrop(chapter.id, chapter.scenes.length); }}
                      >
                        {chapter.scenes.map((scene, sceneIdx) => (
                          <div
                            key={scene.id}
                            draggable
                            onDragStart={() => handleDragStart(scene.id, chapter.id)}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(chapter.id, sceneIdx); }}
                            onClick={() => openScene(scene.id)}
                            className="group flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-accent/5 transition-colors"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-border opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground truncate">{scene.title}</span>
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[scene.status]}`}>
                                  {scene.status}
                                </Badge>
                              </div>
                              {scene.summary && (
                                <p className="mt-0.5 text-xs text-muted-foreground truncate">{scene.summary}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                              {scene.wordCount > 0 ? `${scene.wordCount}w` : '—'}
                            </span>
                          </div>
                        ))}
                        <button
                          onClick={() => addSceneToChapter(chapter.id)}
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Scene
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addChapterToAct(act.id)}
                  className="ml-4 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Chapter
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <FrameworkSelector
        open={frameworkOpen}
        onOpenChange={setFrameworkOpen}
        currentFrameworkId={activeNovel.frameworkId}
        onSelect={handleFrameworkSelect}
      />
    </motion.div>
  );
}

// ── Beat Row component ────────────────────────────────────────────────────────

function BeatRow({
  beat, index, total, isEditing,
  onStartEdit, onStopEdit, onUpdate, onDelete, onAddAfter, onMoveUp, onMoveDown,
}: {
  beat: CustomBeat;
  index: number;
  total: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (id: string, patch: Partial<CustomBeat>) => void;
  onDelete: (id: string) => void;
  onAddAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [localTitle, setLocalTitle] = useState(beat.title);
  const [localDesc, setLocalDesc] = useState(beat.description);
  const [localPct, setLocalPct] = useState(beat.percentage);

  const save = () => {
    onUpdate(beat.id, { title: localTitle, description: localDesc, percentage: localPct });
    onStopEdit();
  };

  const cancel = () => {
    setLocalTitle(beat.title);
    setLocalDesc(beat.description);
    setLocalPct(beat.percentage);
    onStopEdit();
  };

  return (
    <div className="group px-4 py-2.5 hover:bg-accent/5 transition-colors">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
              className="flex-1 rounded-sm border-2 border-border bg-background px-2 py-1 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={localPct}
              onChange={e => setLocalPct(Number(e.target.value))}
              className="w-16 rounded-sm border-2 border-border bg-background px-2 py-1 text-xs text-center font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-ring"
              title="Story %"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <button onClick={save} className="rounded p-1 text-primary hover:bg-primary/10 transition-colors"><Check className="h-4 w-4" /></button>
            <button onClick={cancel} className="rounded p-1 text-muted-foreground hover:bg-accent/10 transition-colors"><X className="h-4 w-4" /></button>
          </div>
          <textarea
            value={localDesc}
            onChange={e => setLocalDesc(e.target.value)}
            placeholder="Beat description…"
            rows={2}
            className="w-full resize-none rounded-sm border-2 border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Reorder */}
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onMoveUp} disabled={index === 0} className="disabled:opacity-20 text-muted-foreground hover:text-foreground"><ChevronDown className="h-3 w-3 rotate-180" /></button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="disabled:opacity-20 text-muted-foreground hover:text-foreground"><ChevronDown className="h-3 w-3" /></button>
          </div>

          {/* Order badge */}
          <span className="w-5 text-center text-xs font-mono text-muted-foreground/60 shrink-0">{index + 1}</span>

          {/* Title + desc */}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground">{beat.title}</span>
            {beat.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{beat.description}</p>
            )}
          </div>

          {/* Pct */}
          <span className="shrink-0 text-xs font-mono text-muted-foreground">{beat.percentage}%</span>

          {/* Tags */}
          {beat.tags.slice(0, 2).map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{t}</Badge>
          ))}

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onStartEdit} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors" title="Edit"><Pencil className="h-3 w-3" /></button>
            <button onClick={onAddAfter} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors" title="Add beat after"><Plus className="h-3 w-3" /></button>
            <button onClick={() => onDelete(beat.id)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
