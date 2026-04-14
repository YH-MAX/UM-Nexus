import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { supabasePublishableKey, supabaseUrl } = getSupabasePublicConfig();
  browserClient = createClient(supabaseUrl, supabasePublishableKey);
  return browserClient;
}
