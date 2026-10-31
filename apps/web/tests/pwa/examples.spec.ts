import { expect, test } from "@playwright/test";
import photos from "../../lib/trade/example-photos.json";
import { listingExamples } from "../../lib/trade/listing-examples";

test("120 disclosed demo items are pageable and never contact fake sellers", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/") && request.method() !== "GET" && request.method() !== "OPTIONS") writes.push(request.url());
  });
  await page.goto("/trade");
  const examples = page.getByRole("region", { name: "Have something like this?" });
  await expect(examples.getByText("Campus inspiration · 120 examples")).toBeVisible();
  await expect(examples.getByText(/Demo items for posting inspiration, not real offers/)).toBeVisible();
  await expect(examples.getByRole("article")).toHaveCount(24);
  for (let i = 0; i < 4; i++) await examples.getByRole("button", { name: /More demo items/ }).click();
  await expect(examples.getByRole("article")).toHaveCount(120);
  await expect(examples.getByRole("button", { name: /More demo items/ })).toHaveCount(0);
  await expect(examples.getByText("Demo · not for sale", { exact: true })).toHaveCount(120);
  await expect(examples.getByRole("img")).toHaveCount(120);
  expect(await examples.getByRole("img").evaluateAll((images) => images.every((image) => image.getAttribute("src")?.startsWith("/example-photos/") && image.getAttribute("loading") === "lazy"))).toBe(true);
  expect(await examples.locator('a[href^="/trade/"]').evaluateAll((links) => links.every((link) => /^\/trade\/(sell|example-[a-z_]+-\d+)$/.test(link.getAttribute("href") || "")))).toBe(true);
  await examples.getByRole("link", { name: /Post your own item like Scientific calculator/ }).click();
  await expect(page).toHaveURL(/\/trade\/sell$/);
  await expect(page.getByRole("heading", { name: /Sign in required/i })).toBeVisible();
  expect(writes).toEqual([]);
});

test("demo cards open item details with photo zoom, related items and real posting entry", async ({ page }) => {
  const exampleRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/v1\/listings\/example-/.test(request.url())) exampleRequests.push(request.url());
  });
  await page.goto("/trade");
  await page.getByRole("link", { name: "View Scientific calculator with slide cover", exact: true }).click();
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
      expect(html).toContain(`/example-photos/${item.id}.webp`);
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

test("demo search resets pagination and keeps real status filters honest", async ({ page }) => {
  await page.goto("/trade");
  const examples = page.getByRole("region", { name: "Have something like this?" });
  await examples.getByRole("button", { name: /More demo items/ }).click();
  await page.getByPlaceholder(/Search textbooks/).fill("scientific calculator");
  await expect(examples.getByRole("article")).toHaveCount(1);
  await expect(examples.getByRole("heading", { name: "Scientific calculator with slide cover" })).toBeVisible();
  await page.getByPlaceholder(/Search textbooks/).fill("");
  await expect(examples.getByRole("article")).toHaveCount(24);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("sold");
  await page.getByRole("button", { name: "Close filters" }).last().click();
  await expect(examples).toHaveCount(0);
});
