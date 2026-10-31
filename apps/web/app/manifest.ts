import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "UM Nexus",
    short_name: "UM Nexus",
    description: "The University of Malaya campus marketplace.",
    start_url: "/trade",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#090807",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
