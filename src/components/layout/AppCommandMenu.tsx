import Fuse from "fuse.js";
import {
  Accessibility,
  BarChart3,
  BookOpen,
  Compass,
  FileText,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useNovelContext } from "@/contexts/NovelContext";
import { usePreferences } from "@/hooks/usePreferences";
import { featureFlags } from "@/lib/feature-flags";
import { ROUTES } from "@/lib/routes";

type SearchRow = { id: string; text: string };

export function AppCommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { preferences, updatePreferences } = usePreferences();
  const { novels, ideaWebEntries, setActiveNovel, setActiveScene, setMode } = useNovelContext();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sceneItems = useMemo(() => {
    const out: { novelId: string; sceneId: string; label: string; novelTitle: string }[] = [];
    for (const n of novels) {
      for (const act of n.acts) {
        for (const ch of act.chapters) {
          for (const s of ch.scenes) {
            out.push({
              novelId: n.id,
              sceneId: s.id,
              novelTitle: n.title,
              label: s.title,
            });
          }
        }
      }
    }
    return out;
  }, [novels]);

  const fuseIndex = useMemo(() => {
    const rows: SearchRow[] = [
      { id: "nav-dash", text: "dashboard home writing desk" },
      { id: "nav-library", text: "library shelf books projects" },
      { id: "nav-inbox", text: "idea web inbox capture sparks" },
      { id: "nav-odyssey", text: "writer odyssey journey rank profile gamification streak badges" },
      { id: "nav-stats", text: "stats analytics streak words" },
      { id: "nav-help", text: "help documentation guide" },
      { id: "nav-a11y", text: "accessibility statement a11y" },
      { id: "action-quick-idea", text: "new idea quick capture inbox shortcut" },
      { id: "action-theme", text: "toggle dark light theme appearance mode" },
    ];
    if (featureFlags.settingsCommandCenter) {
      rows.push({ id: "nav-settings", text: "settings preferences account" });
    }
    for (const n of novels) {
      rows.push({
        id: `novel-${n.id}`,
        text: `${n.title} ${n.author} ${n.genre ?? ""} project novel book`,
      });
    }
    for (const s of sceneItems) {
      rows.push({
        id: `scene-${s.novelId}-${s.sceneId}`,
        text: `${s.label} ${s.novelTitle} scene chapter act`,
      });
    }
    for (const e of ideaWebEntries.slice(0, 120)) {
      rows.push({
        id: `idea-${e.id}`,
        text: `${e.title ?? ""} ${e.body ?? ""} idea spark note`,
      });
    }
    for (const n of novels) {
      for (const c of n.codexEntries) {
        rows.push({
          id: `codex-${n.id}-${c.id}`,
          text: `${c.name} ${c.description ?? ""} ${c.notes ?? ""} codex ${n.title} character location lore`,
        });
      }
    }
    return new Fuse(rows, { keys: ["text"], threshold: 0.42, ignoreLocation: true });
  }, [novels, sceneItems, ideaWebEntries]);

  const filteredIds = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    const hits = fuseIndex.search(q, { limit: 120 });
    return new Set(hits.map((h) => h.item.id));
  }, [query, fuseIndex]);

  const show = (id: string) => filteredIds === null || filteredIds.has(id);

  const run = (fn: () => void) => {
    setOpen(false);
    setQuery("");
    fn();
  };

  const navVisible =
    show("nav-dash") ||
    show("nav-library") ||
    show("nav-inbox") ||
    show("nav-odyssey") ||
    show("nav-stats") ||
    show("nav-help") ||
    show("nav-a11y") ||
    (featureFlags.settingsCommandCenter && show("nav-settings"));

  const projectsVisible = novels.some((n) => show(`novel-${n.id}`));
  const scenesVisible = sceneItems.some((s) => show(`scene-${s.novelId}-${s.sceneId}`));
  const ideasVisible = ideaWebEntries.slice(0, 40).some((e) => show(`idea-${e.id}`));
  const actionVisible = show("action-quick-idea") || show("action-theme");
  const codexVisible = novels.some((n) => n.codexEntries.some((c) => show(`codex-${n.id}-${c.id}`)));
  const anyVisible = navVisible || projectsVisible || scenesVisible || ideasVisible || actionVisible || codexVisible;
  const sepAfterActions =
    actionVisible && (navVisible || projectsVisible || scenesVisible || ideasVisible || codexVisible);
  const sepAfterNav = navVisible && (projectsVisible || scenesVisible || ideasVisible || codexVisible);
  const sepAfterProjects = projectsVisible && (scenesVisible || ideasVisible || codexVisible);
  const sepAfterScenes = scenesVisible && (ideasVisible || codexVisible);
  const sepAfterIdeas = ideasVisible && codexVisible;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      commandShouldFilter={false}
    >
      <CommandInput placeholder="Search pages, books, scenes, ideas…" value={query} onValueChange={setQuery} />
      <CommandList>
        {!anyVisible && query.trim() ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          <>
            {actionVisible && (
              <CommandGroup heading="Actions">
                {show("action-quick-idea") && (
                  <CommandItem
                    value="action-quick-idea"
                    onSelect={() =>
                      run(() => {
                        navigate("/inbox?capture=1");
                      })
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    New idea (quick capture)
                  </CommandItem>
                )}
                {show("action-theme") && (
                  <CommandItem
                    value="action-theme"
                    onSelect={() =>
                      run(() => {
                        const next = preferences?.theme === "dark" ? "light" : "dark";
                        void updatePreferences({ theme: next });
                      })
                    }
                  >
                    {preferences?.theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    Toggle theme
                  </CommandItem>
                )}
              </CommandGroup>
            )}
            {sepAfterActions && <CommandSeparator />}
            {navVisible && (
              <CommandGroup heading="Navigate">
                {show("nav-dash") && (
                  <CommandItem
                    value="nav-dash"
                    onSelect={() =>
                      run(() => {
                        navigate("/");
                      })
                    }
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                    <CommandShortcut>⌘K</CommandShortcut>
                  </CommandItem>
                )}
                {show("nav-library") && (
                  <CommandItem
                    value="nav-library"
                    onSelect={() =>
                      run(() => {
                        navigate("/library");
                      })
                    }
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Library
                  </CommandItem>
                )}
                {show("nav-inbox") && (
                  <CommandItem
                    value="nav-inbox"
                    onSelect={() =>
                      run(() => {
                        navigate("/inbox");
                      })
                    }
                  >
                    <Inbox className="mr-2 h-4 w-4" />
                    Idea Web inbox
                  </CommandItem>
                )}
                {show("nav-odyssey") && (
                  <CommandItem
                    value="nav-odyssey"
                    onSelect={() =>
                      run(() => {
                        navigate(ROUTES.odyssey);
                      })
                    }
                  >
                    <Compass className="mr-2 h-4 w-4" />
                    Writer&apos;s Odyssey
                  </CommandItem>
                )}
                {show("nav-stats") && (
                  <CommandItem
                    value="nav-stats"
                    onSelect={() =>
                      run(() => {
                        navigate("/stats");
                      })
                    }
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Stats
                  </CommandItem>
                )}
                {featureFlags.settingsCommandCenter && show("nav-settings") && (
                  <CommandItem
                    value="nav-settings"
                    onSelect={() =>
                      run(() => {
                        navigate("/settings");
                      })
                    }
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </CommandItem>
                )}
                {show("nav-help") && (
                  <CommandItem
                    value="nav-help"
                    onSelect={() =>
                      run(() => {
                        navigate("/help");
                      })
                    }
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help
                  </CommandItem>
                )}
                {show("nav-a11y") && (
                  <CommandItem
                    value="nav-a11y"
                    onSelect={() =>
                      run(() => {
                        navigate("/accessibility");
                      })
                    }
                  >
                    <Accessibility className="mr-2 h-4 w-4" />
                    Accessibility
                  </CommandItem>
                )}
              </CommandGroup>
            )}
            {sepAfterNav && <CommandSeparator />}
            {projectsVisible && (
              <CommandGroup heading="Projects">
                {novels
                  .filter((n) => show(`novel-${n.id}`))
                  .map((n) => (
                    <CommandItem
                      key={n.id}
                      value={`novel-${n.id}`}
                      onSelect={() =>
                        run(() => {
                          setActiveNovel(n.id);
                          navigate("/", { replace: true });
                        })
                      }
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {n.title}
                      <span className="ml-2 text-xs text-muted-foreground">{n.author}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {sepAfterProjects && <CommandSeparator />}
            {scenesVisible && (
              <CommandGroup heading="Scenes">
                {sceneItems
                  .filter((s) => show(`scene-${s.novelId}-${s.sceneId}`))
                  .map((s) => (
                    <CommandItem
                      key={`${s.novelId}-${s.sceneId}`}
                      value={`scene-${s.novelId}-${s.sceneId}`}
                      onSelect={() =>
                        run(() => {
                          setActiveNovel(s.novelId);
                          setActiveScene(s.sceneId);
                          setMode("write");
                          navigate("/", { replace: true });
                        })
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {s.label}
                      <span className="ml-2 truncate text-xs text-muted-foreground">{s.novelTitle}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {sepAfterScenes && <CommandSeparator />}
            {ideasVisible && (
              <CommandGroup heading="Idea Web">
                {ideaWebEntries
                  .slice(0, 120)
                  .filter((e) => show(`idea-${e.id}`))
                  .map((e) => (
                    <CommandItem
                      key={e.id}
                      value={`idea-${e.id}`}
                      onSelect={() =>
                        run(() => {
                          navigate("/inbox");
                        })
                      }
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      {e.title || "Untitled idea"}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {sepAfterIdeas && <CommandSeparator />}
            {codexVisible && (
              <CommandGroup heading="Codex">
                {novels.flatMap((n) =>
                  n.codexEntries
                    .filter((c) => show(`codex-${n.id}-${c.id}`))
                    .map((c) => (
                      <CommandItem
                        key={`${n.id}-${c.id}`}
                        value={`codex-${n.id}-${c.id}`}
                        onSelect={() =>
                          run(() => {
                            setActiveNovel(n.id);
                            setMode("write");
                            navigate("/", { replace: true });
                          })
                        }
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-2 truncate text-xs text-muted-foreground">{n.title}</span>
                      </CommandItem>
                    )),
                )}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
