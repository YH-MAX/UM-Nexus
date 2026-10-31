import { expect, test } from "@playwright/test";
import photos from "../../lib/trade/example-photos.json";

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
  expect(await examples.locator('a[href^="/trade/"]').evaluateAll((links) => links.every((link) => link.getAttribute("href") === "/trade/sell"))).toBe(true);
  await examples.getByRole("link", { name: /Post your own item like Scientific calculator/ }).click();
  await expect(page).toHaveURL(/\/trade\/sell$/);
  await expect(page.getByRole("heading", { name: /Sign in required/i })).toBeVisible();
  expect(writes).toEqual([]);
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
