import { Link } from "react-router-dom";

import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { RetroWindowFrame } from "@/components/layout/RetroWindowFrame";

export default function Help() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <AppPageHeader title="Help" subtitle="OdinPad documentation and tips" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <RetroWindowFrame title="getting started" accent="mint">
            <p className="text-sm text-muted-foreground">
              OdinPad combines a novel workspace (canvas, write, review), a global Idea Web inbox for sparks, and
              optional Sandbox tools inside a project. Use the dashboard to create books and track daily goals.
            </p>
          </RetroWindowFrame>

          <RetroWindowFrame title="dashboard" accent="lavender">
            <div id="help-dashboard" className="scroll-mt-24">
              <p className="text-sm text-muted-foreground">
                The <strong>Dashboard</strong> is your writing desk: recent projects, daily goals, and shortcuts to
                create books or series. Search filters your shelf; “Create new” opens the book wizard.
              </p>
            </div>
          </RetroWindowFrame>

          <RetroWindowFrame title="library" accent="sky">
            <div id="help-library" className="scroll-mt-24">
              <p className="text-sm text-muted-foreground">
                The <strong>Library</strong> lists all manuscripts. Projects hold your scenes, word counts, and exports.
                Create a book to start drafting, or import a JSON backup from another workspace.
              </p>
            </div>
          </RetroWindowFrame>

          <RetroWindowFrame title="idea web" accent="peach">
            <div id="help-idea-web" className="scroll-mt-24">
              <p className="text-sm text-muted-foreground">
                <strong>Idea Web</strong> is a global inbox for sparks (unassigned ideas). Capture quickly, filter by
                type or project, then harvest into a manuscript. Use the map to link ideas visually.
              </p>
            </div>
          </RetroWindowFrame>

          <RetroWindowFrame title="stats" accent="mint">
            <div id="help-stats" className="scroll-mt-24">
              <p className="text-sm text-muted-foreground">
                <strong>Stats</strong> shows words written, streaks, and per-project totals from your daily log. Goals
                and Foundations progress are separate from gamified Odyssey ranks on the dashboard.
              </p>
            </div>
          </RetroWindowFrame>

          <RetroWindowFrame title="story wiki" accent="white">
            <div id="help-story-wiki" className="scroll-mt-24">
              <p className="text-sm text-muted-foreground">
                The <strong>Story Wiki</strong> (inside a project workspace) stores characters, places, lore, and more so
                names and continuity stay consistent while you draft.
              </p>
            </div>
          </RetroWindowFrame>

          <RetroWindowFrame title="settings" accent="lavender">
            <div id="help-settings" className="scroll-mt-24">
              <p className="text-sm text-muted-foreground">
                <strong>Settings</strong> covers account security, editor preferences (font, goals), imports/exports,
                and notification-related options when enabled.
              </p>
            </div>
          </RetroWindowFrame>

          <RetroWindowFrame title="documentation (repo)" accent="sky">
            <p className="text-sm text-muted-foreground">
              Full technical and product docs live in the repository under{" "}
              <code className="rounded bg-muted px-1">documentation/</code> when you clone or browse the source. Ask
              your administrator if you need a hosted copy.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground">
              <li>
                <a className="text-primary underline" href="https://github.com" target="_blank" rel="noreferrer">
                  Placeholder — link your repo README
                </a>
              </li>
            </ul>
          </RetroWindowFrame>
          <RetroWindowFrame title="keyboard shortcuts" accent="peach">
            <div id="help-keyboard" className="scroll-mt-24 space-y-4">
              <p className="text-sm text-muted-foreground">Keyboard shortcuts to navigate OdinPad faster.</p>
              <div className="space-y-1 text-sm">
                {(
                  [
                    ["⌘K / Ctrl+K", "Open command palette / quick capture"],
                    ["B", "Toggle sidebar collapse"],
                    ["Esc (in Focus mode)", "Exit focus / fullscreen mode"],
                    ["Esc (in Story Wiki)", "Close Story Wiki panel"],
                    ["Enter (in Story Wiki add)", "Save new Story Wiki entry"],
                    ["Enter (scene search)", "Navigate to a scene"],
                  ] as [string, string][]
                ).map(([key, desc]) => (
                  <div key={key} className="flex items-start gap-3">
                    <kbd className="shrink-0 rounded border bg-muted px-2 py-0.5 font-mono text-xs leading-5">
                      {key}
                    </kbd>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </RetroWindowFrame>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/accessibility" className="underline">
              Accessibility statement
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
