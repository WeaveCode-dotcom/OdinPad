import type { IdeaWebStatus } from "@/types/idea-web";

/** Human-readable labels for lifecycle status (Idea Web). */
export const IDEA_WEB_STATUS_LABELS: Record<IdeaWebStatus, string> = {
  seed: "Seed",
  sprouting: "Sprouting",
  growing: "Growing",
  dormant: "Dormant",
  harvested: "Harvested",
  archived: "Archived",
};

export function ideaWebStatusLabel(status: IdeaWebStatus): string {
  return IDEA_WEB_STATUS_LABELS[status] ?? status;
}
