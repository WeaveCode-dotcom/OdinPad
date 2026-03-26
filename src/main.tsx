import "./lib/i18n";
import "./index.css";

import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { getEnvIssues, getPublicEnvSummary, isSupabaseConfigured } from "./lib/env";
import ConfigErrorScreen from "./pages/ConfigErrorScreen";

registerSW({ immediate: true });

const el = document.getElementById("root");
if (!isSupabaseConfigured()) {
  createRoot(el).render(<ConfigErrorScreen issues={getEnvIssues()} />);
} else {
  try {
    const { supabaseUrl } = getPublicEnvSummary();
    const origin = new URL(supabaseUrl).origin;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.prepend(link);
  } catch {
    /* ignore invalid URL */
  }
  void import("./App.tsx").then(({ default: App }) => {
    createRoot(el).render(<App />);
  });
}
