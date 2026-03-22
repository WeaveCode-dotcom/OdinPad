export interface FrameworkBeat {
  id: string;
  title: string;
  description: string;
  percentage: number; // approximate % of story
  tags: string[];
  optional?: boolean;
}

export interface StoryFramework {
  id: string;
  name: string;
  shortName: string;
  description: string;
  beatCount: number;
  bestFor: string[];
  visualization: 'linear' | 'circle' | 'pyramid';
  beats: FrameworkBeat[];
  category: 'core' | 'unlockable';
}

let beatId = 0;
const bid = () => `beat_${++beatId}`;

export const STORY_FRAMEWORKS: StoryFramework[] = [
  {
    id: 'three-act',
    name: 'Classic Three-Act Structure',
    shortName: 'Three-Act',
    description: 'The foundational storytelling model: Setup, Confrontation, Resolution.',
    beatCount: 8,
    bestFor: ['General', 'Genre Fiction', 'Screenwriting'],
    visualization: 'linear',
    category: 'core',
    beats: [
      { id: bid(), title: 'Exposition / Ordinary World', description: 'Introduce the protagonist, setting, and status quo.', percentage: 8, tags: ['Setup'] },
      { id: bid(), title: 'Inciting Incident', description: 'The event that disrupts the ordinary world and sets the story in motion.', percentage: 10, tags: ['Setup'] },
      { id: bid(), title: 'Plot Point 1', description: 'The protagonist commits to the journey; end of Act 1.', percentage: 7, tags: ['Setup'] },
      { id: bid(), title: 'Rising Action / Response', description: 'The protagonist reacts to new challenges and escalating stakes.', percentage: 20, tags: ['Confrontation'] },
      { id: bid(), title: 'Midpoint', description: 'A major revelation or shift that raises stakes and changes direction.', percentage: 5, tags: ['Confrontation'] },
      { id: bid(), title: 'Dark Night / Plot Point 2', description: 'Lowest point for the protagonist; all seems lost.', percentage: 20, tags: ['Confrontation'] },
      { id: bid(), title: 'Climax', description: 'The final confrontation where the central conflict is resolved.', percentage: 15, tags: ['Resolution'] },
      { id: bid(), title: 'Denouement / New Equilibrium', description: 'Wrap up loose ends and show the new normal.', percentage: 15, tags: ['Resolution'] },
    ],
  },
  {
    id: 'heros-journey',
    name: "Hero's Journey (Vogler)",
    shortName: "Hero's Journey",
    description: 'A 12-stage mythic arc following the hero through departure, initiation, and return.',
    beatCount: 12,
    bestFor: ['Fantasy', 'Adventure', 'Character Arc'],
    visualization: 'circle',
    category: 'core',
    beats: [
      { id: bid(), title: 'Ordinary World', description: "The hero's normal life before the adventure begins.", percentage: 8, tags: ['Departure'] },
      { id: bid(), title: 'Call to Adventure', description: 'The hero receives a challenge or quest.', percentage: 5, tags: ['Departure'] },
      { id: bid(), title: 'Refusal of the Call', description: 'The hero hesitates or resists the call.', percentage: 5, tags: ['Departure'] },
      { id: bid(), title: 'Meeting the Mentor', description: 'The hero gains guidance, training, or a magical gift.', percentage: 7, tags: ['Departure'] },
      { id: bid(), title: 'Crossing the Threshold', description: 'The hero commits to the adventure and enters the special world.', percentage: 8, tags: ['Initiation'] },
      { id: bid(), title: 'Tests, Allies, Enemies', description: 'The hero faces challenges and meets companions and foes.', percentage: 12, tags: ['Initiation'] },
      { id: bid(), title: 'Approach to the Inmost Cave', description: 'The hero prepares for the major ordeal.', percentage: 8, tags: ['Initiation'] },
      { id: bid(), title: 'Ordeal', description: 'The hero faces a life-or-death crisis.', percentage: 10, tags: ['Initiation'] },
      { id: bid(), title: 'Reward', description: 'The hero seizes the treasure or achieves the goal.', percentage: 8, tags: ['Return'] },
      { id: bid(), title: 'The Road Back', description: 'The hero begins the journey home, often pursued.', percentage: 8, tags: ['Return'] },
      { id: bid(), title: 'Resurrection', description: 'A final test where the hero is transformed.', percentage: 12, tags: ['Return'] },
      { id: bid(), title: 'Return with the Elixir', description: 'The hero returns home changed, bearing wisdom or treasure.', percentage: 9, tags: ['Return'] },
    ],
  },
  {
    id: 'save-the-cat',
    name: 'Save the Cat Beat Sheet',
    shortName: 'Save the Cat',
    description: '15 beats optimized for pacing and audience hooks. Genre fiction favorite.',
    beatCount: 15,
    bestFor: ['Genre Fiction', 'Screenwriting', 'Commercial'],
    visualization: 'linear',
    category: 'core',
    beats: [
      { id: bid(), title: 'Opening Image', description: 'A snapshot of the protagonist before the journey.', percentage: 1, tags: ['Act 1'] },
      { id: bid(), title: 'Theme Stated', description: 'A hint at the story\'s deeper meaning.', percentage: 4, tags: ['Act 1'] },
      { id: bid(), title: 'Set-Up', description: 'Introduce the main characters, world, and stakes.', percentage: 8, tags: ['Act 1'] },
      { id: bid(), title: 'Catalyst', description: 'The inciting incident that changes everything.', percentage: 3, tags: ['Act 1'] },
      { id: bid(), title: 'Debate', description: 'The protagonist debates whether to take action.', percentage: 9, tags: ['Act 1'] },
      { id: bid(), title: 'Break into Two', description: 'The protagonist chooses to enter the new world.', percentage: 3, tags: ['Act 2'] },
      { id: bid(), title: 'B Story', description: 'A secondary storyline, often the love interest.', percentage: 5, tags: ['Act 2'] },
      { id: bid(), title: 'Fun and Games', description: 'The promise of the premise; what the audience came for.', percentage: 15, tags: ['Act 2'] },
      { id: bid(), title: 'Midpoint', description: 'False victory or false defeat; stakes are raised.', percentage: 5, tags: ['Act 2'] },
      { id: bid(), title: 'Bad Guys Close In', description: 'External pressure increases; internal flaws emerge.', percentage: 15, tags: ['Act 2'] },
      { id: bid(), title: 'All Is Lost', description: 'The lowest point; a whiff of death.', percentage: 3, tags: ['Act 2'] },
      { id: bid(), title: 'Dark Night of the Soul', description: 'The protagonist faces despair before the breakthrough.', percentage: 5, tags: ['Act 2'] },
      { id: bid(), title: 'Break into Three', description: 'A new idea or inspiration propels the protagonist forward.', percentage: 3, tags: ['Act 3'] },
      { id: bid(), title: 'Finale', description: 'The final battle where lessons are applied.', percentage: 15, tags: ['Act 3'] },
      { id: bid(), title: 'Final Image', description: 'A mirror of the opening image, showing transformation.', percentage: 1, tags: ['Act 3'] },
    ],
  },
  {
    id: 'story-circle',
    name: "Dan Harmon's Story Circle",
    shortName: 'Story Circle',
    description: 'An 8-step circular model focused on character change and comfort zone disruption.',
    beatCount: 8,
    bestFor: ['Character Arc', 'TV Episodes', 'Short Fiction'],
    visualization: 'circle',
    category: 'core',
    beats: [
      { id: bid(), title: 'You (Comfort Zone)', description: 'Establish the character in their ordinary world.', percentage: 12, tags: ['Top'] },
      { id: bid(), title: 'Need', description: 'Something is missing or wrong.', percentage: 12, tags: ['Top'] },
      { id: bid(), title: 'Go (Enter Unknown)', description: 'The character crosses into an unfamiliar situation.', percentage: 12, tags: ['Descent'] },
      { id: bid(), title: 'Search (Adapt)', description: 'The character struggles to adapt to the new world.', percentage: 14, tags: ['Descent'] },
      { id: bid(), title: 'Find', description: 'The character gets what they wanted.', percentage: 12, tags: ['Bottom'] },
      { id: bid(), title: 'Take (Pay the Price)', description: 'There is a heavy cost for what was gained.', percentage: 14, tags: ['Ascent'] },
      { id: bid(), title: 'Return', description: 'The character goes back to the familiar world.', percentage: 12, tags: ['Ascent'] },
      { id: bid(), title: 'Change', description: 'The character has been fundamentally transformed.', percentage: 12, tags: ['Top'] },
    ],
  },
  {
    id: 'seven-point',
    name: 'Seven-Point Story Structure',
    shortName: 'Seven-Point',
    description: 'Tight, milestone-based structure by Dan Wells. Great for plotting from resolution backward.',
    beatCount: 7,
    bestFor: ['Genre Fiction', 'Thrillers', 'Plotting'],
    visualization: 'linear',
    category: 'core',
    beats: [
      { id: bid(), title: 'Hook', description: 'The opposite state from the resolution; where the character starts.', percentage: 10, tags: ['Beginning'] },
      { id: bid(), title: 'Plot Turn 1', description: 'Introduce the conflict; the world changes.', percentage: 12, tags: ['Rising'] },
      { id: bid(), title: 'Pinch 1', description: 'Apply pressure; force the character to act.', percentage: 15, tags: ['Rising'] },
      { id: bid(), title: 'Midpoint', description: 'The character shifts from reaction to action.', percentage: 15, tags: ['Middle'] },
      { id: bid(), title: 'Pinch 2', description: 'Maximum pressure; everything goes wrong.', percentage: 15, tags: ['Falling'] },
      { id: bid(), title: 'Plot Turn 2', description: 'The final piece of the puzzle; the character gains what they need.', percentage: 15, tags: ['Falling'] },
      { id: bid(), title: 'Resolution', description: 'The conflict is resolved; the character has changed.', percentage: 18, tags: ['End'] },
    ],
  },
  {
    id: 'freytags-pyramid',
    name: "Freytag's Pyramid",
    shortName: "Freytag's Pyramid",
    description: 'Classic 5-part dramatic arc, ideal for tragic and literary stories.',
    beatCount: 5,
    bestFor: ['Literary', 'Tragedy', 'Classic Drama'],
    visualization: 'pyramid',
    category: 'core',
    beats: [
      { id: bid(), title: 'Exposition', description: 'Introduce characters, setting, and background.', percentage: 20, tags: ['Rising'] },
      { id: bid(), title: 'Rising Action', description: 'Complications and conflict build tension.', percentage: 25, tags: ['Rising'] },
      { id: bid(), title: 'Climax', description: 'The turning point; peak of tension.', percentage: 10, tags: ['Peak'] },
      { id: bid(), title: 'Falling Action', description: 'Consequences unfold; tension decreases.', percentage: 25, tags: ['Falling'] },
      { id: bid(), title: 'Denouement', description: 'Resolution or catastrophe; story concludes.', percentage: 20, tags: ['End'] },
    ],
  },
  {
    id: 'fichtean-curve',
    name: 'Fichtean Curve',
    shortName: 'Fichtean Curve',
    description: 'Crisis-driven structure with minimal setup. Starts with action.',
    beatCount: 4,
    bestFor: ['Thrillers', 'Action', 'In Medias Res'],
    visualization: 'pyramid',
    category: 'core',
    beats: [
      { id: bid(), title: 'Inciting Crisis', description: 'Start in the middle of action. Immediate conflict.', percentage: 15, tags: ['Crisis'] },
      { id: bid(), title: 'Rising Crises', description: 'A chain of escalating crises with brief exposition woven in.', percentage: 45, tags: ['Crisis'] },
      { id: bid(), title: 'Climax', description: 'The ultimate crisis; everything comes to a head.', percentage: 20, tags: ['Peak'] },
      { id: bid(), title: 'Falling Action / Aftermath', description: 'Brief resolution after the climactic moment.', percentage: 20, tags: ['Resolution'] },
    ],
  },
  {
    id: 'kishotenketsu',
    name: 'Kishōtenketsu',
    shortName: 'Kishōtenketsu',
    description: 'East Asian 4-part structure with no required conflict. Twist-focused.',
    beatCount: 4,
    bestFor: ['Literary', 'Non-Conflict', 'East Asian', 'Slice of Life'],
    visualization: 'linear',
    category: 'core',
    beats: [
      { id: bid(), title: 'Ki (Introduction)', description: 'Introduce the characters and setting.', percentage: 25, tags: ['Introduction'] },
      { id: bid(), title: 'Shō (Development)', description: 'Develop the story without dramatic change.', percentage: 25, tags: ['Development'] },
      { id: bid(), title: 'Ten (Twist)', description: 'An unexpected element shifts perspective.', percentage: 25, tags: ['Twist'] },
      { id: bid(), title: 'Ketsu (Conclusion)', description: 'Reconcile the twist with the earlier parts; find harmony.', percentage: 25, tags: ['Conclusion'] },
    ],
  },
  // Unlockables
  {
    id: 'four-act',
    name: 'Four-Act Structure',
    shortName: 'Four-Act',
    description: 'Deeper protagonist change with chiastic mirroring. Korean/Japanese influenced.',
    beatCount: 6,
    bestFor: ['K-Drama', 'Literary', 'Character Arc'],
    visualization: 'linear',
    category: 'unlockable',
    beats: [
      { id: bid(), title: 'Act 1: Setup', description: 'Establish the world and protagonist\'s desire.', percentage: 20, tags: ['Act 1'] },
      { id: bid(), title: 'First Turn', description: 'The inciting incident propels the story forward.', percentage: 5, tags: ['Turn'] },
      { id: bid(), title: 'Act 2: Complication', description: 'Obstacles arise; the protagonist tries and fails.', percentage: 25, tags: ['Act 2'] },
      { id: bid(), title: 'Midpoint Reversal', description: 'A major reversal changes everything.', percentage: 5, tags: ['Turn'] },
      { id: bid(), title: 'Act 3: Crisis', description: 'Stakes escalate to maximum; dark night of the soul.', percentage: 25, tags: ['Act 3'] },
      { id: bid(), title: 'Act 4: Resolution', description: 'Climax and transformation; new equilibrium.', percentage: 20, tags: ['Act 4'] },
    ],
  },
  {
    id: 'pixar-spine',
    name: "Pixar's Story Spine",
    shortName: 'Pixar Spine',
    description: 'Simple 7-sentence backbone. Perfect for brainstorming and rapid outlining.',
    beatCount: 7,
    bestFor: ['Animation', 'Children\'s', 'Quick Outlining'],
    visualization: 'linear',
    category: 'unlockable',
    beats: [
      { id: bid(), title: 'Once upon a time...', description: 'Establish the world and protagonist.', percentage: 12, tags: ['Setup'] },
      { id: bid(), title: 'Every day...', description: 'Show the routine of the ordinary world.', percentage: 12, tags: ['Setup'] },
      { id: bid(), title: 'But one day...', description: 'The inciting incident occurs.', percentage: 12, tags: ['Catalyst'] },
      { id: bid(), title: 'Because of that...', description: 'Chain of cause and effect begins.', percentage: 18, tags: ['Consequence'] },
      { id: bid(), title: 'Because of that...', description: 'Consequences continue to escalate.', percentage: 18, tags: ['Consequence'] },
      { id: bid(), title: 'Until finally...', description: 'The climax; the final confrontation.', percentage: 16, tags: ['Climax'] },
      { id: bid(), title: 'And ever since then...', description: 'The new normal after the journey.', percentage: 12, tags: ['Resolution'] },
    ],
  },
  {
    id: 'story-grid',
    name: 'Story Grid (Five Commandments)',
    shortName: 'Story Grid',
    description: 'Scene-level structure with 5 commandments per scene plus global genre conventions.',
    beatCount: 5,
    bestFor: ['Genre Fiction', 'Scene Craft', 'Revision'],
    visualization: 'linear',
    category: 'unlockable',
    beats: [
      { id: bid(), title: 'Inciting Incident', description: 'An event that upsets the balance of the scene.', percentage: 15, tags: ['Scene'] },
      { id: bid(), title: 'Progressive Complication (Turning Point)', description: 'Complications that force a decision.', percentage: 25, tags: ['Scene'] },
      { id: bid(), title: 'Crisis', description: 'The dilemma — best bad choice or irreconcilable goods.', percentage: 20, tags: ['Scene'] },
      { id: bid(), title: 'Climax', description: 'The character acts on their decision.', percentage: 20, tags: ['Scene'] },
      { id: bid(), title: 'Resolution', description: 'The result of the climactic action.', percentage: 20, tags: ['Scene'] },
    ],
  },
  {
    id: 'hauge-six-stage',
    name: "Michael Hauge's 6-Stage Plot",
    shortName: 'Hauge 6-Stage',
    description: 'Blends inner journey (identity → essence) with outer plot structure.',
    beatCount: 6,
    bestFor: ['Romance', 'Character Transformation', 'Screenwriting'],
    visualization: 'linear',
    category: 'unlockable',
    beats: [
      { id: bid(), title: 'Stage 1: Setup', description: 'Establish the everyday life and identity.', percentage: 10, tags: ['Identity'] },
      { id: bid(), title: 'Stage 2: New Situation', description: 'The character enters a new context.', percentage: 15, tags: ['Identity'] },
      { id: bid(), title: 'Stage 3: Progress', description: 'The character pursues the visible goal.', percentage: 25, tags: ['Journey'] },
      { id: bid(), title: 'Stage 4: Complications', description: 'Higher stakes; the inner and outer journeys collide.', percentage: 25, tags: ['Journey'] },
      { id: bid(), title: 'Stage 5: Final Push', description: 'All-or-nothing pursuit of the goal.', percentage: 15, tags: ['Essence'] },
      { id: bid(), title: 'Stage 6: Aftermath', description: 'The character has shed their identity and lives as their essence.', percentage: 10, tags: ['Essence'] },
    ],
  },
];

export function getFrameworkById(id: string): StoryFramework | undefined {
  return STORY_FRAMEWORKS.find(f => f.id === id);
}

export function getCoreFrameworks(): StoryFramework[] {
  return STORY_FRAMEWORKS.filter(f => f.category === 'core');
}

export function getUnlockableFrameworks(): StoryFramework[] {
  return STORY_FRAMEWORKS.filter(f => f.category === 'unlockable');
}
