import { defineConfig, devices } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  testMatch: ["mobile-ux.spec.ts", "trade-workflows.spec.ts"],
  projects: [
    { name: "iphone-safari", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    { name: "android-chrome", use: { ...devices["Pixel 5"], browserName: "chromium" } },
  ],
});
