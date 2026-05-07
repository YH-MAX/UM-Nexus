import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist } from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

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
    <html className={geistSans.variable} lang="en">
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
