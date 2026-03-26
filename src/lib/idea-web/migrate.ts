import { upsertIdeaWebEntryLegacy } from "@/lib/idea-web/service";
import type { Novel } from "@/types/novel";

export const IDEA_WEB_MIGRATION_STORAGE_KEY = "odinpad_idea_web_v1_migrated";

export function hasMigratedIdeaWeb(userId: string): boolean {
  try {
    return localStorage.getItem(`${IDEA_WEB_MIGRATION_STORAGE_KEY}_${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markIdeaWebMigrated(userId: string): void {
  try {
    localStorage.setItem(`${IDEA_WEB_MIGRATION_STORAGE_KEY}_${userId}`, "1");
  } catch {
    /* ignore */
  }
}

/** Migrate embedded `novel.ideas` into `idea_web_entries`. Idempotent per idea id. */
export async function migrateLegacyNovelIdeasToIdeaWeb(userId: string, novels: Novel[]): Promise<boolean> {
  let any = false;
  for (const novel of novels) {
    for (const idea of novel.ideas || []) {
      any = true;
      const title = idea.content.trim().slice(0, 200) || "Untitled";
      await upsertIdeaWebEntryLegacy({
        id: idea.id,
        user_id: userId,
        novel_id: novel.id,
        title,
        body: idea.content,
        idea_type: idea.category,
        category: idea.category,
        pinned: idea.pinned,
        created_at: idea.createdAt,
        metadata: { legacy: true },
      });
    }
  }
  return any;
}
