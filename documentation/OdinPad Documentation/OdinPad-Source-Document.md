**OdinPad Source Document**

**Executive Summary & Vision**

**OdinPad is the web-first, novel-writing platform that merges the powerful structural organization of Scrivener with intelligent AI assistance inspired by tools like Novelcrafter while offering a comprehensive solution for both plotters and pantsers. It also delivers a seamless, browser-based experience.**

**OdinPad aims to accelerate and streamline the creative journey, allowing writers to effortlessly transition between ideation, drafting, and revision phases. By combining best practices from established novel-writing methodologies with cutting-edge AI, OdinPad provides a flexible yet powerful environment for bringing stories to life. Its core philosophy centers on fostering consistency, facilitating visual planning, enabling seamless drafting and revision, and offering powerful compilation capabilities, all while supporting collaborative workflows.**

**Primary pain point solved**

**Core promise: One beautiful, cozy-yet-minimalist browser workspace where your entire novel lives — from seed idea to polished manuscript — while building sustainable writing habits and helping you write _better_ books.**

**Target audience: Anyone who loves to write — every fiction writer (hobbyist to professional), plus flexible support for narrative non-fiction, screenplays, shorts, fanfic. Balanced plotter + pantser support. Solo first; collaboration later.**

**Brand personality: Creative & artsy but not over-the-top — warm minimalist + cozy writer’s-den vibe (oak desk, fountain pen, soft lamplight, highly customizable).**

**Success definition: Whatever the user defines (finished draft, daily streak, published book, improved prose, personal goal achieved).**

**AI philosophy: 0% generative text. AI is strictly assistant (editorial, codex extraction, visualizations, habit insights, consistency checks).**

**Core Philosophy**

**OdinPad accelerates the entire novel-writing workflow, from ideation to polished export, while addressing common pain points:**

- **Blank-page syndrome**
- **Consistency in characters, lore, and voice**
- **Plot holes and pacing issues**
- **Organizing research, notes, and fragments**
- **Switching between planning, drafting, and revision**
- **Final compilation without losing formatting control**

**User Personas**

- **The Organized Planner – loves Story Navigator, Story Wiki, Arc Evolutions.**
- **The Intuitive Pantser – loves Manuscript, Story Canvas, Focus Mode.**
- **The Productivity-Focused Author – lives for Gamification system + detailed habit analytics/reports.**
- **The AI-Assisted Editor – uses editorial AI only (consistency, grammar, visualizations).**
- **Everyone who loves to write – beginners get gentle onboarding + gamified guidance; pros get unlimited depth.**

**Functional Requirements**

**1.1 Core Writing & Editing Experience**

- **Editor: Continuous Google-Docs-style with optional block sections for notes/research.**
- **Formatting: Both Markdown and Rich Text (seamless toggle).**
- **Story Navigator: Hierarchical tree (folders → parts → chapters → scenes). Recommendations for “not sure”: Hybrid tree + optional Series View for multi-book projects.**
- **Focus Mode (core aim): Full-screen, hides everything. Highly customizable (themes, ambient sounds). Expanded habit-building features:**
  - **Automatic daily goals + streak protection.**
  - **Scheduled “Deep Writing Hours” that lock non-essential features.**
  - **Post-session habit reports.**
  - **Ties directly into Gamification system.**
- **Typewriter Mode: Active line centered.**
- **Moment Freezes: Recommendations (not sure):**

1. **Per-document manual + auto on 500-word milestones or chapter completion.**
2. **Branching “What-if” versions.**
3. **Side-by-side comparison.**

- **Split View: Yes (manuscript + Story Wiki, or two scenes).**
- **Metadata tagging: POV, setting, status, emotional tone, arc stage, custom tags.**
- **Comments & Annotations: Recommendations (not sure):**

1. **Inline threaded (Google Docs style).**
2. **Sidebar sticky notes linked to text.**
3. **Private “Author Margin Notes” (never export).**

- **Manuscript: Yes (continuous multi-scene view).**
- **Side-by-side Research Hub: Yes during writing.**

**1.2 Story Wiki**

