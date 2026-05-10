import { expect, test } from "@playwright/test";

test.describe("guest marketplace behavior", () => {
  test("guest can browse but protected actions ask for sign in", async ({ page }) => {
    await page.goto("/trade");

    await expect(page.getByRole("heading", { name: /Browse UM Listings/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search textbooks/i)).toBeVisible();

    await page.goto("/trade/saved");
    await expect(page.getByText(/Sign in with your UM account/i)).toBeVisible();

    await page.goto("/trade/dashboard");
    await expect(page.getByText(/Sign in with your UM account/i)).toBeVisible();
  });

  test("marketplace filters keep the user on the product feed", async ({ page }) => {
    await page.goto("/trade");

    await page.getByPlaceholder(/Search textbooks/i).fill("calculator");
    await expect(page.getByPlaceholder(/Search textbooks/i)).toHaveValue("calculator");

    await page.getByRole("button", { name: "Electronics" }).click();
    await expect(page.getByRole("button", { name: /Clear all filters/i })).toBeVisible();
  });

  test("sell page keeps manual listing available without AI", async ({ page }) => {
    await page.goto("/trade/sell");

    await expect(page.getByRole("heading", { name: /Sell an item/i })).toBeVisible();
    await expect(page.getByText(/Create a campus listing manually first/i)).toBeVisible();
    await expect(page.getByText(/AI is optional/i)).toBeVisible();
  });
});
