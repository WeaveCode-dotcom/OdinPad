import type { ExpansionTemplateId } from "@/types/sandbox";

export type ExpansionField = { id: string; label: string; placeholder?: string; multiline?: boolean };

export const EXPANSION_TEMPLATES: Record<ExpansionTemplateId, { label: string; fields: ExpansionField[] }> = {
  character: {
    label: "Character",
    fields: [
      { id: "core", label: "Core desire", multiline: true },
      { id: "backstory", label: "Formative wound", multiline: true },
      { id: "flaw", label: "Fatal flaw", multiline: true },
      { id: "voice", label: "Voice & speech", multiline: true },
      { id: "arc", label: "Arc question", multiline: true },
    ],
  },
  location: {
    label: "Location",
    fields: [
      { id: "physical", label: "Physical description", multiline: true },
      { id: "history", label: "History", multiline: true },
      { id: "conflict", label: "Local conflict", multiline: true },
      { id: "atmosphere", label: "Atmosphere", multiline: true },
    ],
  },
  plot_point: {
    label: "Plot point",
    fields: [
      { id: "setup", label: "Setup", multiline: true },
      { id: "turn", label: "Turn / revelation", multiline: true },
      { id: "consequence", label: "Consequence", multiline: true },
      { id: "foreshadow", label: "Foreshadowing hooks", multiline: true },
    ],
  },
  magic: {
    label: "Magic / system",
    fields: [
      { id: "rules", label: "Rules", multiline: true },
      { id: "cost", label: "Cost & limits", multiline: true },
      { id: "culture", label: "Cultural impact", multiline: true },
      { id: "exceptions", label: "Exceptions / loopholes", multiline: true },
    ],
  },
  theme: {
    label: "Theme",
    fields: [
      { id: "statement", label: "What you are exploring", multiline: true },
      { id: "manifestation", label: "Where it shows in plot", multiline: true },
      { id: "counter", label: "Counter-theme", multiline: true },
    ],
  },
  faction: {
    label: "Faction",
    fields: [
      { id: "goal", label: "Goal", multiline: true },
      { id: "structure", label: "Structure", multiline: true },
      { id: "resources", label: "Resources", multiline: true },
      { id: "enemies", label: "Enemies & allies", multiline: true },
    ],
  },
  scene: {
    label: "Scene",
    fields: [
      { id: "setting", label: "Setting", multiline: true },
      { id: "conflict", label: "Conflict", multiline: true },
      { id: "stakes", label: "Stakes", multiline: true },
      { id: "outcome", label: "Outcome / turn", multiline: true },
    ],
  },
};

export const EXPANSION_METHODS = [
  { id: "questions", label: "Question ladder" },
  { id: "spider", label: "Spider-web" },
  { id: "contrast", label: "Contrast (is / isn’t)" },
  { id: "evolution", label: "Evolution across story" },
  { id: "integration", label: "Integration with rest of book" },
  { id: "socratic", label: "Socratic depth" },
] as const;
