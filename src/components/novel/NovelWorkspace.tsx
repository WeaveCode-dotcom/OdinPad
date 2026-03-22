import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feather, Map, PenTool, BookOpen, ArrowLeft, LogOut, Lightbulb, Zap, Eye, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNovelContext } from '@/contexts/NovelContext';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceMode } from '@/types/novel';
import PlanView from './PlanView';
import WriteView from './WriteView';
import CodexPanel from './CodexPanel';
import IdeasView from './IdeasView';
import BrainstormView from './BrainstormView';
import ReviewView from './ReviewView';
import { featureFlags } from '@/lib/feature-flags';
import GuidedTourOverlay from '@/components/onboarding/GuidedTourOverlay';
import { trackEvent } from '@/lib/analytics';
import { AppArtsyDecor } from '@/components/layout/AppArtsyDecor';

const modeConfig: Record<WorkspaceMode, { label: string; icon: React.ElementType }> = {
  ideas: { label: 'Ideas', icon: Lightbulb },
  brainstorm: { label: 'Brainstorm', icon: Zap },
  plan: { label: 'Plan', icon: Map },
  write: { label: 'Write', icon: PenTool },
  review: { label: 'Review', icon: Eye },
};

export default function NovelWorkspace() {
  const { activeNovel, mode, setMode, goToDashboard } = useNovelContext();
  const { signOut, preferences, updatePreferences } = useAuth();
  const navigate = useNavigate();
  const [codexOpen, setCodexOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const checklistDoneCount = [
    preferences?.checklist_opening_scene_done,
    preferences?.checklist_character_done,
    preferences?.checklist_goal_done,
  ].filter(Boolean).length;
  const canAccessAdvanced = !featureFlags.guidedTour || checklistDoneCount >= 3 || Boolean(preferences?.guided_tour_completed_at);
  const visibleModes = (Object.keys(modeConfig) as WorkspaceMode[]).filter(tab => canAccessAdvanced || tab !== 'review');

  const hasCharacterEntry = useMemo(
    () => Boolean(activeNovel?.codexEntries.some(entry => entry.type === 'character')),
    [activeNovel?.codexEntries],
  );

  useEffect(() => {
    if (!activeNovel || !preferences || !featureFlags.guidedTour) return;
    if (!preferences.checklist_opening_scene_done && mode === 'write') {
      void updatePreferences({ checklist_opening_scene_done: true });
    }
  }, [activeNovel, mode, preferences, updatePreferences]);

  useEffect(() => {
    if (!activeNovel || !preferences || !featureFlags.guidedTour) return;
    if (!preferences.checklist_character_done && hasCharacterEntry) {
      void updatePreferences({ checklist_character_done: true });
    }
  }, [activeNovel, hasCharacterEntry, preferences, updatePreferences]);

  const markGoalDone = async () => {
    await updatePreferences({ checklist_goal_done: true });
    navigate('/settings');
  };

  const completeTour = async () => {
    await updatePreferences({
      guided_tour_completed_at: new Date().toISOString(),
      onboarding_step: 'project',
    });
    trackEvent('tour_completed', { source: 'workspace' });
  };

  const skipTour = async () => {
    await updatePreferences({
      checklist_opening_scene_done: true,
      checklist_character_done: true,
      checklist_goal_done: true,
      guided_tour_completed_at: new Date().toISOString(),
      onboarding_deferred: true,
    });
    trackEvent('tour_skipped', { source: 'workspace' });
  };

  const tourSteps = [
    {
      selector: '[data-tour="mode-plan"]',
      title: 'Explore planning mode',
      description: 'Use Plan mode to structure beats and chapter flow before drafting.',
      onNext: () => {
        setMode('plan');
        setTourStep(1);
      },
    },
    {
      selector: '[data-tour="mode-write"]',
      title: 'Write your opening scene',
      description: 'Switch to Write mode and begin drafting your first scene.',
      onNext: () => {
        setMode('write');
        setTourStep(2);
      },
    },
    {
      selector: '[data-tour="write-editor"]',
      title: 'Draft in the editor',
      description: 'Use the focused editor to draft scenes and track word progress.',
      onNext: () => {
        setTourStep(3);
      },
    },
    {
      selector: '[data-tour="codex-toggle"]',
      title: 'Add a character',
      description: 'Open the Codex and create your first character entry.',
      onNext: () => {
        setCodexOpen(true);
        setTourStep(4);
      },
    },
    {
      selector: '[data-tour="codex-add-character"]',
      title: 'Create codex entries',
      description: 'Use the plus control to add character, location, and lore entries.',
      onNext: () => {
        setTourStep(5);
      },
    },
    {
      selector: '[data-tour="settings-button"]',
      title: 'Set your goal',
      description: 'Open Settings and set your daily word target to complete activation.',
      onNext: () => {
        void markGoalDone();
        setTourStep(6);
      },
    },
    {
      selector: '[data-tour="mode-review"]',
      title: 'Use review mode',
      description: 'Review mode helps you revise scenes and finalize your draft.',
      onNext: () => {
        setMode('review');
        setTourStep(7);
      },
    },
    {
      selector: '[data-tour="dashboard-button"]',
      title: 'Return to dashboard',
      description: 'Use this to return to your dashboard anytime. This completes the full tour.',
      onNext: () => {
        void completeTour();
        setTourStep(8);
      },
    },
  ] as const;

  const shouldShowOverlay = featureFlags.guidedTour && !preferences?.guided_tour_completed_at && tourStep < tourSteps.length;

  if (!activeNovel) return null;

  return (
    <div className="relative flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden neo-grid-light">
      <AppArtsyDecor dense />
      {/* Top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b-2 border-black bg-white/90 px-2 py-2 shadow-none backdrop-blur-md transition-[backdrop-filter] duration-300">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neo-lime/70 to-transparent" aria-hidden />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={goToDashboard}
            data-tour="dashboard-button"
            className="flex shrink-0 items-center gap-2 rounded-sm border-2 border-black bg-neo-bg px-2 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-neo-lime/30"
          >
            <ArrowLeft className="h-4 w-4" />
            <Feather className="h-4 w-4 text-primary" />
          </button>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Manuscript</p>
            <h1 className="truncate text-sm font-bold text-foreground font-serif md:text-base">{activeNovel.title}</h1>
          </div>
        </div>

        {/* Mode tabs — pill strip */}
        <div className="flex max-w-[min(100%,52vw)] flex-wrap items-center justify-end gap-0.5 border-2 border-black bg-neo-bg/90 p-0.5 shadow-none sm:max-w-none">
          {visibleModes.map(m => {
            const { label, icon: Icon } = modeConfig[m];
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                data-tour={
                  m === 'write'
                    ? 'mode-write'
                    : m === 'plan'
                      ? 'mode-plan'
                      : m === 'review'
                        ? 'mode-review'
                      : undefined
                }
                className={`relative flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="mode-tab"
                    className="absolute inset-0 rounded-sm bg-accent/10"
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCodexOpen(!codexOpen)}
            data-tour="codex-toggle"
            className={`flex items-center gap-1.5 rounded-sm border-2 border-transparent px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              codexOpen ? 'border-primary/30 bg-primary/10 text-primary' : 'text-muted-foreground hover:border-border hover:text-foreground hover:bg-accent/10'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Codex
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-sm border-2 border-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground hover:bg-accent/10"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            data-tour="settings-button"
            className="flex items-center gap-1.5 rounded-sm border-2 border-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground hover:bg-accent/10"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          {featureFlags.guidedTour && !preferences?.guided_tour_completed_at && (
            <div className="mx-2 mt-2 rounded-sm border-2 border-primary/40 bg-primary/5 p-2 text-xs text-muted-foreground shadow-none">
              <p className="font-medium text-foreground">Guided Learn-by-Doing</p>
              <p className="mt-1">Write your opening scene, add a character, and set a goal to unlock advanced tools.</p>
              <button
                onClick={() => void skipTour()}
                className="mt-2 rounded-sm border-2 border-border bg-background px-2 py-1 text-xs font-semibold shadow-none hover:bg-accent/20"
              >
                Skip full tour
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {mode === 'ideas' && (
              <motion.div
                key="ideas"
                className="min-h-0"
                initial={{ opacity: 0, x: 32, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <IdeasView />
              </motion.div>
            )}
            {mode === 'brainstorm' && (
              <motion.div
                key="brainstorm"
                className="min-h-0"
                initial={{ opacity: 0, x: 32, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <BrainstormView />
              </motion.div>
            )}
            {mode === 'plan' && (
              <motion.div
                key="plan"
                className="min-h-0"
                initial={{ opacity: 0, x: 32, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PlanView />
              </motion.div>
            )}
            {mode === 'write' && (
              <motion.div
                key="write"
                className="min-h-0"
                initial={{ opacity: 0, x: 32, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <WriteView />
              </motion.div>
            )}
            {mode === 'review' && (
              <motion.div
                key="review"
                className="min-h-0"
                initial={{ opacity: 0, x: 32, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <ReviewView />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {codexOpen && <CodexPanel onClose={() => setCodexOpen(false)} />}
      </div>
      {shouldShowOverlay && (
        <GuidedTourOverlay
          selector={tourSteps[tourStep].selector}
          title={tourSteps[tourStep].title}
          description={tourSteps[tourStep].description}
          stepIndex={tourStep}
          stepCount={tourSteps.length}
          onNext={tourSteps[tourStep].onNext}
          onSkip={() => void skipTour()}
        />
      )}
    </div>
  );
}
