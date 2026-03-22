import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  ChartColumn,
  ChevronRight,
  Crosshair,
  Feather,
  FileText,
  Goal,
  HelpCircle,
  Layers,
  Library,
  PenTool,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/motion/PageShell';
import { ScrollReveal } from '@/components/motion/ScrollReveal';
import { cn } from '@/lib/utils';

const featureCards = [
  {
    icon: Layers,
    title: 'Intuitive Story Structures',
    desc: "Three-Act, Hero's Journey, Save the Cat, Kishotenketsu — pick a spine and adapt it to your voice.",
  },
  {
    icon: Sparkles,
    title: 'Gamified Progress',
    desc: 'Streaks, milestones, and visible momentum so consistency feels rewarding, not punishing.',
  },
  {
    icon: ChartColumn,
    title: 'Habit Analytics',
    desc: 'Cadence, output trends, and revision velocity — see how you actually write, not how you wish you did.',
  },
  {
    icon: Goal,
    title: 'Goals That Scale',
    desc: 'Scene goals, chapter targets, and manuscript totals with progress you can trust.',
  },
  {
    icon: Timer,
    title: 'Focus Mode',
    desc: 'Strip the chrome, keep the manuscript — deep work without the noise.',
  },
  {
    icon: WandSparkles,
    title: 'Editorial Depth',
    desc: 'Review and refine with annotations, notes, and continuity in one place.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Capture',
    body: 'Ideas and brainstorm boards before the inner critic wakes up.',
  },
  {
    step: '02',
    title: 'Structure',
    body: 'Acts, chapters, beats — flexible scaffolding for your genre.',
  },
  {
    step: '03',
    title: 'Draft',
    body: 'Scene-by-scene prose with word counts and a calm editor.',
  },
  {
    step: '04',
    title: 'Review',
    body: 'Notes, passes, and polish without losing the thread.',
  },
];

const PASTEL_CARD = ['bg-neo-lavender', 'bg-neo-mint', 'bg-neo-peach', 'bg-neo-sky'] as const;

const STATS = [
  { label: 'Active writers', value: '12k+', sub: 'on drafts this month' },
  { label: 'Words tracked', value: '240M+', sub: 'in OdinPad' },
  { label: 'Frameworks', value: '10+', sub: 'story templates' },
  { label: 'Avg. session', value: '47m', sub: 'focus blocks' },
];

const TEMPLATE_STRIPS = [
  { name: 'Three-Act', tag: 'Classic', color: 'bg-neo-lavender' },
  { name: 'Save the Cat', tag: 'Screenplay', color: 'bg-neo-peach' },
  { name: 'Hero’s Journey', tag: 'Epic', color: 'bg-neo-sky' },
  { name: 'Romance Beat Sheet', tag: 'Genre', color: 'bg-neo-mint' },
  { name: 'Mystery Outline', tag: 'Puzzle', color: 'bg-neo-lavender' },
  { name: 'Kishōtenketsu', tag: 'Structure', color: 'bg-neo-peach' },
];

const GENRE_TAGS = ['Fantasy', 'Romance', 'Thriller', 'Literary', 'Sci-Fi', 'Horror', 'YA', 'Mystery', 'Historical', 'Memoir'];

const TESTIMONIALS = [
  {
    quote: 'Finally a planner that doesn’t feel like a spreadsheet. The boxes and progress bars make me want to open the app.',
    name: 'Alex M.',
    role: 'Debut fantasy',
  },
  {
    quote: 'I switched from scattered docs. One manuscript, one workspace — the brutalist UI is weirdly calming.',
    name: 'Jordan K.',
    role: 'Romance + thriller',
  },
  {
    quote: 'Streaks and daily goals turned “someday” into 4 finished drafts.',
    name: 'Sam R.',
    role: 'Short fiction',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is OdinPad only for “plotters”?',
    a: 'No. You can plan deeply or draft first — ideas, brainstorm, plan, write, and review in one shell.',
  },
  {
    q: 'Can I export my work?',
    a: 'Yes. Back up projects as JSON from the dashboard and keep your manuscript portable.',
  },
  {
    q: 'Does it work offline-first?',
    a: 'Your library syncs when signed in; local drafts keep you moving when the connection drops.',
  },
];

