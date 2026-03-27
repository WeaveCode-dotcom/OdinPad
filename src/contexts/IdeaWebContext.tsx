import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import {
  countLinksForEntry,
  createIdeaWebEntry,
  createIdeaWebRevision,
  deleteIdeaWebRevisionsForEntry,
  enqueueIdeaCapture,
  fetchIdeaWebEntries,
  fetchIdeaWebLinks,
  parseIdeaWebSettings,
  snapshotFromIdeaWebEntry,
  softDeleteIdeaWebEntry,
  suggestAutoStatus,
  updateIdeaWebEntry,
} from "@/lib/idea-web";
import { createStoryWikiEntry } from "@/lib/novel-store";
import type { IdeaWebEntry, IdeaWebLink, IdeaWebRevisionSnapshot, IdeaWebStatus } from "@/types/idea-web";
import type { Idea, Novel, StoryWikiEntry, CodexEntry } from "@/types/novel";

const IDEA_WEB_SAVE_DEBOUNCE_MS = 500;
const IDEA_WEB_EDIT_REVISION_MIN_MS = 30_000;

function applyIdeaWebPatch(entry: IdeaWebEntry, patch: Partial<Idea> & { title?: string }): IdeaWebEntry {
  let next: IdeaWebEntry = { ...entry };
  if (patch.title !== undefined) next = { ...next, title: patch.title };
  if (patch.content !== undefined) next = { ...next, body: patch.content };
  if (patch.category !== undefined) {
    next = { ...next, category: patch.category, ideaType: patch.category };
  }
  if (patch.pinned !== undefined) next = { ...next, pinned: patch.pinned };
  return next;
}

