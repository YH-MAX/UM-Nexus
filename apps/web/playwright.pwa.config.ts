import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["pwa/**/*.spec.ts", "smoke.spec.ts"],
  timeout: 45_000,
  workers: 1,
  use: { baseURL: "http://localhost:3200", serviceWorkers: "allow", trace: "retain-on-failure" },
  webServer: {
    command: "next start --hostname 0.0.0.0 --port 3200",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "mobile-pwa", use: { ...devices["Pixel 5"] } }],
});
