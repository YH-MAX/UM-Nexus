import { expect, test } from "@playwright/test";
import photos from "../../lib/trade/example-photos.json";
import { listingExamples } from "../../lib/trade/listing-examples";
import { exampleImages } from "../../lib/trade/example-images";

test("default production feeds never append demo items or fetch their photos", async ({ page }) => {
  const examplePhotos: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/example-photos/")) examplePhotos.push(request.url()); });
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: { items: [], total: 0, limit: 24, offset: 0, has_more: false } }));
  for (const path of ["/trade", "/trade/explore"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "No listings yet", exact: true })).toBeVisible();
    await expect(page.getByRole("article", { name: /^Demo item:/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Have something like this?" })).toHaveCount(0);
  }
  expect(examplePhotos).toEqual([]);
});

test("direct demo links open item details with photo zoom, related items and real posting entry", async ({ page }) => {
  const exampleRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/v1\/listings\/example-/.test(request.url())) exampleRequests.push(request.url());
  });
  await page.goto("/trade/example-electronics-1");
  await expect(page).toHaveURL(/\/trade\/example-electronics-1$/);
  await expect(page.getByRole("heading", { name: "Scientific calculator with slide cover", level: 1 })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Demo · not for sale.");
  await expect(page.getByRole("region", { name: "Example item details" })).toContainText("RM");
  await expect(page.getByRole("heading", { name: "About this item" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: /Enlarge photo/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close photo", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: /24-inch Full HD study monitor/ }).click();
  await expect(page).toHaveURL(/\/trade\/example-electronics-2$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "24-inch Full HD study monitor", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Post a similar item", exact: true }).click();
  await expect(page).toHaveURL(/\/trade\/sell$/);
  expect(exampleRequests).toEqual([]);
});

test("all 120 demo details resolve directly and unknown examples show not found", async ({ request, page }) => {
  for (let start = 0; start < listingExamples.length; start += 6) {
    await Promise.all(listingExamples.slice(start, start + 6).map(async (item) => {
      const response = await request.get(`/trade/${item.id}`);
      expect(response.status(), item.id).toBe(200);
      const html = await response.text();
      expect(html).toContain(exampleImages[item.id].full.src);
      expect(html).toContain("Demo · not for sale.");
      expect(html).toContain('content="noindex, follow"');
    }));
  }
  await page.goto("/trade/example-unknown-999");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
});

test("all 120 reference photos are served as valid local WebP assets", async ({ request }) => {
  const entries = Object.values(photos);
  expect(entries).toHaveLength(120);
  for (let start = 0; start < entries.length; start += 8) {
    await Promise.all(entries.slice(start, start + 8).map(async (photo) => {
      const response = await request.get(photo.src);
      expect(response.ok(), photo.src).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/webp");
      const bytes = await response.body();
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      if (photo.kind === "stock") {
        expect(photo.sourceUrl).toMatch(/^https:\/\/commons.wikimedia.org\//);
        expect(photo.author).toBeTruthy();
        expect(photo.licenseUrl).toMatch(/^https?:\/\//);
      }
    }));
  }
});

test("search and status filtering keep production browsing free of demos", async ({ page }) => {
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({ json: { items: [], total: 0, limit: 24, offset: 0, has_more: false } }));
  await page.goto("/trade");
  await page.getByPlaceholder(/Search textbooks/).fill("scientific calculator");
  await expect(page.getByRole("heading", { name: "No matching listings", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: /^Demo item:/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filters", exact: true });
  await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption("sold");
  await dialog.getByRole("button", { name: /Show .*results/ }).click();
  await expect(page.getByRole("article", { name: /^Demo item:/ })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("status")).toBe("sold");
});
