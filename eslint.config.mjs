import quality from "./eslint-rules/index.cjs";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    plugins: { quality },
    rules: {
      // Measure existing debt without weakening any existing validation.
      "quality/max-lines": ["warn", { max: 350 }],
    },
  },
];
