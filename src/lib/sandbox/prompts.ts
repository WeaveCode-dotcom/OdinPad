import type { IdeaWebEntry } from "@/types/idea-web";
import type { Novel } from "@/types/novel";

export type CorePromptDef = {
  key: string;
  type: string;
  template: (ctx: { novel: Novel | null; idea: IdeaWebEntry | null }) => string;
};

/** Ten curated non-generative prompts (questions / angles only). */
export const SANDBOX_CORE_PROMPTS: CorePromptDef[] = [
  {
    key: "want_obstacle",
    type: "expansion",
    template: ({ novel, idea }) => {
      const t = idea?.title || "this idea";
      return (
        `About “${t}” in ${novel?.title ?? "your project"}:\n` +
        `1) What does it want most right now?\n` +
        `2) What concrete obstacle stops it?\n` +
        `3) What would it never do to succeed—and when might it do exactly that?`
      );
    },
  },
  {
    key: "stakes_double",
    type: "obstacle",
    template: ({ novel }) =>
      `In “${novel?.title ?? "your story"}”: If the central problem were solved today, what worse problem would appear the next morning? Name one character who notices first.`,
  },
  {
    key: "antagonist_lens",
    type: "perspective",
    template: ({ novel }) =>
      `Scene lens for “${novel?.title ?? "your project"}”: What is the antagonist (or opposing force) trying to protect? What would they lose if the protagonist wins?`,
  },
  {
    key: "sensory_anchor",
    type: "constraint",
    template: () =>
      `Pick one object in your current scene. Describe only temperature, weight, and sound—no dialogue, no backstory. What does that imply about mood?`,
  },
  {
    key: "theme_surface",
    type: "theme",
    template: ({ novel }) =>
      `Where does your theme show up most clearly in “${novel?.title ?? "the book"}”—in a small gesture, not a speech? List three possible moments.`,
  },
  {
    key: "research_gap",
    type: "research",
    template: ({ novel }) =>
      `What would a skeptical expert ask about your worldbuilding in “${novel?.title ?? "this project"}”? Write three factual questions to verify later.`,
  },
  {
    key: "mentor_shift",
    type: "what_if",
    template: () =>
      `What if the character who usually gives advice is wrong in the next beat? What evidence could you plant earlier so it feels fair?`,
  },
  {
    key: "secret_cost",
    type: "expansion",
    template: () =>
      `What secret is your POV character keeping from the reader? What does holding that secret cost them in action (not just feelings)?`,
  },
  {
    key: "time_pressure",
    type: "obstacle",
    template: () =>
      `Add a ticking clock that is not a literal timer (deadline, weather, social ritual). How does it squeeze the next decision?`,
  },
  {
    key: "echo_scene",
    type: "connection",
    template: ({ novel }) =>
      `Name an early image or line from “${novel?.title ?? "your draft"}”. How could it echo in the climax without repeating verbatim?`,
  },
];

export function pickDailySeedPrompt(novel: Novel | null): { key: string; text: string } {
  const day = new Date();
  const i = (day.getFullYear() * 366 + day.getMonth() * 31 + day.getDate()) % SANDBOX_CORE_PROMPTS.length;
  const def = SANDBOX_CORE_PROMPTS[i] ?? SANDBOX_CORE_PROMPTS[0];
  return {
    key: `daily_${def.key}`,
    text: def.template({ novel, idea: null }),
  };
}
