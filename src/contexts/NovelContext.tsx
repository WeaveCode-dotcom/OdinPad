import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { IdeaWebProvider, useIdeaWebContext } from "@/contexts/IdeaWebContext";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { hasMigratedIdeaWeb, markIdeaWebMigrated, migrateLegacyNovelIdeasToIdeaWeb } from "@/lib/idea-web";
import {
  createAct,
  createBrainstormNote,
  createChapter,
  createCodexEntry,
  createDemoNovel,
  createNovel,
  CreateNovelOptions,
  createNovelWithOptions,
  createScene,
  deleteRemoteNovel,
  fetchRemoteNovels,
  loadNovels,
  NOVELS_STORAGE_KEY,
  saveNovels,
  syncNovelsToRemote,
} from "@/lib/novel-store";
import { FrameworkBeat, STORY_FRAMEWORKS } from "@/lib/story-frameworks";
import { countWords, getNovelWordCount } from "@/lib/novel-metrics";
import { mapSupabaseError } from "@/lib/supabase-errors";
import { incrementUserDailyWords } from "@/lib/user-stats-daily";
import type { IdeaWebEntry, IdeaWebLink, IdeaWebRevisionSnapshot, IdeaWebStatus } from "@/types/idea-web";
import {
  BrainstormNote,
  CanvasState,
  CodexEntry,
  CustomBeat,
  Idea,
  Novel,
  ReviewAnnotation,
  Scene,
  WorkspaceMode,
} from "@/types/novel";

/** Editable book-level fields (dashboard / settings). */
export type NovelMetadataPatch = Partial<
  Pick<
    Novel,
    | "title"
    | "author"
    | "penName"
    | "subtitle"
    | "genre"
    | "secondaryGenres"
    | "premise"
    | "logline"
    | "comparables"
    | "targetWordCount"
    | "wordCountPreset"
    | "status"
    | "frameworkId"
    | "series"
    | "seriesId"
    | "seriesPosition"
    | "audience"
    | "contentWarnings"
    | "defaultPov"
    | "defaultTense"
    | "coverImageDataUrl"
    | "coverImageStorageUrl"
  >
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
  updateScene: (sceneId: string, patch: Partial<Scene>) => void;
  addActToNovel: () => void;
  addChapterToAct: (actId: string) => void;
  addSceneToChapter: (chapterId: string) => void;
  addCodexEntry: (type: CodexEntry["type"], name: string) => void;
  updateCodexEntry: (entryId: string, patch: Partial<CodexEntry>) => void;
  deleteCodexEntry: (entryId: string) => void;
  getActiveScene: () => Scene | null;
  goToDashboard: () => void;
  /** Open a book and switch to Sandbox mode (in-book expansion tools). */
  openBookSandbox: (novelId: string) => void;
  /** Merge Canvas studio JSON (corkboard, timeline, atlas, observatory). */
  updateCanvas: (updater: (prev: CanvasState | undefined) => CanvasState) => void;
  reorderScene: (sceneId: string, fromChapterId: string, toChapterId: string, toIndex: number) => void;
  deleteScene: (sceneId: string) => void;
  duplicateScene: (sceneId: string) => void;
  updateAct: (actId: string, patch: { title?: string; summary?: string; color?: string }) => void;
  deleteAct: (actId: string) => void;
  reorderAct: (from: number, to: number) => void;
  updateChapter: (chapterId: string, patch: { title?: string; summary?: string; targetWordCount?: number }) => void;
  deleteChapter: (chapterId: string) => void;
  reorderChapter: (actId: string, from: number, to: number) => void;
  applyFramework: (frameworkId: string) => void;
  // Beat customization
  updateBeat: (beatId: string, patch: Partial<CustomBeat>) => void;
  addCustomBeat: (afterBeatId?: string) => void;
  deleteBeat: (beatId: string) => void;
  reorderBeats: (from: number, to: number) => void;
  getActiveBeats: () => CustomBeat[];
  // Idea Web — all new ideas land in inbox (`novel_id` null) until assigned or harvested
  /** Create an empty idea in the global inbox (not attached to a project). */
  addIdeaToInbox: (category: Idea["category"]) => void;
  updateIdea: (id: string, patch: Partial<Idea> & { title?: string }) => void;
  /** Assign to a project and/or change lifecycle status (from Idea Web inbox). */
  patchIdeaWebEntry: (
    id: string,
    patch: Partial<{ novelId: string | null; status: IdeaWebStatus; remindAt: string | null }>,
  ) => Promise<void>;
  deleteIdea: (id: string) => void;
  /** Idea Web (Supabase-backed) */
  ideaWebEntries: IdeaWebEntry[];
  ideaWebLinks: IdeaWebLink[];
  refetchIdeaWeb: () => Promise<void>;
  createGlobalIdeaWebEntry: (input: {
    title: string;
    body: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) => Promise<IdeaWebEntry | undefined>;
  /** Move ideas into a project; optional codex stubs for character/world ideas. */
  harvestIdeaWebEntries: (
    entryIds: string[],
    targetNovelId: string,
    options?: { addCodexStubs?: boolean; harvestShelfLabel?: string },
  ) => Promise<void>;
  /** Save a manual checkpoint revision for an idea (thread history). */
  checkpointIdeaWebEntry: (id: string) => Promise<void>;
  /** Remove all stored revisions for one idea (privacy). */
  deleteIdeaWebEntryRevisions: (id: string) => Promise<void>;
  /** Restore entry fields from a revision snapshot (saves current state as a revision first). */
  restoreIdeaWebFromSnapshot: (id: string, snapshot: IdeaWebRevisionSnapshot) => Promise<void>;
  // Edit pass state
  updateEditPassState: (sceneId: string, patch: Partial<import("@/types/novel").EditScenePassRecord>) => void;
  // Review annotations (stored on the Novel object)
  addReviewAnnotation: (sceneId: string, type: ReviewAnnotation["type"], content?: string) => void;
  updateReviewAnnotation: (id: string, patch: Partial<ReviewAnnotation>) => void;
  deleteReviewAnnotation: (id: string) => void;
  // Brainstorm
  addBrainstormNote: () => void;
  updateBrainstormNote: (id: string, patch: Partial<BrainstormNote>) => void;
  deleteBrainstormNote: (id: string) => void;
  /** Local ↔ Supabase manuscript sync (debounced). */
  novelSyncStatus: "idle" | "syncing" | "saved" | "error";
  lastNovelSyncedAt: number | null;
  /** Another tab has newer novel JSON in localStorage. */
  novelStorageConflict: { novelId: string } | null;
  applyNovelsFromStorage: () => void;
  dismissNovelStorageConflict: () => void;
}

