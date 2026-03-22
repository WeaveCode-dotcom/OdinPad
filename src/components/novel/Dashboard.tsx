import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  BookOpen,
  Feather,
  Clock,
  LogOut,
  User,
  Shield,
  Upload,
  Download,
  Settings,
  Pencil,
  Trash2,
  Search,
  Focus,
  CalendarDays,
  LayoutGrid,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNovelContext } from '@/contexts/NovelContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AccountSecurityModal from '@/components/auth/AccountSecurityModal';
import BookEditDialog from '@/components/novel/BookEditDialog';
import DeleteBookDialog from '@/components/novel/DeleteBookDialog';
import { toast } from '@/hooks/use-toast';
import {
  clearBookCreationDraft,
  loadBookCreationDraft,
  rankFrameworkRecommendations,
  saveBookCreationDraft,
  validateAndNormalizeBookCreation,
} from '@/lib/book-creation';
import { STORY_FRAMEWORKS } from '@/lib/story-frameworks';
import { trackEvent } from '@/lib/analytics';
import { parseNovelImport } from '@/lib/novel-store';
import { computeWriterStats } from '@/lib/writer-stats';
import {
  findLastTouchedScene,
  findNextSceneTitle,
  getNovelWordCount,
  rankFromWords,
  sortNovelsByRecent,
} from '@/lib/novel-metrics';
import { getWordsToday } from '@/lib/daily-words';
import type { Novel } from '@/types/novel';
import { PageShell } from '@/components/motion/PageShell';
import { ArtsyPageChrome } from '@/components/layout/AppArtsyDecor';

const CREATION_GENRES = ['Fantasy', 'Romance', 'Mystery', 'Literary', 'Sci-Fi', 'Thriller', 'Historical', 'General'];

const QUOTES = [
  "The story you've been waiting to tell is ready.",
  'Small sessions today become finished books tomorrow.',
  'Structure is kindness to your future self.',
  'One true scene beats a hundred vague plans.',
];

