import { expect, test } from "@playwright/test";
import { mockVisualViewport } from "./helpers/mobile-viewport";

test("mobile UX: home exposes the first row of live products above the navigation", async ({ page }, testInfo) => {
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: {
    items: Array.from({ length: 4 }, (_, i) => ({
      id: `phone-item-${i}`, title: "Campus study desk lamp", price: 25, currency: "MYR", category: "dorm_room",
      condition_label: "good", pickup_location: "kk1", status: "available", images: [], created_at: new Date().toISOString(),
    })), total: 4, limit: 24, offset: 0, has_more: false,
  } }));
  for (const [width, height] of [[375, 667], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/trade");
    const cards = page.locator(".nexus-listing-card");
    await expect(cards).toHaveCount(4);
    const nav = page.getByRole("navigation", { name: "Mobile trade navigation" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    const navBounds = (await nav.boundingBox())!;
    for (let index = 0; index < 2; index++) {
      const bounds = (await cards.nth(index).boundingBox())!;
      expect(bounds.y).toBeGreaterThan(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(navBounds.y);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) });
  }
  for (const width of [768, 820, 1023, 1024]) {
    await page.setViewportSize({ width, height: 1024 });
    await expect(page.getByRole("navigation", { name: width < 1024 ? "Mobile trade navigation" : "Trade navigation", exact: true })).toBeVisible();
  }
});

test("mobile UX: standalone launch retains browsing tabs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
  });
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: { items: [], total: 0, limit: 24, offset: 0, has_more: false } }));
  await page.goto("/");
  await expect(page).toHaveURL(/\/trade$/);
  await expect(page.getByRole("navigation", { name: "Mobile trade navigation" }).getByRole("link")).toHaveCount(5);
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/\/trade\/explore$/);
  await expect(page.getByRole("navigation", { name: "Mobile trade navigation" })).toBeVisible();
});

test("mobile UX: browsing keyboard hides tabs without mistaking toolbar resize or zoom for a keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockVisualViewport(page);
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: { items: [], total: 0, limit: 24, offset: 0, has_more: false } }));
  await page.goto("/trade");
  const nav = page.getByRole("navigation", { name: "Mobile trade navigation" });
  await page.getByRole("searchbox", { name: "Search marketplace" }).focus();
  await page.evaluate(() => window.resizeTestKeyboard(780));
  await expect(nav).toBeVisible();
  await page.evaluate(() => window.resizeTestKeyboard(400, 0, 2));
  await expect(nav).toBeVisible();
  await page.evaluate(() => window.resizeTestKeyboard(400));
  await expect(nav).toBeHidden();
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.resizeTestKeyboard(844); });
  await expect(nav).toBeVisible();
});

test("mobile UX: filter fields and Show results fit the visual viewport with a keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockVisualViewport(page);
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: { items: [], total: 0, limit: 24, offset: 0, has_more: false } }));
  await page.goto("/trade/explore");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filters", exact: true });
  const input = dialog.getByPlaceholder("Min RM");
  await input.fill("10");
  await page.evaluate(() => window.resizeTestKeyboard(400));
  await expect(page.getByRole("main")).toHaveAttribute("data-keyboard-open", "true");
  const show = dialog.getByRole("button", { name: /Show .*results/ });
  await expect.poll(async () => {
    const bounds = (await show.boundingBox())!;
    return bounds.y + bounds.height;
  }).toBeLessThanOrEqual(400);
  await expect(input).toBeInViewport();
  await show.click();
  await expect(dialog).toHaveCount(0);
});

test("mobile UX: search Enter dismisses editing after IME composition finishes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: { items: [], total: 0, limit: 24, offset: 0, has_more: false } }));
  await page.goto("/trade");
  const search = page.getByRole("searchbox", { name: "Search marketplace" });
  await search.fill("计算器");
  await search.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(search).toBeFocused();
  await search.press("Enter");
  await expect(search).not.toBeFocused();
  await expect(search).toHaveValue("计算器");
  expect(new URL(page.url()).searchParams.get("search")).toBe("计算器");
});
