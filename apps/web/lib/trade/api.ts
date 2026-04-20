export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  public_url: string | null;
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
  condition_label: string | null;
  price: number;
  currency: string;
  pickup_area: string | null;
  residential_college: string | null;
  status: string;
  risk_score: number;
  is_ai_enriched: boolean;
  created_at: string;
  updated_at: string;
  images: ListingImage[];
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
  created_at: string;
  updated_at: string;
  wanted_post: WantedPost;
};

export type TradeResult = {
  recommendation: {
    suggested_listing_price: number;
    minimum_acceptable_price: number;
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
  };
  expected_outcome: {
    expected_time_to_sell: string;
    expected_buyer_interest: string;
    confidence_level: string;
  };
  action: {
    action_type:
      | "list_now"
      | "revise_price"
      | "upload_better_image"
      | "match_with_buyers"
      | "flag_for_review";
    action_reason: string;
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
  error_message: string | null;
  result: TradeResult | null;
};

export type ListingPayload = {
  title: string;
  description?: string;
  category: string;
  item_name?: string;
  brand?: string;
  model?: string;
  condition_label?: string;
  price: number;
  currency: string;
  pickup_area?: string;
  residential_college?: string;
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

export const tradeCategories = [
  { value: "textbooks", label: "Textbooks" },
  { value: "electronics", label: "Electronics" },
  { value: "small_appliances", label: "Small appliances" },
  { value: "dorm_essentials", label: "Dorm essentials" },
] as const;

export const pickupAreas = [
  { value: "KK", label: "KK" },
  { value: "FSKTM", label: "FSKTM" },
  { value: "library", label: "Library" },
  { value: "faculty_pickup", label: "Faculty pickup" },
  { value: "other", label: "Other" },
] as const;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function formatCategory(category: string): string {
  return category.replaceAll("_", " ");
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

export async function getListings(): Promise<Listing[]> {
  return fetchJson<Listing[]>("/listings");
}

export async function getListing(id: string): Promise<Listing> {
  return fetchJson<Listing>(`/listings/${id}`);
}

export async function createListing(payload: ListingPayload): Promise<Listing> {
  return fetchJson<Listing>("/listings", {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function getListingMatches(id: string): Promise<TradeMatch[]> {
  return fetchJson<TradeMatch[]>(`/listings/${id}/matches`);
}

export async function enrichListing(id: string): Promise<EnrichListingAccepted> {
  return fetchJson<EnrichListingAccepted>(`/ai/trade/enrich-listing/${id}`, {
    method: "POST",
  });
}

export async function getTradeResultStatus(id: string): Promise<TradeResultStatus> {
  return fetchJson<TradeResultStatus>(`/ai/trade/result/${id}`);
}
