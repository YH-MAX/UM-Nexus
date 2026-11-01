export * from "./contracts";
import type {
  ListingImage,
  BetaSignupStatus,
  BetaWaitlistEntry,
  Listing,
  ListingsPage,
  WantedPost,
  WantedPostPage,
  WantedResponse,
  TradeMatch,
  EnrichListingAccepted,
  TradeResultStatus,
  LegacyEvaluationSummary,
  BenchmarkCaseDetail,
  BenchmarkSummary,
  TradeProviderStatus,
  CurrentProfile,
  CurrentUserResponse,
  ListingPayload,
  ProductEventPayload,
  SellAgentSellerContext,
  SellAgentUploadedImage,
  SellAgentDraft,
  SellAgentPublishResponse,
  WantedPostPayload,
  WantedPostFilters,
  WantedResponsePayload,
  ListingReport,
  UserReport,
  ContactRequest,
  ListingFavorite,
  TradeTransaction,
  TradeDashboard,
  ContactRequestsResponse,
  ModerationListing,
  ModerationSummary,
  AdminDashboard,
  NotificationType,
  TradeNotification,
  DecisionFeedback,
  PriceSimulation,
  WantedListingRecommendation,
  RecommendationOptions,
} from "./contracts";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { getPublicListingsPage, invalidatePublicListings, publicCacheGeneration, rememberPublicListing, rememberPublicListingsPage } from "@/lib/trade/public-listing-cache";

function readApiBaseUrl(): string {
  const rawValue = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";
  return rawValue.replace(/^NEXT_PUBLIC_API_BASE_URL=/, "").replace(/\/+$/, "");
}

