import { Link } from "react-router-dom";

import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { RetroWindowFrame } from "@/components/layout/RetroWindowFrame";

export default function AccessibilityStatement() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fdfbf0]">
      <AppPageHeader title="Accessibility" subtitle="OdinPad commitment to inclusive writing tools" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <RetroWindowFrame title="conformance status" accent="white">
            <p className="text-sm leading-relaxed text-muted-foreground">
              OdinPad targets <strong className="text-foreground">WCAG 2.1 Level AA</strong> conformance for all core
              writing and reading flows. Interactive controls use Radix UI primitives which provide keyboard navigation,
              focus management, and ARIA semantics. Idea Web status badges include both colour and shape/icon indicators
              so status is discernible without colour perception.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Last self-audit: <time dateTime="2026-03-25">25 March 2026</time>
            </p>
          </RetroWindowFrame>

          <RetroWindowFrame title="known exceptions" accent="peach">
            <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">Atlas graph (XYFlow)</strong> — pointer-only drag interaction.
                Keyboard navigation for nodes is planned; use the Binder or Blueprint panels as accessible alternatives
                for structural editing.
              </li>
              <li>
                <strong className="text-foreground">Corkboard drag-and-drop</strong> — currently pointer-only. The
                Binder panel provides full keyboard access to scene ordering.
              </li>
              <li>
                <strong className="text-foreground">Rich text formatting</strong> — the Write and Brainstorm editors use
                plain <code className="rounded bg-muted px-1 text-xs">textarea</code> elements; semantic heading and
                bold markup is not yet supported.
              </li>
              <li>
                <strong className="text-foreground">Contribution heatmap (Stats)</strong> — each cell carries a
                descriptive <code className="rounded bg-muted px-1 text-xs">title</code> tooltip; a full
                <code className="rounded bg-muted px-1 text-xs">table</code> alternative is planned.
              </li>
            </ul>
          </RetroWindowFrame>

          <RetroWindowFrame title="motion" accent="mint">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enabling <strong className="text-foreground">Reduce Motion</strong> in your operating system settings
              disables all Framer Motion page transitions, scroll reveals, and loading spinner animations across the
              studio. Static opacity fades replace animated transitions.
            </p>
          </RetroWindowFrame>

          <RetroWindowFrame title="keyboard & focus" accent="sky">
            <p className="text-sm leading-relaxed text-muted-foreground">
              All interactive elements are reachable via{" "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Tab</kbd> /{" "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Shift+Tab</kbd>. Dialogs and
              menus trap focus while open and restore it on close. A{" "}
              <strong className="text-foreground">Skip to main content</strong> link is the first focusable element in
              every app page; press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Tab</kbd>{" "}
              on page load to reveal it.
            </p>
          </RetroWindowFrame>

          <RetroWindowFrame title="contact for accessibility issues" accent="lavender">
            <p className="text-sm leading-relaxed text-muted-foreground">
              To report an accessibility barrier, open an issue in the project repository and include your browser,
              operating system, assistive technology name and version, and a description of the barrier. We aim to
              respond within five business days and prioritise issues affecting core writing flows.
            </p>
          </RetroWindowFrame>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/help" className="underline">
              Back to Help
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
