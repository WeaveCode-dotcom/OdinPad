-- Sandbox: braindump, lists, maps, conversations, prompts, expansion, gamification, daily seed

CREATE TABLE public.sandbox_braindump_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_braindump_user_idx ON public.sandbox_braindump_sessions(user_id);
CREATE INDEX sandbox_braindump_novel_idx ON public.sandbox_braindump_sessions(novel_id);
CREATE INDEX sandbox_braindump_user_updated_idx ON public.sandbox_braindump_sessions(user_id, updated_at DESC);

CREATE TABLE public.sandbox_lists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  list_type TEXT NOT NULL DEFAULT 'misc',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_lists_user_idx ON public.sandbox_lists(user_id);

CREATE TABLE public.sandbox_list_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES public.sandbox_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  rank INTEGER NOT NULL DEFAULT 0,
  favorite BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_list_items_list_idx ON public.sandbox_list_items(list_id);
CREATE INDEX sandbox_list_items_user_idx ON public.sandbox_list_items(user_id);

CREATE TABLE public.sandbox_maps (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  map_type TEXT NOT NULL DEFAULT 'mindmap',
  layout_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_maps_user_idx ON public.sandbox_maps(user_id);

CREATE TABLE public.sandbox_map_nodes (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES public.sandbox_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  node_type TEXT NOT NULL DEFAULT 'idea',
  linked_idea_id TEXT REFERENCES public.idea_web_entries(id) ON DELETE SET NULL,
  linked_codex_id TEXT,
  color TEXT,
  status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_map_nodes_map_idx ON public.sandbox_map_nodes(map_id);

CREATE TABLE public.sandbox_map_edges (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES public.sandbox_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL REFERENCES public.sandbox_map_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES public.sandbox_map_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL DEFAULT 'default',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sandbox_map_edges_no_self CHECK (source_node_id <> target_node_id)
);

CREATE INDEX sandbox_map_edges_map_idx ON public.sandbox_map_edges(map_id);

CREATE TABLE public.sandbox_conversations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  element_type TEXT NOT NULL DEFAULT 'character',
  element_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  transcript JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_conversations_user_idx ON public.sandbox_conversations(user_id);

CREATE TABLE public.sandbox_prompt_events (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  prompt_type TEXT NOT NULL DEFAULT 'expansion',
  prompt_key TEXT NOT NULL DEFAULT '',
  prompt_text TEXT NOT NULL DEFAULT '',
  user_response TEXT,
  idea_web_entry_id TEXT REFERENCES public.idea_web_entries(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_prompt_events_user_idx ON public.sandbox_prompt_events(user_id, created_at DESC);

CREATE TABLE public.sandbox_expansion_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  element_type TEXT NOT NULL DEFAULT 'character',
  source_idea_id TEXT REFERENCES public.idea_web_entries(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL DEFAULT 'character',
  expanded_content JSONB NOT NULL DEFAULT '{}',
  promoted_to JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_expansion_user_idx ON public.sandbox_expansion_sessions(user_id);

CREATE TABLE public.sandbox_gamification_events (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sandbox_gamification_user_idx ON public.sandbox_gamification_events(user_id, created_at DESC);

CREATE TABLE public.sandbox_daily_seed (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_date DATE NOT NULL,
  prompt_key TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, seed_date)
);

-- RLS
ALTER TABLE public.sandbox_braindump_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_map_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_prompt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_expansion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_gamification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_daily_seed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sandbox_braindump_sessions"
  ON public.sandbox_braindump_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_lists"
  ON public.sandbox_lists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_list_items"
  ON public.sandbox_list_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_maps"
  ON public.sandbox_maps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_map_nodes"
  ON public.sandbox_map_nodes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_map_edges"
  ON public.sandbox_map_edges FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_conversations"
  ON public.sandbox_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_prompt_events"
  ON public.sandbox_prompt_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_expansion_sessions"
  ON public.sandbox_expansion_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_gamification_events"
  ON public.sandbox_gamification_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sandbox_daily_seed"
  ON public.sandbox_daily_seed FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_sandbox_braindump_sessions_updated_at
  BEFORE UPDATE ON public.sandbox_braindump_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sandbox_lists_updated_at
  BEFORE UPDATE ON public.sandbox_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sandbox_list_items_updated_at
  BEFORE UPDATE ON public.sandbox_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sandbox_maps_updated_at
  BEFORE UPDATE ON public.sandbox_maps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sandbox_map_nodes_updated_at
  BEFORE UPDATE ON public.sandbox_map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sandbox_conversations_updated_at
  BEFORE UPDATE ON public.sandbox_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sandbox_expansion_sessions_updated_at
  BEFORE UPDATE ON public.sandbox_expansion_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
