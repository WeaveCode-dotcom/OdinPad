import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNovelContext } from '@/contexts/NovelContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookEditDialog from '@/components/novel/BookEditDialog';
import DeleteBookDialog from '@/components/novel/DeleteBookDialog';
import { ArrowLeft, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { computeWriterStats, exportStatsAsCsv, exportStatsAsPdfLikePrint } from '@/lib/writer-stats';
import { PageShell } from '@/components/motion/PageShell';
import { ArtsyPageChrome } from '@/components/layout/AppArtsyDecor';
import { RetroWindowFrame } from '@/components/layout/RetroWindowFrame';

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
};

function toState(
  profile: { display_name: string | null; avatar_url: string | null; bio: string | null } | null,
  preferences: ReturnType<typeof useAuth>['preferences'],
): SettingsState {
  return {
    display_name: profile?.display_name ?? '',
    avatar_url: profile?.avatar_url ?? '',
    bio: profile?.bio ?? '',
    theme: preferences?.theme ?? 'dark',
    font_family: preferences?.font_family ?? 'Inter',
    font_size: String(preferences?.font_size ?? 1),
    line_spacing: String(preferences?.line_spacing ?? 1.75),
    typewriter_mode: preferences?.typewriter_mode ?? false,
    daily_word_goal: String(preferences?.daily_word_goal ?? 500),
    weekly_word_goal: String(preferences?.weekly_word_goal ?? 3500),
    pomodoro_minutes: String(preferences?.pomodoro_minutes ?? 25),
    reminder_daily: preferences?.reminder_daily ?? false,
    reminder_streak: preferences?.reminder_streak ?? true,
    reminder_progress_email: preferences?.reminder_progress_email ?? 'weekly',
    reminder_push_enabled: preferences?.reminder_push_enabled ?? false,
  };
}

