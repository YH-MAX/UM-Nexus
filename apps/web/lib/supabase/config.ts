const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

function readPublicEnv(name: keyof typeof PUBLIC_ENV): string {
  const value = PUBLIC_ENV[name]?.trim();

  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicConfig() {
  return {
    supabaseUrl: readPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublishableKey: readPublicEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}
