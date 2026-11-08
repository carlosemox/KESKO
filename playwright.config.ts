import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium" },
  webServer: {
    command: "node dist/server.js",
    url: "http://127.0.0.1:3000/workflow",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