export interface IdeaWebContextType {
  ideaWebEntries: IdeaWebEntry[];
  ideaWebLinks: IdeaWebLink[];
  refetchIdeaWeb: () => Promise<void>;
  addIdeaToInbox: (category: Idea["category"]) => void;
  updateIdea: (id: string, patch: Partial<Idea> & { title?: string }) => void;
  patchIdeaWebEntry: (
    id: string,
    patch: Partial<{ novelId: string | null; status: IdeaWebStatus; remindAt: string | null }>,
  ) => Promise<void>;
  deleteIdea: (id: string) => void;
  createGlobalIdeaWebEntry: (input: {
    title: string;
    body: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) => Promise<IdeaWebEntry | undefined>;
  harvestIdeaWebEntries: (
    entryIds: string[],
    targetNovelId: string,
    options?: { addCodexStubs?: boolean; harvestShelfLabel?: string },
  ) => Promise<void>;
  checkpointIdeaWebEntry: (id: string) => Promise<void>;
  deleteIdeaWebEntryRevisions: (id: string) => Promise<void>;
  restoreIdeaWebFromSnapshot: (id: string, snapshot: IdeaWebRevisionSnapshot) => Promise<void>;
}

const IdeaWebContext = createContext<IdeaWebContextType | null>(null);

export function useIdeaWebContext(): IdeaWebContextType {
  const ctx = useContext(IdeaWebContext);
  if (!ctx) throw new Error("useIdeaWebContext must be used within IdeaWebProvider");
  return ctx;
}

interface IdeaWebProviderProps {
  children: React.ReactNode;
  /** Passed by NovelProvider so harvestIdeaWebEntries can add Story Wiki stubs without a cross-context ref. */
  setNovels: React.Dispatch<React.SetStateAction<Novel[]>>;
}

export function IdeaWebProvider({ children, setNovels }: IdeaWebProviderProps) {
  const { user, preferences, updatePreferences } = useAuth();

  const [ideaWebEntries, setIdeaWebEntries] = useState<IdeaWebEntry[]>([]);
  const [ideaWebLinks, setIdeaWebLinks] = useState<IdeaWebLink[]>([]);

  /** Latest merged entry state per id (for debounced text saves). */
  const ideaWebLatestRef = useRef<Record<string, IdeaWebEntry>>({});
  const ideaWebSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastEditRevisionAt = useRef<Record<string, number>>({});

  const refetchIdeaWeb = useCallback(async () => {
    if (!user?.id) {
      setIdeaWebEntries([]);
      setIdeaWebLinks([]);
      return;
    }
    try {
      const [rows, links] = await Promise.all([fetchIdeaWebEntries(user.id), fetchIdeaWebLinks(user.id)]);
      setIdeaWebEntries(rows);
      rows.forEach((e) => {
        ideaWebLatestRef.current[e.id] = e;
      });
      setIdeaWebLinks(links);
    } catch (e) {
      console.warn("OdinPad: Idea Web fetch failed (tables may not be migrated yet)", e);
      setIdeaWebEntries([]);
      setIdeaWebLinks([]);
    }
  }, [user?.id]);

  const addIdeaToInbox = useCallback(
    (category: Idea["category"]) => {
      if (!user?.id) return;
      void (async () => {
        try {
          await createIdeaWebEntry({
            userId: user.id,
            novelId: null,
            title: "New idea",
            body: "",
            ideaType: category,
            category,
          });
          trackEvent("idea_web_created", { scope: "inbox", category });
          await refetchIdeaWeb();
        } catch (e) {
          console.warn("OdinPad: addIdeaToInbox failed", e);
        }
      })();
    },
    [user?.id, refetchIdeaWeb],
  );

  const createGlobalIdeaWebEntry = useCallback(
    async (input: {
      title: string;
      body: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<IdeaWebEntry | undefined> => {
      if (!user?.id) return undefined;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueIdeaCapture({
          userId: user.id,
          title: input.title.trim() || "Untitled",
          body: input.body,
          tags: input.tags ?? [],
          metadata: input.metadata,
        });
        trackEvent("idea_web_created", { scope: "global", offline: true });
        if (!preferences?.first_run_idea_web_visited) {
          void updatePreferences({ first_run_idea_web_visited: true });
        }
        return undefined;
      }
      const entry = await createIdeaWebEntry({
        userId: user.id,
        novelId: null,
        title: input.title.trim() || "Untitled",
        body: input.body,
        tags: input.tags ?? [],
        ideaType: "misc",
        metadata: input.metadata,
      });
      trackEvent("idea_web_created", { scope: "global" });
      await refetchIdeaWeb();
      if (!preferences?.first_run_idea_web_visited) {
        void updatePreferences({ first_run_idea_web_visited: true });
      }
      return entry;
    },
    [preferences?.first_run_idea_web_visited, refetchIdeaWeb, updatePreferences, user?.id],
  );

  const harvestIdeaWebEntries = useCallback(
    async (
      entryIds: string[],
      targetNovelId: string,
      options?: { addCodexStubs?: boolean; harvestShelfLabel?: string },
    ) => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const shelf = options?.harvestShelfLabel?.trim();
      const entries: IdeaWebEntry[] = entryIds
        .map((id) => ideaWebEntries.find((e) => e.id === id))
        .filter((e): e is IdeaWebEntry => e != null);
      for (const id of entryIds) {
        const prev = ideaWebEntries.find((e) => e.id === id);
        const meta = { ...((prev?.metadata ?? {}) as Record<string, unknown>) };
        if (shelf) meta.harvestShelfLabel = shelf;
        await updateIdeaWebEntry(user.id, id, {
          novelId: targetNovelId,
          status: "harvested",
          harvestedAt: now,
          harvestTargetNovelId: targetNovelId,
          metadata: meta,
        });
      }
      if (options?.addCodexStubs && entries.length > 0) {
        setNovels((prev) =>
          prev.map((novel) => {
            if (novel.id !== targetNovelId) return novel;
            let storyWiki = [...novel.storyWikiEntries];
            for (const entry of entries) {
              const t = (entry.ideaType || entry.category || "").toLowerCase();
              if (t === "character") {
                const ce = createStoryWikiEntry("character", entry.title.slice(0, 120) || "Character");
                ce.description = entry.body.slice(0, 4000);
                ce.notes = "Harvested from Idea Web";
                ce.tags = [...entry.tags];
                storyWiki = [...storyWiki, ce];
              } else if (t === "world") {
                const ce = createStoryWikiEntry("location", entry.title.slice(0, 120) || "Location");
                ce.description = entry.body.slice(0, 4000);
                ce.notes = "Harvested from Idea Web";
                ce.tags = [...entry.tags];
                storyWiki = [...storyWiki, ce];
              }
            }
            return { ...novel, storyWikiEntries: storyWiki, updatedAt: new Date().toISOString() };
          }),
        );
      }
      trackEvent("idea_web_harvest", { count: entryIds.length, novelId: targetNovelId });
      await refetchIdeaWeb();
    },
    [user?.id, ideaWebEntries, refetchIdeaWeb, setNovels],
  );

  const patchIdeaWebEntryImpl = useCallback(
    async (id: string, patch: Partial<{ novelId: string | null; status: IdeaWebStatus; remindAt: string | null }>) => {
      if (!user?.id) return;
      const updates: {
        novelId?: string | null;
        status?: IdeaWebStatus;
        remindAt?: string | null;
      } = {};
      if (patch.novelId !== undefined) updates.novelId = patch.novelId;
      if (patch.status !== undefined) updates.status = patch.status;
      if (patch.remindAt !== undefined) updates.remindAt = patch.remindAt;
      if (Object.keys(updates).length === 0) return;

      const prev = ideaWebLatestRef.current[id] ?? ideaWebEntries.find((e) => e.id === id);

      // Optimistic update — apply patch to local state immediately so the UI
      // reflects the change without waiting for the round-trip.
      setIdeaWebEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      if (prev && ideaWebLatestRef.current[id]) {
        ideaWebLatestRef.current[id] = { ...ideaWebLatestRef.current[id], ...updates };
      }

      try {
        if (prev) {
          if (patch.status !== undefined && patch.status !== prev.status) {
            await createIdeaWebRevision(user.id, id, "status_change", snapshotFromIdeaWebEntry(prev));
          } else if (patch.novelId !== undefined && patch.novelId !== prev.novelId) {
            await createIdeaWebRevision(user.id, id, "system", snapshotFromIdeaWebEntry(prev));
          }
        }

        await updateIdeaWebEntry(user.id, id, updates);
        trackEvent("idea_web_patched", { fields: Object.keys(updates).join(",") });
        await refetchIdeaWeb();
      } catch (err) {
        // Revert optimistic update on failure.
        if (prev) {
          setIdeaWebEntries((cur) => cur.map((e) => (e.id === id ? prev : e)));
          ideaWebLatestRef.current[id] = prev;
        }
        throw err;
      }
    },
    [user?.id, ideaWebEntries, refetchIdeaWeb],
  );

  const flushIdeaWebTextSave = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const ent = ideaWebLatestRef.current[id];
      if (!ent) return;
      try {
        await updateIdeaWebEntry(user.id, id, {
          title: ent.title,
          body: ent.body,
          ideaType: ent.ideaType,
          category: ent.category,
        });
        const now = Date.now();
        const last = lastEditRevisionAt.current[id] ?? 0;
        if (now - last >= IDEA_WEB_EDIT_REVISION_MIN_MS) {
          try {
            await createIdeaWebRevision(user.id, id, "edit_session", snapshotFromIdeaWebEntry(ent));
            lastEditRevisionAt.current[id] = now;
          } catch (revErr) {
            console.warn("OdinPad: idea revision skipped", revErr);
          }
        }

        const fresh = ideaWebLatestRef.current[id];
        if (fresh && preferences) {
          const settings = parseIdeaWebSettings(preferences.idea_web_settings);
          const suggested = suggestAutoStatus(fresh, countLinksForEntry(id, ideaWebLinks), settings.autoStatusRules);
          if (suggested && suggested !== fresh.status) {
            await patchIdeaWebEntryImpl(id, { status: suggested });
          }
        }
      } catch (e) {
        console.warn("OdinPad: updateIdea flush failed", e);
      }
    },
    [user?.id, preferences, ideaWebLinks, patchIdeaWebEntryImpl],
  );

  const updateIdea = useCallback(
    (id: string, patch: Partial<Idea> & { title?: string }) => {
      if (!user?.id) return;

      setIdeaWebEntries((prev) => {
        const next = prev.map((e) => {
          if (e.id !== id) return e;
          const merged = applyIdeaWebPatch(e, patch);
          ideaWebLatestRef.current[id] = merged;
          return merged;
        });
        return next;
      });

      const hasText = patch.title !== undefined || patch.content !== undefined;
      const hasCategory = patch.category !== undefined;
      const pinOnly = patch.pinned !== undefined && !hasText && !hasCategory;

      if (patch.pinned !== undefined && !pinOnly) {
        void (async () => {
          try {
            const ent = ideaWebLatestRef.current[id];
            if (!ent) return;
            await updateIdeaWebEntry(user.id, id, { pinned: ent.pinned });
          } catch (e) {
            console.warn("OdinPad: updateIdea pin failed", e);
          }
        })();
      }

      if (pinOnly) {
        void (async () => {
          try {
            const ent = ideaWebLatestRef.current[id];
            if (!ent) return;
            await updateIdeaWebEntry(user.id, id, { pinned: ent.pinned });
          } catch (e) {
            console.warn("OdinPad: updateIdea failed", e);
          }
        })();
        return;
      }

      if (hasCategory && !hasText) {
        void (async () => {
          try {
            const ent = ideaWebLatestRef.current[id];
            if (!ent) return;
            await updateIdeaWebEntry(user.id, id, {
              category: ent.category,
              ideaType: ent.ideaType,
            });
          } catch (e) {
            console.warn("OdinPad: updateIdea failed", e);
          }
        })();
        return;
      }

      if (hasText) {
        clearTimeout(ideaWebSaveTimers.current[id]);
        ideaWebSaveTimers.current[id] = setTimeout(() => {
          delete ideaWebSaveTimers.current[id];
          void flushIdeaWebTextSave(id);
        }, IDEA_WEB_SAVE_DEBOUNCE_MS);
      }
    },
    [user?.id, flushIdeaWebTextSave],
  );

  const deleteIdea = useCallback(
    (id: string) => {
      if (!user?.id) return;
      void (async () => {
        try {
          await softDeleteIdeaWebEntry(user.id, id);
          await refetchIdeaWeb();
        } catch (e) {
          console.warn("OdinPad: deleteIdea failed", e);
        }
      })();
    },
    [user?.id, refetchIdeaWeb],
  );

  const patchIdeaWebEntry = useCallback(
    (id: string, patch: Partial<{ novelId: string | null; status: IdeaWebStatus; remindAt: string | null }>) => {
      return patchIdeaWebEntryImpl(id, patch).catch((e) => {
        console.warn("OdinPad: patchIdeaWebEntry failed", e);
      });
    },
    [patchIdeaWebEntryImpl],
  );

  const checkpointIdeaWebEntry = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const ent = ideaWebLatestRef.current[id] ?? ideaWebEntries.find((e) => e.id === id);
      if (!ent) return;
      try {
        await createIdeaWebRevision(user.id, id, "manual_checkpoint", snapshotFromIdeaWebEntry(ent));
      } catch (e) {
        console.warn("OdinPad: checkpoint failed", e);
      }
    },
    [user?.id, ideaWebEntries],
  );

  const deleteIdeaWebEntryRevisions = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      try {
        await deleteIdeaWebRevisionsForEntry(user.id, id);
      } catch (e) {
        console.warn("OdinPad: delete revisions failed", e);
      }
    },
    [user?.id],
  );

  const restoreIdeaWebFromSnapshot = useCallback(
    async (id: string, snapshot: IdeaWebRevisionSnapshot) => {
      if (!user?.id) return;
      const current = ideaWebLatestRef.current[id] ?? ideaWebEntries.find((e) => e.id === id);
      if (!current) return;
      try {
        await createIdeaWebRevision(user.id, id, "system", snapshotFromIdeaWebEntry(current));
        await updateIdeaWebEntry(user.id, id, {
          title: snapshot.title,
          body: snapshot.body,
          status: snapshot.status,
          tags: snapshot.tags,
          ideaType: snapshot.ideaType,
          category: snapshot.category,
          mood: snapshot.mood,
          sourceType: snapshot.sourceType,
          metadata: snapshot.metadata,
          novelId: snapshot.novelId ?? null,
        });
        await refetchIdeaWeb();
      } catch (e) {
        console.warn("OdinPad: restore snapshot failed", e);
      }
    },
    [user?.id, ideaWebEntries, refetchIdeaWeb],
  );

  // Fetch idea web entries whenever the authenticated user changes.
  useEffect(() => {
    void refetchIdeaWeb();
  }, [refetchIdeaWeb]);

  // Flush any pending debounced text saves on unmount.
  useEffect(() => {
    return () => {
      const timers = { ...ideaWebSaveTimers.current };
      ideaWebSaveTimers.current = {};
      Object.keys(timers).forEach((id) => {
        clearTimeout(timers[id]);
        void flushIdeaWebTextSave(id);
      });
    };
  }, [flushIdeaWebTextSave]);

  const value = useMemo<IdeaWebContextType>(
    () => ({
      ideaWebEntries,
      ideaWebLinks,
      refetchIdeaWeb,
      addIdeaToInbox,
      updateIdea,
      patchIdeaWebEntry,
      deleteIdea,
      createGlobalIdeaWebEntry,
      harvestIdeaWebEntries,
      checkpointIdeaWebEntry,
      deleteIdeaWebEntryRevisions,
      restoreIdeaWebFromSnapshot,
    }),
    [
      ideaWebEntries,
      ideaWebLinks,
      refetchIdeaWeb,
      addIdeaToInbox,
      updateIdea,
      patchIdeaWebEntry,
      deleteIdea,
      createGlobalIdeaWebEntry,
      harvestIdeaWebEntries,
      checkpointIdeaWebEntry,
      deleteIdeaWebEntryRevisions,
      restoreIdeaWebFromSnapshot,
    ],
  );

  return <IdeaWebContext.Provider value={value}>{children}</IdeaWebContext.Provider>;
}

// Re-export CodexEntry to keep import surface clean for consumers that only need IdeaWeb.
export type { CodexEntry };
