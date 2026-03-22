import { useState, useEffect, useRef } from 'react';
import { useNovelContext } from '@/contexts/NovelContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WriteView() {
  const { activeNovel, activeSceneId, getActiveScene, updateSceneContent, updateScene, setActiveScene } = useNovelContext();
  const { preferences, updatePreferences } = useAuth();
  const scene = getActiveScene();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(scene?.content || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem('odinpad_editor_font_scale') ?? '1'));
  const [sprintSeconds, setSprintSeconds] = useState(0);
  const [sprintRunning, setSprintRunning] = useState(false);

  useEffect(() => {
    setLocalContent(scene?.content || '');
  }, [activeSceneId, scene?.content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [localContent]);

  useEffect(() => {
    localStorage.setItem('odinpad_editor_font_scale', String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (!sprintRunning) return;
    const timer = window.setInterval(() => setSprintSeconds(prev => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [sprintRunning]);

  // Debounce save
  useEffect(() => {
    if (!activeSceneId) return;
    const timer = setTimeout(() => {
      updateSceneContent(activeSceneId, localContent);
    }, 500);
    return () => clearTimeout(timer);
  }, [localContent, activeSceneId, updateSceneContent]);

  const allScenes = (activeNovel?.acts ?? []).flatMap(act => act.chapters.flatMap(ch => ch.scenes));
  const filteredScenes = allScenes.filter(s => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || (s.summary || '').toLowerCase().includes(q);
  });

  const wordCount = localContent.split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (!activeNovel || !scene || !preferences || preferences.first_100_words_at) return;
    if (wordCount < 100) return;
    void updatePreferences({ first_100_words_at: new Date().toISOString() });
    toast({
      title: 'Great start!',
      description: 'You reached your first 100 words. Keep going.',
    });
  }, [wordCount, activeNovel, scene, preferences, updatePreferences]);

  // If no scene selected, show scene list
  if (!scene) {
    return (
      <div className="w-full max-w-none p-3 sm:p-4">
        <h2 className="mb-6 text-2xl font-bold font-serif text-foreground">Manuscript</h2>
        <p className="mb-6 text-muted-foreground text-sm">Select a scene to begin writing.</p>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search scenes..."
          className="mb-4 w-full rounded-sm border-2 border-border/70 bg-background/80 px-3 py-2 text-sm font-medium shadow-none outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="space-y-1">
          {filteredScenes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveScene(s.id)}
                  className="flex w-full items-center justify-between rounded-sm border-2 border-transparent px-4 py-3 text-left text-sm transition-colors hover:border-border hover:bg-surface-hover"
                >
                  <div>
                    <span className="font-medium text-foreground">{s.title}</span>
                    {s.summary && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">{s.summary}</p>
                    )}
                  </div>
                  <span className="text-xs text-text-dim font-mono">
                    {s.wordCount > 0 ? `${s.wordCount}w` : 'empty'}
                  </span>
                </button>
              ))}
        </div>
      </div>
    );
  }

  if (!activeNovel) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Scene header */}
      <div className="flex items-center gap-3 border-b-2 border-border/40 px-3 py-3 sm:px-4">
        <button
          onClick={() => setActiveScene(null)}
          className="rounded-sm border-2 border-transparent p-1.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground hover:bg-surface-hover"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{scene.title}</h3>
          {scene.pov && (
            <span className="text-xs text-muted-foreground">POV: {scene.pov}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-text-dim font-mono">
          <button
            onClick={() => setSprintRunning(prev => !prev)}
            className="rounded-sm border-2 border-border px-2 py-1 font-semibold shadow-none transition-colors hover:bg-surface-hover"
          >
            {sprintRunning ? 'Stop sprint' : 'Start sprint'}
          </button>
          <span>
            {String(Math.floor(sprintSeconds / 60)).padStart(2, '0')}:{String(sprintSeconds % 60).padStart(2, '0')}
          </span>
          <span>{wordCount} words</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-border/30 px-6 py-2 text-xs">
        <label className="text-muted-foreground">Status</label>
        <Select
          value={scene.status}
          onValueChange={value => updateScene(scene.id, { status: value as typeof scene.status })}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="revised">Revised</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
        <label className="ml-2 text-muted-foreground">Font</label>
        <button onClick={() => setFontScale(v => Math.max(0.85, Number((v - 0.05).toFixed(2))))} className="rounded-sm border-2 border-border bg-background px-2 font-semibold shadow-none">-</button>
        <span>{Math.round(fontScale * 100)}%</span>
        <button onClick={() => setFontScale(v => Math.min(1.3, Number((v + 0.05).toFixed(2))))} className="rounded-sm border-2 border-border bg-background px-2 font-semibold shadow-none">+</button>
        {activeNovel.codexEntries.slice(0, 8).map(entry => {
          const linked = (scene.codexRefs || []).includes(entry.id);
          return (
            <button
              key={entry.id}
              onClick={() =>
                updateScene(scene.id, {
                  codexRefs: linked
                    ? (scene.codexRefs || []).filter(id => id !== entry.id)
                    : [...(scene.codexRefs || []), entry.id],
                })
              }
              className={`rounded-sm border-2 border-border px-2 py-1 text-xs font-semibold shadow-none transition-colors ${linked ? 'border-primary bg-primary text-primary-foreground' : 'bg-secondary/60 text-secondary-foreground'}`}
            >
              {entry.name}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-none px-4 py-8 sm:px-8 lg:px-12">
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={e => setLocalContent(e.target.value)}
            data-tour="write-editor"
            placeholder="Begin writing your scene..."
            className="prose-editor w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/40 min-h-[60vh]"
            style={{ fontSize: `${fontScale}rem`, lineHeight: 1.75 }}
            spellCheck
          />
        </div>
      </div>
    </div>
  );
}
