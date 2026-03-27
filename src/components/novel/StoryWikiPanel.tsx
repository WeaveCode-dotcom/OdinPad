import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Clock,
  Crown,
  Feather,
  Gem,
  GitCommitHorizontal,
  Globe,
  Heart,
  Link2,
  MapPin,
  Music,
  Pin,
  PinOff,
  Plus,
  Scroll,
  Search,
  Shield,
  Sparkles,
  Star,
  Sword,
  Tag,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useNovelContext } from "@/contexts/NovelContext";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import {
  ArticleRelationship,
  CharacterArc,
  Progression,
  StoryWikiEntry,
  StoryWikiEntryType,
} from "@/types/novel";

// ── Constants ─────────────────────────────────────────────────────────────────

const ARC_STAGES: { key: keyof CharacterArc; label: string; placeholder: string }[] = [
  { key: "startingState", label: "Starting state", placeholder: "Who is this character at the beginning?" },
  { key: "incitingWound", label: "Inciting wound", placeholder: "What wound or flaw drives their arc?" },
  { key: "midpointShift", label: "Midpoint shift", placeholder: "What changes at the midpoint?" },
  { key: "climaxChoice", label: "Climax choice", placeholder: "What decision do they face at the climax?" },
  { key: "endingState", label: "Ending state", placeholder: "Who have they become by the end?" },
];

const typeIcons: Record<StoryWikiEntryType, React.ElementType> = {
  character: Users,
  location: MapPin,
  lore: Scroll,
  item: Gem,
  faction: Shield,
  magic_system: Zap,
  species: Globe,
  culture: Music,
  religion: Star,
  event: Clock,
  theme: Feather,
};

const typeLabels: Record<StoryWikiEntryType, string> = {
  character: "Characters",
  location: "Locations",
  item: "Items",
  magic_system: "Magic Systems",
  faction: "Factions",
  species: "Species & Races",
  culture: "Cultures",
  religion: "Religions & Myths",
  event: "Events",
  theme: "Themes & Motifs",
  lore: "Lore",
};

const typeDescriptions: Record<StoryWikiEntryType, string> = {
  character:
    "Name, personality, backstory, motivation, flaws, goals",
  location: "Geography, culture, history, inhabitants, secrets",
  item: "Appearance, properties, history, significance, wielder",
  magic_system: "Rules, costs, limitations, applications, exceptions",
  faction: "Structure, goals, leadership, resources, allies, enemies",
  species: "Physical traits, culture, history, language, notable individuals",
  culture: "Customs, beliefs, language, art, social structure",
  religion: "Deities, beliefs, rituals, clergy, holy sites",
  event: "Date, location, participants, cause, consequences",
  theme: "Description, manifestations, related characters",
  lore: "History, mystery, or world knowledge",
};

const ALL_TYPES: StoryWikiEntryType[] = [
  "character",
  "location",
  "item",
  "magic_system",
  "faction",
  "species",
  "culture",
  "religion",
  "event",
  "theme",
  "lore",
];

// ── Template fields per type ──────────────────────────────────────────────────

