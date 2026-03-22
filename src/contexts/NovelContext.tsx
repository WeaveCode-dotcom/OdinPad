import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Novel, Scene, CodexEntry, WorkspaceMode, Idea, BrainstormNote, CustomBeat } from '@/types/novel';
import {
  createNovel, createNovelWithOptions, createDemoNovel, createAct, createChapter, createScene,
  createCodexEntry, createIdea, createBrainstormNote, saveNovels,
  fetchRemoteNovels, syncNovelsToRemote, deleteRemoteNovel, CreateNovelOptions,
} from '@/lib/novel-store';
import { STORY_FRAMEWORKS, FrameworkBeat } from '@/lib/story-frameworks';
import { useAuth } from '@/contexts/AuthContext';
import { syncDailyStatsSnapshot } from '@/lib/writer-stats';

/** Editable book-level fields (dashboard / settings). */
export type NovelMetadataPatch = Partial<
  Pick<Novel, 'title' | 'author' | 'genre' | 'premise' | 'targetWordCount' | 'status' | 'frameworkId' | 'series'>
>;

interface NovelContextType {
  novels: Novel[];
  activeNovel: Novel | null;
  activeSceneId: string | null;
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  setActiveNovel: (id: string) => void;
  setActiveScene: (id: string | null) => void;
  addNovel: (title: string, author: string) => void;
  addNovelWithOptions: (title: string, author: string, options?: CreateNovelOptions) => void;
  /** Replace or add a book from JSON backup; same `id` overwrites. */
  importNovel: (novel: Novel) => void;
  patchNovel: (novelId: string, patch: NovelMetadataPatch) => void;
  deleteNovel: (novelId: string) => Promise<void>;
  updateSceneContent: (sceneId: string, content: string) => void;
  updateSceneSummary: (sceneId: string, summary: string) => void;
  addActToNovel: () => void;
  addChapterToAct: (actId: string) => void;
  addSceneToChapter: (chapterId: string) => void;
  addCodexEntry: (type: CodexEntry['type'], name: string) => void;
  updateCodexEntry: (entryId: string, patch: Partial<CodexEntry>) => void;
  deleteCodexEntry: (entryId: string) => void;
  getActiveScene: () => Scene | null;
  goToDashboard: () => void;
  reorderScene: (sceneId: string, fromChapterId: string, toChapterId: string, toIndex: number) => void;
  applyFramework: (frameworkId: string) => void;
  // Beat customization
  updateBeat: (beatId: string, patch: Partial<CustomBeat>) => void;
  addCustomBeat: (afterBeatId?: string) => void;
  deleteBeat: (beatId: string) => void;
  reorderBeats: (from: number, to: number) => void;
  getActiveBeats: () => CustomBeat[];
  // Ideas
  addIdea: (category: Idea['category']) => void;
  /** Append an idea with content to a book without changing active novel or workspace. */
  addIdeaToNovel: (novelId: string, category: Idea['category'], content: string) => void;
  updateIdea: (id: string, patch: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  // Brainstorm
  addBrainstormNote: () => void;
  updateBrainstormNote: (id: string, patch: Partial<BrainstormNote>) => void;
  deleteBrainstormNote: (id: string) => void;
}

const NovelContext = createContext<NovelContextType | null>(null);

export function useNovelContext() {
  const ctx = useContext(NovelContext);
  if (!ctx) throw new Error('useNovelContext must be used within NovelProvider');
  return ctx;
}

function frameworkBeatsToCustom(beats: FrameworkBeat[]): CustomBeat[] {
  return beats.map((b, i) => ({ ...b, order: i }));
}

export function NovelProvider({ children }: { children: React.ReactNode }) {
  const { user, preferences } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>('ideas');
  const [isHydrated, setIsHydrated] = useState(false);

  // Bootstrap novels from Supabase and optionally import local cache once.
  useEffect(() => {
    let cancelled = false;

    const bootstrapNovels = async () => {
      if (!user?.id) {
        if (!cancelled) setNovels([]);
        if (!cancelled) setIsHydrated(true);
        return;
      }

      setIsHydrated(false);
      setNovels([]);

      try {
        const remoteNovels = await fetchRemoteNovels(user.id);
        if (cancelled) return;

        if (remoteNovels.length > 0) {
          setNovels(remoteNovels);
          setIsHydrated(true);
          return;
        }

        const seeded = [createDemoNovel()];
        await syncNovelsToRemote(user.id, seeded);
        if (!cancelled) {
          setNovels(seeded);
          setIsHydrated(true);
        }
      } catch (error) {
        console.warn('OdinPad: remote novel load failed; preserving strict user-scoped isolation', error);
        if (!cancelled) {
          setNovels([]);
          setIsHydrated(true);
        }
      }
    };

    void bootstrapNovels();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Persist locally and sync to Supabase when hydrated.
  useEffect(() => {
    saveNovels(novels);
    if (!user?.id || !isHydrated) return;

    const timer = window.setTimeout(() => {
      syncNovelsToRemote(user.id, novels).catch(error => {
        console.warn('OdinPad: failed to sync novels to Supabase', error);
      });
      syncDailyStatsSnapshot(user.id, novels).catch(error => {
        console.warn('OdinPad: failed to sync daily stats snapshot', error);
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [novels, user?.id, isHydrated]);

  useEffect(() => {
    if (!activeNovelId) return;
    if (novels.some(n => n.id === activeNovelId)) return;
    setActiveNovelId(null);
    setActiveSceneId(null);
  }, [novels, activeNovelId]);

  const activeNovel = novels.find(n => n.id === activeNovelId) || null;

  const setActiveNovel = useCallback((id: string) => {
    setActiveNovelId(id);
    const preferredMode = preferences?.preferred_workspace_mode as WorkspaceMode | null | undefined;
    setMode(preferredMode ?? 'ideas');
    setActiveSceneId(null);
  }, [preferences?.preferred_workspace_mode]);

  const goToDashboard = useCallback(() => {
    setActiveNovelId(null);
    setActiveSceneId(null);
  }, []);

  const addNovel = useCallback((title: string, author: string) => {
    const novel = createNovel(title, author);
    setNovels(prev => [...prev, novel]);
    setActiveNovelId(novel.id);
    setMode('ideas');
  }, []);

  const addNovelWithOptions = useCallback((title: string, author: string, options: CreateNovelOptions = {}) => {
    const novel = createNovelWithOptions(title, author, options);
    setNovels(prev => [...prev, novel]);
    setActiveNovelId(novel.id);
    setMode(options.status === 'outlining' ? 'plan' : 'write');
  }, []);

  const importNovel = useCallback((novel: Novel) => {
    setNovels(prev => {
      const without = prev.filter(n => n.id !== novel.id);
      return [...without, { ...novel, updatedAt: new Date().toISOString() }];
    });
    setActiveNovelId(novel.id);
    setMode('ideas');
    setActiveSceneId(null);
  }, []);

  const patchNovel = useCallback((novelId: string, patch: NovelMetadataPatch) => {
    setNovels(prev =>
      prev.map(n => {
        if (n.id !== novelId) return n;
        const next: Novel = { ...n, ...patch, updatedAt: new Date().toISOString() };
        if (patch.frameworkId && patch.frameworkId !== n.frameworkId) {
          const fw = STORY_FRAMEWORKS.find(f => f.id === patch.frameworkId);
          if (fw) {
            next.customBeats = frameworkBeatsToCustom(fw.beats);
          }
        }
        return next;
      }),
    );
  }, []);

  const deleteNovel = useCallback(
    async (novelId: string) => {
      setNovels(prev => prev.filter(n => n.id !== novelId));
      if (activeNovelId === novelId) {
        setActiveNovelId(null);
        setActiveSceneId(null);
      }
      if (user?.id) {
        await deleteRemoteNovel(user.id, novelId);
      }
    },
    [activeNovelId, user?.id],
  );

  const updateNovel = useCallback((updater: (n: Novel) => Novel) => {
    setNovels(prev => prev.map(n => n.id === activeNovelId ? { ...updater(n), updatedAt: new Date().toISOString() } : n));
  }, [activeNovelId]);

  const updateSceneContent = useCallback((sceneId: string, content: string) => {
    updateNovel(novel => ({
      ...novel,
      acts: novel.acts.map(act => ({
        ...act,
        chapters: act.chapters.map(ch => ({
          ...ch,
          scenes: ch.scenes.map(s =>
            s.id === sceneId ? { ...s, content, wordCount: content.split(/\s+/).filter(Boolean).length } : s
          ),
        })),
      })),
    }));
  }, [updateNovel]);

  const updateSceneSummary = useCallback((sceneId: string, summary: string) => {
    updateNovel(novel => ({
      ...novel,
      acts: novel.acts.map(act => ({
        ...act,
        chapters: act.chapters.map(ch => ({
          ...ch,
          scenes: ch.scenes.map(s => s.id === sceneId ? { ...s, summary } : s),
        })),
      })),
    }));
  }, [updateNovel]);

  const addActToNovel = useCallback(() => {
    updateNovel(novel => ({ ...novel, acts: [...novel.acts, createAct(novel.acts.length)] }));
  }, [updateNovel]);

  const addChapterToAct = useCallback((actId: string) => {
    updateNovel(novel => ({
      ...novel,
      acts: novel.acts.map(act =>
        act.id === actId ? { ...act, chapters: [...act.chapters, createChapter(act.chapters.length)] } : act
      ),
    }));
  }, [updateNovel]);

  const addSceneToChapter = useCallback((chapterId: string) => {
    updateNovel(novel => ({
      ...novel,
      acts: novel.acts.map(act => ({
        ...act,
        chapters: act.chapters.map(ch =>
          ch.id === chapterId ? { ...ch, scenes: [...ch.scenes, createScene(ch.scenes.length)] } : ch
        ),
      })),
    }));
  }, [updateNovel]);

  const addCodexEntry = useCallback((type: CodexEntry['type'], name: string) => {
    updateNovel(novel => ({ ...novel, codexEntries: [...novel.codexEntries, createCodexEntry(type, name)] }));
  }, [updateNovel]);

  const updateCodexEntry = useCallback((entryId: string, patch: Partial<CodexEntry>) => {
    updateNovel(novel => ({
      ...novel,
      codexEntries: novel.codexEntries.map(entry => (
        entry.id === entryId ? { ...entry, ...patch } : entry
      )),
    }));
  }, [updateNovel]);

  const deleteCodexEntry = useCallback((entryId: string) => {
    updateNovel(novel => ({
      ...novel,
      codexEntries: novel.codexEntries.filter(entry => entry.id !== entryId),
    }));
  }, [updateNovel]);

  const getActiveScene = useCallback((): Scene | null => {
    if (!activeNovel || !activeSceneId) return null;
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        const scene = ch.scenes.find(s => s.id === activeSceneId);
        if (scene) return scene;
      }
    }
    return null;
  }, [activeNovel, activeSceneId]);

  const reorderScene = useCallback((sceneId: string, fromChapterId: string, toChapterId: string, toIndex: number) => {
    updateNovel(novel => {
      let movedScene: Scene | null = null;
      const updatedActs = novel.acts.map(act => ({
        ...act,
        chapters: act.chapters.map(ch => {
          if (ch.id === fromChapterId) {
            const idx = ch.scenes.findIndex(s => s.id === sceneId);
            if (idx >= 0) {
              movedScene = ch.scenes[idx];
              return { ...ch, scenes: ch.scenes.filter(s => s.id !== sceneId) };
            }
          }
          return ch;
        }),
      }));
      if (!movedScene) return novel;
      return {
        ...novel,
        acts: updatedActs.map(act => ({
          ...act,
          chapters: act.chapters.map(ch => {
            if (ch.id === toChapterId) {
              const newScenes = [...ch.scenes];
              newScenes.splice(toIndex, 0, movedScene!);
              return { ...ch, scenes: newScenes.map((s, i) => ({ ...s, order: i })) };
            }
            return ch;
          }),
        })),
      };
    });
  }, [updateNovel]);

  const applyFramework = useCallback((frameworkId: string) => {
    const fw = STORY_FRAMEWORKS.find(f => f.id === frameworkId);
    if (!fw) return;
    const customBeats = frameworkBeatsToCustom(fw.beats);
    updateNovel(novel => ({ ...novel, frameworkId, customBeats }));
  }, [updateNovel]);

  const getActiveBeats = useCallback((): CustomBeat[] => {
    if (!activeNovel) return [];
    if (activeNovel.customBeats && activeNovel.customBeats.length > 0) {
      return [...activeNovel.customBeats].sort((a, b) => a.order - b.order);
    }
    const fw = STORY_FRAMEWORKS.find(f => f.id === activeNovel.frameworkId) || STORY_FRAMEWORKS[0];
    return frameworkBeatsToCustom(fw.beats);
  }, [activeNovel]);

  const updateBeat = useCallback((beatId: string, patch: Partial<CustomBeat>) => {
    updateNovel(novel => {
      const beats = novel.customBeats && novel.customBeats.length > 0
        ? novel.customBeats
        : frameworkBeatsToCustom(STORY_FRAMEWORKS.find(f => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats);
      return { ...novel, customBeats: beats.map(b => b.id === beatId ? { ...b, ...patch } : b) };
    });
  }, [updateNovel]);

  const addCustomBeat = useCallback((afterBeatId?: string) => {
    updateNovel(novel => {
      const beats = novel.customBeats && novel.customBeats.length > 0
        ? novel.customBeats
        : frameworkBeatsToCustom(STORY_FRAMEWORKS.find(f => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats);
      const newBeat: CustomBeat = {
        id: `beat_custom_${Date.now()}`,
        title: 'New Beat',
        description: '',
        percentage: 5,
        tags: [],
        order: beats.length,
      };
      if (afterBeatId) {
        const idx = beats.findIndex(b => b.id === afterBeatId);
        const result = [...beats];
        result.splice(idx + 1, 0, newBeat);
        return { ...novel, customBeats: result.map((b, i) => ({ ...b, order: i })) };
      }
      return { ...novel, customBeats: [...beats, newBeat] };
    });
  }, [updateNovel]);

  const deleteBeat = useCallback((beatId: string) => {
    updateNovel(novel => {
      const beats = novel.customBeats && novel.customBeats.length > 0
        ? novel.customBeats
        : frameworkBeatsToCustom(STORY_FRAMEWORKS.find(f => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats);
      return { ...novel, customBeats: beats.filter(b => b.id !== beatId).map((b, i) => ({ ...b, order: i })) };
    });
  }, [updateNovel]);

  const reorderBeats = useCallback((from: number, to: number) => {
    updateNovel(novel => {
      const beats = novel.customBeats && novel.customBeats.length > 0
        ? [...novel.customBeats]
        : frameworkBeatsToCustom(STORY_FRAMEWORKS.find(f => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats);
      const [moved] = beats.splice(from, 1);
      beats.splice(to, 0, moved);
      return { ...novel, customBeats: beats.map((b, i) => ({ ...b, order: i })) };
    });
  }, [updateNovel]);

  const addIdea = useCallback((category: Idea['category']) => {
    updateNovel(novel => ({ ...novel, ideas: [...(novel.ideas || []), createIdea(category)] }));
  }, [updateNovel]);

  const addIdeaToNovel = useCallback((novelId: string, category: Idea['category'], content: string) => {
    const idea = createIdea(category);
    idea.content = content.trim();
    if (!idea.content) return;
    setNovels(prev =>
      prev.map(n =>
        n.id === novelId
          ? { ...n, ideas: [...(n.ideas || []), idea], updatedAt: new Date().toISOString() }
          : n,
      ),
    );
  }, []);

  const updateIdea = useCallback((id: string, patch: Partial<Idea>) => {
    updateNovel(novel => ({
      ...novel,
      ideas: (novel.ideas || []).map(idea => idea.id === id ? { ...idea, ...patch } : idea),
    }));
  }, [updateNovel]);

  const deleteIdea = useCallback((id: string) => {
    updateNovel(novel => ({ ...novel, ideas: (novel.ideas || []).filter(idea => idea.id !== id) }));
  }, [updateNovel]);

  const addBrainstormNote = useCallback(() => {
    updateNovel(novel => ({ ...novel, brainstormNotes: [...(novel.brainstormNotes || []), createBrainstormNote()] }));
  }, [updateNovel]);

  const updateBrainstormNote = useCallback((id: string, patch: Partial<BrainstormNote>) => {
    updateNovel(novel => ({
      ...novel,
      brainstormNotes: (novel.brainstormNotes || []).map(n => n.id === id ? { ...n, ...patch } : n),
    }));
  }, [updateNovel]);

  const deleteBrainstormNote = useCallback((id: string) => {
    updateNovel(novel => ({ ...novel, brainstormNotes: (novel.brainstormNotes || []).filter(n => n.id !== id) }));
  }, [updateNovel]);

  return (
    <NovelContext.Provider
      value={{
        novels,
        activeNovel,
        activeSceneId,
        mode,
        setMode,
        setActiveNovel,
        setActiveScene: setActiveSceneId,
        addNovel,
        addNovelWithOptions,
        importNovel,
        patchNovel,
        deleteNovel,
        updateSceneContent,
        updateSceneSummary,
        addActToNovel,
        addChapterToAct,
        addSceneToChapter,
        addCodexEntry,
        updateCodexEntry,
        deleteCodexEntry,
        getActiveScene,
        goToDashboard,
        reorderScene,
        applyFramework,
        updateBeat,
        addCustomBeat,
        deleteBeat,
        reorderBeats,
        getActiveBeats,
        addIdea,
        addIdeaToNovel,
        updateIdea,
        deleteIdea,
        addBrainstormNote,
        updateBrainstormNote,
        deleteBrainstormNote,
      }}
    >
      {children}
    </NovelContext.Provider>
  );
}
