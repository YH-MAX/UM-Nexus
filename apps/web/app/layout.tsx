import type { Metadata } from "next";
import type { Viewport } from "next";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "UM Nexus",
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
  themeColor: "#020617",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