- **Organization: Recommendations (not sure): Wiki-style pages + folder/tag hybrid + Universe Vault that spans projects.**
- **Automatic Mentions: Yes – auto-detect and link names as you type (AI editorial only).**
- **Relationship Maps: Yes (visual graph).**
- **Arc Evolutions: Recommendations (not sure):**
  1. **Timeline slider per entry.**
  2. **Before/After cards.**
  3. **Matrix view across multiple characters.**
  4. **Dynamic integration with manuscript (current state based on chapter position).**
- **Global Spotlight Search: Yes.**
- **Image/Mood Board Uploads: Yes.**
- **Templates: Yes (magic systems, starships, factions, etc.).**
- **Cross-series sharing: Yes.**
- **Spoiler Handling: Recommendations (not sure):**
  1. **“Hidden until Chapter X” flags.**
  2. **Separate Spoiler Vault tab.**
  3. **Toggleable visibility layers.**
- **Plot-hole/inconsistency alerts: Yes (AI editorial).**
- **Sensitive note privacy controls: Yes.**
- **Import existing sheets: Yes (JSON/CSV).**

**1.3 AI Integration (Strictly Assistant Non-Generative)**

- **Role: Editorial only (consistency checker, grammar/style, visualizations, habit insights).**
- **Must-have in MVP: Consistency Checker, Grammar & Style Suggestions, Limited Muse Forge for outline-from-text, Project-wide memory chat (remembers Story Wiki + text). among so many others**
- **User approval workflow: Required for every suggestion.**
- **Ethical guardrails & plagiarism checks: Yes.**

**1.4 Outlining & Planning Tools**

- **Story Canvas: Yes (visual cards, drag-and-drop).**
- **Timeline Views: Linear + multi-thread.**
- **Outline Sync: Real-time bidirectional.**
- **Templates: Beat Weaver (Save the Cat), Fractal Builder (Snowflake), Hero’s Journey, 3-Act, etc.**
- **Drag-and-drop reorganization: Everywhere.**
- **Notes Handling: Recommendations (not sure):**
  - **Scratchpad (global temporary).**
  - **Document-Specific Notes panel.**
  - **Linked Notes attached to text selections.**
- **Mind Map Tool: Yes.**
- **Word-count goals: Project, chapter, session.**
- **Writing Sprints & Productivity Stats: Core feature. Detailed habit tracking, streaks, weekly/monthly scheduled reports, goal-adjustment wizard, peak-hour insights.**

**1.5 Revision & Editing Tools**

- **Multi-pass workflow tools.**
- **AI-specific revision suggestions (three improvements style).**
- **Side-by-side Moment Freezes comparison.**
- **Built-in plagiarism/self-similarity checker.**
- **Grammar/style integration.**
- **Simulated reader / beta feedback tools.**
- **Auto-update references after reordering.**
- **Track-Changes export.**
- **Writing-habit analytics (deep).**
- **Comment/suggestion collaboration mode.**

**1.6 Import / Export Tools**

- **Import: All formats (Word, .scriv, PDF, TXT, Google Docs, Markdown).**
- **Manuscript Forge: Extremely granular (section-by-section control, custom styles, front/back matter).**
- **Export formats: EPUB, PDF, Word, Markdown, Clean Text, Print-ready.**
- **Story Wiki as Wiki: Yes (HTML/Markdown/PDF).**
- **Front Matter: Recommendations (not sure): Template library (title, copyright, dedication) + auto-populated from metadata.**
- **Back Matter: Yes.**
- **Styles: CSS-like custom templates.**
- **Clean Text export: Yes.**
- **Backup: Recommendations (not sure): Dropbox, Google Drive, iCloud, manual full-project ZIP.**
- **Direct KDP: Backlog.**

**1.7 Gamification system**

**To incentivize good writing practices and make consistency addictive, OdinPad includes an opt-in Gamification system layer that ties directly into all other aspects of the project**

**Core Elements:**

