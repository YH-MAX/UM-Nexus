import { expect, type Page, type Request, type Route, test } from "@playwright/test";

const now = "2026-05-05T08:00:00.000Z";

const sellerUser = { id: "seller-1", email: "seller@siswa.um.edu.my" };
const buyerUser = { id: "buyer-1", email: "buyer@siswa.um.edu.my" };
const moderatorUser = { id: "moderator-1", email: "moderator@siswa.um.edu.my" };

const baseListing = {
  id: "listing-1",
  seller_id: "seller-1",
  title: "Casio Scientific Calculator",
  description: "Used Casio calculator in good working condition with minor scratches.",
  category: "electronics",
  item_name: "Scientific calculator",
  brand: "Casio",
  model: "fx-570MS",
  condition: "good",
  condition_label: "good",
  price: 30,
  original_price: 65,
  currency: "MYR",
  pickup_location: "fsktm",
  pickup_area: "fsktm",
  pickup_note: "Meet near the lobby.",
  residential_college: "KK12",
  contact_method: "telegram",
  status: "available",
  view_count: 12,
  hidden_at: null,
  hidden_by: null,
  hidden_reason: null,
  deleted_at: null,
  deleted_by: null,
  deleted_reason: null,
  risk_score: 0,
  risk_level: "low",
  risk_evidence: null,
  moderation_status: "approved",
  suggested_listing_price: null,
  minimum_acceptable_price: null,
  accepted_recommended_price: null,
  recommendation_applied_at: null,
  ai_explanation_cache: null,
  is_ai_enriched: false,
  source_wanted_post_id: null,
  sold_source: null,
  sold_contact_request_id: null,
  created_at: now,
  updated_at: now,
  images: [
    {
      id: "image-1",
      listing_id: "listing-1",
      storage_path: "demo/calculator.jpg",
      public_url: null,
      content_hash: null,
      sort_order: 0,
      is_primary: true,
      created_at: now,
    },
  ],
  seller: {
    id: "seller-1",
    username: "seller",
    status: "active",
    profile: {
      full_name: "Aina Rahman",
      display_name: "Aina",
      faculty: "FSKTM",
      residential_college: "KK12",
      college_or_location: "KK12",
    },
  },
};

const currentProfile = {
  id: "profile-1",
  user_id: "seller-1",
  full_name: "Aina Rahman",
  display_name: "Aina",
  avatar_url: null,
  bio: "Computer science student",
  faculty: "FSKTM",
  year_of_study: 2,
  residential_college: "KK12",
  college_or_location: "KK12",
  contact_preference: "telegram",
  contact_value: "@aina_um",
  verified_um_email: true,
  app_role: "student",
  created_at: now,
  updated_at: now,
};

const acceptedRequest = {
  id: "contact-accepted",
  listing_id: "listing-1",
  buyer_id: "buyer-1",
  seller_id: "seller-1",
  message: "Can I pick this up today?",
  buyer_contact_method: "telegram",
  buyer_contact_value: "@buyer_um",
  seller_contact_method: "telegram",
  seller_contact_value: "@aina_um",
  status: "accepted",
  seller_response: "Accepted. Contact details are now visible.",
  accepted_at: now,
  rejected_at: null,
  cancelled_at: null,
  expired_at: null,
  created_at: now,
  updated_at: now,
  listing: baseListing,
};

const pendingRequest = {
  ...acceptedRequest,
  id: "contact-pending",
  status: "pending",
  seller_response: null,
  accepted_at: null,
  seller_contact_value: null,
};

const wantedPost = {
  id: "wanted-1",
  buyer_id: "buyer-1",
  title: "Looking for Casio calculator",
  description: "Need a scientific calculator before finals.",
  category: "electronics",
  desired_item_name: "scientific calculator",
  max_budget: 60,
  currency: "MYR",
  preferred_pickup_area: "fsktm",
  residential_college: "KK12",
  status: "active",
  closed_reason: null,
  closed_reason_note: null,
  closed_at: null,
  response_count: 0,
  created_at: now,
  updated_at: now,
};

const wantedLinkedListing = {
  ...baseListing,
  id: "listing-from-wanted",
  title: "Calculator from wanted request",
  source_wanted_post_id: "wanted-1",
};