const NovelContext = createContext<NovelContextType | null>(null);

export function useNovelContext() {
  const ctx = useContext(NovelContext);
  if (!ctx) throw new Error("useNovelContext must be used within NovelProvider");
  return ctx;
}

function frameworkBeatsToCustom(beats: FrameworkBeat[]): CustomBeat[] {
  return beats.map((b, i) => ({ ...b, order: i }));
}

/** Map legacy DB values (`plan`, `brainstorm`) to Canvas / Sandbox. */
function normalizeWorkspaceMode(mode: string | null | undefined): WorkspaceMode {
  if (mode === "sandbox" || mode === "canvas" || mode === "write" || mode === "edit" || mode === "review") return mode;
  if (mode === "brainstorm") return "sandbox";
  if (mode === "plan") return "canvas";
  return "canvas";
}

// ---------------------------------------------------------------------------
// State shape passed from NovelProvider → NovelContextInner
// ---------------------------------------------------------------------------
interface NovelOuterState {
  novels: Novel[];
  setNovels: React.Dispatch<React.SetStateAction<Novel[]>>;
  activeNovelId: string | null;
  setActiveNovelId: React.Dispatch<React.SetStateAction<string | null>>;
  activeSceneId: string | null;
  setActiveSceneId: React.Dispatch<React.SetStateAction<string | null>>;
  mode: WorkspaceMode;
  setMode: React.Dispatch<React.SetStateAction<WorkspaceMode>>;
  novelSyncStatus: "idle" | "syncing" | "saved" | "error";
  lastNovelSyncedAt: number | null;
  novelStorageConflict: { novelId: string } | null;
  applyNovelsFromStorage: () => void;
  dismissNovelStorageConflict: () => void;
}

