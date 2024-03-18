// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/*"],
  },
  {
    rules: {
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/promise-function-async": "error",
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  {
    files: ["tools/**"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // This exposes the special hooks from JXA, and needs special handling
    files: ["jxa/src/api.d.ts"],
    rules: {
      // For now, we're using any for $ and ObjC
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