const BENTO = [
  {
    title: 'Codex',
    desc: 'Characters, locations, lore — linked to scenes.',
    icon: Library,
    span: 'md:col-span-2',
    bg: 'bg-neo-lavender',
  },
  {
    title: 'Scene board',
    desc: 'Drag beats, reorder chapters, see the spine.',
    icon: Layers,
    span: '',
    bg: 'bg-neo-mint',
  },
  {
    title: 'Focus timer',
    desc: 'Pomodoro-ready sessions with word deltas.',
    icon: Zap,
    span: '',
    bg: 'bg-neo-peach',
  },
  {
    title: 'Review mode',
    desc: 'Annotations and passes without breaking flow.',
    icon: FileText,
    span: 'md:col-span-2',
    bg: 'bg-neo-sky',
  },
];

function NeoCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className={cn(
        'border-2 border-black bg-white neo-hard transition-[transform,box-shadow] duration-150 motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[7px_7px_0_0_#000]',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  return (
    <PageShell className="page-viewport w-full neo-grid-light">
      <header className="sticky top-0 z-30 w-full border-b-2 border-black bg-neo-cream px-2 py-3 sm:px-4 neo-grid-light">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 text-black">
            <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white neo-hard-sm">
              <BookOpen className="h-5 w-5 stroke-[2.5]" />
            </span>
            <span className="font-display text-lg uppercase tracking-tight">OdinPad</span>
          </Link>
          <nav className="order-3 flex w-full items-center justify-center gap-6 border-t-2 border-black pt-3 text-xs font-black uppercase tracking-wider sm:order-none sm:w-auto sm:border-0 sm:pt-0 md:gap-8">
            <a href="#features" className="text-black hover:underline">
              Features
            </a>
            <a href="#pricing" className="text-black hover:underline">
              Pricing
            </a>
            <Link to="/login" className="text-black hover:underline">
              Sign In
            </Link>
          </nav>
          <Button size="sm" className="shrink-0 uppercase tracking-wide" asChild>
            <Link to="/signup">Start writing</Link>
          </Button>
        </div>
      </header>

      {/* Hero — cream + reference layout (badge, MATTER mint sticker, doc window) */}
      <section className="relative w-full overflow-hidden border-b-2 border-black bg-neo-cream px-2 py-8 text-black sm:px-4 md:py-14 neo-grid-light">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <p className="mb-4 inline-block rounded-full border-2 border-black bg-black px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Professional writing platform
            </p>
            <h1 className="font-display max-w-xl text-4xl uppercase leading-[1.08] tracking-tight text-black md:text-5xl lg:text-[3.35rem]">
              Craft stories that{' '}
              <span
                className="relative inline-block border-2 border-black bg-neo-zineMint px-2 py-1 shadow-[5px_5px_0_0_#000]"
                style={{ transform: 'rotate(-3deg)' }}
              >
                matter
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base font-medium leading-relaxed text-black/85 md:text-lg">
              Plan in bold boxes, draft in a calm editor, track progress in yellow and indigo — one workspace for the whole
              novel lifecycle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button size="lg" className="h-12 gap-2 px-6 uppercase tracking-wide" asChild>
                <Link to="/signup">
                  Begin your masterpiece <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 bg-white px-6 uppercase tracking-wide text-black" asChild>
                <a href="#workflow">View demo</a>
              </Button>
            </div>
          </motion.div>

          {/* Editor window illustration — tilted, typewriter body */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: 6 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ delay: 0.06, type: 'spring', stiffness: 220, damping: 24 }}
            className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end"
          >
            <div className="border-2 border-black bg-white shadow-[8px_8px_0_0_#000]">
              <div className="flex items-center justify-between gap-2 border-b-2 border-black bg-neo-cream px-3 py-2.5">
                <span className="font-mono text-[11px] font-bold tracking-tight text-black md:text-xs">New Project.docx</span>
                <div className="flex shrink-0 gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full border border-black/80 bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full border border-black/80 bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full border border-black/80 bg-[#28c840]" />
                </div>
              </div>
              <div className="border-b-2 border-black bg-white p-4">
                <div className="border-2 border-black bg-[#fafaf8] p-3 font-mono text-[11px] leading-relaxed text-black md:text-xs">
                  <p className="mb-2 opacity-80">Chapter 1 — Cold open</p>
                  <p>
                    The door stuck, then gave. Rain stitched the cobbles; she counted three breaths before stepping into the
                    dark.
                  </p>
                  <p className="mt-2 opacity-70">…</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip — chunky metrics on cream */}
      <section className="w-full border-b-2 border-black bg-neo-cream py-5 neo-grid-light">
        <ScrollReveal>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-2 sm:grid-cols-4 sm:px-4">
          {STATS.map(s => (
            <div
              key={s.label}
              className="border-2 border-black bg-white px-3 py-4 text-center neo-hard-sm transition-[transform,box-shadow] motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[6px_6px_0_0_#000]"
            >
              <p className="text-2xl font-black tabular-nums text-black md:text-3xl">{s.value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-black">{s.label}</p>
              <p className="mt-1 text-[11px] font-medium text-black/65">{s.sub}</p>
            </div>
          ))}
        </div>
        </ScrollReveal>
      </section>

      {/* Story + dashboard preview */}
      <section className="w-full border-b-2 border-black px-2 py-6 sm:px-3 md:py-10 neo-grid-light">
        <div className="mx-auto grid w-full max-w-none gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <span className="mb-4 inline-flex items-center gap-2 border-2 border-black bg-neo-peach px-4 py-1.5 text-xs font-black uppercase tracking-wider text-neo-indigo shadow-none">
              Why writers stay
            </span>
            <h2 className="font-display text-2xl uppercase tracking-tight text-neo-indigo md:text-4xl">Everything in one brutalist shell</h2>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-neo-indigo/85 md:text-lg">
              No more tab soup. Ideas, structure, drafting, and revision share the same borders, the same yellow accent, and
              the same grid you see behind this page.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {GENRE_TAGS.slice(0, 6).map(tag => (
                <span
                  key={tag}
                  className="border-2 border-black bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-neo-indigo shadow-none"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="border-2 border-black bg-white p-5 neo-hard"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neo-indigo/70">Dashboard preview</p>
              <span className="border-2 border-black bg-neo-sunshine px-2 py-0.5 text-[10px] font-black uppercase text-black">Live</span>
            </div>
            <div className="space-y-3">
              <div className="border-2 border-black bg-neo-mint p-3 shadow-none">
                <p className="text-[10px] font-bold uppercase text-neo-indigo/70">Daily goal</p>
                <p className="text-sm font-black text-neo-indigo">1,200 / 2,000 words</p>
                <div className="mt-2 h-2 border-2 border-black bg-white">
                  <div className="h-full w-[60%] bg-neo-sunshine" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-black bg-neo-peach p-3 shadow-none">
                  <p className="text-[10px] font-bold uppercase text-neo-indigo/70">Habit</p>
                  <p className="text-lg font-black text-neo-indigo">87</p>
                </div>
                <div className="border-2 border-black bg-neo-sky p-3 shadow-none">
                  <p className="text-[10px] font-bold uppercase text-neo-indigo/70">Streak</p>
                  <p className="text-lg font-black text-neo-indigo">14 days</p>
                </div>
              </div>
              <div className="border-2 border-black bg-neo-lavender p-3 shadow-none">
                <p className="mb-1 text-[10px] font-bold uppercase text-neo-indigo/70">Next target</p>
                <p className="text-sm font-semibold text-neo-indigo">Finish Chapter 8 beat before tonight&apos;s sprint.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Built for professionals — messy desk collage */}
      <section className="w-full border-b-2 border-black bg-neo-zineMint/25 px-2 py-8 sm:px-3 md:py-12 neo-grid-light">
        <div className="mx-auto grid w-full max-w-none gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="mb-4 inline-block border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-neo-indigo neo-hard-sm">
              Built for professionals
            </span>
            <h2 className="font-display mt-3 text-3xl uppercase leading-tight tracking-tight text-neo-indigo md:text-4xl">
              Stack ideas like paper on a desk
            </h2>
            <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-neo-indigo/85">
              Panels, goals, and notes sit in layers — bold outlines, no fake depth. Drag your eye across the stack; it
              feels physical, not glossy.
            </p>
          </div>
          <div className="relative mx-auto min-h-[280px] w-full max-w-md md:min-h-[320px]">
            {[
              { top: '0%', left: '8%', rot: -3, shadow: 'neo-hard' as const, body: 'Scene board' },
              { top: '12%', left: '38%', rot: 2, shadow: 'neo-hard-yellow' as const, body: 'Daily sprint' },
              { top: '28%', left: '4%', rot: 1, shadow: 'neo-hard-mint' as const, body: 'Character codex' },
              { top: '42%', left: '44%', rot: -2, shadow: 'neo-hard' as const, body: 'Revision pass' },
              { top: '58%', left: '18%', rot: 3, shadow: 'neo-hard-yellow' as const, body: 'Word target' },
            ].map((card, i) => (
              <div
                key={card.body}
                className={`absolute w-[58%] border-2 border-black bg-white p-4 ${card.shadow === 'neo-hard-yellow' ? 'neo-hard-yellow' : card.shadow === 'neo-hard-mint' ? 'neo-hard-mint' : 'neo-hard'}`}
                style={{
                  top: card.top,
                  left: card.left,
                  transform: `rotate(${card.rot}deg)`,
                  zIndex: i,
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-neo-indigo/60">Panel</p>
                <p className="mt-1 font-black text-neo-indigo">{card.body}</p>
                <div className="mt-3 h-1.5 border border-black bg-neo-cream" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three pillars — fixed index */}
      <section className="w-full border-b-2 border-black px-2 py-6 sm:px-3 neo-grid-light">
        <div className="mx-auto mb-8 max-w-none text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-neo-indigo">The promise</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-neo-indigo md:text-3xl">Discipline without the dull</h2>
        </div>
        <div className="mx-auto grid w-full max-w-none gap-4 md:grid-cols-3">
          {[
            {
              icon: Brain,
              title: 'Every writing style',
              copy: 'Plotters, pantsers, hybrids — flexible workflows, not rigid templates.',
            },
            {
              icon: BadgeCheck,
              title: 'Measurable sessions',
              copy: 'Goals and focus blocks that respect your calendar and your brain.',
            },
            {
              icon: ShieldCheck,
              title: 'Editorial clarity',
              copy: 'Review passes and notes that stay tied to scenes and beats.',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`border-2 border-black p-5 shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
              >
                <Icon className="mb-3 h-6 w-6 text-neo-indigo" />
                <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-neo-indigo">{item.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-neo-indigo/80">{item.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Marquee-style genre tags */}
      <section className="w-full overflow-hidden border-b-2 border-black bg-neo-mint/30 py-4 neo-grid-light">
        <div className="mx-auto flex max-w-none flex-wrap justify-center gap-2 px-4">
          {GENRE_TAGS.map(tag => (
            <span
              key={tag}
              className="border-2 border-black bg-white px-3 py-1.5 text-sm font-black uppercase tracking-wide text-neo-indigo shadow-none"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* Core features grid */}
      <section id="features" className="w-full px-2 py-6 sm:px-3 md:py-10 neo-grid-light scroll-mt-24">
        <div className="mx-auto w-full max-w-none">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-neo-indigo">Core features</p>
            <h2 className="text-3xl font-black uppercase tracking-tight text-neo-indigo md:text-4xl">Serious tools, loud UI</h2>
            <p className="mx-auto mt-3 max-w-2xl font-medium text-neo-indigo/75">
              Everything you need to go from spark to manuscript — boxed, labeled, and in motion.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  className={`border-2 border-black p-5 shadow-none ${PASTEL_CARD[index % PASTEL_CARD.length]}`}
                >
                  <Icon className="mb-3 h-6 w-6 text-neo-indigo" />
                  <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-neo-indigo">{feature.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-neo-indigo/80">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Template strips */}
      <section className="w-full border-y-2 border-black bg-white py-4 neo-grid-light">
        <div className="mx-auto max-w-none px-2 sm:px-3">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neo-indigo">Start from a spine</p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-neo-indigo md:text-3xl">Popular frameworks</h2>
            </div>
            <Button variant="outline" className="w-fit bg-neo-sunshine text-black" asChild>
              <Link to="/signup">
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
            {TEMPLATE_STRIPS.map(t => (
              <div
                key={t.name}
                className={`min-w-[200px] shrink-0 border-2 border-black p-4 shadow-none ${t.color}`}
              >
                <p className="text-[10px] font-black uppercase text-neo-indigo/70">{t.tag}</p>
                <p className="mt-1 font-black text-neo-indigo">{t.name}</p>
                <p className="mt-2 text-xs font-semibold text-neo-indigo/75">Use in one click after signup.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — indigo + grid */}
      <section id="workflow" className="w-full border-b-2 border-black px-2 py-6 text-white sm:px-3 md:py-10 neo-grid-dark scroll-mt-24">
        <div className="mx-auto w-full max-w-none">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-neo-sunshine">How it works</p>
              <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">One pipeline · four beats</h2>
            </div>
            <Button variant="outline" className="bg-neo-sunshine font-black text-black" asChild>
              <Link to="/signup">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {workflow.map((item, i) => (
              <div
                key={item.step}
                className={`border-2 border-black p-4 text-neo-indigo shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
              >
                <span className="mb-3 inline-block border-2 border-black bg-white px-2 py-0.5 text-xs font-mono font-bold">
                  {item.step}
                </span>
                <h3 className="mb-2 text-lg font-black uppercase tracking-tight">{item.title}</h3>
                <p className="text-sm font-medium text-neo-indigo/85">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento */}
      <section className="w-full border-b-2 border-black px-2 py-6 sm:px-3 neo-grid-light">
        <div className="mx-auto max-w-none">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-neo-indigo">Inside the workspace</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-neo-indigo md:text-3xl">Modular panels</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {BENTO.map(b => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className={`border-2 border-black p-5 shadow-none ${b.bg} ${b.span}`}
                >
                  <Icon className="mb-3 h-6 w-6 text-neo-indigo" />
                  <h3 className="text-lg font-black uppercase tracking-tight text-neo-indigo">{b.title}</h3>
                  <p className="mt-2 text-sm font-medium text-neo-indigo/80">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full border-b-2 border-black px-2 py-6 sm:px-3 neo-grid-light">
        <div className="mx-auto max-w-none">
          <div className="mb-8 flex items-center gap-2">
            <Star className="h-6 w-6 text-neo-indigo" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-neo-indigo md:text-3xl">Writers talk</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`border-2 border-black p-5 shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
              >
                <Quote className="mb-3 h-5 w-5 text-neo-indigo/50" />
                <p className="text-sm font-medium leading-relaxed text-neo-indigo/90">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-xs font-black uppercase text-neo-indigo">{t.name}</p>
                <p className="text-[11px] font-semibold text-neo-indigo/65">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rhythm + checklist */}
      <section className="w-full px-2 py-6 sm:px-3 neo-grid-light">
        <div className="mx-auto grid w-full max-w-none gap-10 md:grid-cols-2 md:items-start">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-neo-indigo">Built for your rhythm</p>
            <h2 className="mb-4 text-3xl font-black uppercase tracking-tight text-neo-indigo md:text-4xl">
              Plan loud. Write quiet.
            </h2>
            <p className="mb-6 font-medium text-neo-indigo/80">
              The grid stays visible so the interface never pretends to be invisible — just focused.
            </p>
            <ul className="space-y-3 text-sm font-medium text-neo-indigo/85">
              <li className="flex items-start gap-2">
                <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-neo-sunshine" />
                Goals for scenes, chapters, and daily counts.
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-neo-sunshine" />
                Frameworks you can see and snap to.
              </li>
              <li className="flex items-start gap-2">
                <PenTool className="mt-0.5 h-4 w-4 shrink-0 text-neo-sunshine" />
                Revision loops with continuity in view.
              </li>
            </ul>
          </div>
          <div className="border-2 border-black bg-neo-lavender p-6 shadow-none">
            <p className="mb-4 text-sm font-black uppercase tracking-wide text-neo-indigo">You get</p>
            <div className="space-y-3 text-sm">
              {[
                'Intuitive story structures',
                'Gamified momentum loops',
                'Habit analytics',
                'Focus mode & goals',
                'Editorial depth in one shell',
              ].map((item) => (
                <div key={item} className="border-2 border-black bg-white px-3 py-2 font-medium text-neo-indigo shadow-none">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full border-t-2 border-black bg-white/80 px-2 py-6 sm:px-3 neo-grid-light">
        <div className="mx-auto max-w-none">
          <div className="mb-8 flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-neo-indigo" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-neo-indigo md:text-3xl">Quick answers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FAQ_ITEMS.map((f, i) => (
              <div key={f.q} className={`border-2 border-black p-5 shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}>
                <p className="font-black uppercase text-neo-indigo">{f.q}</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-neo-indigo/85">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="pricing" className="w-full border-t-2 border-black px-2 py-6 sm:px-3 neo-grid-light scroll-mt-24">
        <div className="w-full max-w-none border-2 border-black bg-neo-zineMint px-3 py-6 text-center neo-hard md:px-6 md:rotate-[-0.5deg]">
          <h2 className="font-display mb-4 text-3xl uppercase tracking-tight text-neo-indigo md:text-4xl">Build your next novel in OdinPad</h2>
          <p className="mx-auto mb-8 max-w-2xl font-medium text-neo-indigo/80">
            Structure, momentum, and editorial depth — boxed, labeled, and impossible to ignore.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="gap-2 bg-neo-sunshine text-black" asChild>
              <Link to="/signup">
                Get Started <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="bg-white text-neo-indigo" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="w-full border-t-2 border-black bg-neo-indigo px-2 py-6 sm:px-3 neo-grid-dark">
        <div className="mx-auto grid max-w-none gap-10 text-white md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-neo-sunshine neo-hard-sm">
                <Feather className="h-5 w-5 text-black" />
              </span>
              <span className="text-lg font-black uppercase tracking-tight">OdinPad</span>
            </div>
            <p className="mt-4 text-sm font-medium text-white/75">
              Fiction writing workspace — structured, loud, and honest about the work.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-neo-sunshine">Product</p>
            <ul className="space-y-2 text-sm font-semibold text-white/85">
              <li>
                <Link to="/signup" className="hover:underline">
                  Get started
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:underline">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-neo-sunshine">Workspace</p>
            <ul className="space-y-2 text-sm font-semibold text-white/85">
              <li>Ideas & brainstorm</li>
              <li>Plan & write</li>
              <li>Review & export</li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-neo-sunshine">Legal</p>
            <ul className="space-y-2 text-sm font-semibold text-white/85">
              <li>Privacy & terms (placeholder)</li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-none border-t border-white/20 pt-8 text-center text-xs font-bold uppercase tracking-widest text-white/70">
          © {new Date().getFullYear()} OdinPad · Built for serious fiction workflows.
        </p>
      </footer>
    </PageShell>
  );
}
