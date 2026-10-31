"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function PwaRuntime() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    function enterMarketplace() {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      if (pathname === "/" && (standalone.matches || iosStandalone)) {
        router.replace("/trade");
      }
    }
    enterMarketplace();
    standalone.addEventListener("change", enterMarketplace);
    return () => standalone.removeEventListener("change", enterMarketplace);
  }, [pathname, router]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    // Let the next launch adopt an update; never reload a listing form mid-edit.
    void navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch((error: unknown) => {
      console.error("UM Nexus offline support could not start:", error);
    });
  }, []);

  return null;
}
