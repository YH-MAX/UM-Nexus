import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { exampleImages } from "../../lib/trade/example-images";

test("versioned photos have correct hashes, dimensions and immutable cache headers", async ({ request }) => {
  const images = Object.values(exampleImages);
  expect(images).toHaveLength(120);
  const assets = images.flatMap((image) => [image.full, ...image.thumbnails]);
  for (let offset = 0; offset < assets.length; offset += 8) {
    await Promise.all(assets.slice(offset, offset + 8).map(async (image) => {
      const response = await request.get(image.src);
      expect(response.ok(), image.src).toBe(true);
      expect(response.headers()["cache-control"]).toContain("max-age=31536000");
      expect(response.headers()["cache-control"]).toContain("immutable");
      const bytes = await response.body();
      expect(bytes.length).toBe(image.bytes);
      expect(image.src).toContain(createHash("sha256").update(bytes).digest("hex").slice(0, 16));
      const metadata = await sharp(bytes).metadata();
      expect(metadata.width).toBe(image.width);
      expect(metadata.height).toBe(image.height);
    }));
  }
  expect(images.reduce((sum, image) => sum + image.card.bytes, 0)).toBeLessThan(images.reduce((sum, image) => sum + image.full.bytes, 0) * 0.6);
  const legacy = await request.get("/example-photos/example-electronics-1.webp");
  expect(legacy.ok()).toBe(true);
  expect(legacy.headers()["cache-control"]).not.toContain("immutable");
});

test("mobile cards choose thumbnails and reuse them from browser cache", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3200/trade");
    await page.getByRole("region", { name: "Have something like this?" }).scrollIntoViewIfNeeded();
    const photo = page.getByRole("article", { name: "Demo item: Scientific calculator with slide cover", exact: true }).getByRole("img");
    await photo.scrollIntoViewIfNeeded();
    const selected = await photo.evaluate(async (node: HTMLImageElement) => { await node.decode(); return new URL(node.currentSrc).pathname; });
    expect(exampleImages["example-electronics-1"].thumbnails.some((image) => image.src === selected)).toBe(true);
    await page.reload();
    await page.getByRole("region", { name: "Have something like this?" }).scrollIntoViewIfNeeded();
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate((node: HTMLImageElement) => node.decode());
    const timing = await page.evaluate((src) => {
      const entry = performance.getEntriesByType("resource").find((entry) => new URL(entry.name).pathname === src) as PerformanceResourceTiming | undefined;
      return entry ? { transferSize: entry.transferSize } : undefined;
    }, selected);
    expect(timing).toBeDefined();
    expect(timing?.transferSize).toBe(0);
  } finally { await context.close(); }
});

test("example zoom loads the full photo only after opening", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    const full = exampleImages["example-electronics-1"].full;
    const fullRequests: string[] = [];
    page.on("request", (request) => { if (new URL(request.url()).pathname === full.src) fullRequests.push(request.url()); });
    await page.goto("http://localhost:3200/trade/example-electronics-1");
    await page.getByRole("button", { name: /Enlarge photo/ }).getByRole("img").evaluate((node: HTMLImageElement) => node.decode());
    expect(fullRequests).toEqual([]);
    await page.getByRole("button", { name: /Enlarge photo/ }).click();
    const zoom = page.getByRole("dialog").getByRole("img");
    await expect(zoom).toBeVisible();
    expect(await zoom.evaluate(async (node: HTMLImageElement) => { await node.decode(); return node.naturalWidth; })).toBe(full.width);
    expect(fullRequests).toHaveLength(1);
  } finally { await context.close(); }
});

test("image optimizer resizes and rejects unapproved sources", async ({ request }) => {
  const image = exampleImages["example-electronics-1"].full;
  const response = await request.get(`/_next/image?url=${encodeURIComponent(image.src)}&w=96&q=75`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toMatch(/max-age=[1-9]\d{4,}/);
  expect((await sharp(await response.body()).metadata()).width).toBe(96);
  for (const url of ["https://example.com/photo.jpg", "http://127.0.0.1/health", "/api/v1/users/me", "/example-photos/example-electronics-1.webp"]) {
    expect((await request.get(`/_next/image?url=${encodeURIComponent(url)}&w=96&q=75`)).status()).toBe(400);
  }
});

test("bundled fonts load as cacheable local WOFF2 assets", async ({ page, request }) => {
  const fonts = new Set<string>();
  const external: string[] = [];
  page.on("request", (request) => {
    if (/\/_next\/static\/media\/.*\.woff2/.test(request.url())) fonts.add(request.url());
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) external.push(request.url());
  });
  for (const path of ["/trade", "/login"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
  }
  expect(fonts.size).toBeGreaterThanOrEqual(3);
  expect(external).toEqual([]);
  for (const url of fonts) {
    const response = await request.get(url);
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("immutable");
    expect((await response.body()).subarray(0, 4).toString()).toBe("wOF2");
  }
});
