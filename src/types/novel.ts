export interface Novel {
  id: string;
  title: string;
  author: string;
  genre?: string;
  premise?: string;
  targetWordCount?: number;
  status?: 'brainstorming' | 'outlining' | 'drafting' | 'editing' | 'complete';
  series?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  wordCount: number;
  frameworkId: string;
  customBeats?: CustomBeat[];
  acts: Act[];
  codexEntries: CodexEntry[];
  ideas: Idea[];
  brainstormNotes: BrainstormNote[];
  reviewAnnotations?: ReviewAnnotation[];
}

export interface Act {
  id: string;
  title: string;
  order: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  title: string;
  summary: string;
  content: string;
  order: number;
  status: 'draft' | 'in-progress' | 'complete' | 'revision';
  pov?: string;
  location?: string;
  characters: string[];
  wordCount: number;
  labels: string[];
  beatId?: string; // linked framework beat
  codexRefs?: string[];
}

export interface CodexEntry {
  id: string;
  type: 'character' | 'location' | 'lore' | 'item' | 'faction';
  name: string;
  description: string;
  notes: string;
  tags: string[];
}

export interface CustomBeat {
  id: string;
  title: string;
  description: string;
  percentage: number;
  tags: string[];
  optional?: boolean;
  order: number;
}

export interface Idea {
  id: string;
  content: string;
  category: 'plot' | 'character' | 'world' | 'theme' | 'misc';
  pinned: boolean;
  createdAt: string;
}

export interface BrainstormNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

export interface ReviewAnnotation {
  id: string;
  sceneId: string;
  type: 'note' | 'issue' | 'praise';
  content: string;
  resolved: boolean;
  createdAt: string;
}

export type WorkspaceMode = 'ideas' | 'brainstorm' | 'plan' | 'write' | 'review';
