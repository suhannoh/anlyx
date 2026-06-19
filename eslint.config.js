import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".next/**",
      ".turbo/**",
      "playwright-report/**",
      "test-results/**",
      ".anlyx/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
];
