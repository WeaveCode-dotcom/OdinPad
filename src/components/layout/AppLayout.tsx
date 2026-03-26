import { type ChangeEventHandler, type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AccountSecurityModal from "@/components/auth/AccountSecurityModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppShellProvider, useAppShell } from "@/contexts/AppShellContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { featureFlags } from "@/lib/feature-flags";
import { assertFileSizeWithin, FILE_SIZE_LIMITS } from "@/lib/file-upload-policy";
import { parseJsonStringAsync } from "@/lib/json-parse-async";
import { sortNovelsByRecent } from "@/lib/novel-metrics";
import { parseNovelImport } from "@/lib/novel-store";
import { cn } from "@/lib/utils";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { novels, setActiveNovel, ideaWebEntries, importNovel } = useNovelContext();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useAppShell();
  const [securityOpen, setSecurityOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const globalInboxCount = useMemo(() => ideaWebEntries.filter((e) => e.novelId === null).length, [ideaWebEntries]);

  const sortedNovels = useMemo(() => sortNovelsByRecent(novels), [novels]);
  const primaryNovel = sortedNovels[0] ?? null;

  const exportTargetNovel = useCallback(() => {
    const n = primaryNovel;
    if (!n) {
      toast({ title: "No book to export", description: "Create or import a project first.", variant: "destructive" });
      return;
    }
    const blob = new Blob([JSON.stringify(n, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${n.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "novel"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [primaryNovel]);

  const handleImportFile: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      assertFileSizeWithin(file, FILE_SIZE_LIMITS.novelJsonBytes, "JSON backup");
      const raw = await file.text();
      const parsed = await parseJsonStringAsync(raw);
      const novel = parseNovelImport(parsed);
      if (!novel) {
        toast({
          title: "Invalid backup file",
          description: "Expected a novel JSON with id, title, and acts.",
          variant: "destructive",
        });
        return;
      }
      importNovel(novel);
      trackEvent("book_imported", {
        source: "sidebar",
        hasSeriesId: Boolean(novel.seriesId),
        hasSeriesPosition: novel.seriesPosition != null,
      });
      toast({ title: "Book imported", description: `"${novel.title}" was added to your library.` });
    } catch (e) {
      toast({
        title: "Could not read file",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.error) {
      toast({ title: "Sign out failed", description: result.error, variant: "destructive" });
    }
  };

  const sidebarProps = {
    navigate,
    onCloseMobile: () => setMobileNavOpen(false),
    inboxUnassigned: globalInboxCount,
    ideaWebTotal: ideaWebEntries.length,
    novels,
    setActiveNovel,
    user,
    onSecurity: () => setSecurityOpen(true),
    onImport: () => importInputRef.current?.click(),
    onExport: exportTargetNovel,
    onSignOut: () => void handleSignOut(),
    settingsEnabled: featureFlags.settingsCommandCenter,
    collapsed: sidebarCollapsed,
    onToggleCollapse: toggleSidebar,
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:border-2 focus:border-teal-500 focus:bg-[#141414] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        Skip to main content
      </a>
      <div className="flex h-dvh min-h-0 w-full max-h-dvh flex-col overflow-hidden bg-[#0c0c0c] md:flex-row">
        <aside
          className={cn(
            "hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-[#141414] text-zinc-100 transition-[width] duration-300 ease-out md:flex",
            sidebarCollapsed ? "w-[72px]" : "w-[260px]",
          )}
          aria-label="Main navigation"
        >
          <AppSidebar {...sidebarProps} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="flex w-[min(100vw-2rem,280px)] flex-col border-r-2 border-zinc-800 bg-[#141414] p-0 text-zinc-100"
          >
            <SheetTitle className="sr-only">OdinPad navigation</SheetTitle>
            <AppSidebar {...sidebarProps} collapsed={false} />
          </SheetContent>
        </Sheet>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="dashboard-main flex min-h-0 min-w-0 flex-1 flex-col outline-none"
        >
          <div className="h-1 shrink-0 bg-teal-600" aria-hidden />
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
        </main>
      </div>

      <AccountSecurityModal open={securityOpen} onOpenChange={setSecurityOpen} />
    </>
  );
}

/** App shell: dark sidebar + cream main. Children fill the scrollable main column (include page headers). */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShellProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AppShellProvider>
  );
}
