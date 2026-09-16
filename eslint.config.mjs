import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // `out/**` is the static export: the same built bundles as `.next/**`, and
  // linting a minified chunk against the type-aware config only produces
  // parse errors for files no tsconfig covers.
  { ignores: [".next/**", "out/**", "node_modules/**", "public/grids/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "*.config.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { "@next/next": next, "react-hooks": reactHooks },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  { files: ["*.config.*", "scripts/**"], rules: { "@typescript-eslint/no-unnecessary-condition": "off" } },
);
