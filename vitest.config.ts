import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxWorkers: 2,
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/db/**/*.test.ts",
    ],
    environment: "node",
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 120_000,
  },
});