- **Milestones: “First 10k Words”, “Chapter 1 Complete”, “Midpoint Reached”, “First Draft Hero” (50k/80k/100k).**
- **Badges: Daily Streak (7/30/100 days), Focus Master (30+ hours in Focus Mode), Arc Weaver (5 Arc Evolutions completed), Canvas Explorer (20 Story Canvas sessions).**
- **Ranks: Scribe → Storyteller → Bard → Legend → Eternal Author (shown on dashboard).**
- **Collectables: Virtual story artifacts (enchanted quills, glowing manuscripts, ancient maps, character portraits) that unlock new themes/wallpapers.**
- **Map Journeys: Entire novel visualized as a fantasy map. Each chapter = new region. Reaching “The End” completes the continent.**
- **Treasure Hunts: Hidden challenges (e.g., “Write 500 words in one sprint → unlock bestselling-author tip”). Seasonal events (NaNoWriMo special badges).**

**Integration:**

- **Weekly scheduled reports include personalized Odyssey insights.**
- **Goal-adjustment wizard after each milestone.**
- **Private-by-default (opt-in friends circle in Phase 2).**
- **Users who love it get full RPG experience; others can hide the progress bar completely.**

**1.8 Publishing Hub**

**1.9 Analytics**

**OdinPad Workspace**

**Once a novel is created or opened, the user is sent to the OdinPad Workspace. This is the central, unified hub for active work on a project. It provides easy navigation and access to the main creative areas:**

- **Idea Web — For capturing and nurturing raw ideas.**
- **Sandbox - For developing ideas into more**
- **Canvas — For visual planning and outlining (includes Story Canvas, timelines, mind maps, etc.).**
- **Manuscript — For continuous drafting and multi-scene flow.**
- **Editor — For focused writing, editing, metadata tagging, and annotations.**
- **Story Wiki — For worldbuilding, character/lore management (integrated with Story Wiki features).**

**Dashboard**

**On login, users land on the Dashboard — a high-level overview screen that functions like a project management hub. It displays:**

- **Recent or active projects/novels (with thumbnails, last edited, word count progress).**
- **Quick actions (e.g., "Create New Novel," "Open Recent", New idea).**
- **Gamification system overview (current rank, streak status, recent badges/milestones).**
- **Habit stats summary (daily/weekly word counts, peak hours).**
- **Notifications (e.g., scheduled reports ready, new prompts).**
- **Personalized welcome/guidance for beginners.**

**This serves as the entry point for managing multiple projects before diving into a specific Workspace.**

**Shelf**

**Analytics Page**

**Practice Hub**

**Publishing Hub**

**Profile**

**Settings**

**Monetization & Business Model [Details to be fleshed out later]**

- **Model: Subscription SaaS**

**Technical Architecture & Non-Functional Requirements**

- **Stack: React (Next.js recommended) + Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).**
- **Auth: Passkeys primary (full WebAuthn implementation from earlier PRD) + email fallback.**
- **Offline Mode: Recommendations: Full PWA + PowerSync/Local-first + IndexedDB sync.**
- **Real-time saving: Every 3 seconds + optimistic updates.**
- **Performance: <1s load; virtualized rendering for 200k+ word manuscripts; lazy loading.**
- **Database strategy: PostgreSQL with ltree for hierarchy + JSONB for flexible sections + full-text search.**
- **File attachments: Supabase Storage with RLS.**
- **Security: End-to-end TLS 1.3, AES-256 at rest, RLS per-user isolation, OWASP compliance, GDPR/CCPA ready (export/delete APIs).**
- **Undo/Redo: App-level event log + in-memory stack + persisted Moment Freezes.**
- **PWA: Yes (offline-first).**
- **API: Ready for third-party (Zotero, Grammarly, publishing platforms) – future.**
- **Hosting: Multi-region cloud (recommend AWS/GCP/Azure with auto-scaling).**
- **SLAs: 99.99% uptime, <200ms auth/writing ops.**

**Dedicated Backlog Section**

**This section Logs Ideas for future additions to the project. Pst (MVP)**

- **BYOK / paid AI credits.**
- **Direct KDP one-click.**
- **Full real-time multi-user editing.**
- **Native desktop/mobile apps.**
- **Marketplace/ Community.**

 
