const requiredPublicEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

if (process.env.SKIP_ENV_VALIDATION !== "true") {
  const isProductionDeployment =
    process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";
  const productionOnlyEnv = isProductionDeployment ? ["NEXT_PUBLIC_API_BASE_URL"] : [];
  const missing = [...requiredPublicEnv, ...productionOnlyEnv].filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required web environment variable(s): ${missing.join(", ")}. ` +
        "Set them in apps/web/.env.local, the root Docker .env, or your deployment environment.",
    );
  }
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    qualities: [75],
    minimumCacheTTL: 86400,
    deviceSizes: [480, 640, 960, 1280, 1920],
    imageSizes: [96, 160, 240, 320, 400],
    localPatterns: [{ pathname: "/example-photos/optimized/**", search: "" }],
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL ? [{
      protocol: "https",
      hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
      port: "",
      pathname: "/storage/v1/object/public/listing-images/**",
    }] : [],
  },
  allowedDevOrigins: ["127.0.0.1:3100", "localhost:3100", "http://127.0.0.1:3100", "http://localhost:3100"],
  async redirects() {
    return [
      {
        source: "/luxury",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/example-photos/optimized/:file",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