const sentWantedResponse = {
  id: "wanted-response-1",
  wanted_post_id: "wanted-1",
  seller_id: "seller-1",
  buyer_id: "buyer-1",
  listing_id: "listing-1",
  message: "I have an FX-570EX in good condition and can meet at FSKTM.",
  seller_contact_method: "telegram",
  seller_contact_value: null,
  contact_reveal_blocked_reason: null,
  status: "pending",
  buyer_response: null,
  accepted_at: null,
  rejected_at: null,
  cancelled_at: null,
  created_at: now,
  updated_at: now,
  wanted_post: wantedPost,
  listing: baseListing,
};

test.describe("authenticated Trade product workflows", () => {
  test("buyer can save, request contact, and report from listing detail", async ({ page }) => {
    await loginAs(page, buyerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/listing-1");
    await expect(page.getByRole("heading", { level: 1, name: /Casio Scientific Calculator/i })).toBeVisible();

    await page.getByRole("button", { name: /Save listing/i }).click();
    await expect(page.getByText(/Listing saved/i)).toBeVisible();
    expect(state.favorites).toContain("listing-1");

    await page.getByPlaceholder("@username").fill("@buyer_um");
    await page.getByLabel(/I understand UM Nexus does not hold payment/i).check();
    await page.getByRole("button", { name: /I'm interested/i }).first().click();
    await expect(page.getByText(/Request sent/i)).toBeVisible();
    expect(state.contactRequestCreated).toBe(true);

    await page.getByRole("button", { name: /Report listing/i }).click();
    await expect(page.getByText(/Report submitted/i)).toBeVisible();
    expect(state.reportCreated).toBe(true);
  });

  test("seller can publish manually and open the new listing", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/sell");
    await page.getByLabel("Title").fill("Desk lamp near KK12");
    await page.getByLabel("Price").fill("25");
    await page.getByLabel("Category").selectOption("dorm_room");
    await page.getByLabel("Condition").selectOption("good");
    await page.getByLabel("Pickup location").selectOption("kk1");
    await page.getByLabel("Description").fill("Compact lamp in good condition, bright enough for study desk use.");
    await page.getByLabel("Contact value").fill("@aina_um");
    await page.getByRole("button", { name: /Publish Listing/i }).click();
    await expect(page.getByRole("heading", { name: /Ready to publish/i })).toBeVisible();
    await page.getByRole("button", { name: "Publish with Warnings" }).click();

    await expect(page).toHaveURL(/\/trade\/listing-new$/);
    expect(state.publishedListingCreated).toBe(true);
  });

  test("seller uploaded photo appears on the published listing", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/sell");
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "desk-lamp.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-bytes"),
    });
    await page.getByLabel("Title").fill("Desk lamp near KK12");
    await page.getByLabel("Price").fill("25");
    await page.getByLabel("Category").selectOption("dorm_room");
    await page.getByLabel("Condition").selectOption("good");
    await page.getByLabel("Pickup location").selectOption("kk1");
    await page.getByLabel("Description").fill("Compact lamp in good condition, bright enough for study desk use.");
    await page.getByLabel("Contact value").fill("@aina_um");
    await page.getByRole("button", { name: /Publish Listing/i }).click();
    const publishReview = page.locator("section").filter({
      has: page.getByRole("heading", { name: /Ready to publish/i }),
    });
    await publishReview.getByRole("button", { name: "Publish Listing" }).click();

    await expect(page).toHaveURL(/\/trade\/listing-new$/);
    await expect(page.locator('img[alt="Desk lamp near KK12"]').first()).toBeVisible();
    await expect(page.getByText("No photo yet")).toHaveCount(0);
    expect(state.uploadedImages).toHaveLength(1);
  });

  test("seller dashboard exposes request timeline and accept/reject actions", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/dashboard");
    await page.getByRole("button", { name: "Buyer Requests" }).click();
    await expect(page.getByText(/Can I pick this up today/i)).toBeVisible();
    await expect(page.getByText("Sent", { exact: true }).last()).toBeVisible();

    await page.getByRole("button", { name: "Accept" }).click();
    await page.getByRole("button", { name: "Accept Request" }).click();
    await expect.poll(() => state.acceptedRequests).toBe(1);

    await page.getByRole("button", { name: "My Requests" }).click();
    await expect(page.getByText(/Seller: telegram @aina_um/i)).toBeVisible();
  });

  test("dashboard infers the request tab from a request id link", async ({ page }) => {
    await loginAs(page, sellerUser);
    await mockTradeApi(page);

    await page.goto("/trade/dashboard?request_id=contact-pending");

    await expect(page.getByRole("button", { name: "Buyer Requests" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#request-contact-pending")).toHaveAttribute("data-highlighted", "true");
  });

  test("alerts show unread state and deep-link into the relevant dashboard request", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade");
    await expect(page.getByLabel("Alerts").first()).toContainText("2");

    await page.goto("/trade/notifications");
    await expect(page.getByRole("heading", { name: /Inbox/i })).toBeVisible();
    await expect(page.getByText("Earlier")).toBeVisible();
    await expect(page.getByText(/New buyer interest/i)).toBeVisible();
    await expect(page.getByText("Request").first()).toBeVisible();
    await expect(page.getByText("urgent")).toBeVisible();

    await page.getByRole("link", { name: /Open/i }).first().click();
    await expect(page).toHaveURL(/\/trade\/dashboard\?tab=received&request_id=contact-pending/);
    await expect(page.getByRole("button", { name: "Buyer Requests" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#request-contact-pending")).toHaveAttribute("data-highlighted", "true");
    await expect.poll(() => state.notifications.filter((notification) => !notification.is_read).length).toBe(1);
  });

  test("alerts can mark one or all notifications read", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/notifications");
    await expect(page.getByText("2 unread")).toBeVisible();

    await page.getByRole("button", { name: "Mark read" }).first().click();
    await expect.poll(() => state.notifications.filter((notification) => !notification.is_read).length).toBe(1);
    await expect(page.getByText("1 unread")).toBeVisible();

    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect.poll(() => state.notifications.filter((notification) => !notification.is_read).length).toBe(0);
    await expect(page.getByText("0 unread")).toBeVisible();
    await expect(page.getByText("You're all caught up.")).toBeVisible();
  });

  test("seller can browse wanted demand and send an offer", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/want");
    await expect(page.getByRole("heading", { name: /Wanted board/i })).toBeVisible();
    await expect(page.getByText(/Looking for Casio calculator/i)).toBeVisible();

    await page.getByRole("button", { name: /^Send Offer$/i }).first().click();
    await page.getByLabel(/Offer message/i).fill("I have an FX-570EX in good condition and can meet at FSKTM.");
    await page.getByLabel(/Contact method/i).selectOption("telegram");
    await page.getByLabel(/Contact value/i).fill("@aina_um");
    await page.getByLabel(/Attach one of your listings/i).selectOption("listing-1");
    await page.getByRole("button", { name: /^Send Offer$/i }).last().click();

    await expect(page.getByText(/Direct offer sent/i)).toBeVisible();
    expect(state.wantedResponseCreated).toBe(true);
    expect(state.lastWantedResponseListingId).toBe("listing-1");
  });

  test("wanted detail shows seller response status and wanted-linked listings", async ({ page }) => {
    await loginAs(page, sellerUser);
    await mockTradeApi(page);

    await page.goto("/wanted-posts/wanted-1");
    await expect(page.getByRole("heading", { level: 1, name: /Looking for Casio calculator/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your response status/i })).toBeVisible();
    await expect(page.getByText(/I have an FX-570EX/i)).toBeVisible();
    await expect(page.getByText("pending").first()).toBeVisible();

    await page.goto("/trade/dashboard");
    await page.getByRole("button", { name: "Wanted" }).click();
    await expect(page.getByRole("heading", { name: /Listings From Wanted/i })).toBeVisible();
    await expect(page.getByText(/Calculator from wanted request/i)).toBeVisible();
  });

  test("dashboard highlights a listing from a listing alert link", async ({ page }) => {
    await loginAs(page, sellerUser);
    await mockTradeApi(page);

    await page.goto("/trade/dashboard?tab=listings&listing_id=listing-1");

    await expect(page.getByRole("button", { name: "My Listings" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#listing-listing-1")).toHaveAttribute("data-highlighted", "true");
  });

  test("seller can edit listing details from the dedicated edit route", async ({ page }) => {
    await loginAs(page, sellerUser);
    const state = await mockTradeApi(page);

    await page.goto("/trade/listing-1/edit");
    await expect(page.getByRole("heading", { name: /Edit listing/i })).toBeVisible();

    await page.getByLabel("Title").fill("Casio Calculator - Good Condition");
    await page.getByLabel("Contact value").fill("@aina_um");
    await page.getByRole("button", { name: /Save changes/i }).click();

    await expect(page.getByText(/Listing changes saved/i)).toBeVisible();
    expect(state.lastUpdatedTitle).toBe("Casio Calculator - Good Condition");
  });

  test("moderator actions require reasons and update the safety console", async ({ page }) => {
    await loginAs(page, moderatorUser);
    const state = await mockTradeApi(page);

    page.on("dialog", (dialog) => {
      void dialog.accept("Duplicate report checked against seller history.");
    });

    await page.goto("/trade/moderation");
    await expect(page.getByRole("heading", { name: /Trust review queue/i })).toBeVisible();
    await page.getByRole("button", { name: "Reject and hide" }).click();
    await page.getByLabel(/Reason for rejection/i).fill("Duplicate report checked against seller history.");
    await page.getByRole("button", { name: "Reject and hide listing" }).click();

    await expect.poll(() => state.moderationReason).toContain("Duplicate report checked");
  });
});

async function loginAs(page: Page, user: { id: string; email: string }) {
  await page.addInitScript((nextUser) => {
    window.localStorage.setItem("um_nexus_e2e_user", JSON.stringify(nextUser));
  }, user);
}

async function mockTradeApi(page: Page) {
  const state = {
    favorites: [] as string[],
    contactRequestCreated: false,
    reportCreated: false,
    publishedListingCreated: false,
    uploadedImages: [] as typeof baseListing.images,
    wantedResponseCreated: false,
    lastWantedResponseListingId: "",
    acceptedRequests: 0,
    lastUpdatedTitle: "",
    moderationReason: "",
    notifications: tradeNotifications().map((notification) => ({ ...notification })),
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = request.method();

    if (method === "POST" && path === "/analytics/events") {
      return json(route, { id: "event-1" });
    }

    if (method === "GET" && path === "/auth/me") {
      return json(route, {
        user: {
          id: "seller-1",
          email: "seller@siswa.um.edu.my",
          username: "seller",
          status: "active",
          created_at: now,
          updated_at: now,
        },
        profile: currentProfile,
      });
    }

    if (method === "GET" && path === "/listings") {
      return json(route, { items: [baseListing], total: 1, limit: 24, offset: 0, has_more: false });
    }

    if (method === "GET" && path === "/wanted-posts") {
      return json(route, { items: [wantedPost], total: 1, limit: 24, offset: 0, has_more: false });
    }

    if (method === "GET" && path === "/wanted-posts/wanted-1") {
      return json(route, wantedPost);
    }

    if (method === "GET" && path === "/wanted-posts/wanted-1/recommended-listings") {
      return json(route, []);
    }

    if (method === "POST" && path === "/wanted-posts/wanted-1/responses") {
      state.wantedResponseCreated = true;
      const payload = requestJson(request);
      state.lastWantedResponseListingId = String(payload.listing_id ?? "");
      return json(
        route,
        {
          ...sentWantedResponse,
          listing_id: payload.listing_id ?? null,
          message: payload.message ?? null,
          seller_contact_method: payload.seller_contact_method ?? "telegram",
          listing: payload.listing_id === "listing-1" ? baseListing : null,
        },
        201,
      );
    }

    if (method === "POST" && path === "/listings") {
      state.publishedListingCreated = url.searchParams.get("publish") === "true";
      const payload = requestJson(request);
      return json(route, {
        ...baseListing,
        id: "listing-new",
        seller_id: "seller-1",
        title: payload.title ?? "Desk lamp near KK12",
        description: payload.description ?? baseListing.description,
        price: payload.price ?? 25,
        pickup_location: payload.pickup_location ?? "kk1",
        images: [],
      });
    }

    if (method === "POST" && path === "/listings/listing-new/images") {
      const image = {
        id: `image-${state.uploadedImages.length + 1}`,
        listing_id: "listing-new",
        storage_path: "listings/listing-new/desk-lamp.jpg",
        public_url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        content_hash: "fake-hash",
        sort_order: state.uploadedImages.length,
        is_primary: state.uploadedImages.length === 0,
        created_at: now,
      };
      state.uploadedImages.push(image);
      return json(route, image, 201);
    }

    if (method === "GET" && (path === "/listings/listing-1" || path === "/listings/listing-new")) {
      return json(
        route,
        path.endsWith("listing-new")
          ? { ...baseListing, id: "listing-new", title: "Desk lamp near KK12", images: state.uploadedImages }
          : baseListing,
      );
    }

    if (method === "PATCH" && path === "/listings/listing-1") {
      const payload = requestJson(request);
      state.lastUpdatedTitle = String(payload.title ?? "");
      return json(route, { ...baseListing, ...payload });
    }

    if (method === "GET" && path === "/ai/trade/result/listing-1") {
      return json(route, {
        listing_id: "listing-1",
        status: "not_started",
        agent_run_id: null,
        last_run_id: null,
        updated_at: null,
        error_message: null,
        result: null,
      });
    }

    if (method === "GET" && path === "/ai/trade/result/listing-new") {
      return json(route, {
        listing_id: "listing-new",
        status: "not_started",
        agent_run_id: null,
        last_run_id: null,
        updated_at: null,
        error_message: null,
        result: null,
      });
    }

    if (method === "GET" && path.endsWith("/matches")) {
      return json(route, []);
    }

    if (method === "GET" && path === "/users/me/favorites") {
      return json(
        route,
        state.favorites.map((listingId) => ({
          id: `favorite-${listingId}`,
          user_id: "buyer-1",
          listing_id: listingId,
          created_at: now,
          updated_at: now,
          listing: baseListing,
        })),
      );
    }

    if (method === "POST" && path === "/listings/listing-1/favorite") {
      state.favorites.push("listing-1");
      return json(route, {
        id: "favorite-listing-1",
        user_id: "buyer-1",
        listing_id: "listing-1",
        created_at: now,
        updated_at: now,
        listing: baseListing,
      });
    }

    if (method === "DELETE" && path === "/listings/listing-1/favorite") {
      state.favorites = state.favorites.filter((id) => id !== "listing-1");
      return route.fulfill({ status: 204, body: "" });
    }

    if (method === "POST" && path === "/listings/listing-1/contact-requests") {
      state.contactRequestCreated = true;
      return json(route, pendingRequest);
    }

    if (method === "POST" && path === "/listings/listing-1/reports") {
      state.reportCreated = true;
      return json(route, {
        id: "report-1",
        listing_id: "listing-1",
        reporter_user_id: "buyer-1",
        report_type: "scam_suspicion",
        reason: "Reported from listing detail for moderator review.",
        status: "pending",
        moderator_user_id: null,
        resolution: null,
        reviewed_at: null,
        created_at: now,
      });
    }

    if (method === "POST" && path === "/users/seller-1/reports") {
      return json(route, {
        id: "user-report-1",
        reported_user_id: "seller-1",
        reporter_user_id: "buyer-1",
        report_type: "unsafe_transaction",
        reason: "Reported from listing detail for admin review.",
        status: "pending",
        moderator_user_id: null,
        resolution: null,
        reviewed_at: null,
        created_at: now,
      });
    }

    if (method === "GET" && path === "/users/me/notifications/unread-count") {
      return json(route, { unread: state.notifications.filter((notification) => !notification.is_read).length });
    }

    if (method === "GET" && path === "/users/me/notifications") {
      let notifications = [...state.notifications];
      if (url.searchParams.get("unread_only") === "true") {
        notifications = notifications.filter((notification) => !notification.is_read);
      }
      const notificationType = url.searchParams.get("type");
      if (notificationType) {
        notifications = notifications.filter((notification) => notification.type === notificationType);
      }
      const limit = Number(url.searchParams.get("limit"));
      if (Number.isFinite(limit) && limit > 0) {
        notifications = notifications.slice(0, limit);
      }
      return json(route, notifications);
    }

    if (method === "PATCH" && path.startsWith("/notifications/") && path.endsWith("/read")) {
      const notificationId = path.split("/")[2];
      state.notifications = state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true, read_at: now } : notification,
      );
      return json(route, state.notifications.find((notification) => notification.id === notificationId) ?? state.notifications[0]);
    }

    if (method === "PATCH" && path === "/notifications/read-all") {
      state.notifications = state.notifications.map((notification) => ({ ...notification, is_read: true, read_at: now }));
      return json(route, { updated: state.notifications.length });
    }

    if (method === "GET" && path === "/users/me/trade-dashboard") {
      return json(route, dashboardPayload());
    }

    if (method === "PATCH" && path === "/contact-requests/contact-pending") {
      state.acceptedRequests += 1;
      return json(route, acceptedRequest);
    }

    if (method === "PATCH" && path === "/contact-requests/contact-pending/cancel") {
      return json(route, { ...pendingRequest, status: "cancelled", cancelled_at: now });
    }

    if (method === "GET" && path === "/moderation/listings") {
      return json(route, [{ listing: { ...baseListing, risk_level: "high", moderation_status: "review_required" }, reports: [listingReport()] }]);
    }

    if (method === "GET" && path === "/moderation/summary") {
      return json(route, { high_risk_count: 1, pending_review_count: 1, rejected_count: 0, approved_count: 3 });
    }

    if (method === "GET" && path === "/admin/dashboard") {
      return json(route, adminDashboardPayload());
    }

    if (method === "PATCH" && path === "/moderation/listings/listing-1/review") {
      const payload = requestJson(request);
      state.moderationReason = String(payload.resolution ?? "");
      return json(route, { ...baseListing, moderation_status: payload.moderation_status ?? "rejected" });
    }

    return json(route, {}, 200);
  });

  return state;
}

function requestJson(request: Request): Record<string, unknown> {
  try {
    const payload = request.postDataJSON();
    return typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function dashboardPayload() {
  return {
    listings: [baseListing, wantedLinkedListing, { ...baseListing, id: "sold-1", title: "Sold monitor", status: "sold" }],
    favorites: [],
    wanted_posts: [],
    matches: [],
    transactions: [],
    contact_requests_received: [pendingRequest],
    contact_requests_sent: [acceptedRequest],
    wanted_responses_received: [],
    wanted_responses_sent: [sentWantedResponse],
    metrics: {
      recommendations_accepted: 0,
      decision_feedback_count: 0,
      completed_sales_after_ai_recommendation: 0,
      average_price_adjustment: null,
    },
  };
}

function tradeNotifications() {
  return [
    {
      id: "notification-1",
      user_id: "seller-1",
      actor_id: "buyer-1",
      type: "contact_request_received",
      title: "New buyer interest",
      body: "Buyer Student is interested in Casio Scientific Calculator. Review the request in My Trade.",
      action_url: "/trade/dashboard?tab=received&request_id=contact-pending",
      entity_type: "contact_request",
      entity_id: "contact-pending",
      metadata: { listing_id: "listing-1", listing_title: "Casio Scientific Calculator", request_id: "contact-pending" },
      priority: "high",
      is_read: false,
      read_at: null,
      created_at: now,
    },
    {
      id: "notification-2",
      user_id: "seller-1",
      actor_id: "moderator-1",
      type: "listing_hidden_by_moderation",
      title: "Listing hidden for review",
      body: "Casio Scientific Calculator was hidden while UM Nexus reviews safety reports.",
      action_url: "/trade/dashboard?tab=listings&listing_id=listing-1",
      entity_type: "listing",
      entity_id: "listing-1",
      metadata: { listing_id: "listing-1", listing_title: "Casio Scientific Calculator" },
      priority: "urgent",
      is_read: false,
      read_at: null,
      created_at: now,
    },
  ];
}

function adminDashboardPayload() {
  return {
    statistics: {
      total_users: 3,
      active_listings: 1,
      sold_listings: 1,
      reported_listings: 1,
      new_listings_this_week: 1,
      most_popular_categories: [{ category: "electronics", count: 1 }],
      reserved_listings: 0,
      contact_requests_sent: 2,
      contact_requests_accepted: 1,
      favorite_count: 4,
      report_count: 1,
      ai_generations_used: 0,
      ai_failure_rate: 0,
      most_popular_pickup_locations: [{ pickup_location: "fsktm", count: 1 }],
    },
    listings: [baseListing, { ...baseListing, id: "hidden-1", title: "Hidden listing", status: "hidden" }],
    listing_reports: [listingReport()],
    user_reports: [],
    suspicious_ai_flags: [{ ...baseListing, risk_level: "high" }],
    users: [
      {
        id: "buyer-1",
        email: "buyer@siswa.um.edu.my",
        username: "buyer",
        status: "active",
        app_role: "student",
        full_name: "Buyer Student",
        display_name: "Buyer",
        faculty: "FSKTM",
        residential_college: "KK1",
        college_or_location: "KK1",
      },
    ],
    categories: [
      {
        id: "cat-electronics",
        slug: "electronics",
        label: "Electronics",
        sort_order: 20,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    ai_usage_logs: [],
    admin_actions: [
      {
        id: "action-1",
        admin_id: "moderator-1",
        target_type: "listing",
        target_id: "listing-1",
        action_type: "hide_listing",
        reason: "Seeded report review",
        created_at: now,
      },
    ],
    ai_settings: {
      ai_trade_enabled: true,
      ai_student_daily_limit: 3,
      ai_staff_daily_limit: 50,
      ai_global_daily_limit: 200,
    },
  };
}

function listingReport() {
  return {
    id: "report-1",
    listing_id: "listing-1",
    reporter_user_id: "buyer-1",
    report_type: "scam_suspicion",
    reason: "The seller asked for payment before meetup.",
    status: "pending",
    moderator_user_id: null,
    resolution: null,
    reviewed_at: null,
    created_at: now,
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}
