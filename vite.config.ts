import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8")) as { version: string };

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    ...(mode === "analyze"
      ? [
          visualizer({
            filename: "dist/bundle-stats.html",
            gzipSize: true,
            template: "treemap",
          }),
        ]
      : []),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        /** Do not treat Supabase API as offline shell; always hit network for data. */
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkOnly",
          },
        ],
        navigateFallbackDenylist: [/^\/rest\/v1\//],
      },
      manifest: {
        name: "OdinPad",
        short_name: "OdinPad",
        description: "Novel writing workspace — Idea Web, Sandbox, manuscript.",
        theme_color: "#faf8f5",
        background_color: "#faf8f5",
        display: "standalone",
        start_url: "/",
        shortcuts: [
          {
            name: "Quick idea",
            short_name: "Idea",
            description: "Capture a spark to Idea Web",
            url: "/inbox?capture=1",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