// ---------------------------------------------------------------------------
// Inner component — has access to IdeaWebContext (provided above it in the tree)
// ---------------------------------------------------------------------------
function NovelContextInner({
  children,
  novels,
  setNovels,
  activeNovelId,
  setActiveNovelId,
  activeSceneId,
  setActiveSceneId,
  mode,
  setMode,
  novelSyncStatus,
  lastNovelSyncedAt,
  novelStorageConflict,
  applyNovelsFromStorage,
  dismissNovelStorageConflict,
}: NovelOuterState & { children: React.ReactNode }) {
  const { user, preferences, updatePreferences } = useAuth();
  const ideaWeb = useIdeaWebContext();

  // Legacy migration: run once per user after hydration, from NovelContext
  // because it reads novels state.
  useEffect(() => {
    if (!user?.id) return;
    if (novels.length === 0) return; // wait until hydrated
    if (hasMigratedIdeaWeb(user.id)) return;
    void (async () => {
      try {
        if (novels.length === 0) {
          markIdeaWebMigrated(user.id);
          await ideaWeb.refetchIdeaWeb();
          return;
        }
        const hadLegacy = await migrateLegacyNovelIdeasToIdeaWeb(user.id, novels);
        markIdeaWebMigrated(user.id);
        if (hadLegacy) {
          setNovels((prev) => {
            const next = prev.map((n) => ({ ...n, ideas: [], updatedAt: new Date().toISOString() }));
            void syncNovelsToRemote(user.id, next).catch((err) => {
              console.warn("OdinPad: sync after idea migration failed", err);
            });
            return next;
          });
        }
        await ideaWeb.refetchIdeaWeb();
      } catch (e) {
        console.warn("OdinPad: Idea Web legacy migration failed", e);
      }
    })();
  }, [user?.id, novels, ideaWeb, setNovels]);

  const activeNovel = novels.find((n) => n.id === activeNovelId) || null;

  const setActiveNovel = useCallback(
    (id: string) => {
      setActiveNovelId(id);
      const preferredMode = preferences?.preferred_workspace_mode;
      setMode(normalizeWorkspaceMode(preferredMode));
      setActiveSceneId(null);
      if (user?.id && !preferences?.first_run_novel_created) {
        void updatePreferences({ first_run_novel_created: true });
      }
    },
    [
      preferences?.first_run_novel_created,
      preferences?.preferred_workspace_mode,
      updatePreferences,
      user?.id,
      setActiveNovelId,
      setMode,
      setActiveSceneId,
    ],
  );

  const goToDashboard = useCallback(() => {
    setActiveNovelId(null);
    setActiveSceneId(null);
  }, [setActiveNovelId, setActiveSceneId]);

  const openBookSandbox = useCallback(
    (id: string) => {
      setActiveNovelId(id);
      setMode("sandbox");
      setActiveSceneId(null);
    },
    [setActiveNovelId, setMode, setActiveSceneId],
  );

  const addNovel = useCallback(
    (title: string, author: string) => {
      const novel = createNovel(title, author);
      setNovels((prev) => [...prev, novel]);
      setActiveNovelId(novel.id);
      setMode("canvas");
    },
    [setNovels, setActiveNovelId, setMode],
  );

  const addNovelWithOptions = useCallback(
    (title: string, author: string, options: CreateNovelOptions = {}) => {
      const novel = createNovelWithOptions(title, author, options);
      setNovels((prev) => [...prev, novel]);
      setActiveNovelId(novel.id);
      setMode(options.status === "outlining" ? "canvas" : "write");
      if (!preferences?.first_run_novel_created) {
        void updatePreferences({ first_run_novel_created: true });
      }
    },
    [preferences?.first_run_novel_created, updatePreferences, setNovels, setActiveNovelId, setMode],
  );

  const importNovel = useCallback(
    (novel: Novel) => {
      setNovels((prev) => {
        const without = prev.filter((n) => n.id !== novel.id);
        return [...without, { ...novel, updatedAt: new Date().toISOString() }];
      });
      setActiveNovelId(novel.id);
      setMode("canvas");
      setActiveSceneId(null);
      if (!preferences?.first_run_novel_created) {
        void updatePreferences({ first_run_novel_created: true });
      }
    },
    [preferences?.first_run_novel_created, updatePreferences, setNovels, setActiveNovelId, setMode, setActiveSceneId],
  );

  const patchNovel = useCallback(
    (novelId: string, patch: NovelMetadataPatch) => {
      setNovels((prev) =>
        prev.map((n) => {
          if (n.id !== novelId) return n;
          const next: Novel = { ...n, ...patch, updatedAt: new Date().toISOString() };
          if (patch.frameworkId && patch.frameworkId !== n.frameworkId) {
            const fw = STORY_FRAMEWORKS.find((f) => f.id === patch.frameworkId);
            if (fw) {
              next.customBeats = frameworkBeatsToCustom(fw.beats);
            }
          }
          return next;
        }),
      );
    },
    [setNovels],
  );

  const deleteNovel = useCallback(
    async (novelId: string) => {
      const snapshot = novels.find((n) => n.id === novelId);
      const wasActive = activeNovelId === novelId;
      const prevSceneId = activeSceneId;
      setNovels((prev) => prev.filter((n) => n.id !== novelId));
      if (wasActive) {
        setActiveNovelId(null);
        setActiveSceneId(null);
      }
      if (user?.id) {
        try {
          await deleteRemoteNovel(user.id, novelId);
        } catch (e) {
          if (snapshot) {
            setNovels((prev) => (prev.some((n) => n.id === novelId) ? prev : [...prev, snapshot]));
            if (wasActive) {
              setActiveNovelId(novelId);
              setActiveSceneId(prevSceneId);
            }
          }
          toast({
            title: "Could not delete book",
            description: mapSupabaseError(e),
            variant: "destructive",
          });
        }
      }
    },
    [activeNovelId, activeSceneId, novels, user?.id, setNovels, setActiveNovelId, setActiveSceneId],
  );

  const updateNovel = useCallback(
    (updater: (n: Novel) => Novel) => {
      setNovels((prev) =>
        prev.map((n) => (n.id === activeNovelId ? { ...updater(n), updatedAt: new Date().toISOString() } : n)),
      );
    },
    [activeNovelId, setNovels],
  );

  const updateCanvas = useCallback(
    (updater: (prev: CanvasState | undefined) => CanvasState) => {
      updateNovel((novel) => ({ ...novel, canvas: updater(novel.canvas) }));
    },
    [updateNovel],
  );

  const updateEditPassState = useCallback(
    (sceneId: string, patch: Partial<import("@/types/novel").EditScenePassRecord>) => {
      updateNovel((novel) => {
        const prev = novel.editPassState ?? { sceneRecords: {} };
        const existing = prev.sceneRecords[sceneId] ?? { status: "unedited" as const };
        return {
          ...novel,
          editPassState: {
            sceneRecords: {
              ...prev.sceneRecords,
              [sceneId]: { ...existing, ...patch },
            },
          },
        };
      });
    },
    [updateNovel],
  );

  const updateSceneContent = useCallback(
    (sceneId: string, content: string) => {
      const newWords = countWords(content);
      updateNovel((novel) => {
        let oldWords = 0;
        outer: for (const act of novel.acts) {
          for (const ch of act.chapters) {
            for (const s of ch.scenes) {
              if (s.id === sceneId) {
                oldWords = s.wordCount;
                break outer;
              }
            }
          }
        }
        const delta = newWords - oldWords;
        if (user?.id && delta !== 0) {
          void incrementUserDailyWords(delta);
        }
        return {
          ...novel,
          acts: novel.acts.map((act) => ({
            ...act,
            chapters: act.chapters.map((ch) => ({
              ...ch,
              scenes: ch.scenes.map((s) => (s.id === sceneId ? { ...s, content, wordCount: newWords } : s)),
            })),
          })),
        };
      });
    },
    [updateNovel, user?.id],
  );

  const updateSceneSummary = useCallback(
    (sceneId: string, summary: string) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters.map((ch) => ({
            ...ch,
            scenes: ch.scenes.map((s) => (s.id === sceneId ? { ...s, summary } : s)),
          })),
        })),
      }));
    },
    [updateNovel],
  );

  const updateScene = useCallback(
    (sceneId: string, patch: Partial<Scene>) => {
      const resolvedPatch = patch.content !== undefined ? { ...patch, wordCount: countWords(patch.content) } : patch;
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters.map((ch) => ({
            ...ch,
            scenes: ch.scenes.map((s) => (s.id === sceneId ? { ...s, ...resolvedPatch } : s)),
          })),
        })),
      }));
    },
    [updateNovel],
  );

  const addActToNovel = useCallback(() => {
    updateNovel((novel) => ({ ...novel, acts: [...novel.acts, createAct(novel.acts.length)] }));
  }, [updateNovel]);

  const addChapterToAct = useCallback(
    (actId: string) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) =>
          act.id === actId ? { ...act, chapters: [...act.chapters, createChapter(act.chapters.length)] } : act,
        ),
      }));
    },
    [updateNovel],
  );

  const addSceneToChapter = useCallback(
    (chapterId: string) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, scenes: [...ch.scenes, createScene(ch.scenes.length)] } : ch,
          ),
        })),
      }));
    },
    [updateNovel],
  );

  const addCodexEntry = useCallback(
    (type: CodexEntry["type"], name: string) => {
      updateNovel((novel) => ({ ...novel, codexEntries: [...novel.codexEntries, createCodexEntry(type, name)] }));
    },
    [updateNovel],
  );

  const updateCodexEntry = useCallback(
    (entryId: string, patch: Partial<CodexEntry>) => {
      updateNovel((novel) => ({
        ...novel,
        codexEntries: novel.codexEntries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
      }));
    },
    [updateNovel],
  );

  const deleteCodexEntry = useCallback(
    (entryId: string) => {
      updateNovel((novel) => ({
        ...novel,
        codexEntries: novel.codexEntries.filter((entry) => entry.id !== entryId),
      }));
    },
    [updateNovel],
  );

  const getActiveScene = useCallback((): Scene | null => {
    if (!activeNovel || !activeSceneId) return null;
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        const scene = ch.scenes.find((s) => s.id === activeSceneId);
        if (scene) return scene;
      }
    }
    return null;
  }, [activeNovel, activeSceneId]);

  const reorderScene = useCallback(
    (sceneId: string, fromChapterId: string, toChapterId: string, toIndex: number) => {
      updateNovel((novel) => {
        let movedScene: Scene | null = null;
        const updatedActs = novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters.map((ch) => {
            if (ch.id === fromChapterId) {
              const idx = ch.scenes.findIndex((s) => s.id === sceneId);
              if (idx >= 0) {
                movedScene = ch.scenes[idx];
                return { ...ch, scenes: ch.scenes.filter((s) => s.id !== sceneId) };
              }
            }
            return ch;
          }),
        }));
        if (!movedScene) return novel;
        return {
          ...novel,
          acts: updatedActs.map((act) => ({
            ...act,
            chapters: act.chapters.map((ch) => {
              if (ch.id === toChapterId) {
                const newScenes = [...ch.scenes];
                newScenes.splice(toIndex, 0, movedScene);
                return { ...ch, scenes: newScenes.map((s, i) => ({ ...s, order: i })) };
              }
              return ch;
            }),
          })),
        };
      });
    },
    [updateNovel],
  );

  const applyFramework = useCallback(
    (frameworkId: string) => {
      const fw = STORY_FRAMEWORKS.find((f) => f.id === frameworkId);
      if (!fw) return;
      const customBeats = frameworkBeatsToCustom(fw.beats);
      updateNovel((novel) => ({ ...novel, frameworkId, customBeats }));
    },
    [updateNovel],
  );

  const getActiveBeats = useCallback((): CustomBeat[] => {
    if (!activeNovel) return [];
    if (activeNovel.customBeats && activeNovel.customBeats.length > 0) {
      return [...activeNovel.customBeats].sort((a, b) => a.order - b.order);
    }
    const fw = STORY_FRAMEWORKS.find((f) => f.id === activeNovel.frameworkId) || STORY_FRAMEWORKS[0];
    return frameworkBeatsToCustom(fw.beats);
  }, [activeNovel]);

  const updateBeat = useCallback(
    (beatId: string, patch: Partial<CustomBeat>) => {
      updateNovel((novel) => {
        const beats =
          novel.customBeats && novel.customBeats.length > 0
            ? novel.customBeats
            : frameworkBeatsToCustom(
                STORY_FRAMEWORKS.find((f) => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats,
              );
        return { ...novel, customBeats: beats.map((b) => (b.id === beatId ? { ...b, ...patch } : b)) };
      });
    },
    [updateNovel],
  );

  const addCustomBeat = useCallback(
    (afterBeatId?: string) => {
      updateNovel((novel) => {
        const beats =
          novel.customBeats && novel.customBeats.length > 0
            ? novel.customBeats
            : frameworkBeatsToCustom(
                STORY_FRAMEWORKS.find((f) => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats,
              );
        const newBeat: CustomBeat = {
          id: `beat_custom_${Date.now()}`,
          title: "New Beat",
          description: "",
          percentage: 5,
          tags: [],
          order: beats.length,
        };
        if (afterBeatId) {
          const idx = beats.findIndex((b) => b.id === afterBeatId);
          const result = [...beats];
          result.splice(idx + 1, 0, newBeat);
          return { ...novel, customBeats: result.map((b, i) => ({ ...b, order: i })) };
        }
        return { ...novel, customBeats: [...beats, newBeat] };
      });
    },
    [updateNovel],
  );

  const deleteBeat = useCallback(
    (beatId: string) => {
      updateNovel((novel) => {
        const beats =
          novel.customBeats && novel.customBeats.length > 0
            ? novel.customBeats
            : frameworkBeatsToCustom(
                STORY_FRAMEWORKS.find((f) => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats,
              );
        return { ...novel, customBeats: beats.filter((b) => b.id !== beatId).map((b, i) => ({ ...b, order: i })) };
      });
    },
    [updateNovel],
  );

  const reorderBeats = useCallback(
    (from: number, to: number) => {
      updateNovel((novel) => {
        const beats =
          novel.customBeats && novel.customBeats.length > 0
            ? [...novel.customBeats]
            : frameworkBeatsToCustom(
                STORY_FRAMEWORKS.find((f) => f.id === novel.frameworkId)?.beats || STORY_FRAMEWORKS[0].beats,
              );
        const [moved] = beats.splice(from, 1);
        beats.splice(to, 0, moved);
        return { ...novel, customBeats: beats.map((b, i) => ({ ...b, order: i })) };
      });
    },
    [updateNovel],
  );

  const deleteScene = useCallback(
    (sceneId: string) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters.map((ch) => ({
            ...ch,
            scenes: ch.scenes.filter((s) => s.id !== sceneId).map((s, i) => ({ ...s, order: i })),
          })),
        })),
      }));
    },
    [updateNovel],
  );

  const duplicateScene = useCallback(
    (sceneId: string) => {
      updateNovel((novel) => {
        for (const act of novel.acts) {
          for (const ch of act.chapters) {
            const idx = ch.scenes.findIndex((s) => s.id === sceneId);
            if (idx >= 0) {
              const original = ch.scenes[idx];
              const clone = {
                ...original,
                id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                title: `${original.title} (copy)`,
                content: "",
                wordCount: 0,
                order: idx + 1,
              };
              const newScenes = [...ch.scenes];
              newScenes.splice(idx + 1, 0, clone);
              return {
                ...novel,
                acts: novel.acts.map((a) =>
                  a.id === act.id
                    ? {
                        ...a,
                        chapters: a.chapters.map((c) =>
                          c.id === ch.id ? { ...c, scenes: newScenes.map((s, i) => ({ ...s, order: i })) } : c,
                        ),
                      }
                    : a,
                ),
              };
            }
          }
        }
        return novel;
      });
    },
    [updateNovel],
  );

  const updateAct = useCallback(
    (actId: string, patch: { title?: string; summary?: string; color?: string }) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((a) => (a.id === actId ? { ...a, ...patch } : a)),
      }));
    },
    [updateNovel],
  );

  const deleteAct = useCallback(
    (actId: string) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.filter((a) => a.id !== actId).map((a, i) => ({ ...a, order: i })),
      }));
    },
    [updateNovel],
  );

  const reorderAct = useCallback(
    (from: number, to: number) => {
      updateNovel((novel) => {
        const acts = [...novel.acts];
        const [moved] = acts.splice(from, 1);
        acts.splice(to, 0, moved);
        return { ...novel, acts: acts.map((a, i) => ({ ...a, order: i })) };
      });
    },
    [updateNovel],
  );

  const updateChapter = useCallback(
    (chapterId: string, patch: { title?: string; summary?: string; targetWordCount?: number }) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters.map((ch) => (ch.id === chapterId ? { ...ch, ...patch } : ch)),
        })),
      }));
    },
    [updateNovel],
  );

  const deleteChapter = useCallback(
    (chapterId: string) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => ({
          ...act,
          chapters: act.chapters
            .filter((ch) => ch.id !== chapterId)
            .map((ch, i) => ({ ...ch, order: i })),
        })),
      }));
    },
    [updateNovel],
  );

  const reorderChapter = useCallback(
    (actId: string, from: number, to: number) => {
      updateNovel((novel) => ({
        ...novel,
        acts: novel.acts.map((act) => {
          if (act.id !== actId) return act;
          const chapters = [...act.chapters];
          const [moved] = chapters.splice(from, 1);
          chapters.splice(to, 0, moved);
          return { ...act, chapters: chapters.map((c, i) => ({ ...c, order: i })) };
        }),
      }));
    },
    [updateNovel],
  );

  const addReviewAnnotation = useCallback(
    (sceneId: string, type: ReviewAnnotation["type"], content = "") => {
      const annotation: ReviewAnnotation = {
        id: crypto.randomUUID(),
        sceneId,
        type,
        content,
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      updateNovel((novel) => ({
        ...novel,
        reviewAnnotations: [...(novel.reviewAnnotations ?? []), annotation],
      }));
    },
    [updateNovel],
  );

  const updateReviewAnnotation = useCallback(
    (id: string, patch: Partial<ReviewAnnotation>) => {
      updateNovel((novel) => ({
        ...novel,
        reviewAnnotations: (novel.reviewAnnotations ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
    },
    [updateNovel],
  );

  const deleteReviewAnnotation = useCallback(
    (id: string) => {
      updateNovel((novel) => ({
        ...novel,
        reviewAnnotations: (novel.reviewAnnotations ?? []).filter((a) => a.id !== id),
      }));
    },
    [updateNovel],
  );

  const addBrainstormNote = useCallback(() => {
    updateNovel((novel) => ({ ...novel, brainstormNotes: [...(novel.brainstormNotes || []), createBrainstormNote()] }));
  }, [updateNovel]);

  const updateBrainstormNote = useCallback(
    (id: string, patch: Partial<BrainstormNote>) => {
      updateNovel((novel) => ({
        ...novel,
        brainstormNotes: (novel.brainstormNotes || []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }));
    },
    [updateNovel],
  );

  const deleteBrainstormNote = useCallback(
    (id: string) => {
      updateNovel((novel) => ({ ...novel, brainstormNotes: (novel.brainstormNotes || []).filter((n) => n.id !== id) }));
    },
    [updateNovel],
  );

  const novelContextValue = useMemo<NovelContextType>(
    () => ({
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
      updateScene,
      addActToNovel,
      addChapterToAct,
      addSceneToChapter,
      addCodexEntry,
      updateCodexEntry,
      deleteCodexEntry,
      getActiveScene,
      goToDashboard,
      openBookSandbox,
      updateCanvas,
      reorderScene,
      deleteScene,
      duplicateScene,
      updateAct,
      deleteAct,
      reorderAct,
      updateChapter,
      deleteChapter,
      reorderChapter,
      applyFramework,
      updateBeat,
      addCustomBeat,
      deleteBeat,
      reorderBeats,
      getActiveBeats,
      // IdeaWeb — delegated to IdeaWebContext
      addIdeaToInbox: ideaWeb.addIdeaToInbox,
      updateIdea: ideaWeb.updateIdea,
      patchIdeaWebEntry: ideaWeb.patchIdeaWebEntry,
      deleteIdea: ideaWeb.deleteIdea,
      ideaWebEntries: ideaWeb.ideaWebEntries,
      ideaWebLinks: ideaWeb.ideaWebLinks,
      refetchIdeaWeb: ideaWeb.refetchIdeaWeb,
      createGlobalIdeaWebEntry: ideaWeb.createGlobalIdeaWebEntry,
      harvestIdeaWebEntries: ideaWeb.harvestIdeaWebEntries,
      checkpointIdeaWebEntry: ideaWeb.checkpointIdeaWebEntry,
      deleteIdeaWebEntryRevisions: ideaWeb.deleteIdeaWebEntryRevisions,
      restoreIdeaWebFromSnapshot: ideaWeb.restoreIdeaWebFromSnapshot,
      updateEditPassState,
      addReviewAnnotation,
      updateReviewAnnotation,
      deleteReviewAnnotation,
      addBrainstormNote,
      updateBrainstormNote,
      deleteBrainstormNote,
      novelSyncStatus,
      lastNovelSyncedAt,
      novelStorageConflict,
      applyNovelsFromStorage,
      dismissNovelStorageConflict,
    }),
    [
      novels,
      activeNovel,
      activeSceneId,
      mode,
      setMode,
      setActiveNovel,
      setActiveSceneId,
      addNovel,
      addNovelWithOptions,
      importNovel,
      patchNovel,
      deleteNovel,
      updateSceneContent,
      updateSceneSummary,
      updateScene,
      addActToNovel,
      addChapterToAct,
      addSceneToChapter,
      addCodexEntry,
      updateCodexEntry,
      deleteCodexEntry,
      getActiveScene,
      goToDashboard,
      openBookSandbox,
      updateCanvas,
      updateEditPassState,
      reorderScene,
      deleteScene,
      duplicateScene,
      updateAct,
      deleteAct,
      reorderAct,
      updateChapter,
      deleteChapter,
      reorderChapter,
      applyFramework,
      updateBeat,
      addCustomBeat,
      deleteBeat,
      reorderBeats,
      getActiveBeats,
      ideaWeb,
      addReviewAnnotation,
      updateReviewAnnotation,
      deleteReviewAnnotation,
      addBrainstormNote,
      updateBrainstormNote,
      deleteBrainstormNote,
      novelSyncStatus,
      lastNovelSyncedAt,
      novelStorageConflict,
      applyNovelsFromStorage,
      dismissNovelStorageConflict,
    ],
  );

  return <NovelContext.Provider value={novelContextValue}>{children}</NovelContext.Provider>;
}

// ---------------------------------------------------------------------------
// NovelProvider — outer component: holds all novel state + effects
// ---------------------------------------------------------------------------
export function NovelProvider({ children }: { children: React.ReactNode }) {
  const { user, preferences } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>("canvas");
  const [isHydrated, setIsHydrated] = useState(false);
  const [novelSyncStatus, setNovelSyncStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const [lastNovelSyncedAt, setLastNovelSyncedAt] = useState<number | null>(null);
  const [novelStorageConflict, setNovelStorageConflict] = useState<{ novelId: string } | null>(null);
  const syncErrorToastAtRef = useRef(0);
  /** Tracks which novel IDs have already triggered the end-of-draft celebration toast. */
  const draftCelebratedRef = useRef<Set<string>>(new Set());
  /** Snapshot of novel list as of the last *successful* remote sync — used to roll back on error. */
  const lastSyncedNovelsRef = useRef<Novel[]>([]);

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
        console.warn("OdinPad: remote novel load failed; preserving strict user-scoped isolation", error);
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
    if (!user?.id || !isHydrated) {
      setNovelSyncStatus("idle");
      return;
    }

    setNovelSyncStatus("syncing");
    const snapshot = novels;
    const timer = window.setTimeout(() => {
      syncNovelsToRemote(user.id, novels)
        .then(() => {
          lastSyncedNovelsRef.current = snapshot;
          setNovelSyncStatus("saved");
          setLastNovelSyncedAt(Date.now());
        })
        .catch((error) => {
          setNovelSyncStatus("error");
          console.warn("OdinPad: failed to sync novels to Supabase", error);
          const now = Date.now();
          if (now - syncErrorToastAtRef.current > 15_000) {
            syncErrorToastAtRef.current = now;
            const prev = lastSyncedNovelsRef.current;
            toast({
              title: "Could not sync to cloud",
              description: mapSupabaseError(error),
              variant: "destructive",
              action:
                prev.length > 0 ? (
                  <ToastAction altText="Revert to last save" onClick={() => setNovels(prev)}>
                    Revert to last save
                  </ToastAction>
                ) : undefined,
            });
          }
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [novels, user?.id, isHydrated]);

  // Cross-tab conflict detection.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== NOVELS_STORAGE_KEY || !e.newValue || !activeNovelId) return;
      try {
        const parsed = JSON.parse(e.newValue) as Novel[];
        const remote = parsed.find((n) => n.id === activeNovelId);
        const local = novels.find((n) => n.id === activeNovelId);
        if (remote && local && remote.updatedAt > local.updatedAt) {
          setNovelStorageConflict({ novelId: activeNovelId });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [activeNovelId, novels]);

  // End-of-draft celebration — fires once per novel when word count crosses targetWordCount.
  useEffect(() => {
    const activeNovel = novels.find((n) => n.id === activeNovelId);
    if (!activeNovel?.targetWordCount) return;
    const total = getNovelWordCount(activeNovel);
    if (total >= activeNovel.targetWordCount && !draftCelebratedRef.current.has(activeNovel.id)) {
      draftCelebratedRef.current.add(activeNovel.id);
      toast({
        title: "Draft complete! 🎉",
        description: `You've hit ${activeNovel.targetWordCount.toLocaleString()} words on "${activeNovel.title}". Time to celebrate — then edit.`,
      });
    }
  }, [novels, activeNovelId]);

  // Clear active novel when it's deleted.
  useEffect(() => {
    if (!activeNovelId) return;
    if (novels.some((n) => n.id === activeNovelId)) return;
    setActiveNovelId(null);
    setActiveSceneId(null);
  }, [novels, activeNovelId]);

  const applyNovelsFromStorage = useCallback(() => {
    const parsed = loadNovels();
    if (!parsed) return;
    setNovels(parsed);
    setNovelStorageConflict(null);
  }, []);

  const dismissNovelStorageConflict = useCallback(() => setNovelStorageConflict(null), []);

  return (
    <IdeaWebProvider setNovels={setNovels}>
      <NovelContextInner
        novels={novels}
        setNovels={setNovels}
        activeNovelId={activeNovelId}
        setActiveNovelId={setActiveNovelId}
        activeSceneId={activeSceneId}
        setActiveSceneId={setActiveSceneId}
        mode={mode}
        setMode={setMode}
        novelSyncStatus={novelSyncStatus}
        lastNovelSyncedAt={lastNovelSyncedAt}
        novelStorageConflict={novelStorageConflict}
        applyNovelsFromStorage={applyNovelsFromStorage}
        dismissNovelStorageConflict={dismissNovelStorageConflict}
      >
        {children}
      </NovelContextInner>
    </IdeaWebProvider>
  );
}
