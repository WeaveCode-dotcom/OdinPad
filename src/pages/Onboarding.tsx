import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ArtsyPageChrome } from "@/components/layout/AppArtsyDecor";
import { PageShell } from "@/components/motion/PageShell";
import { OnboardingProfileStep } from "@/components/onboarding/OnboardingProfileStep";
import { OnboardingProjectStep } from "@/components/onboarding/OnboardingProjectStep";
import { OnboardingQuizStep } from "@/components/onboarding/OnboardingQuizStep";
import { OnboardingSkipDialog } from "@/components/onboarding/OnboardingSkipDialog";
import { OnboardingTourStep } from "@/components/onboarding/OnboardingTourStep";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { bookCreateMetadataAnalytics, validateAndNormalizeBookCreation } from "@/lib/book-creation";
import type { BookAudience, BookPov, BookTense, WordCountPresetId } from "@/lib/book-metadata";
import { mapPersonalization, WritingGoal, WritingStyle } from "@/lib/personalization";
import { type BookSeriesRow, fetchBookSeriesForUser } from "@/lib/series-service";

type StepId = "quiz" | "profile" | "tour" | "project";
type ProfileModalStep = 0 | 1 | 2;

const STEPS: StepId[] = ["quiz", "profile", "tour", "project"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, preferences, onboardingCompleted, updatePreferences, profile, updateProfile } = useAuth();
  const { addNovelWithOptions, novels } = useNovelContext();

  const initialStep = (preferences?.onboarding_step as StepId | undefined) ?? "quiz";
  const [step, setStep] = useState<StepId>(STEPS.includes(initialStep) ? initialStep : "quiz");
  const [saving, setSaving] = useState(false);

  // Quiz state
  const [writingStyle, setWritingStyle] = useState<WritingStyle>(
    (preferences?.writing_style as WritingStyle) ?? "hybrid",
  );
  const [genres, setGenres] = useState<string[]>(preferences?.genres ?? []);
  const [goal, setGoal] = useState<WritingGoal>((preferences?.primary_goal as WritingGoal) ?? "finish-first-draft");

  // Profile state
  const [profileModalStep, setProfileModalStep] = useState<ProfileModalStep>(0);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [theme, setTheme] = useState(preferences?.theme ?? "light");
  const [fontSize, setFontSize] = useState(String(preferences?.font_size ?? 1));
  const [dailyGoal, setDailyGoal] = useState(String(preferences?.daily_word_goal ?? 500));

  // Project state
  const [title, setTitle] = useState("");
  const [projectGenre, setProjectGenre] = useState("");
  const [premise, setPremise] = useState("");
  const [targetWordCount, setTargetWordCount] = useState("");
  const [frameworkId, setFrameworkId] = useState(preferences?.default_framework_id ?? "three-act");
  const [projectAdvancedOpen, setProjectAdvancedOpen] = useState(false);
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newPenName, setNewPenName] = useState("");
  const [newLogline, setNewLogline] = useState("");
  const [newComparables, setNewComparables] = useState("");
  const [newSecondaryGenres, setNewSecondaryGenres] = useState<string[]>([]);
  const [newWordCountPreset, setNewWordCountPreset] = useState<WordCountPresetId | "">("");
  const [newSeriesScope, setNewSeriesScope] = useState<"standalone" | "series">("standalone");
  const [newSeriesId, setNewSeriesId] = useState("");
  const [newSeriesPosition, setNewSeriesPosition] = useState("");
  const [newAudience, setNewAudience] = useState<BookAudience | "">("");
  const [newContentWarnings, setNewContentWarnings] = useState<string[]>([]);
  const [newDefaultPov, setNewDefaultPov] = useState<BookPov | "">("");
  const [newDefaultTense, setNewDefaultTense] = useState<BookTense | "">("");
  const [newCoverImageDataUrl, setNewCoverImageDataUrl] = useState("");
  const [seriesRows, setSeriesRows] = useState<BookSeriesRow[]>([]);

  // Skip dialog state
  const [skipSurveyOpen, setSkipSurveyOpen] = useState(false);
  const [skipReasonChip, setSkipReasonChip] = useState<string | null>(null);
  const [skipReasonOther, setSkipReasonOther] = useState("");

  useEffect(() => {
    if (onboardingCompleted) navigate("/");
  }, [onboardingCompleted, navigate]);

  useEffect(() => {
    trackEvent("onboarding_started", { step });
  }, [step]);

  useEffect(() => {
    if (!projectGenre && genres.length > 0) setProjectGenre(genres[0]);
  }, [genres, projectGenre]);

  useEffect(() => {
    if (step !== "project" || !user?.id) return;
    void fetchBookSeriesForUser(user.id)
      .then(setSeriesRows)
      .catch(() => setSeriesRows([]));
  }, [step, user?.id]);

  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100;

  const persistStep = async (next: StepId) => {
    setSaving(true);
    const result = await updatePreferences({ onboarding_step: next });
    setSaving(false);
    if (result.error) {
      toast({ title: "Could not save progress", description: result.error, variant: "destructive" });
      return false;
    }
    return true;
  };

  const goTo = async (next: StepId) => {
    const ok = await persistStep(next);
    if (ok) setStep(next);
  };

  const skipForNow = async () => {
    const reason = (skipReasonOther.trim() || skipReasonChip || "").trim() || null;
    const result = await updatePreferences({
      onboarding_deferred: true,
      onboarding_step: step,
      onboarding_skip_reason: reason,
    });
    if (result.error) {
      toast({ title: "Could not skip onboarding", description: result.error, variant: "destructive" });
      return;
    }
    trackEvent("onboarding_skipped", { step, reason: reason ?? "unspecified" });
    setSkipSurveyOpen(false);
    setSkipReasonChip(null);
    setSkipReasonOther("");
    navigate("/");
  };

  const submitQuiz = async () => {
    if (genres.length === 0) {
      toast({ title: "Select at least one genre", variant: "destructive" });
      return;
    }
    const mapped = mapPersonalization({ writingStyle, genres, primaryGoal: goal });
    const result = await updatePreferences({
      writing_stage: null,
      writing_style: writingStyle,
      genres,
      primary_goal: goal,
      default_framework_id: mapped.recommendedFrameworkId,
      preferred_workspace_mode: mapped.preferredWorkspaceMode,
    });
    if (result.error) {
      toast({ title: "Could not save quiz answers", description: result.error, variant: "destructive" });
      return;
    }
    setFrameworkId(mapped.recommendedFrameworkId);
    trackEvent("onboarding_quiz_completed", { writingStyle, primaryGoal: goal });
    await goTo("profile");
  };

  const nextProfileModal = async () => {
    if (profileModalStep === 0 && !displayName.trim()) {
      toast({ title: "Display name is required", variant: "destructive" });
      return;
    }
    if (profileModalStep === 1) {
      const parsed = Number(fontSize);
      if (!Number.isFinite(parsed) || parsed < 0.8 || parsed > 1.6) {
        toast({ title: "Font size must be between 0.8 and 1.6", variant: "destructive" });
        return;
      }
    }
    if (profileModalStep === 2) {
      const parsed = Number(dailyGoal);
      if (!Number.isFinite(parsed) || parsed < 100) {
        toast({ title: "Daily word goal must be at least 100", variant: "destructive" });
        return;
      }
    }

    if (profileModalStep < 2) {
      setProfileModalStep((v) => (v + 1) as ProfileModalStep);
      return;
    }

    const profileResult = await updateProfile({
      display_name: displayName.trim(),
      bio: bio.trim() || null,
    });
    if (profileResult.error) {
      toast({ title: "Could not save profile", description: profileResult.error, variant: "destructive" });
      return;
    }

    const preferenceResult = await updatePreferences({
      theme,
      font_size: Number(fontSize),
      daily_word_goal: Number(dailyGoal),
    });
    if (preferenceResult.error) {
      toast({ title: "Could not save preferences", description: preferenceResult.error, variant: "destructive" });
      return;
    }

    trackEvent("onboarding_profile_completed", { theme });
    await goTo("tour");
  };

  const launchTour = async () => {
    const result = await updatePreferences({
      onboarding_deferred: false,
      onboarding_step: "tour",
      guided_tour_completed_at: null,
      checklist_opening_scene_done: false,
      checklist_character_done: false,
      checklist_goal_done: false,
    });
    if (result.error) {
      toast({ title: "Could not launch tour", description: result.error, variant: "destructive" });
      return;
    }

    if (novels.length === 0) {
      addNovelWithOptions("Guided Tour Project", displayName.trim() || profile?.display_name || "Anonymous", {
        genre: genres[0] || "General",
        frameworkId,
        status: "drafting",
      });
    }

    trackEvent("tour_launched", { source: "onboarding" });
    navigate("/");
  };

  const skipTourFromOnboarding = async () => {
    const result = await updatePreferences({
      onboarding_deferred: true,
      onboarding_step: "tour",
    });
    if (result.error) {
      toast({ title: "Could not skip tour", description: result.error, variant: "destructive" });
      return;
    }
    trackEvent("tour_skipped", { source: "onboarding" });
    navigate("/");
  };

  const createFirstProject = async () => {
    const seriesTitleById = new Map(seriesRows.map((s) => [s.id, s.title]));
    const validation = validateAndNormalizeBookCreation(
      {
        title,
        author: displayName.trim() || profile?.display_name || "Anonymous",
        genre: projectGenre || genres[0] || "",
        premise,
        targetWordCount,
        frameworkId,
        status: "drafting",
        subtitle: newSubtitle,
        penName: newPenName,
        logline: newLogline,
        comparables: newComparables,
        secondaryGenres: newSecondaryGenres,
        wordCountPreset: newWordCountPreset || undefined,
        seriesMode: newSeriesScope,
        seriesId: newSeriesScope === "standalone" ? undefined : newSeriesId || undefined,
        seriesPosition: newSeriesPosition,
        audience: newAudience,
        contentWarnings: newContentWarnings,
        defaultPov: newDefaultPov,
        defaultTense: newDefaultTense,
        coverImageDataUrl: newCoverImageDataUrl,
      },
      novels.map((novel) => ({ title: novel.title, seriesId: novel.seriesId })),
      seriesTitleById,
    );
    if (validation.warnings[0]) {
      toast({ title: validation.warnings[0] });
    }
    if (validation.errors[0]) {
      toast({ title: validation.errors[0], variant: "destructive" });
      return;
    }

    trackEvent("book_create_submitted", {
      source: "onboarding",
      frameworkId: validation.normalized.frameworkId,
      hasPremise: Boolean(validation.normalized.premise),
      hasTargetWordCount: Boolean(validation.normalized.targetWordCount),
      hasSeries: Boolean(validation.normalized.seriesId),
    });
    const n = validation.normalized;
    addNovelWithOptions(n.title, n.author, {
      genre: n.genre,
      premise: n.premise,
      targetWordCount: n.targetWordCount,
      frameworkId: n.frameworkId,
      status: "drafting",
      penName: n.penName,
      subtitle: n.subtitle,
      secondaryGenres: n.secondaryGenres,
      logline: n.logline,
      comparables: n.comparables,
      wordCountPreset: n.wordCountPreset,
      seriesId: n.seriesId,
      seriesTitle: n.seriesTitle,
      seriesPosition: n.seriesPosition,
      audience: n.audience,
      contentWarnings: n.contentWarnings,
      defaultPov: n.defaultPov,
      defaultTense: n.defaultTense,
      coverImageDataUrl: n.coverImageDataUrl,
    });
    trackEvent("book_create_succeeded", {
      source: "onboarding",
      frameworkId: validation.normalized.frameworkId,
      ...bookCreateMetadataAnalytics(validation.normalized),
    });
    const completeResult = await updatePreferences({
      onboarding_deferred: false,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: "project",
      first_run_novel_created: true,
      first_run_write_opened: true,
    });
    if (completeResult.error) {
      toast({ title: "Could not complete onboarding", description: completeResult.error, variant: "destructive" });
      return;
    }
    trackEvent("first_project_created", { frameworkId, source: "onboarding" });
    trackEvent("onboarding_completed", { flow: "quiz-profile-tour-project" });
    navigate("/");
  };

  return (
    <PageShell className="page-viewport w-full overflow-y-auto bg-background">
      <ArtsyPageChrome>
        <div className="relative w-full max-w-none border border-border bg-white p-3 shadow-none sm:p-6 md:rotate-[0.15deg] motion-reduce:rotate-0">
          <span className="absolute -right-1 -top-2 inline-block rotate-3 border border-border bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
            Onboarding
          </span>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase leading-none tracking-tight text-foreground md:text-3xl">
                Welcome to OdinPad
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Four messy-beautiful steps to your workspace.</p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 -rotate-1 border border-border"
              onClick={() => setSkipSurveyOpen(true)}
            >
              I&apos;ll explore myself
            </Button>
          </div>
          <Progress value={progress} className="mb-6 h-2 max-w-md" />

          {step === "quiz" && (
            <OnboardingQuizStep
              writingStyle={writingStyle}
              setWritingStyle={setWritingStyle}
              genres={genres}
              setGenres={setGenres}
              goal={goal}
              setGoal={setGoal}
              saving={saving}
              onSubmit={() => void submitQuiz()}
            />
          )}

          {step === "profile" && (
            <OnboardingProfileStep
              profileModalStep={profileModalStep}
              displayName={displayName}
              setDisplayName={setDisplayName}
              bio={bio}
              setBio={setBio}
              theme={theme}
              setTheme={setTheme}
              fontSize={fontSize}
              setFontSize={setFontSize}
              dailyGoal={dailyGoal}
              setDailyGoal={setDailyGoal}
              onNext={() => void nextProfileModal()}
              onBack={() => setProfileModalStep((v) => (v > 0 ? ((v - 1) as ProfileModalStep) : v))}
            />
          )}

          {step === "tour" && (
            <OnboardingTourStep onLaunch={() => void launchTour()} onSkip={() => void skipTourFromOnboarding()} />
          )}

          {step === "project" && (
            <OnboardingProjectStep
              title={title}
              setTitle={setTitle}
              projectGenre={projectGenre}
              setProjectGenre={setProjectGenre}
              premise={premise}
              setPremise={setPremise}
              targetWordCount={targetWordCount}
              setTargetWordCount={setTargetWordCount}
              frameworkId={frameworkId}
              setFrameworkId={setFrameworkId}
              projectAdvancedOpen={projectAdvancedOpen}
              setProjectAdvancedOpen={setProjectAdvancedOpen}
              newSubtitle={newSubtitle}
              setNewSubtitle={setNewSubtitle}
              newPenName={newPenName}
              setNewPenName={setNewPenName}
              newLogline={newLogline}
              setNewLogline={setNewLogline}
              newComparables={newComparables}
              setNewComparables={setNewComparables}
              newSecondaryGenres={newSecondaryGenres}
              setNewSecondaryGenres={setNewSecondaryGenres}
              newWordCountPreset={newWordCountPreset}
              setNewWordCountPreset={setNewWordCountPreset}
              newSeriesScope={newSeriesScope}
              setNewSeriesScope={setNewSeriesScope}
              newSeriesId={newSeriesId}
              setNewSeriesId={setNewSeriesId}
              newSeriesPosition={newSeriesPosition}
              setNewSeriesPosition={setNewSeriesPosition}
              newAudience={newAudience}
              setNewAudience={setNewAudience}
              newContentWarnings={newContentWarnings}
              setNewContentWarnings={setNewContentWarnings}
              newDefaultPov={newDefaultPov}
              setNewDefaultPov={setNewDefaultPov}
              newDefaultTense={newDefaultTense}
              setNewDefaultTense={setNewDefaultTense}
              newCoverImageDataUrl={newCoverImageDataUrl}
              setNewCoverImageDataUrl={setNewCoverImageDataUrl}
              userId={user?.id}
              genres={genres}
              writingStyle={writingStyle}
              goal={goal}
              seriesRows={seriesRows}
              novels={novels}
              saving={saving}
              onBack={() => void goTo("tour")}
              onSubmit={() => void createFirstProject()}
            />
          )}
        </div>

        <OnboardingSkipDialog
          open={skipSurveyOpen}
          onOpenChange={setSkipSurveyOpen}
          skipReasonChip={skipReasonChip}
          setSkipReasonChip={setSkipReasonChip}
          skipReasonOther={skipReasonOther}
          setSkipReasonOther={setSkipReasonOther}
          onConfirm={() => void skipForNow()}
        />
      </ArtsyPageChrome>
    </PageShell>
  );
}
