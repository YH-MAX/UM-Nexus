import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Browser Supabase client via @supabase/ssr so PKCE OAuth uses cookie-backed
 * storage (not localStorage). That avoids "PKCE code verifier not found" after
 * the Google redirect on Next.js.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const { supabasePublishableKey, supabaseUrl } = getSupabasePublicConfig();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
