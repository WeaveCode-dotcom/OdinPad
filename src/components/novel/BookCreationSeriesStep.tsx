import { BookSeriesPlacementForm } from "@/components/novel/BookSeriesPlacementForm";

interface BookCreationSeriesStepProps {
  userId: string | undefined;
  seriesScope: "standalone" | "series";
  setSeriesScope: (v: "standalone" | "series") => void;
  seriesId: string;
  setSeriesId: (id: string, title?: string) => void;
  seriesPosition: string;
  setSeriesPosition: (v: string) => void;
  subtitle: string;
  setSubtitle: (v: string) => void;
}

export function BookCreationSeriesStep({
  userId,
  seriesScope,
  setSeriesScope,
  seriesId,
  setSeriesId,
  seriesPosition,
  setSeriesPosition,
  subtitle,
  setSubtitle,
}: BookCreationSeriesStepProps) {
  return (
    <BookSeriesPlacementForm
      userId={userId}
      seriesScope={seriesScope}
      setSeriesScope={setSeriesScope}
      seriesId={seriesId}
      setSeriesId={setSeriesId}
      seriesPosition={seriesPosition}
      setSeriesPosition={setSeriesPosition}
      subtitle={subtitle}
      setSubtitle={setSubtitle}
      intro={
        <div className="rounded-lg border border-teal-600/30 bg-teal-50/50 px-3 py-2.5 text-sm leading-snug text-teal-950 dark:bg-teal-950/30 dark:text-teal-50">
          Choose whether this project is a <strong>standalone</strong> book or belongs to a <strong>series</strong>. You
          can create a new series below if needed.
        </div>
      }
    />
  );
}