const API_BASE_URL = readApiBaseUrl();
const API_REQUEST_TIMEOUT_MS = readPositiveNumber(
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
  20_000,
);

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (
    process.env.NEXT_PUBLIC_E2E_AUTH === "true" &&
    typeof window !== "undefined" &&
    window.localStorage.getItem("um_nexus_e2e_user")
  ) {
    return { Authorization: "Bearer e2e-access-token" };
  }
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init?: RequestInit, skipSessionLookup = false): Promise<T> {
  const authHeaders = skipSessionLookup ? {} : await getAuthHeaders();
  const mutating = init?.method && !["GET", "HEAD", "OPTIONS"].includes(init.method) && path !== "/analytics/events";
  if (mutating) invalidatePublicListings();
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (mutating) invalidatePublicListings();

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(body, response.status));
  }

  return response.json() as Promise<T>;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();

  init.signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The API request timed out. Check that the backend service is running.");
    }
    if (error instanceof TypeError) {
      throw new Error("Unable to reach the UM Nexus API. Check your connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}

function getApiErrorMessage(body: unknown, statusCode: number): string {
  if (isRecord(body)) {
    const detail = body.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const validationMessages = detail
        .map((item) => {
          if (!isRecord(item)) {
            return null;
          }
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "field";
          return typeof item.msg === "string" ? `${field}: ${item.msg}` : null;
        })
        .filter(Boolean);
      if (validationMessages.length > 0) {
        return validationMessages.join("; ");
      }
    }
    if (typeof body.message === "string") {
      return body.message;
    }
  }

  return `Request failed with status ${statusCode}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getBetaSignupStatus(): Promise<BetaSignupStatus> {
  return fetchJson<BetaSignupStatus>("/auth/beta-status");
}

export async function joinBetaWaitlist(payload: {
  email: string;
  reason?: string;
}): Promise<BetaWaitlistEntry> {
  return fetchJson<BetaWaitlistEntry>("/auth/beta-waitlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return fetchJson<CurrentUserResponse>("/auth/me");
}

export async function updateMyProfile(payload: {
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  faculty?: string | null;
  year_of_study?: number | null;
  residential_college?: string | null;
  college_or_location?: string | null;
  contact_preference?: string | null;
  contact_value?: string | null;
  avatar_url?: string | null;
}): Promise<CurrentProfile> {
  return fetchJson<CurrentProfile>("/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

function listingsQuery(
  filters: Record<string, string> = {},
  pagination: { limit?: number; offset?: number } = {},
): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  if (pagination.limit !== undefined) {
    params.set("limit", String(pagination.limit));
  }
  if (pagination.offset !== undefined && pagination.offset > 0) {
    params.set("offset", String(pagination.offset));
  }
  params.sort();
  return params.toString();
}

export function getCachedListings(filters: Record<string, string> = {}, pagination: { limit?: number; offset?: number } = {}) {
  return getPublicListingsPage(listingsQuery(filters, pagination));
}

const publicListingRequests = new Map<string, Promise<ListingsPage>>();

export async function getListings(
  filters: Record<string, string> = {},
  pagination: { limit?: number; offset?: number } = {},
): Promise<ListingsPage> {
  const query = listingsQuery(filters, pagination);
  const cached = getPublicListingsPage(query);
  if (cached) return cached;
  const generation = publicCacheGeneration();
  const key = `${generation}:${query}`;
  const pending = publicListingRequests.get(key);
  if (pending) return pending;
  // This endpoint is public, so it needs neither a session lookup nor a bearer token.
  const request = fetchJson<ListingsPage>(`/listings${query ? `?${query}` : ""}`, undefined, true)
    .then((page) => { rememberPublicListingsPage(query, page, generation); return page; })
    .finally(() => { publicListingRequests.delete(key); });
  publicListingRequests.set(key, request);
  return request;
}

export async function getListing(id: string): Promise<Listing> {
  const generation = publicCacheGeneration();
  const headers = await getAuthHeaders();
  try {
    const listing = await fetchJson<Listing>(`/listings/${id}`, { headers }, true);
    if (!headers.Authorization) rememberPublicListing(listing, generation);
    return listing;
  } catch (error) {
    invalidatePublicListings();
    throw error;
  }
}

export async function createListing(payload: ListingPayload, options: { publish?: boolean } = {}): Promise<Listing> {
  const query = options.publish === undefined ? "" : `?publish=${String(options.publish)}`;
  return fetchJson<Listing>(`/listings${query}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateListing(id: string, payload: Partial<ListingPayload> & { status?: string }): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function publishListing(id: string): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}/publish`, {
    method: "POST",
  });
}

export async function trackProductEvent(payload: ProductEventPayload): Promise<void> {
  try {
    await fetchJson<{ id: string }>("/analytics/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never break the marketplace workflow.
  }
}

export async function updateListingStatus(
  id: string,
  payload: {
    status: "available" | "reserved" | "sold" | "hidden" | "deleted";
    reason?: string;
    sold_source?: "accepted_request" | "outside_um_nexus" | "prefer_not_to_say";
    sold_contact_request_id?: string;
    agreed_price?: number;
  },
): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteListing(id: string): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}`, {
    method: "DELETE",
  });
}

export async function addListingImage(
  listingId: string,
  payload: {
    storage_path: string;
    public_url?: string | null;
    sort_order?: number;
    is_primary?: boolean;
  },
): Promise<ListingImage> {
  return fetchJson<ListingImage>(`/listings/${listingId}/images`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadListingImage(
  listingId: string,
  file: File,
  options: { sortOrder?: number; isPrimary?: boolean } = {},
): Promise<ListingImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sort_order", String(options.sortOrder ?? 0));
  formData.append("is_primary", String(options.isPrimary ?? false));

  const authHeaders = await getAuthHeaders();
  invalidatePublicListings();
  const response = await fetchWithTimeout(`${API_BASE_URL}/listings/${listingId}/images`, {
    method: "POST",
    body: formData,
    headers: authHeaders,
  });
  invalidatePublicListings();

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(body, response.status));
  }

  const image = (await response.json()) as ListingImage;
  if (!image.public_url) {
    throw new Error("The image uploaded, but the API did not return a display URL.");
  }
  return image;
}

