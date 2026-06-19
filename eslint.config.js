import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "**/dist/**",
      "build/**",
      "**/build/**",
      "coverage/**",
      ".next/**",
      ".turbo/**",
      "playwright-report/**",
      "test-results/**",
      ".anlyx/**"
    ]
  },
  {
    files: ["scripts/**/*.mjs", "packages/*/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly"
      }
    }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
];