const neo = {
  outer: 'border-2 border-black bg-neo-bg/90 shadow-none backdrop-blur-[1px]',
  innerMuted:
    'border-2 border-black shadow-none transition-[box-shadow,transform,filter] duration-300 hover:ring-1 hover:ring-[hsl(var(--neo-indigo))]/25 motion-safe:hover:-translate-y-0.5',
  title: 'text-[11px] font-black uppercase tracking-[0.2em] text-[hsl(var(--neo-indigo))]',
  progressTrack: 'h-3 w-full overflow-hidden border-2 border-black bg-white',
  progressFill: 'h-full bg-[hsl(var(--neo-lime))] transition-[width] duration-300',
};

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function quoteOfDay(): string {
  const d = new Date();
  const i = (d.getFullYear() + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
  return QUOTES[i] ?? QUOTES[0];
}

function firstChapterLabel(novel: Novel): string {
  const ch = novel.acts[0]?.chapters[0];
  return ch?.title ? `Book 1: ${ch.title}` : 'Book 1';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    novels,
    activeNovel,
    addNovelWithOptions,
    importNovel,
    setActiveNovel,
    setMode,
    addIdeaToNovel,
  } = useNovelContext();
  const { user, signOut, preferences } = useAuth();
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newFrameworkId, setNewFrameworkId] = useState('three-act');
  const [newPremise, setNewPremise] = useState('');
  const [newTargetWordCount, setNewTargetWordCount] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [postCreateDestination, setPostCreateDestination] = useState<'write' | 'plan'>('write');
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [creationStartedAt, setCreationStartedAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [seedText, setSeedText] = useState('');

  const sortedNovels = useMemo(() => sortNovelsByRecent(novels), [novels]);
  const primaryNovel = useMemo(() => {
    if (activeNovel) return activeNovel;
    return sortedNovels[0] ?? null;
  }, [activeNovel, sortedNovels]);

  const stats = useMemo(() => computeWriterStats(novels), [novels]);
  const wordsToday = getWordsToday();
  const dailyGoal = preferences?.daily_word_goal ?? 500;
  const targetWords = primaryNovel?.targetWordCount ?? 50000;
  const primaryWords = primaryNovel ? getNovelWordCount(primaryNovel) : 0;
  const manuscriptPct = targetWords > 0 ? Math.min(100, Math.round((primaryWords / targetWords) * 100)) : 0;
  const dailyPct = dailyGoal > 0 ? Math.min(100, Math.round((wordsToday / dailyGoal) * 100)) : 0;

  const rankInfo = rankFromWords(primaryWords);
  const streakDays = stats.totalWords > 0 ? Math.min(14, Math.max(1, Math.floor(stats.totalWords / 2500))) : 0;

  const recentIdeas = useMemo(() => {
    if (!primaryNovel?.ideas?.length) return [];
    return [...primaryNovel.ideas]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 3)
      .map(i => i.content.trim())
      .filter(Boolean);
  }, [primaryNovel]);

  const filteredNovels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedNovels;
    return sortedNovels.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        (n.genre ?? '').toLowerCase().includes(q),
    );
  }, [sortedNovels, searchQuery]);

  const frameworkRecommendations = useMemo(
    () =>
      rankFrameworkRecommendations({
        selectedGenre: newGenre,
        preferredGenres: preferences?.genres,
        writingStyle: preferences?.writing_style,
        primaryGoal: preferences?.primary_goal,
        fallbackFrameworkId: preferences?.default_framework_id,
      }),
    [newGenre, preferences?.default_framework_id, preferences?.genres, preferences?.primary_goal, preferences?.writing_style],
  );

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setFormWarning(null);
    setCreationStartedAt(Date.now());
    trackEvent('book_create_started', { source: 'dashboard' });
    const userId = user?.id;
    if (userId) {
      const draft = loadBookCreationDraft(userId);
      if (draft) {
        setNewTitle(draft.title);
        setNewAuthor(draft.author);
        setNewGenre(draft.genre);
        setNewFrameworkId(draft.frameworkId);
        setNewPremise(draft.premise);
        setNewTargetWordCount(draft.targetWordCount);
        setAdvancedOpen(draft.advancedOpen);
        return;
      }
    }
    setNewTitle('');
    setNewAuthor(user?.name ?? 'Anonymous');
    setNewGenre(preferences?.genres?.[0] ?? 'General');
    setNewFrameworkId(preferences?.default_framework_id ?? 'three-act');
    setNewPremise('');
    setNewTargetWordCount('');
    setAdvancedOpen(false);
    setPostCreateDestination('write');
  }, [open, preferences?.default_framework_id, preferences?.genres, user?.id, user?.name]);

  useEffect(() => {
    if (!open || !user?.id) return;
    saveBookCreationDraft(user.id, {
      title: newTitle,
      author: newAuthor,
      genre: newGenre,
      frameworkId: newFrameworkId,
      premise: newPremise,
      targetWordCount: newTargetWordCount,
      advancedOpen,
    });
  }, [advancedOpen, newAuthor, newFrameworkId, newGenre, newPremise, newTargetWordCount, newTitle, open, user?.id]);

  const exportTargetNovel = () => {
    const n = primaryNovel ?? sortedNovels[0];
    if (!n) {
      toast({ title: 'No book to export', description: 'Create or import a project first.', variant: 'destructive' });
      return;
    }
    const blob = new Blob([JSON.stringify(n, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${n.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'novel'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile: ChangeEventHandler<HTMLInputElement> = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      const novel = parseNovelImport(parsed);
      if (!novel) {
        toast({ title: 'Invalid backup file', description: 'Expected a novel JSON with id, title, and acts.', variant: 'destructive' });
        return;
      }
      importNovel(novel);
      trackEvent('book_imported', { source: 'dashboard' });
      toast({ title: 'Book imported', description: `"${novel.title}" was added to your library.` });
    } catch {
      toast({ title: 'Could not read file', variant: 'destructive' });
    } finally {
      event.currentTarget.value = '';
    }
  };

  const handleCreate = () => {
    const validation = validateAndNormalizeBookCreation(
      {
        title: newTitle,
        author: newAuthor,
        genre: newGenre || 'General',
        frameworkId: newFrameworkId,
        premise: newPremise,
        targetWordCount: newTargetWordCount,
        status: postCreateDestination === 'plan' ? 'outlining' : 'drafting',
      },
      novels.map(novel => novel.title),
    );
    setFormError(validation.errors[0] ?? null);
    setFormWarning(validation.warnings[0] ?? null);
    if (validation.errors.length > 0) {
      trackEvent('book_create_failed', {
        source: 'dashboard',
        reason: validation.errors[0],
      });
      return;
    }

    trackEvent('book_create_submitted', {
      source: 'dashboard',
      frameworkId: validation.normalized.frameworkId,
      hasPremise: Boolean(validation.normalized.premise),
      hasTargetWordCount: Boolean(validation.normalized.targetWordCount),
      destination: postCreateDestination,
    });

    addNovelWithOptions(validation.normalized.title, validation.normalized.author, {
      genre: validation.normalized.genre,
      premise: validation.normalized.premise,
      targetWordCount: validation.normalized.targetWordCount,
      frameworkId: validation.normalized.frameworkId,
      status: validation.normalized.status,
    });
    if (user?.id) clearBookCreationDraft(user.id);
    trackEvent('book_create_succeeded', {
      source: 'dashboard',
      frameworkId: validation.normalized.frameworkId,
      destination: postCreateDestination,
    });
    if (creationStartedAt) {
      trackEvent('book_create_time_ms', {
        source: 'dashboard',
        duration: Date.now() - creationStartedAt,
      });
    }
    setOpen(false);
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    const result = await signOut();
    if (result.error) setSignOutError(result.error);
  };

  const displayName = user?.name?.split(/\s+/)[0] ?? 'Writer';

  const focusMode = () => {
    const n = primaryNovel ?? sortedNovels[0];
    if (!n) {
      toast({ title: 'Open a project first', description: 'Create a book or pick one from your library.', variant: 'destructive' });
      return;
    }
    setActiveNovel(n.id);
    setMode('write');
  };

  const logSeed = () => {
    const text = seedText.trim();
    if (!text) {
      toast({ title: 'Nothing to log', description: 'Type a line or two in the seed prompt.', variant: 'destructive' });
      return;
    }
    if (!primaryNovel) {
      toast({ title: 'No active project', description: 'Create a book first — ideas attach to a project.', variant: 'destructive' });
      return;
    }
    addIdeaToNovel(primaryNovel.id, 'misc', text);
    setSeedText('');
    toast({ title: 'Logged to Ideas', description: 'Saved on your Idea Web for this project.' });
  };

  const lastScene = primaryNovel ? findLastTouchedScene(primaryNovel) : null;
  const nextScene = primaryNovel ? findNextSceneTitle(primaryNovel) : '—';

  return (
    <PageShell className="page-viewport w-full neo-grid-light">
      <ArtsyPageChrome>
      <div className={`w-full max-w-none p-1 sm:p-2 ${neo.outer}`}>
        {/* Top bar — offset logo strip */}
        <header className="relative flex flex-col gap-3 border-b-2 border-black pb-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex items-center gap-3">
            <span className="absolute -left-1 -top-1 hidden h-[calc(100%+8px)] w-3 -skew-y-1 bg-neo-lime/90 sm:block" aria-hidden />
            <div className="relative flex items-center gap-2 pl-1 sm:pl-2">
            <Feather className="h-7 w-7 text-[hsl(var(--neo-indigo))]" />
            <span className="text-xl font-black uppercase tracking-tight text-[hsl(var(--neo-indigo))]">OdinPad</span>
            <span className="ml-1 hidden -rotate-2 rounded-sm border-2 border-black bg-neo-peach px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-neo-indigo sm:inline-block">
              Studio
            </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--neo-indigo))] opacity-60" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="border-2 border-black bg-white pl-9 font-semibold placeholder:font-bold placeholder:text-[hsl(var(--neo-indigo))]/40"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-2 border-black bg-white shadow-none"
              onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Library
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 border-black bg-white shadow-none">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="mr-1 h-6 w-6 rounded-sm border border-black object-cover" />
                  ) : (
                    <User className="mr-1 h-4 w-4" />
                  )}
                  Profile
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-2 border-black shadow-none">
                <DropdownMenuLabel>{user?.name ?? 'User'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSecurityOpen(true)}>
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  Security
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportTargetNovel}>
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleSignOut()}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {signOutError && (
          <div className="mt-2 rounded-sm border-2 border-destructive/60 bg-destructive/10 px-2 py-1.5 text-xs text-destructive shadow-none">
            Sign out failed: {signOutError}
          </div>
        )}

        <motion.div
          className="mt-3 space-y-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
            <p className="inline-block rotate-[-0.8deg] border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.35em] text-[hsl(var(--neo-indigo))]">
              Command center
            </p>
            <span className="text-[11px] font-bold text-[hsl(var(--neo-indigo))]/50">Today · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>

          {/* Welcome — asymmetric split */}
          <div className={`${neo.innerMuted} relative overflow-hidden bg-[hsl(270_40%_94%)] p-4 md:p-6`}>
            <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-neo-lime/25 blur-2xl" aria-hidden />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:max-w-[58%]">
                <p className="text-sm font-black uppercase tracking-wide text-[hsl(var(--neo-indigo))]">
                  {greetingForNow()}, {displayName}.
                </p>
                <p className="mt-3 text-xl font-semibold italic leading-snug text-[hsl(var(--neo-indigo))] md:text-2xl md:leading-tight">
                  &ldquo;{quoteOfDay()}&rdquo;
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-2 lg:-translate-y-1 lg:translate-x-1 lg:pt-1">
                <Button type="button" size="sm" className="gap-1 border-2 border-black shadow-none" onClick={focusMode}>
                  <Focus className="h-3.5 w-3.5" />
                  Focus Mode
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 border-2 border-black bg-white shadow-none"
                  onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Recent Projects
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 border-2 border-black bg-white shadow-none"
                  onClick={() => document.getElementById('deadlines')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendar
                </Button>
              </div>
            </div>
          </div>

          {/* Bento stats — uneven grid */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
            {/** Active project — wide tile */}
            <div className={`${neo.innerMuted} flex flex-col bg-[hsl(270_35%_92%)] p-4 lg:col-span-7`}>
              <p className={neo.title}>Active Project</p>
              {primaryNovel ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveNovel(primaryNovel.id)}
                    className="mt-3 w-full rounded-sm border-2 border-black bg-white p-3 text-left shadow-none transition-transform hover:-translate-x-px hover:-translate-y-px"
                  >
                    <p className="text-base font-black text-[hsl(var(--neo-indigo))]">{primaryNovel.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[hsl(var(--neo-indigo))]/80">{firstChapterLabel(primaryNovel)}</p>
                    <div className="mt-3">
                      <div className={neo.progressTrack}>
                        <div className={neo.progressFill} style={{ width: `${manuscriptPct}%` }} />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[hsl(var(--neo-indigo))]">{manuscriptPct}% toward goal</p>
                    </div>
                    <p className="mt-3 text-xs text-[hsl(var(--neo-indigo))]/85">
                      Last edited: {lastScene?.label ?? '—'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[hsl(var(--neo-indigo))]">Next up: {nextScene}</p>
                  </button>
                </>
              ) : (
                <p className="mt-4 text-sm text-[hsl(var(--neo-indigo))]/80">No projects yet — create your first book below.</p>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:col-span-5">
            {/** Today's progress */}
            <div className={`${neo.innerMuted} flex flex-1 flex-col bg-[hsl(142_35%_90%)] p-4`}>
              <p className={neo.title}>Today&apos;s Progress</p>
              <div className="mt-4 space-y-2 text-sm font-semibold text-[hsl(var(--neo-indigo))]">
                <p>Words today: {wordsToday.toLocaleString()}</p>
                <p>Words total: {stats.totalWords.toLocaleString()}</p>
                <p>Goal: {targetWords.toLocaleString()}</p>
              </div>
              <div className="mt-4">
                <div className={neo.progressTrack}>
                  <div className={neo.progressFill} style={{ width: `${dailyPct}%` }} />
                </div>
                <p className="mt-1 text-xs font-semibold text-[hsl(var(--neo-indigo))]">{dailyPct}% of daily goal</p>
              </div>
              <p className="mt-4 text-xs text-[hsl(var(--neo-indigo))]/85">Best time: 8–11 PM (estimate)</p>
              <p className="mt-1 text-xs font-semibold text-[hsl(var(--neo-indigo))]">
                Daily streak: {streakDays > 0 ? `${streakDays} days` : '—'}
              </p>
            </div>

            {/** Writer's Odyssey — slightly offset */}
            <div className={`${neo.innerMuted} flex flex-col bg-[hsl(38_90%_90%)] p-4 lg:-translate-x-1 lg:translate-y-1`}>
              <p className={neo.title}>Writer&apos;s Odyssey</p>
              <div className="mt-4 space-y-2 text-sm font-semibold text-[hsl(var(--neo-indigo))]">
                <p>Rank: {rankInfo.rank}</p>
                <p>Streak: {streakDays > 0 ? `${streakDays} days` : 'Start writing'}</p>
              </div>
              <div className="mt-4 rounded-sm border-2 border-black bg-white p-3 text-sm shadow-none">
                <p className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--neo-indigo))]/70">Next badge</p>
                <p className="mt-1 font-bold text-[hsl(var(--neo-indigo))]">&ldquo;{rankInfo.nextBadge}&rdquo;</p>
                <p className="mt-1 text-xs text-[hsl(var(--neo-indigo))]/80">
                  {rankInfo.scenesToBadge > 0 ? `${rankInfo.scenesToBadge} scenes to go` : 'Badge unlocked!'}
                </p>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--neo-indigo))]">
                <Trophy className="h-4 w-4" />5 new badges this month
              </p>
            </div>
            </div>
          </div>

          {/* Row 2 — zig-zag */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div id="recent-ideas" className={`${neo.innerMuted} bg-[hsl(200_40%_92%)] p-4 lg:col-span-7`}>
              <p className={neo.title}>Recent Ideas</p>
              <ul className="mt-4 space-y-3 text-sm text-[hsl(var(--neo-indigo))]">
                {recentIdeas.length === 0 ? (
                  <li className="text-[hsl(var(--neo-indigo))]/70">No ideas yet — capture one below.</li>
                ) : (
                  recentIdeas.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-black">•</span>
                      <span>{line}</span>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-2 border-black bg-white shadow-none"
                  onClick={() => primaryNovel && setActiveNovel(primaryNovel.id)}
                  disabled={!primaryNovel}
                >
                  View all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="border-2 border-black shadow-none"
                  onClick={() => {
                    if (!primaryNovel) {
                      toast({ title: 'Create a project first', variant: 'destructive' });
                      return;
                    }
                    const t = window.prompt('Quick capture — your idea');
                    if (t?.trim()) addIdeaToNovel(primaryNovel.id, 'misc', t.trim());
                  }}
                >
                  Quick Capture +
                </Button>
              </div>
            </div>

            <div id="deadlines" className={`${neo.innerMuted} bg-[hsl(330_35%_93%)] p-4 lg:col-span-5 lg:translate-y-6`}>
              <p className={neo.title}>Upcoming Deadlines</p>
              <ul className="mt-4 space-y-4 text-sm text-[hsl(var(--neo-indigo))]">
                <li>
                  <span className="mr-1">📅</span>
                  <strong>Summer Camp Challenge</strong>
                  <br />
                  <span className="text-xs font-semibold opacity-80">Starts in 3 days</span>
                </li>
                <li>
                  <span className="mr-1">📅</span>
                  <strong>Chapter 8 Goal</strong>
                  <br />
                  <span className="text-xs font-semibold opacity-80">Due Friday</span>
                </li>
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 border-2 border-black bg-white shadow-none"
                onClick={() => document.getElementById('deadlines')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View calendar
              </Button>
            </div>
          </div>

          {/* Daily seed — tilted panel */}
          <div className={`${neo.innerMuted} rotate-[0.35deg] bg-[hsl(0_0%_100%)] p-4 md:p-5 motion-reduce:rotate-0`}>
            <p className={neo.title}>Daily Seed Prompt</p>
            <p className="mt-3 text-sm font-semibold text-[hsl(var(--neo-indigo))]">
              &ldquo;What&apos;s one image, scene, or feeling in your head today?&rdquo;
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                value={seedText}
                onChange={e => setSeedText(e.target.value)}
                placeholder="Type your idea here..."
                className="flex-1 border-2 border-black font-semibold placeholder:font-bold placeholder:text-[hsl(var(--neo-indigo))]/35"
                onKeyDown={e => e.key === 'Enter' && logSeed()}
              />
              <Button type="button" className="border-2 border-black shadow-none" onClick={logSeed}>
                Log
              </Button>
            </div>
          </div>
        </motion.div>

          {/* Library */}
          <div id="library" className="relative space-y-4 border-2 border-dashed border-black/50 bg-neo-bg/50 p-3 pt-8">
            <span className="absolute -left-0.5 -top-3 inline-block -rotate-2 border-2 border-black bg-neo-lime px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-black">
              Library
            </span>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase leading-none tracking-tight text-[hsl(var(--neo-indigo))] md:text-4xl">
                  Shelf
                </h2>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--neo-indigo))]/70">
                  {novels.length} {novels.length === 1 ? 'project' : 'projects'}
                  {searchQuery.trim() ? ` · ${filteredNovels.length} match` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 border-2 border-black shadow-none">
                      <Plus className="h-4 w-4" />
                      New Book
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a New Book</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">Title *</label>
                        <Input
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          placeholder="The Great American Novel"
                          onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">Author / Pen Name</label>
                        <Input
                          value={newAuthor}
                          onChange={e => setNewAuthor(e.target.value)}
                          placeholder="Anonymous"
                          onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">Genre *</label>
                        <Select value={newGenre || 'General'} onValueChange={setNewGenre}>
                          <SelectTrigger>
                            <SelectValue placeholder="Genre" />
                          </SelectTrigger>
                          <SelectContent>
                            {CREATION_GENRES.map(genre => (
                              <SelectItem key={genre} value={genre}>
                                {genre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">Template *</label>
                        <Select
                          value={newFrameworkId}
                          onValueChange={value => {
                            setNewFrameworkId(value);
                            trackEvent('book_create_template_selected', { source: 'dashboard', frameworkId: value });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Template" />
                          </SelectTrigger>
                          <SelectContent>
                            {STORY_FRAMEWORKS.map(framework => (
                              <SelectItem key={framework.id} value={framework.id}>
                                {framework.shortName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {frameworkRecommendations.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Recommended:{' '}
                            {frameworkRecommendations
                              .slice(0, 2)
                              .map(item => {
                                const match = STORY_FRAMEWORKS.find(framework => framework.id === item.frameworkId);
                                return match?.shortName ?? item.frameworkId;
                              })
                              .join(', ')}
                          </p>
                        )}
                      </div>

                      <button type="button" onClick={() => setAdvancedOpen(prev => !prev)} className="text-left text-xs font-medium text-primary">
                        {advancedOpen ? 'Hide advanced options' : 'Show advanced options'}
                      </button>

                      {advancedOpen && (
                        <div className="space-y-4 rounded-sm border-2 border-border/80 bg-muted/30 p-3 shadow-none">
                          <div>
                            <label className="mb-1.5 block text-sm text-muted-foreground">Premise</label>
                            <Input value={newPremise} onChange={e => setNewPremise(e.target.value)} placeholder="One-sentence premise" />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm text-muted-foreground">Target word count</label>
                            <Input
                              value={newTargetWordCount}
                              onChange={e => setNewTargetWordCount(e.target.value)}
                              placeholder="Optional target (100 - 1,000,000)"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">After create</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={postCreateDestination === 'write' ? 'default' : 'outline'}
                            onClick={() => setPostCreateDestination('write')}
                          >
                            Open Write
                          </Button>
                          <Button
                            type="button"
                            variant={postCreateDestination === 'plan' ? 'default' : 'outline'}
                            onClick={() => setPostCreateDestination('plan')}
                          >
                            Open Plan
                          </Button>
                        </div>
                      </div>

                      {formError && (
                        <p className="rounded-sm border-2 border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                          {formError}
                        </p>
                      )}
                      {formWarning && !formError && (
                        <p className="rounded-sm border-2 border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-300">
                          {formWarning}
                        </p>
                      )}

                      <Button onClick={handleCreate} className="w-full">
                        Create Book
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredNovels.map((novel, i) => {
                  const totalWords = getNovelWordCount(novel);
                  const totalScenes = novel.acts.reduce((sum, act) => sum + act.chapters.reduce((cSum, ch) => cSum + ch.scenes.length, 0), 0);
                  const tilt = i % 3 === 0 ? '-rotate-[0.4deg]' : i % 3 === 1 ? 'rotate-[0.35deg]' : '-rotate-[0.2deg]';

                  return (
                    <motion.div
                      key={novel.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setActiveNovel(novel.id)}
                      className={`group cursor-pointer border-2 border-black bg-white p-5 shadow-none transition-all hover:z-10 hover:-translate-y-1 hover:border-[hsl(var(--neo-indigo))]/50 motion-reduce:rotate-0 ${tilt}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <BookOpen className="h-5 w-5 shrink-0 text-[hsl(var(--neo-indigo))]" />
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-2 border-black"
                            onClick={e => {
                              e.stopPropagation();
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
                            className="h-8 w-8 border-2 border-black"
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteBookId(novel.id);
                            }}
                            title="Delete book"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <span className="rounded-sm border-2 border-black bg-[hsl(var(--neo-lime))]/30 px-2.5 py-0.5 text-xs font-mono font-semibold text-[hsl(var(--neo-indigo))]">
                            {totalWords.toLocaleString()} words
                          </span>
                        </div>
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-[hsl(var(--neo-indigo))] group-hover:underline">{novel.title}</h3>
                      <p className="mb-3 text-sm text-[hsl(var(--neo-indigo))]/75">{novel.author}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--neo-indigo))]/70">
                        <span>{novel.genre ?? '—'}</span>
                        <span>·</span>
                        <span>{novel.status ?? 'drafting'}</span>
                        <span>·</span>
                        <span>{novel.acts.length} acts</span>
                        <span>·</span>
                        <span>{totalScenes} scenes</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(novel.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
      </div>
      </ArtsyPageChrome>

      <BookEditDialog
        novelId={editBookId}
        open={editOpen}
        onOpenChange={o => {
          setEditOpen(o);
          if (!o) setEditBookId(null);
        }}
        source="dashboard"
      />

      <DeleteBookDialog
        novelId={deleteBookId}
        open={Boolean(deleteBookId)}
        onOpenChange={o => {
          if (!o) setDeleteBookId(null);
        }}
        source="dashboard"
      />

      <AccountSecurityModal open={securityOpen} onOpenChange={setSecurityOpen} />
    </PageShell>
  );
}
