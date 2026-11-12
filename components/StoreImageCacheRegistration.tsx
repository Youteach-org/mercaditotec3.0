"use client";

import { useEffect } from "react";

/** Registers a narrowly scoped fetch handler for public store photos only. */
export default function StoreImageCacheRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.isSecureContext ||
      !("serviceWorker" in navigator)
    ) return;

    void navigator.serviceWorker.register("/mercadito-media-sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch(() => {
      // Browsing must keep working even when service workers are unsupported.
    });
  }, []);

  return null;
}
