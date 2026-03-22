import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNovelContext } from '@/contexts/NovelContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mapPersonalization, WritingGoal, WritingStyle } from '@/lib/personalization';
import { STORY_FRAMEWORKS } from '@/lib/story-frameworks';
import { toast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { rankFrameworkRecommendations, validateAndNormalizeBookCreation } from '@/lib/book-creation';
import { PageShell } from '@/components/motion/PageShell';
import { ArtsyPageChrome } from '@/components/layout/AppArtsyDecor';

type StepId = 'quiz' | 'profile' | 'tour' | 'project';
type ProfileModalStep = 0 | 1 | 2;

const STEPS: StepId[] = ['quiz', 'profile', 'tour', 'project'];

const STYLES: Array<{ value: WritingStyle; label: string }> = [
  { value: 'plotter', label: 'Plotter - love structure' },
  { value: 'pantser', label: 'Pantser - write freely' },
  { value: 'hybrid', label: 'Hybrid' },
];

const GOALS: Array<{ value: WritingGoal; label: string }> = [
  { value: 'finish-first-draft', label: 'Finish first draft' },
  { value: 'daily-word-count', label: 'Hit daily word count' },
  { value: 'build-world', label: 'Build world/characters' },
  { value: 'overcome-block', label: 'Overcome writer block' },
];

const GENRES = ['Fantasy', 'Romance', 'Mystery', 'Literary', 'Sci-Fi', 'Thriller', 'Historical'];

export default function Onboarding() {
  const navigate = useNavigate();
  const {
    preferences,
    onboardingCompleted,
    updatePreferences,
    profile,
    updateProfile,
  } = useAuth();
  const { addNovelWithOptions, novels } = useNovelContext();

  const initialStep = (preferences?.onboarding_step as StepId | undefined) ?? 'quiz';
  const [step, setStep] = useState<StepId>(STEPS.includes(initialStep) ? initialStep : 'quiz');
  const [saving, setSaving] = useState(false);

  const [writingStyle, setWritingStyle] = useState<WritingStyle>((preferences?.writing_style as WritingStyle) ?? 'hybrid');
  const [genres, setGenres] = useState<string[]>(preferences?.genres ?? []);
  const [goal, setGoal] = useState<WritingGoal>((preferences?.primary_goal as WritingGoal) ?? 'finish-first-draft');

  const [profileModalStep, setProfileModalStep] = useState<ProfileModalStep>(0);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [theme, setTheme] = useState(preferences?.theme ?? 'dark');
  const [fontSize, setFontSize] = useState(String(preferences?.font_size ?? 1));
  const [dailyGoal, setDailyGoal] = useState(String(preferences?.daily_word_goal ?? 500));

  const [title, setTitle] = useState('');
  const [projectGenre, setProjectGenre] = useState('');
  const [premise, setPremise] = useState('');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [frameworkId, setFrameworkId] = useState(preferences?.default_framework_id ?? 'three-act');

  useEffect(() => {
    if (onboardingCompleted) navigate('/');
  }, [onboardingCompleted, navigate]);

  useEffect(() => {
    trackEvent('onboarding_started', { step });
  }, [step]);

  useEffect(() => {
    if (!projectGenre && genres.length > 0) setProjectGenre(genres[0]);
  }, [genres, projectGenre]);

  const progress = useMemo(() => ((STEPS.indexOf(step) + 1) / STEPS.length) * 100, [step]);
  const frameworkRecommendations = useMemo(
    () =>
      rankFrameworkRecommendations({
        selectedGenre: projectGenre || genres[0],
        preferredGenres: genres,
        writingStyle,
        primaryGoal: goal,
        fallbackFrameworkId: frameworkId,
      }),
    [frameworkId, genres, goal, projectGenre, writingStyle],
  );

  const persistStep = async (next: StepId) => {
    setSaving(true);
    const result = await updatePreferences({ onboarding_step: next });
    setSaving(false);
    if (result.error) {
      toast({ title: 'Could not save progress', description: result.error, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const goTo = async (next: StepId) => {
    const ok = await persistStep(next);
    if (ok) setStep(next);
  };

  const skipForNow = async () => {
    const result = await updatePreferences({ onboarding_deferred: true, onboarding_step: step });
    if (result.error) {
      toast({ title: 'Could not skip onboarding', description: result.error, variant: 'destructive' });
      return;
    }
    trackEvent('onboarding_skipped', { step });
    navigate('/');
  };

  const submitQuiz = async () => {
    if (genres.length === 0) {
      toast({ title: 'Select at least one genre', variant: 'destructive' });
      return;
    }
    const mapped = mapPersonalization({
      writingStyle,
      genres,
      primaryGoal: goal,
    });
    const result = await updatePreferences({
      writing_stage: null,
      writing_style: writingStyle,
      genres,
      primary_goal: goal,
      default_framework_id: mapped.recommendedFrameworkId,
      preferred_workspace_mode: mapped.preferredWorkspaceMode,
    });
    if (result.error) {
      toast({ title: 'Could not save quiz answers', description: result.error, variant: 'destructive' });
      return;
    }
    setFrameworkId(mapped.recommendedFrameworkId);
    trackEvent('onboarding_quiz_completed', { writingStyle, primaryGoal: goal });
    await goTo('profile');
  };

  const nextProfileModal = async () => {
    if (profileModalStep === 0 && !displayName.trim()) {
      toast({ title: 'Display name is required', variant: 'destructive' });
      return;
    }
    if (profileModalStep === 1) {
      const parsed = Number(fontSize);
      if (!Number.isFinite(parsed) || parsed < 0.8 || parsed > 1.6) {
        toast({ title: 'Font size must be between 0.8 and 1.6', variant: 'destructive' });
        return;
      }
    }
    if (profileModalStep === 2) {
      const parsed = Number(dailyGoal);
      if (!Number.isFinite(parsed) || parsed < 100) {
        toast({ title: 'Daily word goal must be at least 100', variant: 'destructive' });
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
      toast({ title: 'Could not save profile', description: profileResult.error, variant: 'destructive' });
      return;
    }

    const preferenceResult = await updatePreferences({
      theme,
      font_size: Number(fontSize),
      daily_word_goal: Number(dailyGoal),
    });
    if (preferenceResult.error) {
      toast({ title: 'Could not save preferences', description: preferenceResult.error, variant: 'destructive' });
      return;
    }

    trackEvent('onboarding_profile_completed', { theme });
    await goTo('tour');
  };

  const launchTour = async () => {
    const result = await updatePreferences({
      onboarding_deferred: false,
      onboarding_step: 'tour',
      guided_tour_completed_at: null,
      checklist_opening_scene_done: false,
      checklist_character_done: false,
      checklist_goal_done: false,
    });
    if (result.error) {
      toast({ title: 'Could not launch tour', description: result.error, variant: 'destructive' });
      return;
    }

    if (novels.length === 0) {
      addNovelWithOptions('Guided Tour Project', displayName.trim() || profile?.display_name || 'Anonymous', {
        genre: genres[0] || 'General',
        frameworkId,
        status: 'drafting',
      });
    }

    trackEvent('tour_launched', { source: 'onboarding' });
    navigate('/');
  };

  const skipTourFromOnboarding = async () => {
    const result = await updatePreferences({
      onboarding_deferred: true,
      onboarding_step: 'tour',
    });
    if (result.error) {
      toast({ title: 'Could not skip tour', description: result.error, variant: 'destructive' });
      return;
    }
    trackEvent('tour_skipped', { source: 'onboarding' });
    navigate('/');
  };

  const createFirstProject = async () => {
    const validation = validateAndNormalizeBookCreation(
      {
        title,
        author: displayName.trim() || profile?.display_name || 'Anonymous',
        genre: projectGenre || genres[0] || '',
        premise,
        targetWordCount,
        frameworkId,
        status: 'drafting',
      },
      novels.map((novel) => novel.title),
    );
    if (validation.warnings[0]) {
      toast({ title: validation.warnings[0] });
    }
    if (validation.errors[0]) {
      toast({ title: validation.errors[0], variant: 'destructive' });
      return;
    }

    trackEvent('book_create_submitted', {
      source: 'onboarding',
      frameworkId: validation.normalized.frameworkId,
      hasPremise: Boolean(validation.normalized.premise),
      hasTargetWordCount: Boolean(validation.normalized.targetWordCount),
    });
    addNovelWithOptions(validation.normalized.title, validation.normalized.author, {
      genre: validation.normalized.genre,
      premise: validation.normalized.premise,
      targetWordCount: validation.normalized.targetWordCount,
      frameworkId: validation.normalized.frameworkId,
      status: 'drafting',
    });
    trackEvent('book_create_succeeded', {
      source: 'onboarding',
      frameworkId: validation.normalized.frameworkId,
    });
    const completeResult = await updatePreferences({
      onboarding_deferred: false,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: 'project',
    });
    if (completeResult.error) {
      toast({ title: 'Could not complete onboarding', description: completeResult.error, variant: 'destructive' });
      return;
    }
    trackEvent('first_project_created', { frameworkId, source: 'onboarding' });
    trackEvent('onboarding_completed', { flow: 'quiz-profile-tour-project' });
    navigate('/');
  };

  return (
    <PageShell className="page-viewport w-full overflow-y-auto neo-grid-light">
      <ArtsyPageChrome>
      <div className="relative w-full max-w-none border-2 border-black bg-white p-3 shadow-none sm:p-6 md:rotate-[0.15deg] motion-reduce:rotate-0">
        <span className="absolute -right-1 -top-2 inline-block rotate-3 border-2 border-black bg-neo-lime px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
          Onboarding
        </span>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase leading-none tracking-tight text-neo-indigo md:text-3xl">Welcome to OdinPad</h1>
            <p className="mt-2 text-sm text-muted-foreground">Four messy-beautiful steps to your workspace.</p>
          </div>
          <Button variant="outline" className="shrink-0 -rotate-1 border-2 border-black" onClick={() => void skipForNow()}>I&apos;ll explore myself</Button>
        </div>
        <Progress value={progress} className="mb-6 h-2 max-w-md" />

        {step === 'quiz' && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground">Personalization quiz</h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Preferred style?</p>
              <div className="grid grid-cols-1 gap-2">
                {STYLES.map(item => (
                  <Button key={item.value} type="button" variant={writingStyle === item.value ? 'default' : 'outline'} onClick={() => setWritingStyle(item.value)}>
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Genre(s) you write?</p>
              <div className="grid grid-cols-3 gap-2">
                {GENRES.map(item => {
                  const selected = genres.includes(item);
                  return (
                    <Button key={item} type="button" variant={selected ? 'default' : 'outline'} onClick={() => setGenres(prev => selected ? prev.filter(v => v !== item) : [...prev, item])}>
                      {item}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">What is your current goal/aim?</p>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(item => (
                  <Button key={item.value} type="button" variant={goal === item.value ? 'default' : 'outline'} onClick={() => setGoal(item.value)}>
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={() => void submitQuiz()} disabled={saving}>Continue</Button>
          </div>
        )}

        {step === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Complete your profile</h2>
            <p className="text-sm text-muted-foreground">We will quickly complete your writer profile in three modals.</p>
            <Dialog open>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {profileModalStep === 0 && 'Profile basics'}
                    {profileModalStep === 1 && 'Writing preferences'}
                    {profileModalStep === 2 && 'Goal target'}
                  </DialogTitle>
                </DialogHeader>

                {profileModalStep === 0 && (
                  <div className="space-y-3">
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display / pen name" />
                    <Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Short writer bio (optional)" />
                  </div>
                )}

                {profileModalStep === 1 && (
                  <div className="space-y-3">
                    <Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Theme (dark/light/sepia)" />
                    <Input value={fontSize} onChange={e => setFontSize(e.target.value)} placeholder="Font size (0.8 to 1.6)" />
                  </div>
                )}

                {profileModalStep === 2 && (
                  <div className="space-y-3">
                    <Input value={dailyGoal} onChange={e => setDailyGoal(e.target.value)} placeholder="Daily word goal" />
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setProfileModalStep(v => (v > 0 ? ((v - 1) as ProfileModalStep) : v))}
                    disabled={profileModalStep === 0}
                  >
                    Back
                  </Button>
                  <Button onClick={() => void nextProfileModal()}>
                    {profileModalStep === 2 ? 'Save and Continue' : 'Next'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {step === 'tour' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Feature tour</h2>
            <p className="text-sm text-muted-foreground">
              You will get a full in-app tour covering writing modes, editor, codex, settings, review, and dashboard return.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>- Explore mode switcher (ideas, plan, write, review)</li>
              <li>- Write in the editor and link codex references</li>
              <li>- Add a character in codex</li>
              <li>- Visit settings and return to dashboard</li>
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void skipTourFromOnboarding()}>Skip tour</Button>
              <Button onClick={() => void launchTour()}>Start tour</Button>
            </div>
          </div>
        )}

        {step === 'project' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Create your first project</h2>
            <p className="text-sm text-muted-foreground">Now that you completed the tour, create your first real project.</p>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project title" />
            <Input value={projectGenre} onChange={e => setProjectGenre(e.target.value)} placeholder="Genre" />
            <Input value={premise} onChange={e => setPremise(e.target.value)} placeholder="One-sentence premise" />
            <Input value={targetWordCount} onChange={e => setTargetWordCount(e.target.value)} placeholder="Target word count (optional)" />
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Quick-start template</p>
              <div className="grid grid-cols-2 gap-2">
                {STORY_FRAMEWORKS.map(framework => (
                  <Button
                    key={framework.id}
                    type="button"
                    variant={frameworkId === framework.id ? 'default' : 'outline'}
                    onClick={() => {
                      setFrameworkId(framework.id);
                      trackEvent('book_create_template_selected', { source: 'onboarding', frameworkId: framework.id });
                    }}
                  >
                    {framework.shortName}
                  </Button>
                ))}
              </div>
              {frameworkRecommendations.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Recommended templates: {frameworkRecommendations.slice(0, 3).map(item => {
                    const match = STORY_FRAMEWORKS.find(framework => framework.id === item.frameworkId);
                    return match?.shortName ?? item.frameworkId;
                  }).join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void goTo('tour')}>Back</Button>
              <Button onClick={() => void createFirstProject()} disabled={saving}>Create project</Button>
            </div>
          </div>
        )}
      </div>
      </ArtsyPageChrome>
    </PageShell>
  );
}
