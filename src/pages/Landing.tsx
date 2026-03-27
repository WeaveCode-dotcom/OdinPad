import { motion, useReducedMotion } from "framer-motion";
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
  Monitor,
  PenTool,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageShell } from "@/components/motion/PageShell";
import { Button } from "@/components/ui/button";
const featureCards = [
  {
    icon: Layers,
    title: "Intuitive Story Structures",
    desc: "Three-Act, Hero's Journey, Save the Cat, Kishotenketsu — pick a spine and adapt it to your voice.",
  },
  {
    icon: Sparkles,
    title: "Gamified Progress",
    desc: "Streaks, milestones, and visible momentum so consistency feels rewarding, not punishing.",
  },
  {
    icon: ChartColumn,
    title: "Habit Analytics",
    desc: "Cadence, output trends, and revision velocity — see how you actually write, not how you wish you did.",
  },
  {
    icon: Goal,
    title: "Goals That Scale",
    desc: "Scene goals, chapter targets, and manuscript totals with progress you can trust.",
  },
  {
    icon: Timer,
    title: "Focus Mode",
    desc: "Strip the chrome, keep the manuscript — deep work without the noise.",
  },
  {
    icon: WandSparkles,
    title: "Editorial Depth",
    desc: "Review and refine with annotations, notes, and continuity in one place.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Capture",
    body: "Ideas and brainstorm boards before the inner critic wakes up.",
  },
  {
    step: "02",
    title: "Structure",
    body: "Acts, chapters, beats — flexible scaffolding for your genre.",
  },
  {
    step: "03",
    title: "Draft",
    body: "Scene-by-scene prose with word counts and a calm editor.",
  },
  {
    step: "04",
    title: "Review",
    body: "Notes, passes, and polish without losing the thread.",
  },
];

const PASTEL_CARD = ["bg-teal-50", "bg-emerald-50", "bg-amber-50", "bg-sky-50"] as const;

const TEMPLATE_STRIPS = [
  { name: "Three-Act", tag: "Classic", color: "bg-teal-50" },
  { name: "Save the Cat", tag: "Screenplay", color: "bg-amber-50" },
  { name: "Hero’s Journey", tag: "Epic", color: "bg-sky-50" },
  { name: "Romance Beat Sheet", tag: "Genre", color: "bg-emerald-50" },
  { name: "Mystery Outline", tag: "Puzzle", color: "bg-teal-50" },
  { name: "Kishōtenketsu", tag: "Structure", color: "bg-amber-50" },
];

const GENRE_TAGS = [
  "Fantasy",
  "Romance",
  "Thriller",
  "Literary",
  "Sci-Fi",
  "Horror",
  "YA",
  "Mystery",
  "Historical",
  "Memoir",
];

const TESTIMONIALS = [
  {
    quote:
      "Finally a planner that doesn’t feel like a spreadsheet. The boxes and progress bars make me want to open the app.",
    name: "Alex M.",
    role: "Debut fantasy",
  },
  {
    quote: "I switched from scattered docs. One manuscript, one workspace — clean layout, less noise.",
    name: "Jordan K.",
    role: "Romance + thriller",
  },
  {
    quote: "Streaks and daily goals turned “someday” into 4 finished drafts.",
    name: "Sam R.",
    role: "Short fiction",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is OdinPad only for “plotters”?",
    a: "No. You can plan deeply or draft first — ideas, brainstorm, plan, write, and review in one shell.",
  },
  {
    q: "Can I export my work?",
    a: "Yes. Back up projects as JSON from the dashboard and keep your manuscript portable.",
  },
  {
    q: "Does it work offline-first?",
    a: "Your library syncs when signed in; local drafts keep you moving when the connection drops.",
  },
];

/** Landing neobrutalist blocks — copy distilled from OdinPad Documentation (source doc, Idea Web, workspace). */
const NEO_AUDIENCE_ROWS = [
  { label: "Series & worldbuilders" },
  { label: "Visual planners & outliners" },
  { label: "Deep-focus drafters" },
  { label: "Habit & streak builders" },
  { label: "Editorial, assistant-first AI users" },
] as const;

