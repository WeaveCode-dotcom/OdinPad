import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import {
  FIRST_RUN_CHECKLIST_EVENTS,
  FOUNDATIONS_TRACK_LABEL,
  getFirstRunProgress,
  msSinceUserSignup,
} from "@/lib/first-run-checklist";
import { cn } from "@/lib/utils";

const DISMISS_LS = "odinpad_first_run_checklist_dismissed";
const CELEBRATION_TOAST_LS = "odinpad_foundations_celebration_toast";

type ChecklistPayload = {
  source: "dashboard" | "stats";
  ms_since_signup?: number;
};

function buildPayload(userCreatedAt: string | undefined, source: ChecklistPayload["source"]): ChecklistPayload {
  const ms = msSinceUserSignup(userCreatedAt);
  return ms != null ? { source, ms_since_signup: ms } : { source };
}

/** Dashboard: compact row + sheet when checklist incomplete and not dismissed. */
export function FirstRunDashboardChecklist({ onOpenCreateProject }: { onOpenCreateProject: () => void }) {
  const navigate = useNavigate();
  const { preferences, user, updatePreferences } = useAuth();
  const { novels, setActiveNovel, createGlobalIdeaWebEntry } = useNovelContext();
  const [hidden, setHidden] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_LS) === "1",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const impressionTracked = useRef(false);
  const statsImpressionTracked = useRef(false);
  const prevFlags = useRef<{
    first_run_novel_created: boolean;
    first_run_idea_web_visited: boolean;
    first_run_write_opened: boolean;
  } | null>(null);

  const visible = useMemo(
    () =>
      Boolean(
        preferences &&
        !hidden &&
        !(
          preferences.first_run_novel_created &&
          preferences.first_run_idea_web_visited &&
          preferences.first_run_write_opened
        ),
      ),
    [preferences, hidden],
  );

  useEffect(() => {
    if (!visible) return;
    if (impressionTracked.current) return;
    impressionTracked.current = true;
    trackEvent(FIRST_RUN_CHECKLIST_EVENTS.IMPRESSION, buildPayload(user?.createdAt, "dashboard"));
  }, [visible, user?.createdAt]);

  useEffect(() => {
    if (!preferences) return;
    const curr = {
      first_run_novel_created: Boolean(preferences.first_run_novel_created),
      first_run_idea_web_visited: Boolean(preferences.first_run_idea_web_visited),
      first_run_write_opened: Boolean(preferences.first_run_write_opened),
    };
    const prev = prevFlags.current;
    if (prev) {
      if (!prev.first_run_novel_created && curr.first_run_novel_created) {
        trackEvent(FIRST_RUN_CHECKLIST_EVENTS.STEP_COMPLETE, { step: "novel" });
      }
      if (!prev.first_run_idea_web_visited && curr.first_run_idea_web_visited) {
        trackEvent(FIRST_RUN_CHECKLIST_EVENTS.STEP_COMPLETE, { step: "idea_web" });
      }
      if (!prev.first_run_write_opened && curr.first_run_write_opened) {
        trackEvent(FIRST_RUN_CHECKLIST_EVENTS.STEP_COMPLETE, { step: "write" });
      }
      const allBefore = prev.first_run_novel_created && prev.first_run_idea_web_visited && prev.first_run_write_opened;
      const allNow = curr.first_run_novel_created && curr.first_run_idea_web_visited && curr.first_run_write_opened;
      if (!allBefore && allNow) {
        trackEvent(FIRST_RUN_CHECKLIST_EVENTS.ALL_COMPLETE, buildPayload(user?.createdAt, "dashboard"));
        if (typeof localStorage !== "undefined" && !localStorage.getItem(CELEBRATION_TOAST_LS)) {
          localStorage.setItem(CELEBRATION_TOAST_LS, "1");
          toast({
            title: `${FOUNDATIONS_TRACK_LABEL} complete`,
            description: "You finished the three quick wins. Odyssey ranks are still earned by writing volume.",
          });
        }
        if (!preferences.foundations_badge_unlocked) {
          void updatePreferences({ foundations_badge_unlocked: true });
        }
      }
    }
    prevFlags.current = curr;
  }, [preferences, updatePreferences, user?.createdAt]);

  if (!preferences || !visible) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border border-border bg-card"
          onClick={() => setDrawerOpen(true)}
        >
          Getting started
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            trackEvent(FIRST_RUN_CHECKLIST_EVENTS.DISMISS, { source: "dashboard" });
            localStorage.setItem(DISMISS_LS, "1");
            setHidden(true);
          }}
        >
          Remind me later
        </Button>
      </div>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>First-run checklist</SheetTitle>
            <p className="text-left text-sm text-muted-foreground">Three quick wins to get comfortable in OdinPad.</p>
          </SheetHeader>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex flex-wrap items-center gap-2">
              <Check
                className={`h-4 w-4 ${preferences.first_run_novel_created ? "text-primary" : "text-muted-foreground/40"}`}
                aria-hidden
              />
              <span
                className={
                  preferences.first_run_novel_created ? "text-muted-foreground line-through" : "font-medium text-foreground"
                }
              >
                Create or open a project
              </span>
              {!preferences.first_run_novel_created && (
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={onOpenCreateProject}>
                  Create
                </Button>
              )}
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <Check
                className={`h-4 w-4 ${preferences.first_run_idea_web_visited ? "text-primary" : "text-muted-foreground/40"}`}
                aria-hidden
              />
              <span
                className={
                  preferences.first_run_idea_web_visited
                    ? "text-muted-foreground line-through"
                    : "font-medium text-foreground"
                }
              >
                Visit Idea Web or capture an idea
              </span>
              {!preferences.first_run_idea_web_visited && (
                <>
                  <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => navigate("/inbox")}>
                    Open inbox
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      void createGlobalIdeaWebEntry({
                        title: "Quick capture",
                        body: "Replace this with your spark.",
                      });
                    }}
                  >
                    Log sample idea
                  </Button>
                </>
              )}
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <Check
                className={`h-4 w-4 ${preferences.first_run_write_opened ? "text-primary" : "text-muted-foreground/40"}`}
                aria-hidden
              />
              <span
                className={
                  preferences.first_run_write_opened ? "text-muted-foreground line-through" : "font-medium text-foreground"
                }
              >
                Open Write view in a project
              </span>
              {!preferences.first_run_write_opened && novels[0] && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setActiveNovel(novels[0].id);
                    navigate("/", { replace: true });
                  }}
                >
                  Open book
                </Button>
              )}
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Stats & analytics: full Foundations card + parity with dashboard checklist. */
export function FirstRunStatsCard() {
  const navigate = useNavigate();
  const { preferences, user } = useAuth();
  const firstRunProgress = useMemo(() => getFirstRunProgress(preferences), [preferences]);
  const impressionOnce = useRef(false);

  useEffect(() => {
    if (!preferences || firstRunProgress.allDone || impressionOnce.current) return;
    impressionOnce.current = true;
    trackEvent(FIRST_RUN_CHECKLIST_EVENTS.IMPRESSION, buildPayload(user?.createdAt, "stats"));
  }, [preferences, firstRunProgress.allDone, user?.createdAt]);

  if (!preferences) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-amber-900">{FOUNDATIONS_TRACK_LABEL}</h2>
          <p className="mt-1 text-sm text-neutral-700">
            First-run checklist progress. This track is separate from Odyssey word ranks on the dashboard.
            {preferences.foundations_badge_unlocked && (
              <span className="mt-2 block font-medium text-primary">
                Badge unlocked: {FOUNDATIONS_TRACK_LABEL} — cosmetic only, separate from Odyssey.
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border border-border"
          onClick={() => navigate("/")}
        >
          Open dashboard
        </Button>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${firstRunProgress.pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-neutral-600">
        {firstRunProgress.completed} of {firstRunProgress.total} complete
        {firstRunProgress.allDone ? " — nice work." : ""}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-800">
        <li className="flex items-center gap-2">
          <Check
            className={cn("h-4 w-4 shrink-0", firstRunProgress.steps.novel ? "text-primary" : "text-muted-foreground/40")}
            aria-hidden
          />
          <span className={firstRunProgress.steps.novel ? "text-muted-foreground line-through" : ""}>
            Create or open a project
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Check
            className={cn("h-4 w-4 shrink-0", firstRunProgress.steps.idea_web ? "text-primary" : "text-muted-foreground/40")}
            aria-hidden
          />
          <span className={firstRunProgress.steps.idea_web ? "text-muted-foreground line-through" : ""}>
            Visit Idea Web or capture an idea
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Check
            className={cn("h-4 w-4 shrink-0", firstRunProgress.steps.write ? "text-primary" : "text-muted-foreground/40")}
            aria-hidden
          />
          <span className={firstRunProgress.steps.write ? "text-muted-foreground line-through" : ""}>
            Open Write view in a project
          </span>
        </li>
      </ul>
    </div>
  );
}
