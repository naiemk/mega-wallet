import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8088",
    ...devices["iPhone 13"],
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 5"], browserName: "chromium" } }],
});