/** Section: alternating case studies (image 2). */
const CASE_STUDIES = [
  {
    tags: [
      { label: "Idea Web", className: "bg-teal-200" },
      { label: "Capture", className: "bg-pink-200" },
    ],
    title: "From spark to structure without losing a fragment",
    body: "Idea Web is built to beat blank-page syndrome: capture first, organize second, structure when you’re ready. Seeds link forward to Story Canvas and Story Wiki so nothing lives in a dead-end notes app.",
    cta: "Explore Idea Web",
    href: "#features",
    mockVariant: "browser" as const,
  },
  {
    tags: [
      { label: "Habits", className: "bg-amber-300" },
      { label: "Gamification", className: "bg-pink-200" },
    ],
    title: "Momentum you can see: streaks, milestones, and honest analytics",
    body: "The gamification layer ties into Focus Mode and goals—badges for streaks, ranks from Scribe to Eternal Author, weekly reports, and optional map-style “novel as a journey.” Hide it all if you want a quiet desk.",
    cta: "See how habits work",
    href: "#workflow",
    mockVariant: "phone" as const,
  },
] as const;

/** Section: three service cards (image 3). */
const SERVICE_CARDS = [
  {
    iconBg: "bg-teal-500",
    icon: <Monitor className="h-6 w-6 text-black" strokeWidth={2.5} />,
    title: "Browser workspace & manuscript flow",
    body: "A continuous, Google-Docs-style editor with Markdown and rich text, Story Navigator hierarchy, split view with research, and typewriter mode—everything in one cozy-yet-minimalist shell.",
    cta: "Get started",
    href: "/signup",
  },
  {
    iconBg: "bg-teal-400",
    icon: <Layers className="h-6 w-6 text-black" strokeWidth={2.5} />,
    title: "Templates, Canvas & outline sync",
    body: "Story Canvas, timelines, and beat templates from Save the Cat to Hero’s Journey—drag-and-drop reorganization with real-time bidirectional outline sync so structure and prose never drift apart.",
    cta: "Learn more",
    href: "#features",
  },
  {
    iconBg: "bg-amber-300",
    icon: <Library className="h-6 w-6 text-black" strokeWidth={2.5} />,
    title: "Story Wiki & export-ready manuscript",
    body: "Universe-scale wiki pages, relationship maps, spoiler layers, and Manuscript Forge exports—EPUB, PDF, Word, Markdown—with granular control so your final files match how you work.",
    cta: "Learn more",
    href: "#pricing",
  },
] as const;

const NEO_FEATURE_QUADS = [
  {
    title: "Story Wiki",
    body: "Characters, lore, relationships, and spoiler-aware notes—searchable and wired to scenes so continuity survives rewrites.",
    rot: -1.8,
    shadow: "#e11d74",
  },
  {
    title: "Canvas & beats",
    body: "Story Canvas, timelines, and outline sync—drag structure before prose, with templates from Save the Cat to Hero’s Journey.",
    rot: 1.6,
    shadow: "#f59e0b",
  },
  {
    title: "Manuscript & focus",
    body: "Continuous drafting, typewriter mode, split view with research, and Focus Mode with streaks and session reports.",
    rot: 1.2,
    shadow: "#0f766e",
  },
  {
    title: "Gamification",
    body: "Milestones, badges, ranks, and optional map-style journeys—rewards for showing up; hide it all if you want a quiet desk.",
    rot: -1.4,
    shadow: "#84cc16",
  },
] as const;

const BENTO = [
  {
    title: "Story Wiki",
    desc: "Characters, locations, lore — linked to scenes.",
    icon: Library,
    span: "md:col-span-2",
    bg: "bg-teal-50",
  },
  {
    title: "Scene board",
    desc: "Drag beats, reorder chapters, see the spine.",
    icon: Layers,
    span: "",
    bg: "bg-emerald-50",
  },
  {
    title: "Focus timer",
    desc: "Pomodoro-ready sessions with word deltas.",
    icon: Zap,
    span: "",
    bg: "bg-amber-50",
  },
  {
    title: "Review mode",
    desc: "Annotations and passes without breaking flow.",
    icon: FileText,
    span: "md:col-span-2",
    bg: "bg-sky-50",
  },
];

