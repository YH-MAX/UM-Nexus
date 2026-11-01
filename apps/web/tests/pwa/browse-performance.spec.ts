import { expect, test } from "@playwright/test";

const emptyFeed = { items: [], total: 0, limit: 24, offset: 0, has_more: false };

test("a failed early feed request falls back to a fresh request", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/v1/listings?*", async (route) => {
    requests++;
    if (requests === 1) await route.fulfill({ status: 503, json: { detail: "Starting up" } });
    else await route.fulfill({ json: emptyFeed });
  });
  await page.goto("/trade");
  await expect(page.getByRole("heading", { name: "No listings yet", exact: true })).toBeVisible();
  expect(requests).toBe(2);
});

test("account routes do not start the public feed bootstrap", async ({ page }) => {
  const feeds: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/listings?")) feeds.push(request.url()); });
  await page.goto("/trade/profile");
  await expect(page.getByRole("heading", { name: "Sign in required", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__umNexusPublicBrowse)).toBeUndefined();
  expect(feeds).toEqual([]);
});

test("anonymous feed starts before application scripts and is reused after hydration", async ({ page }) => {
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/_next/static/**/*.js", async (route) => { await scripts; await route.continue(); });
  await page.route("**/api/v1/listings?*", async (route) => {
    requests++;
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: emptyFeed });
  });
  try {
    await page.goto("/trade", { waitUntil: "commit" });
    await expect.poll(() => requests).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("heading", { name: "No listings yet", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile trade navigation" }).getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page.getByRole("heading", { name: "All Items", exact: true }).first()).toBeVisible();
  expect(requests).toBe(1);
});

test("mobile skeleton is two columns, chrome has no blur, and demos stay absent", async ({ page }) => {
  let release!: () => void;
  const feed = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/listings?*", async (route) => { await feed; await route.fulfill({ json: emptyFeed }); });
  try {
    await page.goto("/trade", { waitUntil: "domcontentloaded" });
    const skeleton = page.getByRole("status", { name: "Loading marketplace listings" });
    await expect(skeleton).toBeVisible();
    const [first, second] = await skeleton.locator(":scope > div").evaluateAll((nodes) => nodes.slice(0, 2).map((node) => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })));
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBe(first.y);
    expect(await page.locator(".nexus-header, .nexus-bottom-nav").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).backdropFilter === "none"))).toBe(true);
    await expect(page.getByRole("article", { name: /^Demo item:/ })).toHaveCount(0);
  } finally { release(); }
  await expect(page.getByRole("heading", { name: "No listings yet", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Have something like this?" })).toHaveCount(0);
  await expect(page.getByRole("article", { name: /^Demo item:/ })).toHaveCount(0);
});
