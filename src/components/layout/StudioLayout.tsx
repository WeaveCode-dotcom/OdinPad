import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { IdeaWebQuickCaptureHost } from "@/components/idea-web/IdeaWebQuickCapture";
import { AppCommandMenu } from "@/components/layout/AppCommandMenu";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConnectivityBanner } from "@/components/layout/ConnectivityBanner";
import NovelWorkspace from "@/components/novel/NovelWorkspace";
import { useNovelContext } from "@/contexts/NovelContext";

/**
 * When a book is open, the writing workspace is full-screen (no app sidebar).
 * Otherwise, child routes render inside {@link AppLayout}.
 */
export default function StudioLayout() {
  const { activeNovel } = useNovelContext();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeNovel && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [activeNovel, location.pathname, navigate]);

  return (
    <>
      <ConnectivityBanner />
      <AppCommandMenu />
      <IdeaWebQuickCaptureHost />
      {activeNovel ? (
        <NovelWorkspace />
      ) : (
        <AppLayout>
          <Outlet />
        </AppLayout>
      )}
    </>
  );
}
