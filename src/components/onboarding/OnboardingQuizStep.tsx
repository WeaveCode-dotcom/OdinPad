import { Button } from "@/components/ui/button";
import type { WritingGoal, WritingStyle } from "@/lib/personalization";

const STYLES: Array<{ value: WritingStyle; label: string }> = [
  { value: "plotter", label: "Plotter - love structure" },
  { value: "pantser", label: "Pantser - write freely" },
  { value: "hybrid", label: "Hybrid" },
];

const GOALS: Array<{ value: WritingGoal; label: string }> = [
  { value: "finish-first-draft", label: "Finish first draft" },
  { value: "daily-word-count", label: "Hit daily word count" },
  { value: "build-world", label: "Build world/characters" },
  { value: "overcome-block", label: "Overcome writer block" },
];

export const QUIZ_GENRES = ["Fantasy", "Romance", "Mystery", "Literary", "Sci-Fi", "Thriller", "Historical"];

interface OnboardingQuizStepProps {
  writingStyle: WritingStyle;
  setWritingStyle: (v: WritingStyle) => void;
  genres: string[];
  setGenres: React.Dispatch<React.SetStateAction<string[]>>;
  goal: WritingGoal;
  setGoal: (v: WritingGoal) => void;
  saving: boolean;
  onSubmit: () => void;
}

export function OnboardingQuizStep({
  writingStyle,
  setWritingStyle,
  genres,
  setGenres,
  goal,
  setGoal,
  saving,
  onSubmit,
}: OnboardingQuizStepProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">Personalization quiz</h2>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Preferred style?</p>
        <div className="grid grid-cols-1 gap-2">
          {STYLES.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={writingStyle === item.value ? "default" : "outline"}
              onClick={() => setWritingStyle(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Genre(s) you write?</p>
        <div className="grid grid-cols-3 gap-2">
          {QUIZ_GENRES.map((item) => {
            const selected = genres.includes(item);
            return (
              <Button
                key={item}
                type="button"
                variant={selected ? "default" : "outline"}
                onClick={() => setGenres((prev) => (selected ? prev.filter((v) => v !== item) : [...prev, item]))}
              >
                {item}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">What is your current goal/aim?</p>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={goal === item.value ? "default" : "outline"}
              onClick={() => setGoal(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <Button onClick={onSubmit} disabled={saving}>
        Continue
      </Button>
    </div>
  );
}
