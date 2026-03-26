import { useEffect } from "react";

import { usePreferences } from "@/hooks/usePreferences";

/** Applies `preferences.theme` to `<html>` for Tailwind `dark` variant. */
export function ThemeSync() {
  const { preferences } = usePreferences();

  useEffect(() => {
    const t = preferences?.theme ?? "light";
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const fs = preferences?.font_size ?? 1;
    const ff = preferences?.font_family ?? "inherit";
    root.style.setProperty("--prose-font-size", `${fs}rem`);
    root.style.setProperty("--prose-font-family", ff);
  }, [preferences?.theme, preferences?.font_size, preferences?.font_family]);

  return null;
}
