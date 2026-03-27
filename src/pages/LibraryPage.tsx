import { AppPageHeader } from "@/components/layout/AppPageHeader";
import LibraryShelf from "@/components/novel/LibraryShelf";

export default function LibraryPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <AppPageHeader
        title="Library"
        subtitle="Your manuscripts and imports"
        helpLink={{ label: "About the Library", to: "/help#help-library" }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <LibraryShelf />
      </div>
    </div>
  );
}
