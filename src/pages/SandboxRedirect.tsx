import { useLayoutEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

import { useNovelContext } from "@/contexts/NovelContext";

/**
 * Legacy bookmark: `/sandbox/:novelId` loads the dashboard flow after opening that novel in Sandbox.
 * (Bare `/sandbox` is handled in App routes and redirects without this component.)
 */
export default function SandboxRedirect() {
  const { novelId } = useParams();
  const { openBookSandbox } = useNovelContext();

  useLayoutEffect(() => {
    if (novelId) openBookSandbox(novelId);
  }, [novelId, openBookSandbox]);

  return <Navigate to="/" replace />;
}
