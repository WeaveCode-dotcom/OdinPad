import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import boundaries from "eslint-plugin-boundaries";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

/**
 * Typed linting: `src/` only. Root Vite/Tailwind configs are ignored (different TS project roots).
 * Incrementally tighten: raise `@typescript-eslint/no-floating-promises` to `error`, add `strictTypeChecked` to extends.
 */
export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "lighthouserc.cjs",
      "commitlint.config.cjs",
      "tailwind.config.ts",
      "vite.config.ts",
      "vitest.config.ts",
      "postcss.config.js",
      "public/sw.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "simple-import-sort": simpleImportSort,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "pages", pattern: "src/pages/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "contexts", pattern: "src/contexts/**" },
        { type: "hooks", pattern: "src/hooks/**" },
        { type: "api", pattern: "src/api/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "types", pattern: "src/types/**" },
        { type: "workers", pattern: "src/workers/**" },
        { type: "integrations", pattern: "src/integrations/**" },
      ],
    },
    rules: {
      // Domain boundary rules (warnings only; will become errors once fully compliant)
      // lib must not import from components, pages, contexts, or hooks
      "boundaries/no-unknown-files": "warn",
      // types must not import from anything except other types
      // Enforce via the element-types rule
      "boundaries/element-types": [
        "warn",
        {
          default: "allow",
          rules: [
            // lib is pure util — no React imports
            { from: "lib", disallow: ["components", "pages", "contexts", "hooks"] },
            // types have zero deps (pure TS interfaces)
            { from: "types", disallow: ["components", "pages", "contexts", "hooks", "lib", "api"] },
            // workers should not import React components
            { from: "workers", disallow: ["components", "pages", "contexts", "hooks"] },
            // api should not import components or pages
            { from: "api", disallow: ["components", "pages"] },
          ],
        },
      ],
      ...reactHooks.configs.recommended.rules,
      // Enforce exhaustive deps to prevent stale closure bugs
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      // Warn on console.log/debug in src (use console.warn/error for intentional messages)
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
    },
  },
  eslintConfigPrettier,
);