const templateFields: Partial<Record<StoryWikiEntryType, { key: string; label: string; placeholder: string }[]>> = {
  character: [
    { key: "age", label: "Age", placeholder: "e.g. 24" },
    { key: "occupation", label: "Occupation / Role", placeholder: "e.g. Thief, Queen, Engineer" },
    { key: "physicalDescription", label: "Physical description", placeholder: "Appearance, distinguishing features…" },
    { key: "personality", label: "Personality", placeholder: "Key traits, quirks, voice…" },
    { key: "motivation", label: "Core motivation", placeholder: "What drives them above all else?" },
    { key: "flaw", label: "Fatal flaw", placeholder: "What holds them back or causes harm?" },
    { key: "skills", label: "Skills & abilities", placeholder: "What can they do exceptionally well?" },
  ],
  location: [
    { key: "locationType", label: "Type", placeholder: "e.g. City, Forest, Temple, Space Station" },
    { key: "climate", label: "Climate / Atmosphere", placeholder: "Weather, feel, mood…" },
    { key: "culture", label: "Culture & society", placeholder: "Who lives here, how do they live?" },
    { key: "history", label: "History", placeholder: "How did this place come to be?" },
    { key: "secrets", label: "Secrets & mysteries", placeholder: "Hidden truths about this place…" },
  ],
  magic_system: [
    { key: "rules", label: "Core rules", placeholder: "How does the magic work?" },
    { key: "cost", label: "Cost / limitation", placeholder: "What does it take to use? What are the risks?" },
    { key: "source", label: "Source", placeholder: "Where does the power come from?" },
    { key: "applications", label: "Applications", placeholder: "What can the magic do?" },
    { key: "exceptions", label: "Exceptions & edge cases", placeholder: "Where the rules bend or break…" },
  ],
  faction: [
    { key: "factionType", label: "Type", placeholder: "e.g. Kingdom, Guild, Cult, Resistance" },
    { key: "leadership", label: "Leadership", placeholder: "Who leads and how?" },
    { key: "goals", label: "Goals", placeholder: "What does this faction want?" },
    { key: "methods", label: "Methods", placeholder: "How do they pursue their goals?" },
    { key: "resources", label: "Resources", placeholder: "What power or wealth do they command?" },
  ],
  religion: [
    { key: "deities", label: "Deities / Powers", placeholder: "Who or what is worshipped?" },
    { key: "beliefs", label: "Core beliefs", placeholder: "What do they hold sacred?" },
    { key: "rituals", label: "Rituals & practices", placeholder: "How do they express devotion?" },
    { key: "holySites", label: "Holy sites", placeholder: "Sacred locations or objects…" },
  ],
  event: [
    { key: "date", label: "When (in-world)", placeholder: "e.g. Year 423, three years before the story" },
    { key: "participants", label: "Participants", placeholder: "Who was involved?" },
    { key: "cause", label: "Cause", placeholder: "What led to this event?" },
    { key: "consequences", label: "Consequences", placeholder: "What changed as a result?" },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId() {
  return `swiki_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressionCard({
  prog,
  onChange,
  onDelete,
}: {
  prog: Progression;
  onChange: (patch: Partial<Progression>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-sm border-2 border-border/60 bg-background/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Input
          value={prog.triggerPoint}
          onChange={(e) => onChange({ triggerPoint: e.target.value })}
          placeholder="Trigger point (e.g. After Chapter 12, Act 2 Midpoint)"
          className="h-7 text-xs flex-1"
        />
        <button
          onClick={onDelete}
          aria-label="Delete progression"
          className="mt-0.5 rounded-sm border-2 border-transparent p-0.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <textarea
        value={prog.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Describe what changes at this point in the narrative…"
        rows={3}
        className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-xs text-foreground shadow-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex items-center gap-2">
        <select
          value={prog.status}
          onChange={(e) => onChange({ status: e.target.value as Progression["status"] })}
          className="h-6 rounded-sm border-2 border-border/60 bg-background text-[10px] font-medium text-muted-foreground px-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="reversed">Reversed</option>
          <option value="irreversible">Irreversible</option>
        </select>
        <Input
          value={prog.tags.join(", ")}
          onChange={(e) =>
            onChange({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
          }
          placeholder="Tags (comma separated)"
          className="h-6 text-[10px] flex-1"
        />
      </div>
    </div>
  );
}

function RelationshipCard({
  rel,
  allEntries,
  onChange,
  onDelete,
}: {
  rel: ArticleRelationship;
  allEntries: StoryWikiEntry[];
  onChange: (patch: Partial<ArticleRelationship>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-sm border-2 border-border/60 bg-background/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={rel.targetEntryId}
          onChange={(e) => onChange({ targetEntryId: e.target.value })}
          className="h-7 flex-1 rounded-sm border-2 border-border/60 bg-background text-xs font-medium text-foreground px-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">Select entry…</option>
          {allEntries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({typeLabels[e.type]})
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          aria-label="Delete relationship"
          className="rounded-sm border-2 border-transparent p-0.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={rel.relationshipType}
          onChange={(e) => onChange({ relationshipType: e.target.value })}
          placeholder="Relationship type (e.g. allies, rivals, mentor)"
          className="h-7 text-xs flex-1"
        />
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
          <input
            type="checkbox"
            checked={!!rel.bidirectional}
            onChange={(e) => onChange({ bidirectional: e.target.checked })}
            className="h-3 w-3"
          />
          Bidirectional
        </label>
      </div>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

type DetailTab = "info" | "arc" | "progressions" | "relationships";

function EntryDetail({
  entry,
  allEntries,
  onUpdate,
  onDelete,
  onBack,
}: {
  entry: StoryWikiEntry;
  allEntries: StoryWikiEntry[];
  onUpdate: (patch: Partial<StoryWikiEntry>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("info");
  const Icon = typeIcons[entry.type];

  const fields = entry.fields ?? {};
  const template = templateFields[entry.type] ?? [];

  const progressions = entry.progressions ?? [];
  const relationships = entry.relationships ?? [];

  const addProgression = () => {
    const newProg: Progression = {
      id: genId(),
      triggerPoint: "",
      description: "",
      tags: [],
      status: "active",
      order: progressions.length,
    };
    onUpdate({ progressions: [...progressions, newProg] });
  };

  const updateProgression = (id: string, patch: Partial<Progression>) => {
    onUpdate({ progressions: progressions.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };

  const deleteProgression = (id: string) => {
    onUpdate({ progressions: progressions.filter((p) => p.id !== id) });
  };

  const addRelationship = () => {
    const newRel: ArticleRelationship = {
      id: genId(),
      targetEntryId: "",
      relationshipType: "",
      bidirectional: false,
    };
    onUpdate({ relationships: [...relationships, newRel] });
  };

  const updateRelationship = (id: string, patch: Partial<ArticleRelationship>) => {
    onUpdate({ relationships: relationships.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };

  const deleteRelationship = (id: string) => {
    onUpdate({ relationships: relationships.filter((r) => r.id !== id) });
  };

  const tabBtn = (t: DetailTab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-colors ${
        tab === t
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 px-4 pt-3 pb-2 border-b-2 border-border/50">
        <button
          onClick={onBack}
          className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3 w-3 rotate-180" />
          Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <Input
            value={entry.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 text-sm font-semibold"
            placeholder="Entry name…"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={entry.status}
            onChange={(e) => onUpdate({ status: e.target.value as StoryWikiEntry["status"] })}
            className="h-6 rounded-sm border-2 border-border/60 bg-background text-[10px] font-semibold text-muted-foreground px-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <span className="text-[10px] text-muted-foreground">{typeLabels[entry.type]}</span>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {tabBtn("info", "Info")}
          {entry.type === "character" && tabBtn("arc", "Arc")}
          {tabBtn("progressions", `Progressions${progressions.length ? ` (${progressions.length})` : ""}`)}
          {tabBtn("relationships", `Links${relationships.length ? ` (${relationships.length})` : ""}`)}
        </div>
      </div>

      <div className="p-4 space-y-4 text-sm">
        {/* ── Info tab ── */}
        {tab === "info" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={entry.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={4}
                className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={`Describe this ${entry.type}…`}
              />
            </div>

            {/* Template-specific fields */}
            {template.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {typeLabels[entry.type]} Details
                </p>
                {template.map((f) => (
                  <div key={f.key}>
                    <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {f.label}
                    </label>
                    <textarea
                      value={fields[f.key] ?? ""}
                      onChange={(e) =>
                        onUpdate({ fields: { ...fields, [f.key]: e.target.value } })
                      }
                      rows={2}
                      placeholder={f.placeholder}
                      className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-xs text-foreground shadow-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </label>
              <textarea
                value={entry.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                rows={3}
                className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Private notes, reminders, revision flags…"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Tag className="h-3 w-3" aria-hidden />
                Tags
              </label>
              <Input
                value={entry.tags.join(", ")}
                onChange={(e) =>
                  onUpdate({
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="protagonist, magic, ancient (comma separated)"
              />
              {entry.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onDelete}
              className="w-full rounded-sm border-2 border-destructive/50 px-2 py-1.5 text-xs font-semibold text-destructive shadow-none transition-colors hover:bg-destructive/10"
            >
              Delete entry
            </button>
          </>
        )}

        {/* ── Arc tab (character only) ── */}
        {tab === "arc" && entry.type === "character" && (
          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <GitCommitHorizontal className="h-3.5 w-3.5 text-primary" aria-hidden />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Character Arc Worksheet
              </p>
            </div>
            <div className="space-y-3">
              {ARC_STAGES.map((stage) => (
                <div key={stage.key}>
                  <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {stage.label}
                  </label>
                  <textarea
                    value={entry.arc?.[stage.key] ?? ""}
                    onChange={(e) =>
                      onUpdate({
                        arc: { ...(entry.arc ?? {}), [stage.key]: e.target.value },
                      })
                    }
                    rows={2}
                    placeholder={stage.placeholder}
                    className="w-full rounded-sm border-2 border-border/70 bg-background/80 px-2 py-1.5 text-xs text-foreground shadow-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Progressions tab ── */}
        {tab === "progressions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Progressions</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Track how this entry evolves over the narrative.
                </p>
              </div>
              <button
                onClick={addProgression}
                className="flex items-center gap-1 rounded-sm border-2 border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Plus className="h-3 w-3" aria-hidden />
                Add
              </button>
            </div>
            {progressions.length === 0 && (
              <div className="rounded-md border-2 border-dashed border-border bg-muted/20 p-4 text-center">
                <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" aria-hidden />
                <p className="text-xs font-semibold text-foreground">No progressions yet</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Add progression milestones to track how this {entry.type} changes.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {progressions.map((prog) => (
                <ProgressionCard
                  key={prog.id}
                  prog={prog}
                  onChange={(patch) => updateProgression(prog.id, patch)}
                  onDelete={() => deleteProgression(prog.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Relationships tab ── */}
        {tab === "relationships" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Relationships</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Link this entry to others in your Story Wiki.
                </p>
              </div>
              <button
                onClick={addRelationship}
                className="flex items-center gap-1 rounded-sm border-2 border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Plus className="h-3 w-3" aria-hidden />
                Link
              </button>
            </div>
            {relationships.length === 0 && (
              <div className="rounded-md border-2 border-dashed border-border bg-muted/20 p-4 text-center">
                <Link2 className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" aria-hidden />
                <p className="text-xs font-semibold text-foreground">No links yet</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Connect this {entry.type} to characters, locations, or other entries.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {relationships.map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  rel={rel}
                  allEntries={allEntries.filter((e) => e.id !== entry.id)}
                  onChange={(patch) => updateRelationship(rel.id, patch)}
                  onDelete={() => deleteRelationship(rel.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function StoryWikiPanel({
  onClose,
  pinned = false,
  onTogglePin,
}: {
  onClose: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const { activeNovel, addStoryWikiEntry, updateStoryWikiEntry, deleteStoryWikiEntry } = useNovelContext();
  const { schedule } = useUndoableAction();
  const [selectedEntry, setSelectedEntry] = useState<StoryWikiEntry | null>(null);
  const [addingType, setAddingType] = useState<StoryWikiEntryType | null>(null);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<StoryWikiEntryType | "all">("all");
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  if (!activeNovel) return null;

  const entries = activeNovel.storyWikiEntries;
  const searchQ = search.trim().toLowerCase();

  const filtered = entries.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (!searchQ) return true;
    return (
      e.name.toLowerCase().includes(searchQ) ||
      e.description.toLowerCase().includes(searchQ) ||
      e.notes.toLowerCase().includes(searchQ) ||
      e.tags.some((t) => t.toLowerCase().includes(searchQ)) ||
      Object.values(e.fields ?? {}).some((v) => v.toLowerCase().includes(searchQ))
    );
  });

  // Group by type
  const grouped = ALL_TYPES.reduce(
    (acc, type) => {
      acc[type] = filtered.filter((e) => e.type === type);
      return acc;
    },
    {} as Record<StoryWikiEntryType, StoryWikiEntry[]>,
  );

  const total = entries.length;

  const handleAdd = () => {
    if (!newName.trim() || !addingType) return;
    addStoryWikiEntry(addingType, newName.trim());
    setNewName("");
    setAddingType(null);
  };

  const handleUpdateSelected = (patch: Partial<StoryWikiEntry>) => {
    if (!selectedEntry) return;
    const updated = { ...selectedEntry, ...patch };
    setSelectedEntry(updated);
    updateStoryWikiEntry(selectedEntry.id, patch);
  };

  const handleDelete = () => {
    if (!selectedEntry) return;
    const id = selectedEntry.id;
    setSelectedEntry(null);
    schedule(() => deleteStoryWikiEntry(id), { message: "Removing Story Wiki entry…" });
  };

  // Sync selected entry from novel state so progressions/relationships update live
  const liveSelected = selectedEntry
    ? (entries.find((e) => e.id === selectedEntry.id) ?? selectedEntry)
    : null;

  return (
    <div
      id="novel-story-wiki-panel"
      className={`flex h-full flex-col border-l-2 border-border bg-card/90 ${pinned ? "w-80" : "w-72"}`}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Story Wiki</h3>
          {total > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              title={pinned ? "Unpin Story Wiki panel" : "Pin Story Wiki panel open"}
              aria-label={pinned ? "Unpin Story Wiki panel" : "Pin Story Wiki panel open"}
              className={`rounded-sm border-2 border-transparent p-1 transition-colors hover:border-border hover:text-foreground ${pinned ? "text-primary" : "text-muted-foreground"}`}
            >
              {pinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close Story Wiki panel"
            className="rounded-sm border-2 border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {liveSelected ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <EntryDetail
              entry={liveSelected}
              allEntries={entries}
              onUpdate={handleUpdateSelected}
              onDelete={handleDelete}
              onBack={() => setSelectedEntry(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Search + filter bar */}
            <div className="border-b-2 border-border/50 px-3 py-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Story Wiki…"
                  className="h-7 pl-7 text-xs"
                  aria-label="Search Story Wiki entries"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterType("all")}
                  className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
                {ALL_TYPES.filter((t) => entries.some((e) => e.type === t)).map((t) => {
                  const Icon = typeIcons[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterType(t === filterType ? "all" : t)}
                      title={typeLabels[t]}
                      aria-label={typeLabels[t]}
                      className={`rounded-sm p-0.5 transition-colors ${filterType === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add new entry — type picker */}
            <div className="border-b-2 border-border/50 px-3 py-2">
              {!showTypeMenu ? (
                <button
                  onClick={() => setShowTypeMenu(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-sm border-2 border-dashed border-border px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  New entry
                </button>
              ) : addingType ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {(() => {
                      const Icon = typeIcons[addingType];
                      return <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />;
                    })()}
                    <span>New {typeLabels[addingType].slice(0, -1)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                        if (e.key === "Escape") {
                          setAddingType(null);
                          setShowTypeMenu(false);
                        }
                      }}
                      placeholder={`Name…`}
                      className="h-7 text-xs flex-1"
                    />
                    <button
                      onClick={handleAdd}
                      disabled={!newName.trim()}
                      className="rounded-sm border-2 border-primary px-2 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingType(null);
                        setShowTypeMenu(false);
                      }}
                      className="rounded-sm border-2 border-transparent p-1 text-muted-foreground hover:border-border hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Choose type
                    </span>
                    <button
                      onClick={() => setShowTypeMenu(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {ALL_TYPES.map((t) => {
                      const Icon = typeIcons[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setAddingType(t)}
                          title={typeDescriptions[t]}
                          className="flex items-center gap-1.5 rounded-sm border-2 border-border/50 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
                        >
                          <Icon className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate text-[10px]">{typeLabels[t].replace(/s$/, "")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Entry list */}
            <div className="flex-1 overflow-y-auto p-3">
              {total === 0 && (
                <div className="mb-4 rounded-md border-2 border-dashed border-border bg-muted/20 p-4 text-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground mx-auto mb-2" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">Your Story Wiki is empty</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The Story Wiki is your living story bible — characters, locations, lore, magic systems, and more.
                  </p>
                  <p className="mt-2 text-xs font-medium text-teal-800">
                    Add your first entry with the "New entry" button above.
                  </p>
                </div>
              )}

              {ALL_TYPES.map((type) => {
                const typeEntries = grouped[type];
                if (typeEntries.length === 0 && filterType !== "all" && filterType !== type) return null;
                if (typeEntries.length === 0 && total > 0 && !searchQ) return null;
                if (typeEntries.length === 0 && searchQ) return null;

                const Icon = typeIcons[type];
                return (
                  <div key={type} className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {typeLabels[type]}
                        {typeEntries.length > 0 && (
                          <span className="text-[10px] font-bold text-muted-foreground/60">
                            ({typeEntries.length})
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          setAddingType(type);
                          setShowTypeMenu(true);
                        }}
                        data-tour={type === "character" ? "story-wiki-add-character" : undefined}
                        aria-label={`Add ${typeLabels[type].slice(0, -1)}`}
                        className="rounded-sm border-2 border-transparent p-0.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" aria-hidden />
                      </button>
                    </div>

                    {typeEntries.map((entry) => {
                      const statusDot =
                        entry.status === "published"
                          ? "bg-emerald-500"
                          : entry.status === "archived"
                            ? "bg-neutral-400"
                            : "bg-amber-400";
                      return (
                        <button
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className="flex w-full items-center gap-2 rounded-sm border-2 border-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
                          <span className="truncate flex-1 text-left">{entry.name}</span>
                          {(entry.progressions?.length ?? 0) > 0 && (
                            <Clock
                              className="h-3 w-3 shrink-0 text-muted-foreground/50"
                              aria-label={`${entry.progressions!.length} progressions`}
                            />
                          )}
                        </button>
                      );
                    })}

                    {typeEntries.length === 0 && (
                      <p className="px-2 text-[11px] text-text-dim">No entries yet</p>
                    )}
                  </div>
                );
              })}

              {searchQ && filtered.length === 0 && (
                <div className="rounded-md border-2 border-dashed border-border bg-muted/20 p-4 text-center">
                  <p className="text-xs font-semibold text-foreground">No results for "{search}"</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Try different keywords or create a new entry.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
