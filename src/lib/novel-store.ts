import { Novel, CodexEntry, Act, Chapter, Scene, Idea, BrainstormNote } from '@/types/novel';
import { supabase } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';

let idCounter = 0;
const genId = () => `id_${++idCounter}_${Date.now()}`;

// ── LocalStorage persistence ──────────────────────────────────────────────────

const STORAGE_KEY = 'odinpad_novels';

export function saveNovels(novels: Novel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novels));
  } catch {
    console.warn('OdinPad: could not save to localStorage');
  }
}

export function loadNovels(): Novel[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Novel[];
  } catch {
    return null;
  }
}

type NovelInsert = TablesInsert<'novels'>;

function normalizeNovel(row: {
  id: string;
  title: string;
  author: string;
  data: Json;
  created_at: string;
  updated_at: string;
}): Novel {
  const raw = (row.data ?? {}) as Partial<Novel>;
  return {
    id: row.id,
    title: raw.title ?? row.title,
    author: raw.author ?? row.author,
    series: raw.series,
    createdAt: raw.createdAt ?? row.created_at,
    updatedAt: raw.updatedAt ?? row.updated_at,
    wordCount: raw.wordCount ?? 0,
    frameworkId: raw.frameworkId ?? 'three-act',
    customBeats: raw.customBeats ?? [],
    acts: raw.acts ?? [],
    codexEntries: raw.codexEntries ?? [],
    ideas: raw.ideas ?? [],
    brainstormNotes: raw.brainstormNotes ?? [],
  };
}

function novelToInsert(userId: string, novel: Novel): NovelInsert {
  return {
    id: novel.id,
    user_id: userId,
    title: novel.title,
    author: novel.author,
    data: novel as unknown as Json,
  };
}

