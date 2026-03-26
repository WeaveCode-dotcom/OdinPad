/** Mirrors `user_preferences.ai_companion` JSONB; omitted keys default to enabled. */
export type AiCompanionSettings = {
  daily_prompt_enabled: boolean;
  auto_enrich_enabled: boolean;
  use_context_enabled: boolean;
  stretch_variants_enabled: boolean;
};

const DEFAULTS: AiCompanionSettings = {
  daily_prompt_enabled: true,
  auto_enrich_enabled: true,
  use_context_enabled: true,
  stretch_variants_enabled: true,
};

export function parseAiCompanionSettings(raw: unknown): AiCompanionSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULTS };
  }
  const o = raw as Record<string, unknown>;
  return {
    daily_prompt_enabled: o.daily_prompt_enabled !== false,
    auto_enrich_enabled: o.auto_enrich_enabled !== false,
    use_context_enabled: o.use_context_enabled !== false,
    stretch_variants_enabled: o.stretch_variants_enabled !== false,
  };
}

export function toAiCompanionPatch(partial: Partial<AiCompanionSettings>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (partial.daily_prompt_enabled !== undefined) out.daily_prompt_enabled = partial.daily_prompt_enabled;
  if (partial.auto_enrich_enabled !== undefined) out.auto_enrich_enabled = partial.auto_enrich_enabled;
  if (partial.use_context_enabled !== undefined) out.use_context_enabled = partial.use_context_enabled;
  if (partial.stretch_variants_enabled !== undefined) out.stretch_variants_enabled = partial.stretch_variants_enabled;
  return out;
}

export function mergeAiCompanion(existing: unknown, patch: Partial<AiCompanionSettings>): Record<string, boolean> {
  const cur = parseAiCompanionSettings(existing);
  return {
    daily_prompt_enabled: patch.daily_prompt_enabled ?? cur.daily_prompt_enabled,
    auto_enrich_enabled: patch.auto_enrich_enabled ?? cur.auto_enrich_enabled,
    use_context_enabled: patch.use_context_enabled ?? cur.use_context_enabled,
    stretch_variants_enabled: patch.stretch_variants_enabled ?? cur.stretch_variants_enabled,
  };
}
