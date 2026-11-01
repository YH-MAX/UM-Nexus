import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/listings?*", (route) => route.fulfill({
    json: { items: [], total: 0, limit: 24, offset: 0, has_more: false },
  }));
});

test("primary navigation covers phone, tablet and desktop widths", async ({ page }) => {
  await page.goto("/trade");
  for (const width of [375, 767, 768, 820, 1023, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const name = width < 1024 ? "Mobile trade navigation" : "Trade navigation";
    await expect(page.getByRole("navigation", { name, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("default browsing contains only live inventory, including the empty state", async ({ page }) => {
  for (const path of ["/trade", "/trade/explore"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "No listings yet", exact: true })).toBeVisible();
    await expect(page.getByText("Have something like this?", { exact: true })).toHaveCount(0);
    await expect(page.locator(".nexus-examples")).toHaveCount(0);
  }
});

test("filters support keyboard containment, Escape and a persistent results action", async ({ page }) => {
  await page.goto("/trade/explore");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Filters", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close filters" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: /Show .*results/ })).toBeEnabled();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: /Show .*results/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close filters" })).toBeFocused();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByPlaceholder("Min RM").fill("50");
  await dialog.getByPlaceholder("Max RM").fill("10");
  await expect(dialog.getByRole("button", { name: /Show .*results/ })).toBeDisabled();
  await dialog.getByPlaceholder("Max RM").fill("100");
  await dialog.getByRole("combobox", { name: "Condition", exact: true }).selectOption("good");
  await dialog.getByRole("combobox", { name: "Pickup", exact: true }).selectOption("kk1");
  await dialog.getByRole("combobox", { name: "Sort by", exact: true }).selectOption("price_low_high");
  await dialog.getByRole("button", { name: /Show .*results/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.reload();
  await trigger.click();
  await expect(dialog.getByPlaceholder("Min RM")).toHaveValue("50");
  await expect(dialog.getByPlaceholder("Max RM")).toHaveValue("100");
  await expect(dialog.getByRole("combobox", { name: "Condition", exact: true })).toHaveValue("good");
  await expect(dialog.getByRole("combobox", { name: "Pickup", exact: true })).toHaveValue("kk1");
  await expect(dialog.getByRole("combobox", { name: "Sort by", exact: true })).toHaveValue("price_low_high");
});
