import { expect, test } from "@playwright/test";

test("manifest, home screen icons and worker headers are deployable", async ({ page, request }) => {
  await page.goto("/trade");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "UM Nexus");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", start_url: "/trade", scope: "/", display: "standalone" });
  for (const icon of [...manifest.icons, { src: "/icons/apple-touch-icon.png" }]) {
    const asset = await request.get(icon.src);
    expect(asset.ok()).toBeTruthy();
    expect(asset.headers()["content-type"]).toContain("image/png");
    const png = await asset.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  }
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  const session = await page.context().newCDPSession(page);
  await session.send("Page.getAppManifest");
  const { installabilityErrors } = await session.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});

for (const mode of ["standalone", "ios"] as const) {
  test(`${mode} home entry skips landing and keeps mobile navigation`, async ({ page }, testInfo) => {
    await page.addInitScript((displayMode) => {
      if (displayMode === "ios") {
        Object.defineProperty(navigator, "standalone", { value: true });
      } else {
        const original = window.matchMedia.bind(window);
        window.matchMedia = (query) => {
          const result = original(query);
          if (query === "(display-mode: standalone)") Object.defineProperty(result, "matches", { value: true });
          return result;
        };
      }
    }, mode);
    await page.goto("/");
    await expect(page).toHaveURL(/\/trade$/);
    await expect(page.getByRole("navigation", { name: "Mobile trade navigation" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    if (mode === "standalone") await page.screenshot({ path: testInfo.outputPath("marketplace-mobile.png") });
    await page.getByRole("navigation", { name: "Mobile trade navigation" }).getByRole("link", { name: "Sell", exact: true }).click();
    await expect(page).toHaveURL(/\/trade\/sell$/);
    await expect(page.getByRole("heading", { name: /Sign in required/i })).toBeVisible();
    await page.goto("/login");
    await page.getByRole("link", { name: /UM Nexus Trade — home/i }).click();
    await expect(page).toHaveURL(/\/trade$/);
  });
}

test("browser home retains landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Where students/i })).toBeVisible();
});

test("offline navigation falls back, retries online and caches no private responses", async ({ page, context }) => {
  await page.goto("/trade");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  await context.setOffline(true);
  await page.goto("/trade/saved");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  expect(await page.evaluate(async () => {
    const urls = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return urls.sort();
  })).toEqual(["/icons/apple-touch-icon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/offline.html"]);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: /Saved listings/i })).toBeVisible();
});