export default function Landing() {
  const reduceMotion = useReducedMotion();
  return (
    <PageShell className="page-viewport w-full landing-grid-paper text-foreground">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border-2 focus:border-black focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-black focus:shadow-md focus:outline-none focus:ring-2 focus:ring-black"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 w-full border-b-2 border-black bg-zinc-950 px-2 py-3 text-zinc-100 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] sm:px-4">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5">
              <BookOpen className="h-5 w-5 stroke-[2] text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">OdinPad</span>
          </Link>
          <nav className="order-3 flex w-full items-center justify-center gap-6 border-t border-white/10 pt-3 text-sm font-medium text-zinc-400 sm:order-none sm:w-auto sm:border-0 sm:pt-0 md:gap-8">
            <a href="#features" className="transition-colors hover:text-white hover:underline">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-white hover:underline">
              Pricing
            </a>
            <Link to="/login" className="transition-colors hover:text-white hover:underline">
              Sign In
            </Link>
          </nav>
          <Button
            size="sm"
            className="shrink-0 border-0 bg-white font-semibold text-zinc-950 hover:bg-zinc-100"
            asChild
          >
            <Link to="/signup">Start writing</Link>
          </Button>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1} className="outline-none">
        {/* Hero — grid paper visible around the white card (card is large but not full-bleed) */}
        <section className="relative w-full overflow-hidden border-b border-border px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-7xl rounded-3xl border-2 border-black/12 bg-white p-8 shadow-[8px_8px_0_0_rgb(0_0_0/0.07)] sm:p-10 md:p-12 lg:p-14 xl:min-h-[min(520px,70vh)]">
            <div className="grid h-full w-full gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14 xl:gap-16">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={reduceMotion ? false : { opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 28 }}
              >
                <p className="mb-4 inline-block rounded-full border border-border bg-black px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  Professional writing platform
                </p>
                <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl md:text-[2.75rem] lg:text-[3.5rem] xl:text-[3.75rem]">
                  Crafting stories that{" "}
                  <span
                    className="relative inline-block rounded-md border border-border bg-emerald-100 px-2 py-1 shadow-sm"
                    style={{ transform: "rotate(-2deg)" }}
                  >
                    matter
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-muted-foreground md:text-lg lg:text-xl">
                  Plan with structure, draft in a calm editor, and track progress in one workspace for the whole novel
                  lifecycle.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button size="lg" className="h-12 gap-2 px-6" asChild>
                    <Link to="/signup">
                      Begin your masterpiece <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-6" asChild>
                    <a href="#workflow">View demo</a>
                  </Button>
                </div>
              </motion.div>

              {/* Editor window illustration — tilted, typewriter body */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 6 }}
                animate={reduceMotion ? false : { opacity: 1, y: 0, rotate: 2 }}
                transition={
                  reduceMotion ? { duration: 0 } : { delay: 0.06, type: "spring", stiffness: 220, damping: 24 }
                }
                className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end"
              >
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2.5">
                    <span className="font-mono text-[11px] font-medium tracking-tight text-foreground md:text-xs">
                      New Project.docx
                    </span>
                    <div className="flex shrink-0 gap-1.5" aria-hidden>
                      <span className="h-2.5 w-2.5 rounded-full border border-black/80 bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full border border-black/80 bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full border border-black/80 bg-[#28c840]" />
                    </div>
                  </div>
                  <div className="border-b border-border bg-card p-4">
                    <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-foreground md:text-xs">
                      <p className="mb-2 opacity-80">Chapter 1 — Cold open</p>
                      <p>
                        The door stuck, then gave. Rain stitched the cobbles; she counted three breaths before stepping
                        into the dark.
                      </p>
                      <p className="mt-2 opacity-70">…</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Alternating case studies (ref image 2) */}
        <section className="w-full border-b-2 border-black px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-16 md:gap-24">
            {CASE_STUDIES.map((study, index) => (
              <div key={study.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
                <div className={index % 2 === 1 ? "md:order-2" : ""}>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {study.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`rounded-full border-2 border-black px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_0_#000] ${tag.className}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-black leading-tight tracking-tight text-black md:text-3xl">
                    {study.title}
                  </h3>
                  <p className="mt-4 text-base font-medium leading-relaxed text-neutral-700">{study.body}</p>
                  <Link
                    to={study.href}
                    className="mt-6 inline-flex items-center gap-1 text-sm font-black uppercase tracking-wide text-black underline decoration-2 underline-offset-4 hover:decoration-black"
                  >
                    {study.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div
                  className={`relative mx-auto w-full max-w-lg border-[3px] border-black bg-white p-3 shadow-[8px_8px_0_0_#000] ${index % 2 === 1 ? "md:order-1" : ""}`}
                >
                  {study.mockVariant === "browser" ? (
                    <>
                      <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                        <div className="flex gap-1.5" aria-hidden>
                          <span className="h-2.5 w-2.5 rounded-full border border-black bg-[#ff5f57]" />
                          <span className="h-2.5 w-2.5 rounded-full border border-black bg-[#febc2e]" />
                          <span className="h-2.5 w-2.5 rounded-full border border-black bg-[#28c840]" />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-neutral-600">idea-web — OdinPad</span>
                      </div>
                      <div className="space-y-3 pt-4">
                        <div className="h-24 rounded border-2 border-black bg-teal-100 p-3">
                          <p className="text-[10px] font-black uppercase text-neutral-600">Quick capture</p>
                          <p className="mt-1 text-sm font-bold text-black">“What if the crown was already broken?”</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="h-16 rounded border-2 border-black bg-pink-200" />
                          <div className="h-16 rounded border-2 border-black bg-amber-200" />
                          <div className="h-16 rounded border-2 border-black bg-teal-200" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mx-auto max-w-[220px]">
                      <div className="rounded-[2rem] border-[3px] border-black bg-neutral-900 p-2 shadow-[4px_4px_0_0_#a855f7]">
                        <div className="overflow-hidden rounded-[1.5rem] bg-amber-100 p-4 text-center">
                          <p className="text-[10px] font-black uppercase text-neutral-600">Streak unlocked</p>
                          <p className="mt-3 text-2xl font-black text-black">14 days</p>
                          <p className="mt-2 text-xs font-bold text-neutral-700">Deep Writing Hour complete</p>
                          <div className="mt-4 rounded-lg border-2 border-black bg-white p-3">
                            <p className="text-[10px] font-black uppercase text-teal-800">Next badge</p>
                            <p className="mt-1 text-sm font-black">Focus Master</p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="pointer-events-none absolute -right-4 bottom-8 h-12 w-12 rounded-lg border-2 border-black bg-teal-400 shadow-[3px_3px_0_0_#000]"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute -left-2 top-6 h-10 w-10 rounded-lg border-2 border-black bg-amber-300 shadow-[3px_3px_0_0_#000]"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What OdinPad can do for you — three cards (ref image 3) */}
        <section id="odinpad-services" className="w-full border-b-2 border-black px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-black md:text-4xl">
              What OdinPad can do for you
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {SERVICE_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col rounded-xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
                >
                  <div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000] ${card.iconBg}`}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-black leading-snug text-black">{card.title}</h3>
                  <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-neutral-700">{card.body}</p>
                  <Link
                    to={card.href}
                    className="mt-6 inline-flex items-center gap-1 text-sm font-black text-black hover:underline"
                  >
                    {card.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story + dashboard preview */}
        <section className="w-full border-b border-border px-2 py-6 sm:px-3 md:py-10 bg-background">
          <div className="mx-auto grid w-full max-w-none gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-foreground">
                Why writers stay
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                Everything in one workspace
              </h2>
              <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-muted-foreground md:text-lg">
                No more tab soup. Ideas, structure, drafting, and revision live together in one place — clear layout,
                calm writing surface.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {GENRE_TAGS.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground shadow-sm"
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
              className="rounded-xl border border-border bg-card p-5 shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Dashboard preview
                </p>
                <span className="rounded-md border border-border bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-emerald-50/80 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Daily goal</p>
                  <p className="text-sm font-bold text-foreground">1,200 / 2,000 words</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full border border-border bg-muted">
                    <div className="h-full w-[60%] rounded-full bg-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-amber-50/80 p-3">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Habit</p>
                    <p className="text-lg font-bold text-foreground">87</p>
                  </div>
                  <div className="rounded-lg border border-border bg-sky-50/80 p-3">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Streak</p>
                    <p className="text-lg font-bold text-foreground">14 days</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-teal-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Next target</p>
                  <p className="text-sm font-semibold text-foreground">
                    Finish Chapter 8 beat before tonight&apos;s sprint.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Built for serious writers — two-column neobrutalist */}
        <section className="w-full border-b-2 border-black px-4 py-12 sm:px-6 md:py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-2 md:items-start md:gap-14">
            <div>
              <h2 className="text-3xl font-black uppercase leading-tight tracking-tight text-black md:text-4xl">
                Built for writers who finish
              </h2>
              <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-neutral-700">
                This isn&apos;t another app stuffed with features you&apos;ll never open. OdinPad unifies Idea Web,
                Canvas, Manuscript, and Story Wiki so plotters and pantsers alike can move from seed idea to
                export—without losing continuity or momentum.
              </p>
              <ul className="mt-8 flex flex-col gap-3">
                {NEO_AUDIENCE_ROWS.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-2 border-2 border-black bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000] sm:text-sm"
                  >
                    <span className="select-none text-black" aria-hidden>
                      ♦
                    </span>
                    {row.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {NEO_FEATURE_QUADS.map((card) => (
                <div
                  key={card.title}
                  className="border-2 border-black bg-white p-4 sm:p-5"
                  style={{
                    transform: `rotate(${card.rot}deg)`,
                    boxShadow: `6px 6px 0 0 ${card.shadow}`,
                  }}
                >
                  <h3 className="text-sm font-black uppercase tracking-tight text-black sm:text-base">{card.title}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-600 sm:text-sm">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Three pillars — fixed index */}
        <section className="w-full border-b border-border px-2 py-6 sm:px-3 bg-background">
          <div className="mx-auto mb-8 max-w-none text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-foreground">The promise</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Discipline without the dull
            </h2>
          </div>
          <div className="mx-auto grid w-full max-w-none gap-4 md:grid-cols-3">
            {[
              {
                icon: Brain,
                title: "Every writing style",
                copy: "Plotters, pantsers, hybrids — flexible workflows, not rigid templates.",
              },
              {
                icon: BadgeCheck,
                title: "Measurable sessions",
                copy: "Goals and focus blocks that respect your calendar and your brain.",
              },
              {
                icon: ShieldCheck,
                title: "Editorial clarity",
                copy: "Review passes and notes that stay tied to scenes and beats.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`border border-border p-5 shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
                >
                  <Icon className="mb-3 h-6 w-6 text-foreground" />
                  <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-foreground">{item.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Marquee-style genre tags */}
        <section className="w-full overflow-hidden border-b border-border bg-emerald-50/80 py-4 bg-background">
          <div className="mx-auto flex max-w-none flex-wrap justify-center gap-2 px-4">
            {GENRE_TAGS.map((tag) => (
              <span
                key={tag}
                className="border border-border bg-white px-3 py-1.5 text-sm font-black uppercase tracking-wide text-foreground shadow-none"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Core features grid */}
        <section id="features" className="w-full px-2 py-6 sm:px-3 md:py-10 bg-background scroll-mt-24">
          <div className="mx-auto w-full max-w-none">
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-foreground">Core features</p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Serious tools, focused UI
              </h2>
              <p className="mx-auto mt-3 max-w-2xl font-medium text-muted-foreground">
                Everything you need to go from spark to manuscript — structured, organized, and in motion.
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
                    className={`border border-border p-5 shadow-none ${PASTEL_CARD[index % PASTEL_CARD.length]}`}
                  >
                    <Icon className="mb-3 h-6 w-6 text-foreground" />
                    <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Template strips */}
        <section className="w-full border-y border-border bg-white py-4 bg-background">
          <div className="mx-auto max-w-none px-2 sm:px-3">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Start from a spine</p>
                <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
                  Popular frameworks
                </h2>
              </div>
              <Button variant="outline" className="w-fit" asChild>
                <Link to="/signup">
                  Browse all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
              {TEMPLATE_STRIPS.map((t) => (
                <div key={t.name} className={`min-w-[200px] shrink-0 border border-border p-4 shadow-none ${t.color}`}>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{t.tag}</p>
                  <p className="mt-1 font-black text-foreground">{t.name}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Use in one click after signup.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — grid */}
        <section
          id="workflow"
          className="w-full border-b border-border bg-slate-950 px-2 py-6 text-white sm:px-3 md:py-10 scroll-mt-24"
        >
          <div className="mx-auto w-full max-w-none">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">How it works</p>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">One pipeline · four beats</h2>
              </div>
              <Button variant="secondary" className="font-semibold" asChild>
                <Link to="/signup">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {workflow.map((item, i) => (
                <div
                  key={item.step}
                  className={`border border-border p-4 text-foreground shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
                >
                  <span className="mb-3 inline-block border border-border bg-white px-2 py-0.5 text-xs font-mono font-bold">
                    {item.step}
                  </span>
                  <h3 className="mb-2 text-lg font-black uppercase tracking-tight">{item.title}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento */}
        <section className="w-full border-b border-border px-2 py-6 sm:px-3 bg-background">
          <div className="mx-auto max-w-none">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-foreground">Inside the workspace</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Modular panels
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {BENTO.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className={`border border-border p-5 shadow-none ${b.bg} ${b.span}`}>
                    <Icon className="mb-3 h-6 w-6 text-foreground" />
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">{b.title}</h3>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full border-b border-border px-2 py-6 sm:px-3 bg-background">
          <div className="mx-auto max-w-none">
            <div className="mb-8 flex items-center gap-2">
              <Star className="h-6 w-6 text-foreground" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">Writers talk</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  className={`border border-border p-5 shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
                >
                  <Quote className="mb-3 h-5 w-5 text-muted-foreground/70" />
                  <p className="text-sm font-medium leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-4 text-xs font-black uppercase text-foreground">{t.name}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">{t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rhythm + checklist */}
        <section className="w-full px-2 py-6 sm:px-3 bg-background">
          <div className="mx-auto grid w-full max-w-none gap-10 md:grid-cols-2 md:items-start">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-foreground">
                Built for your rhythm
              </p>
              <h2 className="mb-4 text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
                Plan loud. Write quiet.
              </h2>
              <p className="mb-6 font-medium text-muted-foreground">
                The interface stays out of your way when you write — and stays clear when you plan.
              </p>
              <ul className="space-y-3 text-sm font-medium text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Goals for scenes, chapters, and daily counts.
                </li>
                <li className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Frameworks you can see and snap to.
                </li>
                <li className="flex items-start gap-2">
                  <PenTool className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Revision loops with continuity in view.
                </li>
              </ul>
            </div>
            <div className="border border-border bg-teal-50 p-6 shadow-none">
              <p className="mb-4 text-sm font-black uppercase tracking-wide text-foreground">You get</p>
              <div className="space-y-3 text-sm">
                {[
                  "Intuitive story structures",
                  "Gamified momentum loops",
                  "Habit analytics",
                  "Focus mode & goals",
                  "Editorial depth in one shell",
                ].map((item) => (
                  <div
                    key={item}
                    className="border border-border bg-white px-3 py-2 font-medium text-foreground shadow-none"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="w-full border-t border-border bg-white/80 px-2 py-6 sm:px-3 bg-background">
          <div className="mx-auto max-w-none">
            <div className="mb-8 flex items-center gap-2">
              <HelpCircle className="h-7 w-7 text-foreground" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
                Quick answers
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FAQ_ITEMS.map((f, i) => (
                <div
                  key={f.q}
                  className={`border border-border p-5 shadow-none ${PASTEL_CARD[i % PASTEL_CARD.length]}`}
                >
                  <p className="font-black uppercase text-foreground">{f.q}</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="pricing" className="w-full border-t border-border px-2 py-6 sm:px-3 bg-background scroll-mt-24">
          <div className="w-full max-w-none rounded-2xl border border-border bg-muted/50 px-3 py-8 text-center md:px-6">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Build your next novel in OdinPad
            </h2>
            <p className="mx-auto mb-8 max-w-2xl font-medium text-muted-foreground">
              Structure, momentum, and editorial depth — organized, visible, and easy to return to.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/signup">
                  Get Started <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-white text-foreground" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        <footer className="w-full border-t border-border bg-slate-950 px-2 py-6 sm:px-3">
          <div className="mx-auto grid max-w-none gap-10 text-white md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                  <Feather className="h-5 w-5 text-white" />
                </span>
                <span className="text-lg font-semibold tracking-tight">OdinPad</span>
              </div>
              <p className="mt-4 text-sm font-medium text-white/75">
                Fiction writing workspace — structured, calm, and honest about the work.
              </p>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-300/90">Product</p>
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-300/90">Workspace</p>
              <ul className="space-y-2 text-sm font-semibold text-white/85">
                <li>Ideas & brainstorm</li>
                <li>Plan & write</li>
                <li>Review & export</li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-300/90">Legal</p>
              <ul className="space-y-2 text-sm font-semibold text-white/85">
                <li>Privacy & terms (placeholder)</li>
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-none border-t border-white/20 pt-8 text-center text-xs font-bold uppercase tracking-widest text-white/70">
            © {new Date().getFullYear()} OdinPad · Built for serious fiction workflows.
          </p>
        </footer>
      </main>
    </PageShell>
  );
}
