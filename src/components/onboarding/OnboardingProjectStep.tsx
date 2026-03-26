import { BookCreationAdvancedFields } from "@/components/novel/BookCreationAdvancedFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rankFrameworkRecommendations } from "@/lib/book-creation";
import type { BookAudience, BookPov, BookTense, WordCountPresetId } from "@/lib/book-metadata";
import type { BookSeriesRow } from "@/lib/series-service";
import { STORY_FRAMEWORKS } from "@/lib/story-frameworks";
import type { Novel } from "@/types/novel";
import { trackEvent } from "@/lib/analytics";

interface OnboardingProjectStepProps {
  title: string;
  setTitle: (v: string) => void;
  projectGenre: string;
  setProjectGenre: (v: string) => void;
  premise: string;
  setPremise: (v: string) => void;
  targetWordCount: string;
  setTargetWordCount: (v: string) => void;
  frameworkId: string;
  setFrameworkId: (v: string) => void;
  projectAdvancedOpen: boolean;
  setProjectAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newSubtitle: string;
  setNewSubtitle: (v: string) => void;
  newPenName: string;
  setNewPenName: (v: string) => void;
  newLogline: string;
  setNewLogline: (v: string) => void;
  newComparables: string;
  setNewComparables: (v: string) => void;
  newSecondaryGenres: string[];
  setNewSecondaryGenres: (v: string[]) => void;
  newWordCountPreset: WordCountPresetId | "";
  setNewWordCountPreset: (v: WordCountPresetId | "") => void;
  newSeriesScope: "standalone" | "series";
  setNewSeriesScope: (v: "standalone" | "series") => void;
  newSeriesId: string;
  setNewSeriesId: (id: string) => void;
  newSeriesPosition: string;
  setNewSeriesPosition: (v: string) => void;
  newAudience: BookAudience | "";
  setNewAudience: (v: BookAudience | "") => void;
  newContentWarnings: string[];
  setNewContentWarnings: (v: string[]) => void;
  newDefaultPov: BookPov | "";
  setNewDefaultPov: (v: BookPov | "") => void;
  newDefaultTense: BookTense | "";
  setNewDefaultTense: (v: BookTense | "") => void;
  newCoverImageDataUrl: string;
  setNewCoverImageDataUrl: (v: string) => void;
  userId: string | undefined;
  genres: string[];
  writingStyle: string;
  goal: string;
  seriesRows: BookSeriesRow[];
  novels: Novel[];
  saving: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function OnboardingProjectStep({
  title,
  setTitle,
  projectGenre,
  setProjectGenre,
  premise,
  setPremise,
  targetWordCount,
  setTargetWordCount,
  frameworkId,
  setFrameworkId,
  projectAdvancedOpen,
  setProjectAdvancedOpen,
  newSubtitle,
  setNewSubtitle,
  newPenName,
  setNewPenName,
  newLogline,
  setNewLogline,
  newComparables,
  setNewComparables,
  newSecondaryGenres,
  setNewSecondaryGenres,
  newWordCountPreset,
  setNewWordCountPreset,
  newSeriesScope,
  setNewSeriesScope,
  newSeriesId,
  setNewSeriesId,
  newSeriesPosition,
  setNewSeriesPosition,
  newAudience,
  setNewAudience,
  newContentWarnings,
  setNewContentWarnings,
  newDefaultPov,
  setNewDefaultPov,
  newDefaultTense,
  setNewDefaultTense,
  newCoverImageDataUrl,
  setNewCoverImageDataUrl,
  userId,
  genres,
  writingStyle,
  goal,
  saving,
  onBack,
  onSubmit,
}: OnboardingProjectStepProps) {
  const frameworkRecommendations = rankFrameworkRecommendations({
    selectedGenre: projectGenre || genres[0],
    preferredGenres: genres,
    writingStyle: writingStyle as Parameters<typeof rankFrameworkRecommendations>[0]["writingStyle"],
    primaryGoal: goal as Parameters<typeof rankFrameworkRecommendations>[0]["primaryGoal"],
    fallbackFrameworkId: frameworkId,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Create your first project</h2>
      <p className="text-sm text-muted-foreground">Now that you completed the tour, create your first real project.</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
      <Input value={projectGenre} onChange={(e) => setProjectGenre(e.target.value)} placeholder="Genre" />
      <button
        type="button"
        onClick={() => setProjectAdvancedOpen((o) => !o)}
        className="text-left text-xs font-medium text-primary"
      >
        {projectAdvancedOpen ? "Hide additional details" : "Additional details (series, metadata, length…)"}
      </button>
      {projectAdvancedOpen && (
        <BookCreationAdvancedFields
          primaryGenre={projectGenre || genres[0] || "General"}
          userId={userId}
          subtitle={newSubtitle}
          setSubtitle={setNewSubtitle}
          penName={newPenName}
          setPenName={setNewPenName}
          logline={newLogline}
          setLogline={setNewLogline}
          comparables={newComparables}
          setComparables={setNewComparables}
          secondaryGenres={newSecondaryGenres}
          setSecondaryGenres={setNewSecondaryGenres}
          wordCountPreset={newWordCountPreset}
          setWordCountPreset={setNewWordCountPreset}
          seriesScope={newSeriesScope}
          setSeriesScope={setNewSeriesScope}
          seriesId={newSeriesId}
          setSeriesId={(id, _t) => setNewSeriesId(id)}
          seriesPosition={newSeriesPosition}
          setSeriesPosition={setNewSeriesPosition}
          audience={newAudience}
          setAudience={setNewAudience}
          contentWarnings={newContentWarnings}
          setContentWarnings={setNewContentWarnings}
          defaultPov={newDefaultPov}
          setDefaultPov={setNewDefaultPov}
          defaultTense={newDefaultTense}
          setDefaultTense={setNewDefaultTense}
          premise={premise}
          setPremise={setPremise}
          targetWordCount={targetWordCount}
          setTargetWordCount={setTargetWordCount}
          coverImageDataUrl={newCoverImageDataUrl}
          setCoverImageDataUrl={setNewCoverImageDataUrl}
        />
      )}
      {!projectAdvancedOpen && (
        <>
          <Input value={premise} onChange={(e) => setPremise(e.target.value)} placeholder="One-sentence premise" />
          <Input
            value={targetWordCount}
            onChange={(e) => setTargetWordCount(e.target.value)}
            placeholder="Target word count (optional)"
          />
        </>
      )}
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Quick-start template</p>
        <div className="grid grid-cols-2 gap-2">
          {STORY_FRAMEWORKS.map((framework) => (
            <Button
              key={framework.id}
              type="button"
              variant={frameworkId === framework.id ? "default" : "outline"}
              onClick={() => {
                setFrameworkId(framework.id);
                trackEvent("book_create_template_selected", {
                  source: "onboarding",
                  frameworkId: framework.id,
                });
              }}
            >
              {framework.shortName}
            </Button>
          ))}
        </div>
        {frameworkRecommendations.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Recommended templates:{" "}
            {frameworkRecommendations
              .slice(0, 3)
              .map((item) => {
                const match = STORY_FRAMEWORKS.find((framework) => framework.id === item.frameworkId);
                return match?.shortName ?? item.frameworkId;
              })
              .join(", ")}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={saving}>
          Create project
        </Button>
      </div>
    </div>
  );
}
