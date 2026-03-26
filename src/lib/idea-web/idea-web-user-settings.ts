export type IdeaWebUserAutoRules = {
  seedToSprouting?: { enabled: boolean; minBodyWords?: number };
  sproutingToGrowing?: { enabled: boolean; minLinks?: number };
};

export type IdeaWebUserSettings = {
  /** Days without `updated_at` before auto-dormant (default 90). */
  inactivityDays: number;
  autoDormantEnabled: boolean;
  autoStatusRules: IdeaWebUserAutoRules;
};

const DEFAULT_RULES: IdeaWebUserAutoRules = {
  seedToSprouting: { enabled: true, minBodyWords: 40 },
  sproutingToGrowing: { enabled: true, minLinks: 1 },
};

export const DEFAULT_IDEA_WEB_USER_SETTINGS: IdeaWebUserSettings = {
  inactivityDays: 90,
  autoDormantEnabled: true,
  autoStatusRules: DEFAULT_RULES,
};

export function parseIdeaWebSettings(raw: unknown): IdeaWebUserSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_IDEA_WEB_USER_SETTINGS, autoStatusRules: { ...DEFAULT_RULES } };
  }
  const o = raw as Record<string, unknown>;
  const rulesRaw = o.autoStatusRules;
  let autoStatusRules = { ...DEFAULT_RULES };
  if (rulesRaw && typeof rulesRaw === "object") {
    const r = rulesRaw as Record<string, unknown>;
    if (r.seedToSprouting && typeof r.seedToSprouting === "object") {
      const s = r.seedToSprouting as Record<string, unknown>;
      autoStatusRules = {
        ...autoStatusRules,
        seedToSprouting: {
          enabled: Boolean(s.enabled),
          minBodyWords: typeof s.minBodyWords === "number" ? s.minBodyWords : 40,
        },
      };
    }
    if (r.sproutingToGrowing && typeof r.sproutingToGrowing === "object") {
      const s = r.sproutingToGrowing as Record<string, unknown>;
      autoStatusRules = {
        ...autoStatusRules,
        sproutingToGrowing: {
          enabled: Boolean(s.enabled),
          minLinks: typeof s.minLinks === "number" ? s.minLinks : 1,
        },
      };
    }
  }
  return {
    inactivityDays:
      typeof o.inactivityDays === "number" && o.inactivityDays >= 7 && o.inactivityDays <= 365
        ? o.inactivityDays
        : DEFAULT_IDEA_WEB_USER_SETTINGS.inactivityDays,
    autoDormantEnabled:
      typeof o.autoDormantEnabled === "boolean"
        ? o.autoDormantEnabled
        : DEFAULT_IDEA_WEB_USER_SETTINGS.autoDormantEnabled,
    autoStatusRules,
  };
}

export function mergeIdeaWebSettingsPatch(
  current: Record<string, unknown>,
  patch: Partial<IdeaWebUserSettings>,
): Record<string, unknown> {
  const base = parseIdeaWebSettings(current);
  const ar = patch.autoStatusRules;
  const next: IdeaWebUserSettings = {
    ...base,
    ...patch,
    autoStatusRules: {
      seedToSprouting: {
        ...base.autoStatusRules.seedToSprouting,
        ...ar?.seedToSprouting,
      },
      sproutingToGrowing: {
        ...base.autoStatusRules.sproutingToGrowing,
        ...ar?.sproutingToGrowing,
      },
    },
  };
  return {
    inactivityDays: next.inactivityDays,
    autoDormantEnabled: next.autoDormantEnabled,
    autoStatusRules: next.autoStatusRules,
  };
}
