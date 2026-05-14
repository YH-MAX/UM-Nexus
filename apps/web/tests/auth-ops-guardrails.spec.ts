import { expect, type Page, type Route, test } from "@playwright/test";

const now = "2026-05-15T00:00:00.000Z";

test.describe("auth and operator access guardrails", () => {
  test("signup blocks non-UM email domains", async ({ page }) => {
    await page.goto("/signup");

    await page.getByRole("button", { name: /Sign up with email/i }).click();
    await page.getByLabel(/UM email/i).fill("student@gmail.com");
    await page.getByLabel(/^Password$/i).fill("password123");
    await page.getByRole("button", { name: /Create account/i }).click();

    await expect(page.getByRole("article", { name: /Create your account/i }).getByRole("alert")).toContainText(/Use a University of Malaya email address/i);
  });

  test("guest is prompted to sign in on internal operator pages", async ({ page }) => {
    await page.goto("/trade/launch-checklist");
    await expect(page.getByRole("heading", { name: /Sign in required/i })).toBeVisible();

    await page.goto("/trade/evaluation");
    await expect(page.getByRole("heading", { name: /Sign in required/i })).toBeVisible();
  });

  test("student account is blocked from launch checklist", async ({ page }) => {
    await loginAs(page, { id: "student-1", email: "student@siswa.um.edu.my" });
    await mockOperatorApi(page, "student");

    await page.goto("/trade/launch-checklist");

    await expect(page.getByRole("heading", { name: /Access restricted/i })).toBeVisible();
  });

  test("moderator can view launch checklist", async ({ page }) => {
    await loginAs(page, { id: "moderator-1", email: "moderator@siswa.um.edu.my" });
    await mockOperatorApi(page, "moderator");

    await page.goto("/trade/launch-checklist");

    await expect(page.getByRole("heading", { name: /Launch readiness/i })).toBeVisible();
    await expect(page.getByText(/Internal . Operator-only . Not visible to students/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ready to launch|Action needed before launch/i })).toBeVisible();
  });

  test("admin can view and run release quality controls", async ({ page }) => {
    await loginAs(page, { id: "admin-1", email: "admin@siswa.um.edu.my" });
    await mockOperatorApi(page, "admin");

    await page.goto("/trade/evaluation");

    await expect(page.getByRole("heading", { name: /Release quality controls/i })).toBeVisible();
    await expect(page.getByText(/Internal . Operator-only . Not visible to students/i)).toBeVisible();
    await expect(page.getByText(/GLM status/i)).toBeVisible();

    await page.getByRole("button", { name: /Run quality gate/i }).click();
    await expect(page.getByText(/Scenario set focused on UM marketplace decisions./i)).toBeVisible();
  });
});

async function loginAs(page: Page, user: { id: string; email: string }) {
  await page.addInitScript((nextUser) => {
    window.localStorage.setItem("um_nexus_e2e_user", JSON.stringify(nextUser));
  }, user);
}

async function mockOperatorApi(page: Page, appRole: "student" | "moderator" | "admin") {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = request.method();

    if (method === "GET" && path === "/auth/me") {
      return json(route, {
        user: {
          id: `${appRole}-1`,
          email: `${appRole}@siswa.um.edu.my`,
          username: appRole,
          status: "active",
          created_at: now,
          updated_at: now,
        },
        profile: {
          id: `profile-${appRole}`,
          user_id: `${appRole}-1`,
          full_name: `${appRole} user`,
          display_name: appRole,
          avatar_url: null,
          bio: null,
          faculty: "FSKTM",
          year_of_study: 2,
          residential_college: "KK12",
          college_or_location: "KK12",
          contact_preference: "telegram",
          contact_value: `@${appRole}`,
          verified_um_email: true,
          app_role: appRole,
          trade_safety_acknowledged_at: null,
          created_at: now,
          updated_at: now,
        },
      });
    }

    if (method === "GET" && path === "/admin/launch-checklist") {
      return json(route, {
        items: [
          {
            key: "active_listings",
            label: "Active listings",
            section: "Content",
            value: 14,
            status: "green",
            detail: "Listings exceed minimum launch baseline.",
          },
          {
            key: "open_moderation_items",
            label: "Open moderation items",
            section: "Safety",
            value: 0,
            status: "green",
            detail: "No unresolved high-risk moderation items.",
          },
        ],
        active_listings: 14,
        listings_without_photo: 0,
        listings_missing_pickup_or_contact: 0,
        active_users: 42,
        pending_reports: 0,
        open_moderation_items: 0,
        ai_provider_status: "healthy",
        failed_ai_calls_24h: 0,
        total_ai_calls_24h: 21,
        contact_requests_sent: 17,
        contact_requests_accepted: 11,
      });
    }

    if (method === "GET" && path === "/ai/trade/provider-status") {
      return json(route, {
        provider: "demo",
        model: "deterministic-v1",
        status: "ready",
        should_use_zai_provider: false,
        fallback_mode: "deterministic",
        live_checked: false,
        last_successful_call_at: now,
        message: null,
      });
    }

    if (method === "GET" && path === "/ai/trade/evaluation/summary") {
      return json(route, evaluationSummary());
    }

    if (method === "POST" && path === "/ai/trade/evaluation/run") {
      return json(route, evaluationSummary());
    }

    return json(route, {});
  });
}

function evaluationSummary() {
  return {
    case_count: 3,
    evaluated_case_count: 3,
    ai_overall_score: 88,
    baseline_overall_score: 61,
    overall_score_delta: 0.27,
    ai_pricing_accuracy_rate: 0.84,
    baseline_pricing_accuracy_rate: 0.5,
    price_accuracy_delta: 0.34,
    ai_risk_detection_rate: 0.91,
    baseline_risk_detection_rate: 0.62,
    risk_detection_delta: 0.29,
    ai_action_agreement_rate: 0.86,
    baseline_action_agreement_rate: 0.54,
    action_agreement_delta: 0.32,
    ai_match_quality_rate: 0.82,
    baseline_match_quality_rate: 0.57,
    match_quality_delta: 0.25,
    ai_time_to_sale_proxy_days: 3.8,
    baseline_time_to_sale_proxy_days: 5.6,
    time_to_sale_delta_days: -1.8,
    estimated_search_time_saved_minutes: 18,
    metrics_note: "Scenario set focused on UM marketplace decisions.",
    cases: [],
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}
