import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: /Buy smarter|UM Nexus Trade/i },
  { path: "/trade", heading: /Browse UM Listings/i },
  { path: "/trade/sell", heading: /Sell an item/i },
  { path: "/trade/want", heading: /Wanted board/i },
  { path: "/trade/saved", heading: /Saved listings/i },
  { path: "/trade/dashboard", heading: /My Trade/i },
  { path: "/trade/notifications", heading: /Trade alerts/i },
  { path: "/trade/profile", heading: /Trade profile/i },
  { path: "/trade/moderation", heading: /Trust review queue/i },
  { path: "/safety", heading: /Trade safely within UM/i },
  { path: "/terms", heading: /UM Nexus Trade Terms/i },
  { path: "/privacy", heading: /UM Nexus Trade Privacy/i },
  { path: "/login", heading: /Welcome back/i },
  { path: "/signup", heading: /Create your account/i },
];

test.describe("product route smoke", () => {
  for (const route of publicRoutes) {
    test(`${route.path} renders`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
    });
  }
});

test("trade shell exposes launch navigation", async ({ page, isMobile }) => {
  await page.goto("/trade");

  await expect(page.getByRole("link", { name: /Sell/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Wanted/i }).first()).toBeVisible();

  if (isMobile) {
    await expect(page.getByRole("navigation", { name: /Mobile trade navigation/i })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: /Trade navigation/i })).toBeVisible();
  }
});
