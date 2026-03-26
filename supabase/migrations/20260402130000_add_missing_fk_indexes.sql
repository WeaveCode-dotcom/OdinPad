-- Performance: add covering indexes for all unindexed foreign keys
-- identified by the Supabase performance advisor.

CREATE INDEX IF NOT EXISTS idx_idea_web_entries_harvest_target_novel_id
  ON public.idea_web_entries (harvest_target_novel_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_conversations_novel_id
  ON public.sandbox_conversations (novel_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_expansion_sessions_novel_id
  ON public.sandbox_expansion_sessions (novel_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_expansion_sessions_source_idea_id
  ON public.sandbox_expansion_sessions (source_idea_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_lists_novel_id
  ON public.sandbox_lists (novel_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_map_edges_source_node_id
  ON public.sandbox_map_edges (source_node_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_map_edges_target_node_id
  ON public.sandbox_map_edges (target_node_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_map_nodes_linked_idea_id
  ON public.sandbox_map_nodes (linked_idea_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_maps_novel_id
  ON public.sandbox_maps (novel_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_prompt_events_novel_id
  ON public.sandbox_prompt_events (novel_id);

CREATE INDEX IF NOT EXISTS idx_sandbox_prompt_events_idea_web_entry_id
  ON public.sandbox_prompt_events (idea_web_entry_id);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_best_seed_id
  ON public.weekly_digests (best_seed_id);
