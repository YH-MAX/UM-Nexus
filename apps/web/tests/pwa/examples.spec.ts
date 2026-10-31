import { expect, test } from "@playwright/test";

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
  expect(await examples.locator('a[href^="/trade/"]').evaluateAll((links) => links.every((link) => link.getAttribute("href") === "/trade/sell"))).toBe(true);
  await examples.getByRole("link", { name: /Post your own item like Scientific calculator/ }).click();
  await expect(page).toHaveURL(/\/trade\/sell$/);
  await expect(page.getByRole("heading", { name: /Sign in required/i })).toBeVisible();
  expect(writes).toEqual([]);
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
