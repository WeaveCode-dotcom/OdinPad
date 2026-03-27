import type { WorkspaceMode } from "@/types/novel";

export type WritingStage = "brainstorming" | "outlining" | "drafting" | "editing" | "finishing";
export type WritingStyle = "plotter" | "pantser" | "hybrid";
export type WritingGoal = "finish-first-draft" | "daily-word-count" | "build-world" | "overcome-block";

export interface PersonalizationInput {
  writingStage?: WritingStage;
  writingStyle: WritingStyle;
  genres: string[];
  primaryGoal: WritingGoal;
}

export interface PersonalizationResult {
  recommendedFrameworkId: string;
  preferredWorkspaceMode: WorkspaceMode;
  highlightedTools: string[];
}

export function mapPersonalization(input: PersonalizationInput): PersonalizationResult {
  const genres = input.genres.map((v) => v.toLowerCase());
  const hasRomance = genres.some((g) => g.includes("romance"));
  const hasFantasy = genres.some((g) => g.includes("fantasy"));
  const hasLiterary = genres.some((g) => g.includes("literary"));

  let recommendedFrameworkId = "three-act";
  if (hasRomance) recommendedFrameworkId = "hauge-six-stage";
  if (hasFantasy) recommendedFrameworkId = "heros-journey";
  if (hasLiterary) recommendedFrameworkId = "freytags-pyramid";
  if (input.writingStyle === "pantser") recommendedFrameworkId = "story-circle";
  if (input.writingStyle === "plotter") recommendedFrameworkId = "save-the-cat";

  let preferredWorkspaceMode: WorkspaceMode = "canvas";
  if (input.writingStage === "outlining") preferredWorkspaceMode = "canvas";
  if (input.writingStage === "drafting") preferredWorkspaceMode = "write";
  if (input.writingStage === "editing" || input.writingStage === "finishing") preferredWorkspaceMode = "review";

  const highlightedTools = ["goal-tracker"];
  if (hasFantasy || input.primaryGoal === "build-world") highlightedTools.push("story-wiki");
  if (input.primaryGoal === "daily-word-count") highlightedTools.push("sprint-timer");
  if (input.writingStyle === "plotter") highlightedTools.push("framework-planner");
  if (input.writingStyle === "pantser") highlightedTools.push("scene-drafts");

  return {
    recommendedFrameworkId,
    preferredWorkspaceMode,
    highlightedTools: Array.from(new Set(highlightedTools)),
  };
}
