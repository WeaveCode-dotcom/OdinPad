import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, BookPlus, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { SeriesManageDialog } from "@/components/novel/SeriesManageDialog";
import { SortableSeriesBookCard } from "@/components/novel/SortableSeriesBookCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { type BookSeriesRow, fetchBookSeriesForUser } from "@/lib/series-service";

export default function SeriesWorkspacePage() {
  const { id: seriesId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { novels, setActiveNovel, patchNovel } = useNovelContext();

  const [seriesRow, setSeriesRow] = useState<BookSeriesRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!user?.id || !seriesId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchBookSeriesForUser(user.id)
      .then((rows) => {
        const found = rows.find((r) => r.id === seriesId) ?? null;
        setSeriesRow(found);
      })
      .catch(() => {
        toast({ title: "Could not load series", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [user?.id, seriesId]);

  const seriesBooks = useMemo(() => {
    if (!seriesId) return [];
    return novels
      .filter((n) => n.seriesId === seriesId)
      .sort((a, b) => (a.seriesPosition ?? 9999) - (b.seriesPosition ?? 9999));
  }, [novels, seriesId]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = seriesBooks.findIndex((n) => n.id === active.id);
      const newIndex = seriesBooks.findIndex((n) => n.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(seriesBooks, oldIndex, newIndex);
      reordered.forEach((novel, i) => {
        const pos = i + 1;
        if (novel.seriesPosition !== pos) patchNovel(novel.id, { seriesPosition: pos });
      });
    },
    [seriesBooks, patchNovel],
  );

  if (!loading && !seriesRow) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#fdfbf0]">
        <AppPageHeader title="Series not found" subtitle="" />
        <div className="p-6">
          <Link to={ROUTES.library} className="text-sm text-teal-700 underline">
            ← Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fdfbf0]">
      <AppPageHeader
        title={loading ? "Loading…" : (seriesRow?.title ?? "Series")}
        subtitle={seriesRow?.description ?? "Book series workspace"}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Navigation + actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-2 border-neutral-900"
              onClick={() => navigate(ROUTES.library)}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Library
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-2 border-neutral-900"
                onClick={() => setManageOpen(true)}
                disabled={!seriesRow}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit series
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 border-2 border-neutral-900 bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => navigate(ROUTES.library)}
                title="Add book in the Library → New book → choose this series"
              >
                <BookPlus className="h-3.5 w-3.5" aria-hidden />
                Add book
              </Button>
            </div>
          </div>

          {/* Series header card */}
          {!loading && seriesRow && (
            <div className="rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-[4px_4px_0_0_rgb(0_0_0_/_0.08)] md:p-5">
              <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">{seriesRow.title}</h2>
              {seriesRow.description && <p className="mt-1 text-sm text-muted-foreground">{seriesRow.description}</p>}
              <p className="mt-2 text-xs text-neutral-500">
                {seriesBooks.length} book{seriesBooks.length === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {/* Book list */}
          <div className="rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-[4px_4px_0_0_rgb(0_0_0_/_0.1)] md:p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Books in series</h3>
              {seriesBooks.length > 1 && (
                <span className="text-[11px] text-muted-foreground">Drag the handle to reorder</span>
              )}
            </div>

            {loading ? (
              <div className="h-24 animate-pulse rounded-md bg-neutral-100" />
            ) : seriesBooks.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-neutral-300 p-6 text-center">
                <p className="text-sm text-muted-foreground">No books yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a book in Library → New book and pick this series.
                </p>
              </div>
            ) : (
              <DndContext
                id={`series-workspace-${seriesId}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={seriesBooks.map((n) => n.id)} strategy={rectSortingStrategy}>
                  <div className="space-y-2">
                    {seriesBooks.map((novel, i) => (
                      <SortableSeriesBookCard
                        key={novel.id}
                        novel={novel}
                        index={i}
                        onOpen={() => {
                          setActiveNovel(novel.id);
                          navigate("/");
                        }}
                        onEdit={(e) => {
                          e.stopPropagation();
                          // Navigate to library with the book selected for editing
                          navigate(ROUTES.library);
                        }}
                        onDelete={(e) => {
                          e.stopPropagation();
                          navigate(ROUTES.library);
                        }}
                        prefetchWorkspace={() => {}}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {seriesRow && (
        <SeriesManageDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          userId={user?.id}
          series={seriesRow}
          novels={novels}
          analyticsSource="series_workspace"
          onSeriesUpdated={(rows) => {
            const updated = rows.find((r) => r.id === seriesId);
            if (updated) setSeriesRow(updated);
          }}
          onSeriesDeleted={() => navigate(ROUTES.library)}
          onRefreshNovelSeriesTitles={(sid, newTitle) => {
            if (sid === seriesId) setSeriesRow((prev) => (prev ? { ...prev, title: newTitle } : prev));
          }}
        />
      )}
    </div>
  );
}
