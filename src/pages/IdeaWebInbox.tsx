import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { IdeaWebInboxView } from "@/components/idea-web/IdeaWebInboxView";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { usePreferences } from "@/hooks/usePreferences";
import { openIdeaWebQuickCapture } from "@/lib/idea-web/open-quick-capture";

/**
 * Dedicated global inbox for Idea Web entries with no project (`novel_id` null).
 */
export default function IdeaWebInbox() {
  const { preferences, updatePreferences } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!preferences || preferences.first_run_idea_web_visited) return;
    void updatePreferences({ first_run_idea_web_visited: true });
  }, [preferences, updatePreferences]);

  useEffect(() => {
    if (searchParams.get("capture") !== "1") return;
    openIdeaWebQuickCapture();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("capture");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fdfbf0]">
      <AppPageHeader
        title="Idea Web"
        subtitle="Inbox and quick capture"
        helpLink={{ label: "About Idea Web", to: "/help#help-idea-web" }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <IdeaWebInboxView />
      </div>
    </div>
  );
}
