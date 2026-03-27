import { Bell, ChevronDown, Clock, ExternalLink, Mail, Pencil, Shield, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AccountSecurityModal from "@/components/auth/AccountSecurityModal";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { RetroWindowFrame } from "@/components/layout/RetroWindowFrame";
import BookEditDialog from "@/components/novel/BookEditDialog";
import DeleteBookDialog from "@/components/novel/DeleteBookDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { mergeAiCompanion, parseAiCompanionSettings } from "@/lib/ai-companion-settings";
import { FOUNDATIONS_TRACK_LABEL, getFirstRunProgress } from "@/lib/first-run-checklist";
import { mergeIdeaWebSettingsPatch, parseIdeaWebSettings } from "@/lib/idea-web/idea-web-user-settings";
import { parseJsonStringAsync } from "@/lib/json-parse-async";
import { getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from "@/lib/notifications";
import { getNovelWordCount } from "@/lib/novel-metrics";
import { parseNovelImport } from "@/lib/novel-store";
import { mapSupabaseError } from "@/lib/supabase-errors";
import { downloadJson, fetchUserDataBundle } from "@/lib/user-data-export";
import { getLocalISODate } from "@/lib/user-stats-daily";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types/novel";

type SettingsState = {
  display_name: string;
  avatar_url: string;
  bio: string;
  theme: string;
  font_family: string;
  font_size: string;
  line_spacing: string;
  typewriter_mode: boolean;
  daily_word_goal: string;
  weekly_word_goal: string;
  pomodoro_minutes: string;
  reminder_daily: boolean;
  reminder_streak: boolean;
  reminder_progress_email: string;
  reminder_push_enabled: boolean;
  idea_web_inactivity_days: string;
  idea_web_auto_dormant: boolean;
  idea_web_rule_seed: boolean;
  idea_web_rule_grow: boolean;
  ai_daily_prompt: boolean;
  ai_auto_enrich: boolean;
  ai_use_context: boolean;
  ai_stretch: boolean;
};

const DAILY_GOAL_PRESETS = [250, 500, 750, 1000, 1500] as const;
const WEEKLY_GOAL_PRESETS = [2500, 3500, 5000, 7000, 10000] as const;
const POMODORO_PRESETS = [20, 25, 30, 45] as const;

function toState(
  profile: { display_name: string | null; avatar_url: string | null; bio: string | null } | null,
  preferences: ReturnType<typeof useAuth>["preferences"],
): SettingsState {
  return {
    display_name: profile?.display_name ?? "",
    avatar_url: profile?.avatar_url ?? "",
    bio: profile?.bio ?? "",
    theme: preferences?.theme ?? "light",
    font_family: preferences?.font_family ?? "Inter",
    font_size: String(preferences?.font_size ?? 1),
    line_spacing: String(preferences?.line_spacing ?? 1.75),
    typewriter_mode: preferences?.typewriter_mode ?? false,
    daily_word_goal: String(preferences?.daily_word_goal ?? 500),
    weekly_word_goal: String(preferences?.weekly_word_goal ?? 3500),
    pomodoro_minutes: String(preferences?.pomodoro_minutes ?? 25),
    reminder_daily: preferences?.reminder_daily ?? false,
    reminder_streak: preferences?.reminder_streak ?? true,
    reminder_progress_email: preferences?.reminder_progress_email ?? "weekly",
    reminder_push_enabled: preferences?.reminder_push_enabled ?? false,
    ...(() => {
      const iw = parseIdeaWebSettings(preferences?.idea_web_settings ?? {});
      return {
        idea_web_inactivity_days: String(iw.inactivityDays),
        idea_web_auto_dormant: iw.autoDormantEnabled,
        idea_web_rule_seed: iw.autoStatusRules.seedToSprouting?.enabled ?? true,
        idea_web_rule_grow: iw.autoStatusRules.sproutingToGrowing?.enabled ?? true,
      };
    })(),
    ...(() => {
      const ac = parseAiCompanionSettings(preferences?.ai_companion);
      return {
        ai_daily_prompt: ac.daily_prompt_enabled,
        ai_auto_enrich: ac.auto_enrich_enabled,
        ai_use_context: ac.use_context_enabled,
        ai_stretch: ac.stretch_variants_enabled,
      };
    })(),
  };
}

// ── Backup/restore wizard ─────────────────────────────────────────────────────

function BackupRestoreWizard({
  existingNovelIds,
  onImport,
}: {
  existingNovelIds: Set<string>;
  onImport: (novel: Novel) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"idle" | "preview" | "conflict" | "done">("idle");
  const [novel, setNovel] = useState<ReturnType<typeof parseNovelImport>>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    setError(null);
    try {
      const raw = await file.text();
      const parsed = await parseJsonStringAsync(raw);
      const n = parseNovelImport(parsed);
      if (!n) {
        setError("This file does not look like a valid OdinPad novel backup.");
        return;
      }
      setNovel(n);
      setStep(existingNovelIds.has(n.id) ? "conflict" : "preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file.");
    }
  };

  const doImport = () => {
    if (!novel) return;
    onImport(novel);
    setStep("done");
  };

  return (
    <div className="mt-4 space-y-3">
      {step === "idle" && (
        <>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleFile} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border border-border"
            onClick={() => fileRef.current?.click()}
          >
            Choose backup file (.json)
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
      {(step === "preview" || step === "conflict") && novel && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
          {step === "conflict" && (
            <div className="rounded-md border-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              A project with this ID already exists in your library. Importing will overwrite it.
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Novel to restore</p>
            <p className="mt-1 font-semibold text-foreground">{novel.title}</p>
            <p className="text-xs text-muted-foreground">
              by {novel.author} · {getNovelWordCount(novel).toLocaleString()} words ·{" "}
              {novel.acts.reduce((s, a) => s + a.chapters.reduce((cs, ch) => cs + ch.scenes.length, 0), 0)} scenes
            </p>
            <p className="text-xs text-muted-foreground">Last updated {new Date(novel.updatedAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="border border-border bg-primary text-white hover:bg-primary/90"
              onClick={doImport}
            >
              {step === "conflict" ? "Overwrite & restore" : "Restore"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border border-border"
              onClick={() => {
                setNovel(null);
                setStep("idle");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {step === "done" && (
        <div className="rounded-md border-2 border-emerald-400 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Restored! Find your project in the Library.{" "}
          <button type="button" className="underline hover:no-underline" onClick={() => setStep("idle")}>
            Restore another
          </button>
        </div>
      )}
    </div>
  );
}

const WEBHOOK_KEY = "odinpad_save_webhook_url";

export function getWebhookUrl(): string {
  try {
    return localStorage.getItem(WEBHOOK_KEY) ?? "";
  } catch {
    return "";
  }
}

function PushSubscribeButton({ userId }: { userId: string | undefined }) {
  type PushState = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";
  const [pushState, setPushState] = useState<PushState>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void getPushSubscriptionState().then((s) => setPushState(s as PushState));
  }, []);

  const handleToggle = async () => {
    if (!userId) return;
    setWorking(true);
    try {
      if (pushState === "subscribed") {
        await unsubscribeFromPush(userId);
        setPushState("unsubscribed");
        toast({ title: "Push notifications disabled" });
      } else {
        const result = await subscribeToPush(userId);
        setPushState(result === "subscribed" ? "subscribed" : result === "denied" ? "denied" : "unsubscribed");
        if (result === "subscribed") toast({ title: "Push notifications enabled" });
        else if (result === "denied")
          toast({
            title: "Permission denied",
            description: "Allow notifications in browser settings.",
            variant: "destructive",
          });
        else if (result === "unsupported")
          toast({
            title: "Not supported",
            description: "Your browser does not support Web Push. Try setting VITE_VAPID_PUBLIC_KEY.",
            variant: "destructive",
          });
      }
    } catch {
      toast({ title: "Failed to update push subscription", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  if (pushState === "loading") return null;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2">
        <Smartphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">Browser push notifications</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {pushState === "unsupported"
          ? "Not supported in this browser or VAPID key not configured (VITE_VAPID_PUBLIC_KEY)."
          : pushState === "denied"
            ? "Notifications blocked — allow them in your browser / OS settings."
            : pushState === "subscribed"
              ? "Enabled for this browser. You will receive OdinPad reminders here."
              : "Enable to receive writing reminders in this browser."}
      </p>
      {pushState !== "unsupported" && pushState !== "denied" && (
        <Button
          type="button"
          size="sm"
          variant={pushState === "subscribed" ? "outline" : "default"}
          className="mt-1 w-fit border border-border"
          disabled={working}
          onClick={() => void handleToggle()}
        >
          {pushState === "subscribed" ? "Disable" : "Enable push"}
        </Button>
      )}
    </div>
  );
}

function WebhookField() {
  const [url, setUrl] = useState(() => getWebhookUrl());
  const [saved, setSaved] = useState(false);
  const save = () => {
    try {
      if (url.trim()) {
        localStorage.setItem(WEBHOOK_KEY, url.trim());
      } else {
        localStorage.removeItem(WEBHOOK_KEY);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mt-4 space-y-2">
      <Label htmlFor="webhook-url" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">
        Webhook URL
      </Label>
      <div className="flex gap-2">
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://hooks.zapier.com/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border border-border font-mono text-xs shadow-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border border-border shrink-0"
          onClick={save}
        >
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>
      {url.trim() && <p className="text-xs text-emerald-700">Webhook active — fires on every manuscript save.</p>}
      {!url.trim() && <p className="text-xs text-muted-foreground">Leave empty to disable.</p>}
    </div>
  );
}

function GoalModeToggle() {
  const [mode, setMode] = useState<"daily" | "rolling_7day">(
    () => (localStorage.getItem("odinpad_goal_mode") as "daily" | "rolling_7day") ?? "daily",
  );
  const toggle = (next: "daily" | "rolling_7day") => {
    setMode(next);
    localStorage.setItem("odinpad_goal_mode", next);
  };
  return (
    <div className="mt-3 flex gap-2">
      {(
        [
          { value: "daily", label: "Daily target", desc: "Fixed daily word goal" },
          { value: "rolling_7day", label: "7-day rolling avg", desc: "Average of last 7 days" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={cn(
            "flex-1 rounded-md border border-border px-3 py-2 text-left text-xs font-semibold transition-colors",
            mode === opt.value
              ? "bg-primary text-white shadow-[2px_2px_0_0_rgb(0_0_0_/_0.15)]"
              : "bg-card text-foreground/80 hover:bg-accent",
          )}
        >
          {opt.label}
          <span
            className={cn(
              "mt-0.5 block text-[10px] font-normal",
              mode === opt.value ? "text-teal-100" : "text-neutral-500",
            )}
          >
            {opt.desc}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, preferences, updateProfile, updatePreferences } = useAuth();
  const { novels, setActiveNovel, importNovel } = useNovelContext();
  const [state, setState] = useState<SettingsState>(() => toState(profile, preferences));
  const [editOpen, setEditOpen] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveFeedbackDetail, setSaveFeedbackDetail] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<"idle" | "success" | "error">("idle");
  const [exportFeedbackDetail, setExportFeedbackDetail] = useState<string | null>(null);

  useEffect(() => {
    setState(toState(profile, preferences));
  }, [profile, preferences]);

  useEffect(() => {
    let cancelled = false;
    let hideSavedTimer: number | undefined;
    const timer = window.setTimeout(async () => {
      setSaveFeedback("saving");
      setSaveFeedbackDetail(null);
      const profileResult = await updateProfile({
        display_name: state.display_name,
        avatar_url: state.avatar_url || null,
        bio: state.bio || null,
      });
      if (cancelled) return;
      if (profileResult.error) {
        const msg = mapSupabaseError(profileResult.error);
        setSaveFeedback("error");
        setSaveFeedbackDetail(msg);
        toast({ title: "Failed to save account settings", description: msg, variant: "destructive" });
        return;
      }
      const prefResult = await updatePreferences({
        theme: state.theme,
        font_family: state.font_family,
        font_size: Number(state.font_size) || 1,
        line_spacing: Number(state.line_spacing) || 1.75,
        typewriter_mode: state.typewriter_mode,
        daily_word_goal: Number(state.daily_word_goal) || 500,
        weekly_word_goal: Number(state.weekly_word_goal) || 3500,
        pomodoro_minutes: Number(state.pomodoro_minutes) || 25,
        reminder_daily: state.reminder_daily,
        reminder_streak: state.reminder_streak,
        reminder_progress_email: state.reminder_progress_email,
        reminder_push_enabled: state.reminder_push_enabled,
        idea_web_settings: mergeIdeaWebSettingsPatch(preferences?.idea_web_settings ?? {}, {
          inactivityDays: Math.min(365, Math.max(7, Number(state.idea_web_inactivity_days) || 90)),
          autoDormantEnabled: state.idea_web_auto_dormant,
          autoStatusRules: {
            seedToSprouting: {
              enabled: state.idea_web_rule_seed,
              minBodyWords: 40,
            },
            sproutingToGrowing: {
              enabled: state.idea_web_rule_grow,
              minLinks: 1,
            },
          },
        }),
        ai_companion: mergeAiCompanion(preferences?.ai_companion, {
          daily_prompt_enabled: state.ai_daily_prompt,
          auto_enrich_enabled: state.ai_auto_enrich,
          use_context_enabled: state.ai_use_context,
          stretch_variants_enabled: state.ai_stretch,
        }),
      });
      if (cancelled) return;
      if (prefResult.error) {
        const msg = mapSupabaseError(prefResult.error);
        setSaveFeedback("error");
        setSaveFeedbackDetail(msg);
        toast({ title: "Failed to save preferences", description: msg, variant: "destructive" });
        return;
      }
      setSaveFeedback("saved");
      hideSavedTimer = window.setTimeout(() => {
        if (!cancelled) {
          setSaveFeedback("idle");
          setSaveFeedbackDetail(null);
        }
      }, 2200);
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (hideSavedTimer) window.clearTimeout(hideSavedTimer);
    };
  }, [state, updatePreferences, updateProfile]);

  const tabBase =
    "w-full justify-start border border-border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-accent";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <AppPageHeader
        title="Settings"
        subtitle="Control room — account, editor, goals, and projects"
        helpLink={{ label: "About Settings", to: "/help#help-settings" }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-4 md:px-8">
        {saveFeedback !== "idle" && (
          <p
            className={cn(
              "mb-3 rounded-md border px-3 py-2 text-sm",
              saveFeedback === "saved" && "border-emerald-200 bg-emerald-50 text-emerald-900",
              saveFeedback === "error" && "border-destructive/40 bg-destructive/5 text-destructive",
              saveFeedback === "saving" && "border-border bg-muted/40 text-muted-foreground",
            )}
            role={saveFeedback === "error" ? "alert" : undefined}
          >
            {saveFeedback === "saving" && "Saving…"}
            {saveFeedback === "saved" && "All changes saved."}
            {saveFeedback === "error" && (saveFeedbackDetail ?? "Could not save settings.")}
          </p>
        )}
        <Tabs defaultValue="account" className="flex flex-col gap-4 md:flex-row md:items-start">
          <TabsList className="flex h-auto w-full flex-none flex-row flex-wrap gap-1 border-0 bg-transparent p-0 md:w-52 md:flex-col md:flex-nowrap">
            <TabsTrigger
              value="account"
              className={`${tabBase} data-[state=active]:!bg-secondary data-[state=active]:!text-black`}
            >
              Account
            </TabsTrigger>
            <TabsTrigger
              value="writing"
              className={`${tabBase} data-[state=active]:!bg-emerald-50 data-[state=active]:!text-black`}
            >
              Writing
            </TabsTrigger>
            <TabsTrigger
              value="goals"
              className={`${tabBase} data-[state=active]:!bg-amber-50 data-[state=active]:!text-black`}
            >
              Goals
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className={`${tabBase} data-[state=active]:!bg-secondary data-[state=active]:!text-black`}
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="idea-web"
              className={`${tabBase} data-[state=active]:!bg-amber-50 data-[state=active]:!text-black`}
            >
              Idea Web
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className={`${tabBase} data-[state=active]:!bg-violet-50 data-[state=active]:!text-black`}
            >
              AI
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className={`${tabBase} data-[state=active]:!bg-card data-[state=active]:!text-black`}
            >
              Privacy
            </TabsTrigger>
          </TabsList>

          <div className="min-w-0 flex-1 md:-translate-y-1 md:rotate-[0.2deg]">
            <TabsContent value="account" className="mt-0 space-y-2 focus-visible:outline-none">
              <RetroWindowFrame title="account — identity" accent="white">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mb-2 gap-2 border border-border"
                  onClick={() => setSecurityOpen(true)}
                >
                  <Shield className="h-4 w-4" />
                  Account security
                </Button>
                <Input
                  value={state.display_name}
                  onChange={(e) => setState((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Pen name / display name"
                />
                <Input
                  value={state.avatar_url}
                  onChange={(e) => setState((prev) => ({ ...prev, avatar_url: e.target.value }))}
                  placeholder="Avatar URL (optional)"
                />
                <Input
                  value={state.bio}
                  onChange={(e) => setState((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Writer bio"
                />
              </RetroWindowFrame>
            </TabsContent>

            <TabsContent value="writing" className="mt-0 space-y-2 focus-visible:outline-none">
              <RetroWindowFrame title="writing — editor" accent="mint">
                <p className="text-sm font-semibold text-foreground">Reading &amp; writing comfort</p>
                <p className="text-xs text-muted-foreground">
                  Font size and family apply to the manuscript editor. Reduced motion follows your system preference.
                </p>
                <Input
                  value={state.theme}
                  onChange={(e) => setState((prev) => ({ ...prev, theme: e.target.value }))}
                  placeholder="Theme (dark/light/sepia)"
                />
                <Input
                  value={state.font_family}
                  onChange={(e) => setState((prev) => ({ ...prev, font_family: e.target.value }))}
                  placeholder="Font family"
                />
                <label className="text-xs font-medium text-muted-foreground">
                  Font size (rem)
                  <input
                    type="range"
                    min={0.85}
                    max={1.35}
                    step={0.05}
                    value={Number(state.font_size) || 1}
                    onChange={(e) => setState((prev) => ({ ...prev, font_size: e.target.value }))}
                    className="mt-1 block w-full accent-teal-600"
                  />
                </label>
                <Input
                  value={state.font_size}
                  onChange={(e) => setState((prev) => ({ ...prev, font_size: e.target.value }))}
                  placeholder="Font size"
                />
                <Input
                  value={state.line_spacing}
                  onChange={(e) => setState((prev) => ({ ...prev, line_spacing: e.target.value }))}
                  placeholder="Line spacing"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={state.typewriter_mode}
                    onCheckedChange={(checked) => setState((prev) => ({ ...prev, typewriter_mode: Boolean(checked) }))}
                  />
                  Enable typewriter mode
                </label>
              </RetroWindowFrame>
              <RetroWindowFrame title="getting started — foundations" accent="peach">
                <p className="text-sm text-muted-foreground">
                  The {FOUNDATIONS_TRACK_LABEL} checklist tracks three quick wins (project, Idea Web, Write). It is
                  separate from Odyssey word ranks.
                </p>
                {preferences && (
                  <div className="mt-2 space-y-1 text-sm text-foreground">
                    <p>
                      Progress: {getFirstRunProgress(preferences).completed} of 3
                      {preferences.foundations_badge_unlocked ? (
                        <span className="mt-2 block font-medium text-primary">
                          Foundations badge unlocked (cosmetic only).
                        </span>
                      ) : null}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border border-border"
                    onClick={() => navigate("/#first-run-checklist")}
                  >
                    Open dashboard checklist
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border border-border"
                    onClick={() => navigate("/stats")}
                  >
                    View on Stats
                  </Button>
                </div>
              </RetroWindowFrame>
            </TabsContent>

            <TabsContent value="goals" className="mt-0 space-y-4 focus-visible:outline-none">
              <RetroWindowFrame title="Writing targets" accent="peach">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Set how much you aim to write. These targets power your{" "}
                  <strong className="font-semibold text-foreground">streak</strong>, the{" "}
                  <strong className="font-semibold text-foreground">weekly progress line</strong> on Dashboard →
                  Reminders, and headline numbers on <strong className="font-semibold text-foreground">Stats</strong>.
                  Changes save automatically.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <Label
                      htmlFor="settings-daily-goal"
                      className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600"
                    >
                      Daily word goal
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Count toward your streak when you hit this in a day (see Stats).
                    </p>
                    <Input
                      id="settings-daily-goal"
                      type="number"
                      min={50}
                      max={50000}
                      inputMode="numeric"
                      className="mt-3 border border-border font-mono shadow-sm"
                      value={state.daily_word_goal}
                      onChange={(e) => setState((prev) => ({ ...prev, daily_word_goal: e.target.value }))}
                    />
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {DAILY_GOAL_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, daily_word_goal: String(n) }))}
                          className={cn(
                            "rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors",
                            Number(state.daily_word_goal) === n
                              ? "bg-primary text-white shadow-[2px_2px_0_0_rgb(0_0_0_/_0.15)]"
                              : "bg-card text-foreground/80 hover:bg-accent",
                          )}
                        >
                          {n.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <Label
                      htmlFor="settings-weekly-goal"
                      className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600"
                    >
                      Weekly word goal
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Monday–today on the dashboard is compared to this target.
                    </p>
                    <Input
                      id="settings-weekly-goal"
                      type="number"
                      min={100}
                      max={200000}
                      inputMode="numeric"
                      className="mt-3 border border-border font-mono shadow-sm"
                      value={state.weekly_word_goal}
                      onChange={(e) => setState((prev) => ({ ...prev, weekly_word_goal: e.target.value }))}
                    />
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {WEEKLY_GOAL_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, weekly_word_goal: String(n) }))}
                          className={cn(
                            "rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors",
                            Number(state.weekly_word_goal) === n
                              ? "bg-amber-600 text-white shadow-[2px_2px_0_0_rgb(0_0_0_/_0.15)]"
                              : "bg-card text-foreground/80 hover:bg-accent",
                          )}
                        >
                          {n.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-lg border border-border bg-card p-4 shadow-sm">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">
                    Goal display mode
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Switch how the Dashboard &ldquo;Goal&rdquo; stat is calculated.
                  </p>
                  <GoalModeToggle />
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border border-border"
                    onClick={() => navigate("/stats")}
                  >
                    Open Stats &amp; analytics
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border border-border"
                    onClick={() => navigate("/odyssey")}
                  >
                    Open Writer&apos;s Odyssey
                  </Button>
                </div>
              </RetroWindowFrame>

              <RetroWindowFrame title="Focus & nudges" accent="white">
                <p className="text-sm text-muted-foreground">
                  Default focus session length and opt-ins for when OdinPad adds scheduled reminders and digests.
                </p>
                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-600">
                      <Clock className="h-4 w-4 text-teal-700" aria-hidden />
                      Pomodoro length
                    </div>
                    <Input
                      type="number"
                      min={10}
                      max={120}
                      inputMode="numeric"
                      className="border border-border font-mono"
                      value={state.pomodoro_minutes}
                      onChange={(e) => setState((prev) => ({ ...prev, pomodoro_minutes: e.target.value }))}
                      aria-label="Pomodoro minutes"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {POMODORO_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setState((prev) => ({ ...prev, pomodoro_minutes: String(n) }))}
                          className={cn(
                            "rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium",
                            Number(state.pomodoro_minutes) === n && "border-neutral-900 bg-neutral-900 text-white",
                          )}
                        >
                          {n} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-amber-200/80 bg-amber-50/60 p-4">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-950">
                      <Mail className="h-4 w-4" aria-hidden />
                      Progress digest (email)
                    </p>
                    <p className="mt-1 text-xs text-neutral-700">
                      How often you&apos;ll want a summary when email reminders ship.
                    </p>
                    <Select
                      value={
                        ["daily", "weekly", "monthly"].includes(state.reminder_progress_email)
                          ? state.reminder_progress_email
                          : "weekly"
                      }
                      onValueChange={(v) => setState((prev) => ({ ...prev, reminder_progress_email: v }))}
                    >
                      <SelectTrigger className="mt-3 border border-border bg-card">
                        <SelectValue placeholder="Cadence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily summary</SelectItem>
                        <SelectItem value="weekly">Weekly summary</SelectItem>
                        <SelectItem value="monthly">Monthly summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 rounded-lg border border-border/15 bg-accent/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-700">
                    Reminder channels
                  </p>
                  <ul className="mt-3 space-y-3">
                    <li className="flex items-start gap-3">
                      <Checkbox
                        id="rem-daily"
                        checked={state.reminder_daily}
                        onCheckedChange={(checked) =>
                          setState((prev) => ({ ...prev, reminder_daily: Boolean(checked) }))
                        }
                      />
                      <div className="min-w-0">
                        <Label
                          htmlFor="rem-daily"
                          className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
                        >
                          <Bell className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          Daily writing nudge
                        </Label>
                        <p className="text-xs text-muted-foreground">Gentle prompt to touch your draft.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Checkbox
                        id="rem-streak"
                        checked={state.reminder_streak}
                        onCheckedChange={(checked) =>
                          setState((prev) => ({ ...prev, reminder_streak: Boolean(checked) }))
                        }
                      />
                      <div className="min-w-0">
                        <Label
                          htmlFor="rem-streak"
                          className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
                        >
                          Streak at risk
                        </Label>
                        <p className="text-xs text-muted-foreground">Heads-up before you break a streak.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <PushSubscribeButton userId={user?.id} />
                    </li>
                    <li className="flex items-start gap-3 opacity-60">
                      <Checkbox id="rem-harvest" checked={false} disabled />
                      <div className="min-w-0">
                        <Label htmlFor="rem-harvest" className="text-sm font-medium text-foreground">
                          Idea Web harvest complete
                        </Label>
                        <p className="text-xs text-muted-foreground">Coming soon.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </RetroWindowFrame>

              <RetroWindowFrame title="Streak rest day" accent="peach">
                <p className="text-sm text-muted-foreground">
                  Mark today as a rest day to pause streak pressure. Your streak won&apos;t break, but no words are
                  required. Resets automatically at midnight.
                </p>
                <div className="mt-4">
                  {preferences?.streak_rest_date === getLocalISODate() ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-semibold text-amber-900">Rest day active — streak protected today.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border border-border"
                        onClick={() => void updatePreferences({ streak_rest_date: null })}
                      >
                        Cancel rest day
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border border-border"
                      onClick={() => void updatePreferences({ streak_rest_date: getLocalISODate() })}
                    >
                      Use rest day today
                    </Button>
                  )}
                </div>
              </RetroWindowFrame>
            </TabsContent>

            <TabsContent value="projects" className="mt-0 space-y-2 focus-visible:outline-none">
              <RetroWindowFrame title="projects — shelf" accent="lavender">
                {novels.length === 0 && (
                  <p className="text-sm text-muted-foreground">No projects yet. Create one from the dashboard.</p>
                )}
                {novels.map((novel) => (
                  <div
                    key={novel.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-border/70 bg-muted/20 p-3 text-sm shadow-none"
                  >
                    <div>
                      <p className="font-medium text-foreground">{novel.title}</p>
                      <p className="text-muted-foreground">
                        {novel.genre ?? "—"} · {novel.status ?? "drafting"} ·{" "}
                        {new Date(novel.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setActiveNovel(novel.id);
                          navigate("/");
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditBookId(novel.id);
                          setEditOpen(true);
                        }}
                        aria-label={`Edit ${novel.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteBookId(novel.id)}
                        aria-label={`Delete ${novel.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </RetroWindowFrame>
            </TabsContent>

            <TabsContent value="idea-web" className="mt-0 space-y-2 focus-visible:outline-none">
              <RetroWindowFrame title="idea web" accent="peach">
                <p className="text-sm text-muted-foreground">
                  Fine-tune automation rules. Core capture behavior stays the same in the Idea Web inbox.
                </p>
                <Collapsible className="mt-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-foreground hover:bg-muted/50">
                    Advanced — lifecycle automation
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={state.idea_web_auto_dormant}
                        onCheckedChange={(checked) =>
                          setState((prev) => ({ ...prev, idea_web_auto_dormant: Boolean(checked) }))
                        }
                      />
                      Auto-mark ideas dormant after inactivity
                    </label>
                    <Input
                      value={state.idea_web_inactivity_days}
                      onChange={(e) => setState((prev) => ({ ...prev, idea_web_inactivity_days: e.target.value }))}
                      placeholder="Days (7–365)"
                      type="number"
                      min={7}
                      max={365}
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={state.idea_web_rule_seed}
                        onCheckedChange={(checked) =>
                          setState((prev) => ({ ...prev, idea_web_rule_seed: Boolean(checked) }))
                        }
                      />
                      Promote seed → sprouting when body reaches ~40 words
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={state.idea_web_rule_grow}
                        onCheckedChange={(checked) =>
                          setState((prev) => ({ ...prev, idea_web_rule_grow: Boolean(checked) }))
                        }
                      />
                      Promote sprouting → growing when the idea has at least one link
                    </label>
                  </CollapsibleContent>
                </Collapsible>
              </RetroWindowFrame>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 space-y-2 focus-visible:outline-none">
              <RetroWindowFrame title="AI companion" accent="white">
                <p className="text-sm text-muted-foreground">
                  AI-powered features powered by Groq. Requires the{" "}
                  <code className="rounded bg-muted px-1">idea-web-groq</code> Edge Function to be deployed.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={state.ai_daily_prompt}
                      onCheckedChange={(checked) =>
                        setState((prev) => ({ ...prev, ai_daily_prompt: Boolean(checked) }))
                      }
                    />
                    Personalized daily seed prompt
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={state.ai_use_context}
                      onCheckedChange={(checked) => setState((prev) => ({ ...prev, ai_use_context: Boolean(checked) }))}
                    />
                    Use my writing context in prompts (book titles, genres, recent ideas)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={state.ai_auto_enrich}
                      onCheckedChange={(checked) => setState((prev) => ({ ...prev, ai_auto_enrich: Boolean(checked) }))}
                    />
                    Auto-enrich new Idea Web entries (tags + summary after capture)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={state.ai_stretch}
                      onCheckedChange={(checked) => setState((prev) => ({ ...prev, ai_stretch: Boolean(checked) }))}
                    />
                    Show stretch variants on the dashboard (paragraph / what-if / opposite)
                  </label>
                </div>
              </RetroWindowFrame>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-2 focus-visible:outline-none">
              <RetroWindowFrame title="privacy — trust" accent="white">
                <p className="text-sm text-muted-foreground">
                  Open <strong className="font-medium text-foreground">Account security</strong> on the Account tab (or
                  the Security item in the sidebar) for password reset, sign out on this device, sign out everywhere,
                  and account deletion.
                </p>
                <p className="text-sm text-muted-foreground">
                  Privacy-first defaults are enabled. No public sharing is forced.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Download a JSON bundle of your profile, preferences, manuscripts metadata, Idea Web entries, and
                  writing stats (data portability).
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!user || exportingData}
                    onClick={() => {
                      if (!user) return;
                      setExportingData(true);
                      setExportFeedback("idle");
                      setExportFeedbackDetail(null);
                      void (async () => {
                        try {
                          const bundle = await fetchUserDataBundle(user.id);
                          downloadJson(`odinpad-data-export-${user.id.slice(0, 8)}.json`, bundle);
                          setExportFeedback("success");
                          setExportFeedbackDetail(null);
                          toast({ title: "Export started", description: "Check your downloads for the JSON file." });
                          window.setTimeout(() => {
                            setExportFeedback("idle");
                          }, 5000);
                        } catch (e) {
                          const msg = mapSupabaseError(e);
                          setExportFeedback("error");
                          setExportFeedbackDetail(msg);
                          toast({
                            title: "Export failed",
                            description: msg,
                            variant: "destructive",
                          });
                        } finally {
                          setExportingData(false);
                        }
                      })();
                    }}
                  >
                    {exportingData ? "Preparing…" : "Download my data (JSON)"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate("/help")}>
                    Help & documentation
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate("/accessibility")}>
                    Accessibility statement
                  </Button>
                </div>
                {exportFeedback !== "idle" && (
                  <p
                    className={cn(
                      "mt-3 text-sm",
                      exportFeedback === "success" && "text-emerald-800",
                      exportFeedback === "error" && "text-destructive",
                    )}
                    role={exportFeedback === "error" ? "alert" : undefined}
                  >
                    {exportFeedback === "success" && "Download should appear in your browser’s downloads folder."}
                    {exportFeedback === "error" && (exportFeedbackDetail ?? "Export failed.")}
                  </p>
                )}
              </RetroWindowFrame>

              <RetroWindowFrame title="Restore from backup" accent="lavender">
                <p className="text-sm text-muted-foreground">
                  Import a previously exported JSON backup file to restore a project. If the project ID already exists,
                  you will be warned before overwriting.
                </p>
                <BackupRestoreWizard
                  existingNovelIds={new Set(novels.map((n) => n.id))}
                  onImport={(n) => {
                    if (!n) return;
                    importNovel(n);
                    toast({ title: "Project restored", description: `"${n.title}" added to your library.` });
                  }}
                />
              </RetroWindowFrame>

              <RetroWindowFrame title="Save webhook" accent="peach">
                <p className="text-sm text-muted-foreground">
                  Post a JSON payload to your URL every time a manuscript saves. Useful for Zapier, Make, or custom
                  integrations.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Payload:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    {"{ novelId, title, wordCount, savedAt }"}
                  </code>
                </p>
                <WebhookField />
              </RetroWindowFrame>
            </TabsContent>
          </div>
        </Tabs>

        <BookEditDialog
          novelId={editBookId}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) setEditBookId(null);
          }}
          source="settings"
        />
        <DeleteBookDialog
          novelId={deleteBookId}
          open={Boolean(deleteBookId)}
          onOpenChange={(o) => {
            if (!o) setDeleteBookId(null);
          }}
          source="settings"
        />
        <AccountSecurityModal open={securityOpen} onOpenChange={setSecurityOpen} />
      </div>
    </div>
  );
}