export default function Settings() {
  const navigate = useNavigate();
  const { profile, preferences, updateProfile, updatePreferences } = useAuth();
  const { novels, setActiveNovel } = useNovelContext();
  const stats = useMemo(() => computeWriterStats(novels), [novels]);
  const [state, setState] = useState<SettingsState>(() => toState(profile, preferences));
  const [editOpen, setEditOpen] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);

  useEffect(() => {
    setState(toState(profile, preferences));
  }, [profile, preferences]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const profileResult = await updateProfile({
        display_name: state.display_name,
        avatar_url: state.avatar_url || null,
        bio: state.bio || null,
      });
      if (profileResult.error) {
        toast({ title: 'Failed to save account settings', description: profileResult.error, variant: 'destructive' });
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
      });
      if (prefResult.error) {
        toast({ title: 'Failed to save preferences', description: prefResult.error, variant: 'destructive' });
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state, updatePreferences, updateProfile]);

  const tabBase =
    'w-full justify-start border-2 border-black px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide data-[state=inactive]:bg-neo-bg data-[state=inactive]:hover:bg-white';

  return (
    <PageShell className="page-viewport w-full overflow-y-auto neo-grid-light">
      <ArtsyPageChrome>
      <div className="w-full max-w-none p-1">
        <div className="relative mb-4 flex flex-col gap-2 border-b-2 border-black pb-3 sm:flex-row sm:items-end sm:justify-between">
          <Button variant="ghost" className="w-fit gap-2 self-start -rotate-1 border-2 border-transparent hover:border-black" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-right sm:ml-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neo-indigo/60">Control room</p>
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-neo-indigo md:text-4xl">
              Settings
            </h1>
          </div>
        </div>

        <Tabs defaultValue="account" className="flex flex-col gap-4 md:flex-row md:items-start">
          <TabsList className="flex h-auto w-full flex-none flex-row flex-wrap gap-1 border-0 bg-transparent p-0 md:w-52 md:flex-col md:flex-nowrap">
            <TabsTrigger value="account" className={`${tabBase} data-[state=active]:!bg-neo-lavender data-[state=active]:!text-black`}>
              Account
            </TabsTrigger>
            <TabsTrigger value="writing" className={`${tabBase} data-[state=active]:!bg-neo-mint data-[state=active]:!text-black`}>
              Writing
            </TabsTrigger>
            <TabsTrigger value="goals" className={`${tabBase} data-[state=active]:!bg-neo-peach data-[state=active]:!text-black`}>
              Goals
            </TabsTrigger>
            <TabsTrigger value="stats" className={`${tabBase} data-[state=active]:!bg-neo-sky data-[state=active]:!text-black`}>
              Stats
            </TabsTrigger>
            <TabsTrigger value="projects" className={`${tabBase} data-[state=active]:!bg-neo-lavender data-[state=active]:!text-black`}>
              Projects
            </TabsTrigger>
            <TabsTrigger value="privacy" className={`${tabBase} data-[state=active]:!bg-white data-[state=active]:!text-black`}>
              Privacy
            </TabsTrigger>
          </TabsList>

          <div className="min-w-0 flex-1 md:-translate-y-1 md:rotate-[0.2deg]">
          <TabsContent value="account" className="mt-0 space-y-2 focus-visible:outline-none">
            <RetroWindowFrame title="account — identity" accent="white">
            <Input value={state.display_name} onChange={e => setState(prev => ({ ...prev, display_name: e.target.value }))} placeholder="Pen name / display name" />
            <Input value={state.avatar_url} onChange={e => setState(prev => ({ ...prev, avatar_url: e.target.value }))} placeholder="Avatar URL (optional)" />
            <Input value={state.bio} onChange={e => setState(prev => ({ ...prev, bio: e.target.value }))} placeholder="Writer bio" />
            </RetroWindowFrame>
          </TabsContent>

          <TabsContent value="writing" className="mt-0 space-y-2 focus-visible:outline-none">
            <RetroWindowFrame title="writing — editor" accent="mint">
            <Input value={state.theme} onChange={e => setState(prev => ({ ...prev, theme: e.target.value }))} placeholder="Theme (dark/light/sepia)" />
            <Input value={state.font_family} onChange={e => setState(prev => ({ ...prev, font_family: e.target.value }))} placeholder="Font family" />
            <Input value={state.font_size} onChange={e => setState(prev => ({ ...prev, font_size: e.target.value }))} placeholder="Font size" />
            <Input value={state.line_spacing} onChange={e => setState(prev => ({ ...prev, line_spacing: e.target.value }))} placeholder="Line spacing" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={state.typewriter_mode}
                onCheckedChange={checked => setState(prev => ({ ...prev, typewriter_mode: Boolean(checked) }))}
              />
              Enable typewriter mode
            </label>
            </RetroWindowFrame>
          </TabsContent>

          <TabsContent value="goals" className="mt-0 space-y-2 focus-visible:outline-none">
            <RetroWindowFrame title="goals — rhythm" accent="peach">
            <Input value={state.daily_word_goal} onChange={e => setState(prev => ({ ...prev, daily_word_goal: e.target.value }))} placeholder="Daily word goal" />
            <Input value={state.weekly_word_goal} onChange={e => setState(prev => ({ ...prev, weekly_word_goal: e.target.value }))} placeholder="Weekly word goal" />
            <Input value={state.pomodoro_minutes} onChange={e => setState(prev => ({ ...prev, pomodoro_minutes: e.target.value }))} placeholder="Pomodoro minutes" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={state.reminder_daily}
                onCheckedChange={checked => setState(prev => ({ ...prev, reminder_daily: Boolean(checked) }))}
              />
              Daily reminder
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={state.reminder_streak}
                onCheckedChange={checked => setState(prev => ({ ...prev, reminder_streak: Boolean(checked) }))}
              />
              Streak alerts
            </label>
            <Input value={state.reminder_progress_email} onChange={e => setState(prev => ({ ...prev, reminder_progress_email: e.target.value }))} placeholder="Progress email cadence (daily/weekly/monthly)" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={state.reminder_push_enabled}
                onCheckedChange={checked => setState(prev => ({ ...prev, reminder_push_enabled: Boolean(checked) }))}
              />
              Enable push-ready channel placeholder
            </label>
            </RetroWindowFrame>
          </TabsContent>

          <TabsContent value="stats" className="mt-0 space-y-2 focus-visible:outline-none">
            <RetroWindowFrame title="stats — numbers" accent="sky">
            <p className="text-sm text-muted-foreground">Total words: {stats.totalWords.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Average daily words: {stats.averageDailyWords.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Projects completed: {stats.projectsCompleted}</p>
            <p className="text-sm text-muted-foreground">Total projects: {stats.totalProjects}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportStatsAsCsv(stats)}>Export CSV</Button>
              <Button variant="outline" onClick={() => exportStatsAsPdfLikePrint(stats)}>Export PDF</Button>
            </div>
            </RetroWindowFrame>
          </TabsContent>

          <TabsContent value="projects" className="mt-0 space-y-2 focus-visible:outline-none">
            <RetroWindowFrame title="projects — shelf" accent="lavender">
            {novels.length === 0 && (
              <p className="text-sm text-muted-foreground">No projects yet. Create one from the dashboard.</p>
            )}
            {novels.map(novel => (
              <div
                key={novel.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-border/70 bg-muted/20 p-3 text-sm shadow-none"
              >
                <div>
                  <p className="font-medium text-foreground">{novel.title}</p>
                  <p className="text-muted-foreground">{novel.genre ?? '—'} · {novel.status ?? 'drafting'} · {new Date(novel.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setActiveNovel(novel.id);
                      navigate('/');
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
                    title="Edit book"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteBookId(novel.id)}
                    title="Delete book"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            </RetroWindowFrame>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0 space-y-2 focus-visible:outline-none">
            <RetroWindowFrame title="privacy — trust" accent="white">
            <p className="text-sm text-muted-foreground">Manage account security actions from the Security panel on the dashboard.</p>
            <p className="text-sm text-muted-foreground">Privacy-first defaults are enabled. No public sharing is forced.</p>
            </RetroWindowFrame>
          </TabsContent>
          </div>
        </Tabs>

        <BookEditDialog
          novelId={editBookId}
          open={editOpen}
          onOpenChange={o => {
            setEditOpen(o);
            if (!o) setEditBookId(null);
          }}
          source="settings"
        />
        <DeleteBookDialog
          novelId={deleteBookId}
          open={Boolean(deleteBookId)}
          onOpenChange={o => {
            if (!o) setDeleteBookId(null);
          }}
          source="settings"
        />
      </div>
      </ArtsyPageChrome>
    </PageShell>
  );
}