export async function removeListingImage(listingId: string, imageId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  invalidatePublicListings();
  const response = await fetchWithTimeout(`${API_BASE_URL}/listings/${listingId}/images/${imageId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  invalidatePublicListings();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(body, response.status));
  }
}

export async function generateSellAgentDraft(
  sellerContext: SellAgentSellerContext,
  images: File[],
): Promise<SellAgentDraft> {
  const formData = new FormData();
  formData.append("seller_context", JSON.stringify(sellerContext));
  images.slice(0, 5).forEach((image) => {
    formData.append("images", image);
  });

  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/ai/trade/sell-agent/draft`, {
    method: "POST",
    body: formData,
    headers: authHeaders,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(body, response.status));
  }

  return response.json() as Promise<SellAgentDraft>;
}

export async function publishSellAgentDraft(payload: {
  draft_id?: string;
  listing_payload: ListingPayload;
  uploaded_images: SellAgentUploadedImage[];
}): Promise<SellAgentPublishResponse> {
  return fetchJson<SellAgentPublishResponse>("/ai/trade/sell-agent/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createWantedPost(
  payload: WantedPostPayload,
): Promise<WantedPost> {
  return fetchJson<WantedPost>("/wanted-posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listWantedPosts(filters: WantedPostFilters = {}): Promise<WantedPostPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchJson<WantedPostPage>(`/wanted-posts${query}`);
}

export async function getWantedPost(id: string): Promise<WantedPost> {
  return fetchJson<WantedPost>(`/wanted-posts/${id}`);
}

export async function updateWantedPostStatus(
  id: string,
  status: "active" | "closed",
  closeDetails: { closed_reason?: string; closed_reason_note?: string } = {},
): Promise<WantedPost> {
  return fetchJson<WantedPost>(`/wanted-posts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...closeDetails }),
  });
}

export async function createWantedResponse(
  id: string,
  payload: WantedResponsePayload,
): Promise<WantedResponse> {
  return fetchJson<WantedResponse>(`/wanted-posts/${id}/responses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWantedResponse(
  id: string,
  payload: { status: "accepted" | "rejected"; buyer_response?: string },
): Promise<WantedResponse> {
  return fetchJson<WantedResponse>(`/wanted-posts/responses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelWantedResponse(id: string): Promise<WantedResponse> {
  return fetchJson<WantedResponse>(`/wanted-posts/responses/${id}/cancel`, {
    method: "PATCH",
  });
}

export async function getWantedPostRecommendations(
  id: string,
  options: RecommendationOptions = {},
): Promise<WantedListingRecommendation[]> {
  const query = recommendationQuery(options);
  return fetchJson<WantedListingRecommendation[]>(`/wanted-posts/${id}/recommended-listings${query}`);
}

export async function getListingMatches(id: string, options: RecommendationOptions = {}): Promise<TradeMatch[]> {
  const query = recommendationQuery(options);
  return fetchJson<TradeMatch[]>(`/listings/${id}/matches${query}`);
}

export async function applyRecommendedPrice(id: string): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}/apply-recommended-price`, {
    method: "POST",
  });
}

export async function reportListing(
  id: string,
  payload: { report_type: string; reason?: string },
): Promise<ListingReport> {
  return fetchJson<ListingReport>(`/listings/${id}/reports`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reportUser(
  id: string,
  payload: { report_type: string; reason?: string },
): Promise<UserReport> {
  return fetchJson<UserReport>(`/users/${id}/reports`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ListingContact = {
  listing_id: string;
  contact_method: string | null;
  contact_value: string | null;
  contact_url: string | null;
};

export async function getListingContact(listingId: string, signal?: AbortSignal): Promise<ListingContact> {
  return fetchJson<ListingContact>(`/listings/${listingId}/contact`, { signal });
}

export async function createContactRequest(
  listingId: string,
  payload: {
    message?: string;
    buyer_contact_method: "in_app" | "telegram" | "whatsapp" | "email";
    buyer_contact_value?: string;
    safety_acknowledged?: boolean;
  },
): Promise<ContactRequest> {
  return fetchJson<ContactRequest>(`/listings/${listingId}/contact-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFavorites(): Promise<ListingFavorite[]> {
  return fetchJson<ListingFavorite[]>("/users/me/favorites");
}

export async function getNotifications(params: {
  limit?: number;
  before?: string;
  unreadOnly?: boolean;
  type?: NotificationType;
} = {}): Promise<TradeNotification[]> {
  const searchParams = new URLSearchParams();
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.before) {
    searchParams.set("before", params.before);
  }
  if (params.unreadOnly) {
    searchParams.set("unread_only", "true");
  }
  if (params.type) {
    searchParams.set("type", params.type);
  }
  const query = searchParams.toString();
  return fetchJson<TradeNotification[]>(`/users/me/notifications${query ? `?${query}` : ""}`);
}

export async function getNotificationUnreadCount(): Promise<{ unread: number }> {
  return fetchJson<{ unread: number }>("/users/me/notifications/unread-count");
}

export async function markNotificationRead(id: string): Promise<TradeNotification> {
  return fetchJson<TradeNotification>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return fetchJson<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
}

export async function addFavorite(listingId: string): Promise<ListingFavorite> {
  return fetchJson<ListingFavorite>(`/listings/${listingId}/favorite`, {
    method: "POST",
  });
}

export async function removeFavorite(listingId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/listings/${listingId}/favorite`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(body, response.status));
  }
}

export async function submitDecisionFeedback(
  id: string,
  payload: {
    feedback_type: "accepted_price" | "rejected_price" | "changed_price" | "ignored_recommendation";
    applied_price?: number;
    reason?: string;
  },
): Promise<DecisionFeedback> {
  return fetchJson<DecisionFeedback>(`/listings/${id}/decision-feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function contactMatch(
  id: string,
  payload: { message?: string },
): Promise<TradeTransaction> {
  return fetchJson<TradeTransaction>(`/matches/${id}/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTradeTransaction(
  id: string,
  payload: {
    status?: string;
    agreed_price?: number;
    seller_feedback?: string;
    buyer_feedback?: string;
    followed_ai_recommendation?: boolean;
  },
): Promise<TradeTransaction> {
  return fetchJson<TradeTransaction>(`/trade-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getTradeDashboard(): Promise<TradeDashboard> {
  return fetchJson<TradeDashboard>("/users/me/trade-dashboard");
}

export async function getContactRequests(): Promise<ContactRequestsResponse> {
  return fetchJson<ContactRequestsResponse>("/users/me/contact-requests");
}

export async function updateContactRequest(
  id: string,
  payload: { status: "accepted" | "rejected"; seller_response?: string; mark_listing_reserved?: boolean },
): Promise<ContactRequest> {
  return fetchJson<ContactRequest>(`/contact-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelContactRequest(id: string): Promise<ContactRequest> {
  return fetchJson<ContactRequest>(`/contact-requests/${id}/cancel`, {
    method: "PATCH",
  });
}

export async function resolveContactRequest(
  id: string,
  payload: {
    action: "mark_completed" | "cancel_accepted" | "buyer_no_response";
    agreed_price?: number;
    sold_source?: "accepted_request" | "outside_um_nexus" | "prefer_not_to_say";
  },
): Promise<ContactRequest> {
  return fetchJson<ContactRequest>(`/contact-requests/${id}/seller-resolution`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getModerationListings(): Promise<ModerationListing[]> {
  return fetchJson<ModerationListing[]>("/moderation/listings");
}

export async function getModerationSummary(): Promise<ModerationSummary> {
  return fetchJson<ModerationSummary>("/moderation/summary");
}

export async function reviewModerationListing(
  id: string,
  payload: { status: string; moderation_status?: string; resolution?: string },
): Promise<Listing> {
  return fetchJson<Listing>(`/moderation/listings/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return fetchJson<AdminDashboard>("/admin/dashboard");
}

export async function updateAdminListing(
  id: string,
  payload: { status?: string; moderation_status?: string; resolution?: string; reason?: string },
): Promise<Listing> {
  return fetchJson<Listing>(`/admin/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserStatus(
  id: string,
  payload: { status: "active" | "suspended" | "banned"; reason?: string },
): Promise<AdminDashboard["users"][number]> {
  return fetchJson<AdminDashboard["users"][number]>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserRole(
  id: string,
  payload: { app_role: "student" | "organizer" | "moderator" | "admin"; reason?: string },
): Promise<AdminDashboard["users"][number]> {
  return fetchJson<AdminDashboard["users"][number]>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminActions(): Promise<NonNullable<AdminDashboard["admin_actions"]>> {
  return fetchJson<AdminDashboard["admin_actions"]>("/admin/actions");
}

export async function getAdminAIUsage(): Promise<NonNullable<AdminDashboard["ai_usage_logs"]>> {
  return fetchJson<AdminDashboard["ai_usage_logs"]>("/admin/ai-usage");
}

export async function getAdminCategories(): Promise<AdminDashboard["categories"]> {
  return fetchJson<AdminDashboard["categories"]>("/admin/categories");
}

export async function createAdminCategory(payload: {
  slug: string;
  label: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<AdminDashboard["categories"][number]> {
  return fetchJson<AdminDashboard["categories"][number]>("/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCategory(
  id: string,
  payload: { label?: string; sort_order?: number; is_active?: boolean },
): Promise<AdminDashboard["categories"][number]> {
  return fetchJson<AdminDashboard["categories"][number]>(`/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminAISettings(): Promise<NonNullable<AdminDashboard["ai_settings"]>> {
  return fetchJson<NonNullable<AdminDashboard["ai_settings"]>>("/admin/ai-settings");
}

export async function updateAdminAISettings(payload: {
  ai_trade_enabled?: boolean;
  ai_student_daily_limit?: number;
  ai_staff_daily_limit?: number;
  ai_global_daily_limit?: number;
}): Promise<NonNullable<AdminDashboard["ai_settings"]>> {
  return fetchJson<NonNullable<AdminDashboard["ai_settings"]>>("/admin/ai-settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function enrichListing(id: string): Promise<EnrichListingAccepted> {
  return fetchJson<EnrichListingAccepted>(`/ai/trade/enrich-listing/${id}`, {
    method: "POST",
  });
}

export async function getTradeResultStatus(id: string): Promise<TradeResultStatus> {
  return fetchJson<TradeResultStatus>(`/ai/trade/result/${id}`);
}

export async function getTradeProviderStatus(): Promise<TradeProviderStatus> {
  return fetchJson<TradeProviderStatus>("/ai/trade/provider-status");
}

export async function simulateListingPrice(id: string, proposedPrice: number): Promise<PriceSimulation> {
  return fetchJson<PriceSimulation>(`/ai/trade/price-simulation/${id}`, {
    method: "POST",
    body: JSON.stringify({ proposed_price: proposedPrice }),
  });
}

export async function runLegacyTradeEvaluation(): Promise<LegacyEvaluationSummary> {
  return fetchJson<LegacyEvaluationSummary>("/ai/trade/evaluate", {
    method: "POST",
  });
}

export async function runTradeEvaluation(): Promise<BenchmarkSummary> {
  return fetchJson<BenchmarkSummary>("/ai/trade/evaluation/run", {
    method: "POST",
  });
}

export async function getTradeEvaluationSummary(): Promise<BenchmarkSummary> {
  return fetchJson<BenchmarkSummary>("/ai/trade/evaluation/summary");
}

export async function getTradeEvaluationCases(): Promise<BenchmarkCaseDetail[]> {
  return fetchJson<BenchmarkCaseDetail[]>("/ai/trade/evaluation/cases");
}

export type LaunchChecklistItem = {
  key: string;
  label: string;
  section: string;
  value: number | string;
  status: "green" | "amber" | "red";
  detail: string;
};

export type LaunchChecklist = {
  items: LaunchChecklistItem[];
  active_listings: number;
  listings_without_photo: number;
  listings_missing_pickup_or_contact: number;
  active_users: number;
  pending_reports: number;
  open_moderation_items: number;
  ai_provider_status: string;
  failed_ai_calls_24h: number;
  total_ai_calls_24h: number;
  contact_requests_sent: number;
  contact_requests_accepted: number;
};

export async function getLaunchChecklist(): Promise<LaunchChecklist> {
  return fetchJson<LaunchChecklist>("/admin/launch-checklist");
}

function recommendationQuery(options: RecommendationOptions): string {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options.minScore !== undefined) {
    params.set("min_score", String(options.minScore));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
