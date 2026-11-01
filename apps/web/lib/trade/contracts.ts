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

export type BetaSignupStatus = {
  signup_open: boolean;
  current_users: number;
  max_users: number;
};

export type BetaWaitlistEntry = {
  id: string;
  email: string;
  reason: string | null;
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
  source_wanted_post_id: string | null;
  sold_source: string | null;
  sold_contact_request_id: string | null;
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
      verified_um_email: boolean | null;
    } | null;
  } | null;
};

export type ListingsPage = {
  items: Listing[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
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
  closed_reason: string | null;
  closed_reason_note: string | null;
  closed_at: string | null;
  response_count: number;
  created_at: string;
  updated_at: string;
};

export type WantedPostPage = {
  items: WantedPost[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type WantedResponse = {
  id: string;
  wanted_post_id: string;
  seller_id: string;
  buyer_id: string;
  listing_id: string | null;
  message: string | null;
  seller_contact_method: string;
  seller_contact_value: string | null;
  contact_reveal_blocked_reason: string | null;
  status: string;
  buyer_response: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  wanted_post: WantedPost | null;
  listing: Listing | null;
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

export type CurrentProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  faculty: string | null;
  year_of_study: number | null;
  residential_college: string | null;
  college_or_location: string | null;
  contact_preference: string | null;
  contact_value: string | null;
  verified_um_email: boolean;
  trade_safety_acknowledged_at: string | null;
  app_role: string;
  created_at: string;
  updated_at: string;
};

export type CurrentUserResponse = {
  user: {
    id: string;
    email: string;
    username: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  profile: CurrentProfile;
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
  contact_method?: "in_app" | "telegram" | "whatsapp" | "email";
  contact_value?: string;
  source_wanted_post_id?: string;
};

export type ProductEventPayload = {
  event_type:
    | "listing_viewed"
    | "favorite_toggled"
    | "contact_request_sent"
    | "listing_published"
    | "listing_sold"
    | "report_submitted"
    | string;
  entity_type?: "listing" | "user" | "contact_request" | "report" | string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
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

export type WantedPostFilters = {
  search?: string;
  category?: string;
  pickup_area?: string;
  max_budget?: string;
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type WantedResponsePayload = {
  message?: string;
  seller_contact_method: string;
  seller_contact_value?: string;
  listing_id?: string;
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
  contact_reveal_blocked_reason: string | null;
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
  contact_request_id: string | null;
  seller_id: string;
  buyer_id: string;
  status: string;
  sale_source: string | null;
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
  wanted_responses_received: WantedResponse[];
  wanted_responses_sent: WantedResponse[];
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

export type NotificationType =
  | "contact_request_received"
  | "contact_request_accepted"
  | "contact_request_rejected"
  | "contact_request_cancelled"
  | "contact_request_expired"
  | "trade_marked_completed"
  | "buyer_no_response"
  | "listing_marked_reserved"
  | "listing_marked_sold"
  | "listing_hidden_by_moderation"
  | "listing_restored_by_moderation"
  | "listing_reported"
  | "report_reviewed"
  | "wanted_match_listing_created"
  | string;

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type TradeNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
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
  { value: "in_app", label: "In-app request only" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
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

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "Recently";
  }
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Recently";
  }
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, unitSeconds] of units) {
    if (seconds >= unitSeconds) {
      return formatter.format(-Math.floor(seconds / unitSeconds), unit);
    }
  }
  return "Just now";
}

export function getSellerDisplayName(listing: Pick<Listing, "seller">): string {
  return (
    listing.seller?.profile?.display_name ??
    listing.seller?.profile?.full_name ??
    listing.seller?.username ??
    "UM student"
  );
}

export function isProfileComplete(profile: CurrentProfile | null | undefined): boolean {
  return Boolean(
    (profile?.display_name || profile?.full_name)?.trim() &&
      profile?.faculty?.trim() &&
      (profile?.college_or_location || profile?.residential_college)?.trim(),
  );
}