export async function fetchRemoteNovels(userId: string): Promise<Novel[]> {
  const { data, error } = await supabase
    .from('novels')
    .select('id, title, author, data, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeNovel);
}

export async function syncNovelsToRemote(userId: string, novels: Novel[]): Promise<void> {
  if (novels.length === 0) return;
  const payload = novels.map(novel => novelToInsert(userId, novel));
  const { error } = await supabase.from('novels').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

/** Permanently removes a novel row for this user (RLS enforces ownership). */
export async function deleteRemoteNovel(userId: string, novelId: string): Promise<void> {
  const { error } = await supabase.from('novels').delete().eq('id', novelId).eq('user_id', userId);
  if (error) throw error;
}

/** Validates JSON backup shape before merging into the library. */
export function parseNovelImport(raw: unknown): Novel | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Partial<Novel>;
  if (typeof n.id !== 'string' || typeof n.title !== 'string' || !Array.isArray(n.acts)) return null;
  return raw as Novel;
}

// ── Factories ─────────────────────────────────────────────────────────────────

export function createNovel(title: string, author: string): Novel {
  const actId = genId();
  const chapterId = genId();
  const sceneId = genId();
  return {
    id: genId(),
    title,
    author,
    status: 'drafting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 0,
    frameworkId: 'three-act',
    acts: [
      {
        id: actId,
        title: 'Act I',
        order: 0,
        chapters: [
          {
            id: chapterId,
            title: 'Chapter 1',
            order: 0,
            scenes: [
              {
                id: sceneId,
                title: 'Opening Scene',
                summary: '',
                content: '',
                order: 0,
                status: 'draft',
                characters: [],
                wordCount: 0,
                labels: [],
              },
            ],
          },
        ],
      },
    ],
    codexEntries: [],
    ideas: [],
    brainstormNotes: [],
  };
}

export interface CreateNovelOptions {
  genre?: string;
  premise?: string;
  targetWordCount?: number;
  frameworkId?: string;
  status?: Novel['status'];
}

export function createNovelWithOptions(title: string, author: string, options: CreateNovelOptions = {}): Novel {
  const novel = createNovel(title, author);
  return {
    ...novel,
    genre: options.genre,
    premise: options.premise,
    targetWordCount: options.targetWordCount,
    frameworkId: options.frameworkId ?? novel.frameworkId,
    status: options.status ?? novel.status,
  };
}

export function createCodexEntry(type: CodexEntry['type'], name: string): CodexEntry {
  return { id: genId(), type, name, description: '', notes: '', tags: [] };
}

export function createAct(order: number): Act {
  return { id: genId(), title: `Act ${order + 1}`, order, chapters: [] };
}

export function createChapter(order: number): Chapter {
  return { id: genId(), title: `Chapter ${order + 1}`, order, scenes: [] };
}

export function createScene(order: number): Scene {
  return {
    id: genId(),
    title: `Scene ${order + 1}`,
    summary: '',
    content: '',
    order,
    status: 'draft',
    characters: [],
    wordCount: 0,
    labels: [],
  };
}

export function createIdea(category: Idea['category'] = 'misc'): Idea {
  return {
    id: genId(),
    content: '',
    category,
    pinned: false,
    createdAt: new Date().toISOString(),
  };
}

export function createBrainstormNote(title = 'New Note'): BrainstormNote {
  const colors = ['bg-primary/10', 'bg-emerald-500/10', 'bg-violet-500/10', 'bg-rose-500/10', 'bg-sky-500/10'];
  return {
    id: genId(),
    title,
    content: '',
    color: colors[Math.floor(Math.random() * colors.length)],
    createdAt: new Date().toISOString(),
  };
}

// ── Demo novel ────────────────────────────────────────────────────────────────

export function createDemoNovel(): Novel {
  const novel = createNovel('The Forgotten City', 'Anonymous');
  novel.acts[0].chapters[0].scenes[0] = {
    ...novel.acts[0].chapters[0].scenes[0],
    title: 'The Discovery',
    summary: 'Protagonist discovers an ancient map leading to a forgotten underground city.',
    content: "The map was tucked between the pages of a book that hadn't been opened in decades. Its edges were yellowed and brittle, threatening to crumble at the lightest touch. But the lines drawn upon it—those were unmistakable.\n\nElara held it closer to the lamplight, her breath catching as she traced the intricate pathways with her fingertip. A city. An entire city, buried beneath the hills she had walked over every day of her life.\n\n\"This can't be real,\" she whispered to no one. The library was empty at this hour, the only sound the distant hum of rain against the windows.",
    wordCount: 96,
    pov: 'Elara',
    location: 'The Old Library',
    characters: ['Elara'],
    status: 'in-progress',
  };

  novel.acts[0].chapters.push({
    ...createChapter(1),
    title: 'Chapter 2 - Descent',
    scenes: [
      {
        ...createScene(0),
        title: 'Preparing the Expedition',
        summary: 'Elara gathers supplies and convinces her reluctant friend Marcus to join.',
        status: 'draft',
        characters: ['Elara', 'Marcus'],
      },
    ],
  });

  novel.codexEntries = [
    {
      id: genId(),
      type: 'character',
      name: 'Elara Voss',
      description: 'A 28-year-old archaeologist and librarian. Curious, determined, sometimes reckless.',
      notes: "Motivated by her late grandmother's stories about the old world.",
      tags: ['protagonist', 'archaeologist'],
    },
    {
      id: genId(),
      type: 'character',
      name: 'Marcus Chen',
      description: "Elara's childhood friend and a structural engineer. Pragmatic and cautious, but fiercely loyal.",
      notes: 'Reluctant adventurer.',
      tags: ['supporting', 'engineer'],
    },
    {
      id: genId(),
      type: 'location',
      name: 'The Old Library',
      description: 'A centuries-old library in the university district.',
      notes: 'Where the map is discovered. Has secret basement levels.',
      tags: ['starting-point'],
    },
    {
      id: genId(),
      type: 'location',
      name: 'The Forgotten City',
      description: 'An ancient underground city beneath the Thornhill countryside.',
      notes: 'Reveal gradually. Full scope not understood until Act III.',
      tags: ['main-setting', 'mystery'],
    },
    {
      id: genId(),
      type: 'lore',
      name: 'The Builders',
      description: 'The unknown civilization that constructed the Forgotten City.',
      notes: 'Central mystery of the story.',
      tags: ['mystery', 'ancient'],
    },
  ];

  novel.ideas = [
    { id: genId(), content: 'What if the city has been inhabited all along, just hidden?', category: 'plot', pinned: true, createdAt: new Date().toISOString() },
    { id: genId(), content: "Elara's fear of underground spaces ties to childhood trauma", category: 'character', pinned: false, createdAt: new Date().toISOString() },
    { id: genId(), content: 'The Builders used bioluminescent plants for lighting', category: 'world', pinned: false, createdAt: new Date().toISOString() },
  ];

  novel.brainstormNotes = [
    { id: genId(), title: 'Themes', content: 'Memory & forgetting\nHidden histories\nThe cost of knowledge', color: 'bg-primary/10', createdAt: new Date().toISOString() },
    { id: genId(), title: 'Tone References', content: 'Indiana Jones meets The Secret History\nAtmospheric, slightly gothic', color: 'bg-violet-500/10', createdAt: new Date().toISOString() },
  ];

  return novel;
}
