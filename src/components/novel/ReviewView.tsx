import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, CheckCircle2, AlertCircle, ThumbsUp, Plus, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useNovelContext } from '@/contexts/NovelContext';
import { Scene, ReviewAnnotation } from '@/types/novel';
import { Badge } from '@/components/ui/badge';

const ANNOTATION_ICONS = {
  note: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  issue: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  praise: { icon: ThumbsUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const statusColors: Record<Scene['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/20 text-primary',
  complete: 'bg-emerald-500/20 text-emerald-400',
  revision: 'bg-amber-500/20 text-amber-400',
};

export default function ReviewView() {
  const { activeNovel, addReviewAnnotation, updateReviewAnnotation, deleteReviewAnnotation } = useNovelContext();
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  if (!activeNovel) return null;
  const annotations = activeNovel.reviewAnnotations || [];

  const allScenes = activeNovel.acts.flatMap(act =>
    act.chapters.flatMap(ch =>
      ch.scenes.map(s => ({ ...s, actTitle: act.title, chTitle: ch.title }))
    )
  );

  const totalWords = allScenes.reduce((s, sc) => s + sc.wordCount, 0);
  const complete = allScenes.filter(s => s.status === 'complete').length;
  const issues = annotations.filter(a => a.type === 'issue' && !a.resolved).length;

  const toggleScene = (id: string) => {
    setExpandedScenes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
          <Eye className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-bold font-serif text-foreground">Review</h2>
            <p className="text-xs text-muted-foreground">Read, annotate, and track revision status</p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Total Words', value: totalWords.toLocaleString() },
          { label: 'Scenes', value: allScenes.length.toString() },
          { label: 'Complete', value: `${complete}/${allScenes.length}` },
          { label: 'Open Issues', value: issues.toString() },
        ].map(stat => (
          <div key={stat.label} className="rounded-sm border-2 border-border/70 bg-card/80 px-4 py-3 shadow-none">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-xl font-bold font-mono text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Scene list */}
      <div className="space-y-2">
        {allScenes.map((scene, i) => {
          const sceneAnnotations = annotations.filter(a => a.sceneId === scene.id);
          const isExpanded = expandedScenes.has(scene.id);

          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-sm border-2 border-border/70 bg-card/80 shadow-none"
            >
              {/* Scene header */}
              <button
                onClick={() => toggleScene(scene.id)}
                className="flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left transition-colors hover:bg-accent/5"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{scene.title}</span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[scene.status]}`}>
                      {scene.status}
                    </Badge>
                    {sceneAnnotations.filter(a => a.type === 'issue' && !a.resolved).length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent-foreground">
                        {sceneAnnotations.filter(a => a.type === 'issue' && !a.resolved).length} issue{sceneAnnotations.filter(a => a.type === 'issue' && !a.resolved).length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{scene.actTitle} · {scene.chTitle}</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {scene.wordCount > 0 ? `${scene.wordCount}w` : '—'}
                </span>
              </button>

              {/* Expanded scene content + annotations */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t-2 border-border/40"
                  >
                    <div className="grid grid-cols-2 gap-0">
                      {/* Scene content */}
                      <div className="border-r-2 border-border/40 p-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Content Preview</p>
                        {scene.content ? (
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-12 font-serif">
                            {scene.content}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No content written yet.</p>
                        )}
                        {scene.summary && (
                          <div className="mt-3 rounded-sm border-2 border-border/50 bg-muted/40 px-3 py-2 shadow-none">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Summary</p>
                            <p className="text-xs text-muted-foreground">{scene.summary}</p>
                          </div>
                        )}
                      </div>

                      {/* Annotations panel */}
                      <div className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Annotations</p>
                          <div className="flex gap-1">
                            {(['note', 'issue', 'praise'] as const).map(t => {
                              const { icon: Icon, color } = ANNOTATION_ICONS[t];
                              return (
                                <button
                                  key={t}
                                  onClick={() => addReviewAnnotation(scene.id, t)}
                                  title={`Add ${t}`}
                                  className={`rounded p-1 hover:bg-accent/10 transition-colors ${color}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {sceneAnnotations.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 italic">No annotations. Add notes, issues, or praise.</p>
                        ) : (
                          <div className="space-y-2">
                            {sceneAnnotations.map(ann => {
                              const { icon: Icon, color, bg } = ANNOTATION_ICONS[ann.type];
                              return (
                                <div
                                  key={ann.id}
                                  className={`group relative rounded-sm border-2 border-border/40 p-2.5 shadow-none ${bg} ${ann.resolved ? 'opacity-50' : ''}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
                                    <textarea
                                      value={ann.content}
                                      onChange={e => updateReviewAnnotation(ann.id, { content: e.target.value })}
                                      placeholder={`Add ${ann.type}…`}
                                      rows={2}
                                      className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                    />
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => updateReviewAnnotation(ann.id, { resolved: !ann.resolved })}
                                        title={ann.resolved ? 'Unresolve' : 'Resolve'}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                      >
                                        <CheckCircle2 className={`h-3.5 w-3.5 ${ann.resolved ? 'text-primary' : ''}`} />
                                      </button>
                                      <button
                                        onClick={() => deleteReviewAnnotation(ann.id)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                      >
                                        <Plus className="h-3.5 w-3.5 rotate-45" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
