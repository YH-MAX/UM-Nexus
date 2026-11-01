import type { Metadata } from "next";
import type { Viewport } from "next";
import { geistSans } from "@/lib/fonts/geist";

import { Providers } from "@/app/providers";
import { PwaRuntime } from "@/components/pwa-runtime";
import { PublicBrowseBootstrap } from "@/components/public-browse-bootstrap";

import "./globals.css";


export const metadata: Metadata = {
  applicationName: "UM Nexus",
  appleWebApp: { capable: true, title: "UM Nexus", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  title: {
    default: "UM Nexus Trade",
    template: "%s | UM Nexus",
  },
  description:
    "A trusted campus marketplace for University of Malaya students.",
  keywords: [
    "UM Nexus",
    "campus marketplace",
    "University of Malaya",
    "UM Nexus Trade",
    "student resale",
  ],
};

export const viewport: Viewport = {
  themeColor: "#090807",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className={geistSans.variable} lang="en">
      <head><PublicBrowseBootstrap /></head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <PwaRuntime />
      </body>
    </html>
  );
}
