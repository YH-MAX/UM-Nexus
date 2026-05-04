import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  public_url: string | null;
  content_hash: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string;
  item_name: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  condition_label: string | null;
  price: number;
  original_price: number | null;
  currency: string;
  pickup_location: string | null;
  pickup_area: string | null;
  pickup_note: string | null;
  residential_college: string | null;
  contact_method: string | null;
  status: string;
  view_count: number;
  hidden_at: string | null;
  hidden_by: string | null;
  hidden_reason: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
  risk_score: number;
  risk_level: string | null;
  risk_evidence: Record<string, unknown> | null;
  moderation_status: string;
  suggested_listing_price: number | null;
  minimum_acceptable_price: number | null;
  accepted_recommended_price: number | null;
  recommendation_applied_at: string | null;
  ai_explanation_cache: Record<string, unknown> | null;
  is_ai_enriched: boolean;
  created_at: string;
  updated_at: string;
  images: ListingImage[];
  seller: {
    id: string;
    username: string | null;
    status: string;
    profile: {
      full_name: string | null;
      display_name: string | null;
      faculty: string | null;
      residential_college: string | null;
      college_or_location: string | null;
    } | null;
  } | null;
};

export type WantedPost = {
  id: string;
  buyer_id: string;
  title: string;
  description: string | null;
  category: string;
  desired_item_name: string | null;
  max_budget: number | null;
  currency: string;
  preferred_pickup_area: string | null;
  residential_college: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type MatchCandidate = {
  wanted_post_id: string;
  title: string;
  match_score: number;
  price_fit_score: number | null;
  location_fit_score: number | null;
  semantic_fit_score: number | null;
  explanation: string;
  price_fit_summary: string;
  location_fit_summary: string;
  item_fit_summary: string;
  final_match_confidence: string;
  max_budget: number | null;
  preferred_pickup_area: string | null;
};

export type TradeMatch = {
  id: string;
  listing_id: string;
  wanted_post_id: string;
  match_score: number;
  price_fit_score: number | null;
  location_fit_score: number | null;
  semantic_fit_score: number | null;
  status: string;
  explanation: string | null;
  contacted_by_user_id: string | null;
  contacted_at: string | null;
  contact_message: string | null;
  created_at: string;
  updated_at: string;
  wanted_post: WantedPost;
};

export type TradeResult = {
  recommendation: {
    suggested_listing_price: number;
    minimum_acceptable_price: number;
    sell_fast_price: number | null;
    risk_score: number | null;
    fair_price_range: {
      low: number;
      high: number;
    };
    risk_level: "low" | "medium" | "high";
    best_match_candidates: MatchCandidate[];
  };
  why: {
    similar_item_pattern: string;
    condition_estimate: string;
    local_demand_context: string;
    price_competitiveness: string;
    evidence: string[];
  };
  expected_outcome: {
    expected_time_to_sell: string;
    expected_buyer_interest: string;
    confidence_level: string;
    confidence_factors: string[];
  };
  action: {
    action_type:
      | "list_now"
      | "revise_price"
      | "upload_better_image"
      | "match_with_buyers"
      | "flag_for_review";
    action_reason: string;
    next_steps: string[];
  };
  metadata: {
    provider: string;
    model: string | null;
    used_fallback: boolean;
    generated_at: string | null;
    analysis_mode: string;
    image_analysis_skipped: boolean;
    data_source: string;
  };
};

export type EnrichListingAccepted = {
  listing_id: string;
  agent_run_id: string;
  status: string;
  message: string;
};

export type TradeResultStatus = {
  listing_id: string;
  status: "not_started" | "pending" | "running" | "completed" | "failed" | string;
  agent_run_id: string | null;
  last_run_id: string | null;
  updated_at: string | null;
  error_message: string | null;
  result: TradeResult | null;
};

export type LegacyEvaluationSummary = {
  case_count: number;
  average_pricing_error: number;
  risk_agreement_rate: number;
  action_agreement_rate: number;
  match_ranking_quality: number;
  average_runtime_ms: number;
  cases: Array<{
    case_id: string;
    suggested_listing_price: number;
    expected_price_band: number[];
    pricing_error: number;
    risk_level: string;
    risk_agreement: boolean;
    action_type: string;
    action_agreement: boolean;
    top_match: string | null;
    match_quality: number;
  }>;
};

export type BenchmarkCase = {
  id: string;
  title: string;
  category: string;
  listing_title: string;
  listing_description: string | null;
  condition_label: string | null;
  pickup_area: string | null;
  residential_college: string | null;
  image_urls: string[];
  expected_price_min: number | null;
  expected_price_max: number | null;
  expected_risk_level: string | null;
  expected_action_type: string | null;
  expected_best_match_count: number | null;
  expected_best_match_ids: string[];
  notes: string | null;
  listing_price_used: number;
};

export type BenchmarkAIResult = {
  id: string;
  benchmark_run_id: string;
  predicted_price: number | null;
  predicted_minimum_price: number | null;
  predicted_risk_level: string | null;
  predicted_action_type: string | null;
  predicted_match_count: number | null;
  pricing_within_band: boolean | null;
  risk_match: boolean | null;
  action_match: boolean | null;
  match_count_reasonable: boolean | null;
  overall_score: number;
  raw_result: TradeResult & {
    evaluation_score?: Record<string, unknown>;
    listing_price_used?: number;
  };
  created_at: string | null;
};

export type BenchmarkBaselineResult = {
  id: string;
  benchmark_case_id: string;
  baseline_name: string;
  predicted_price: number | null;
  predicted_risk_level: string | null;
  predicted_action_type: string | null;
  predicted_match_count: number | null;
  pricing_within_band: boolean | null;
  risk_match: boolean | null;
  action_match: boolean | null;
  overall_score: number;
  raw_result: Record<string, unknown>;
  created_at: string | null;
};

export type BenchmarkCaseDetail = {
  case: BenchmarkCase;
  latest_ai_result: BenchmarkAIResult | null;
  latest_baseline_result: BenchmarkBaselineResult | null;
  why_ai_is_better: string;
};

export type BenchmarkSummary = {
  case_count: number;
  evaluated_case_count: number;
  ai_overall_score: number;
  baseline_overall_score: number;
  overall_score_delta: number;
  ai_pricing_accuracy_rate: number;
  baseline_pricing_accuracy_rate: number;
  price_accuracy_delta: number;
  ai_risk_detection_rate: number;
  baseline_risk_detection_rate: number;
  risk_detection_delta: number;
  ai_action_agreement_rate: number;
  baseline_action_agreement_rate: number;
  action_agreement_delta: number;
  ai_match_quality_rate: number;
  baseline_match_quality_rate: number;
  match_quality_delta: number;
  ai_time_to_sale_proxy_days: number;
  baseline_time_to_sale_proxy_days: number;
  time_to_sale_delta_days: number;
  estimated_search_time_saved_minutes: number;
  metrics_note: string;
  cases: BenchmarkCaseDetail[];
};

export type TradeProviderStatus = {
  provider: string;
  model: string;
  status: string;
  should_use_zai_provider: boolean;
  fallback_mode: string;
  live_checked: boolean;
  last_successful_call_at: string | null;
  message: string | null;
};

export type ListingPayload = {
  title: string;
  description?: string;
  category: string;
  item_name?: string;
  brand?: string;
  model?: string;
  condition?: string;
  condition_label?: string;
  price: number;
  original_price?: number;
  currency: string;
  pickup_location?: string;
  pickup_area?: string;
  pickup_note?: string;
  residential_college?: string;
  contact_method?: "telegram" | "whatsapp";
  contact_value?: string;
};

export type SellAgentSellerContext = {
  product_name?: string;
  free_text?: string;
  category_hint?: string;
  condition_notes?: string;
  brand_model?: string;
  age_usage?: string;
  defects?: string;
  accessories?: string;
  pickup_area?: string;
  residential_college?: string;
  seller_goal: "sell_fast" | "fair_price" | "maximize_revenue";
};

export type SellAgentUploadedImage = {
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  content_hash: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type SellAgentDraft = {
  draft_id: string;
  assistant_message: string;
  missing_fields: string[];
  uploaded_images: SellAgentUploadedImage[];
  listing_payload: ListingPayload;
  pricing: {
    suggested_listing_price: number;
    minimum_acceptable_price: number;
    sell_fast_price: number | null;
    fair_price_range: { low: number; high: number };
    risk_level: "low" | "medium" | "high";
  };
  price_options: Array<{
    type: "sell_fast" | "fair_price" | "maximize_revenue";
    price: number;
    expected_time_to_sell: string;
    buyer_interest: string;
    tradeoff_summary: string;
  }>;
  confidence_breakdown: Record<
    "price_confidence" | "condition_confidence" | "demand_confidence" | "risk_confidence",
    {
      level: "low" | "medium" | "high";
      reason: string;
    }
  >;
  field_explanations: Record<"title" | "category" | "condition" | "price" | "risk", string>;
  why: TradeResult["why"];
  expected_outcome: TradeResult["expected_outcome"];
  action: TradeResult["action"];
  metadata: TradeResult["metadata"];
};

export type SellAgentPublishResponse = {
  listing: Listing;
  uploaded_images: ListingImage[];
  enrichment: EnrichListingAccepted;
  result_status: string;
};

export type WantedPostPayload = {
  title: string;
  description?: string;
  category: string;
  desired_item_name?: string;
  max_budget?: number;
  currency: string;
  preferred_pickup_area?: string;
  residential_college?: string;
};

export type ListingReport = {
  id: string;
  listing_id: string;
  reporter_user_id: string | null;
  report_type: string;
  reason: string | null;
  status: string;
  moderator_user_id: string | null;
  resolution: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type UserReport = {
  id: string;
  reported_user_id: string;
  reporter_user_id: string | null;
  report_type: string;
  reason: string | null;
  status: string;
  moderator_user_id: string | null;
  resolution: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ContactRequest = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  message: string | null;
  buyer_contact_method: string;
  buyer_contact_value: string | null;
  seller_contact_method: string | null;
  seller_contact_value: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired" | string;
  seller_response: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
  listing: Listing | null;
};

export type ListingFavorite = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  updated_at: string;
  listing: Listing | null;
};

export type TradeTransaction = {
  id: string;
  listing_id: string;
  trade_match_id: string | null;
  seller_id: string;
  buyer_id: string;
  status: string;
  agreed_price: number | null;
  currency: string;
  seller_feedback: string | null;
  buyer_feedback: string | null;
  followed_ai_recommendation: boolean | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TradeDashboard = {
  listings: Listing[];
  favorites: ListingFavorite[];
  wanted_posts: WantedPost[];
  matches: TradeMatch[];
  transactions: TradeTransaction[];
  contact_requests_received: ContactRequest[];
  contact_requests_sent: ContactRequest[];
  metrics: {
    recommendations_accepted: number;
    decision_feedback_count: number;
    completed_sales_after_ai_recommendation: number;
    average_price_adjustment: number | null;
  };
};

export type ContactRequestsResponse = {
  received: ContactRequest[];
  sent: ContactRequest[];
};

export type ModerationListing = {
  listing: Listing;
  reports: ListingReport[];
};

export type ModerationSummary = {
  high_risk_count: number;
  pending_review_count: number;
  rejected_count: number;
  approved_count: number;
};

export type AdminDashboard = {
  statistics: {
    total_users: number;
    active_listings: number;
    sold_listings: number;
    reported_listings: number;
    new_listings_this_week: number;
    most_popular_categories: Array<{ category: string; count: number }>;
    reserved_listings: number;
    contact_requests_sent: number;
    contact_requests_accepted: number;
    favorite_count: number;
    report_count: number;
    ai_generations_used: number;
    ai_failure_rate: number;
    most_popular_pickup_locations: Array<{ pickup_location: string; count: number }>;
  };
  listings: Listing[];
  listing_reports: ListingReport[];
  user_reports: UserReport[];
  suspicious_ai_flags: Listing[];
  users: Array<{
    id: string;
    email: string;
    username: string | null;
    status: string;
    app_role: string | null;
    full_name: string | null;
    display_name: string | null;
    faculty: string | null;
    residential_college: string | null;
    college_or_location: string | null;
  }>;
  categories: Array<{
    id: string;
    slug: string;
    label: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  ai_usage_logs: Array<{
    id: string;
    user_id: string | null;
    feature: string;
    provider: string | null;
    model: string | null;
    request_status: string;
    input_tokens: number | null;
    output_tokens: number | null;
    estimated_cost: number | null;
    error_message: string | null;
    created_at: string;
  }>;
  admin_actions: Array<{
    id: string;
    admin_id: string | null;
    target_type: string;
    target_id: string;
    action_type: string;
    reason: string | null;
    created_at: string;
  }>;
  ai_settings: {
    ai_trade_enabled: boolean;
    ai_student_daily_limit: number;
    ai_staff_daily_limit: number;
    ai_global_daily_limit: number;
  } | null;
};

export type DecisionFeedback = {
  id: string;
  listing_id: string;
  user_id: string;
  feedback_type: string;
  suggested_listing_price: number | null;
  applied_price: number | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PriceSimulation = {
  listing_id: string;
  proposed_price: number;
  current_price: number;
  suggested_listing_price: number;
  minimum_acceptable_price: number;
  fair_price_range: { low: number; high: number } | null;
  price_competitiveness: string;
  expected_time_to_sell: string;
  expected_buyer_interest: string;
  risk_level: "low" | "medium" | "high";
  action_type:
    | "list_now"
    | "revise_price"
    | "upload_better_image"
    | "match_with_buyers"
    | "flag_for_review";
  action_reason: string;
  confidence_level: string;
};

export type WantedListingRecommendation = {
  listing: Listing;
  match_score: number;
  price_fit_score: number | null;
  location_fit_score: number | null;
  semantic_fit_score: number | null;
  final_match_confidence: string;
  explanation: string;
  price_fit_summary: string;
  location_fit_summary: string;
  item_fit_summary: string;
  risk_note: string;
  recommended_action: string;
};

export type RecommendationOptions = {
  limit?: number;
  minScore?: number;
};

export const tradeCategories = [
  { value: "textbooks_notes", label: "Textbooks & Notes" },
  { value: "electronics", label: "Electronics" },
  { value: "dorm_room", label: "Dorm & Room" },
  { value: "kitchen_appliances", label: "Kitchen Appliances" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "sports_hobby", label: "Sports & Hobby" },
  { value: "tickets_events", label: "Tickets & Events" },
  { value: "free_items", label: "Free Items" },
  { value: "others", label: "Others" },
] as const;

export const conditionOptions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;

export const listingStatusOptions = [
  { value: "", label: "Available & reserved" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
] as const;

export const contactMethods = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export const tradeSafetyMessage =
  "Meet in public campus areas. Check the item before payment. UM Nexus does not hold payments in V1.";

export const pickupAreas = [
  { value: "kk1", label: "KK1" },
  { value: "kk2", label: "KK2" },
  { value: "kk3", label: "KK3" },
  { value: "kk4", label: "KK4" },
  { value: "kk5", label: "KK5" },
  { value: "kk6", label: "KK6" },
  { value: "kk7", label: "KK7" },
  { value: "kk8", label: "KK8" },
  { value: "kk9", label: "KK9" },
  { value: "kk10", label: "KK10" },
  { value: "kk11", label: "KK11" },
  { value: "kk12", label: "KK12" },
  { value: "fsktm", label: "FSKTM" },
  { value: "main_library", label: "Main Library" },
  { value: "um_sentral", label: "UM Sentral" },
  { value: "faculty_area", label: "Faculty Area" },
  { value: "kk_mart", label: "KK Mart" },
  { value: "other", label: "Other" },
] as const;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";
const API_REQUEST_TIMEOUT_MS = readPositiveNumber(
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
  20_000,
);

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
    cache: "no-store",
  });

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

export function formatCategory(category: string): string {
  return tradeCategories.find((item) => item.value === category)?.label ?? category.replaceAll("_", " ");
}

export function formatPickupLocation(value: string | null | undefined): string {
  if (!value) {
    return "Pickup TBD";
  }
  return pickupAreas.find((item) => item.value === value)?.label ?? value.replaceAll("_", " ");
}

export function formatMoney(value: number | null | undefined, currency = "MYR") {
  if (value === null || value === undefined) {
    return "No budget";
  }

  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getListings(filters: Record<string, string> = {}): Promise<Listing[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return fetchJson<Listing[]>(`/listings${query ? `?${query}` : ""}`);
}

export async function getListing(id: string): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}`);
}

export async function createListing(payload: ListingPayload, options: { publish?: boolean } = {}): Promise<Listing> {
  const query = options.publish === undefined ? "" : `?publish=${String(options.publish)}`;
  return fetchJson<Listing>(`/listings${query}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishListing(id: string): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}/publish`, {
    method: "POST",
  });
}

export async function updateListingStatus(
  id: string,
  payload: { status: "available" | "reserved" | "sold" | "hidden" | "deleted"; reason?: string },
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
  const response = await fetchWithTimeout(`${API_BASE_URL}/listings/${listingId}/images`, {
    method: "POST",
    body: formData,
    headers: authHeaders,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(body, response.status));
  }

  return response.json() as Promise<ListingImage>;
}

export async function removeListingImage(listingId: string, imageId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/listings/${listingId}/images/${imageId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
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
  images.slice(0, 4).forEach((image) => {
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

export async function getWantedPost(id: string): Promise<WantedPost> {
  return fetchJson<WantedPost>(`/wanted-posts/${id}`);
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

export async function createContactRequest(
  listingId: string,
  payload: {
    message?: string;
    buyer_contact_method: "telegram" | "whatsapp";
    buyer_contact_value: string;
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
  payload: { status: "accepted" | "rejected"; seller_response?: string },
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
