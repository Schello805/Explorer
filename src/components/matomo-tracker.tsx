"use client";

import { useEffect } from "react";
import type { Tenant } from "@/lib/types";

declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

export function MatomoTracker({ tracking }: { tracking: Tenant["tracking"] }) {
  useEffect(() => {
    if (!tracking.enabled || tracking.provider !== "matomo") return;
    if (!tracking.matomoUrl || !tracking.matomoSiteId) return;
    if (tracking.respectDoNotTrack && navigator.doNotTrack === "1") return;

    const hasConsent = () => {
      try {
        const consent = JSON.parse(localStorage.getItem("platzguide-consent") ?? "{}") as { value?: string };
        return consent.value === "all";
      } catch {
        return false;
      }
    };

    const loadMatomo = () => {
      if (!hasConsent()) return;
      const matomoBaseUrl = tracking.matomoUrl.replace(/\/+$/, "");
      window._paq = window._paq ?? [];
      if (tracking.anonymizeIp) window._paq.push(["setPrivacyMode", true]);
      window._paq.push(["trackPageView"]);
      window._paq.push(["enableLinkTracking"]);
      window._paq.push(["setTrackerUrl", `${matomoBaseUrl}/matomo.php`]);
      window._paq.push(["setSiteId", tracking.matomoSiteId]);
      if (document.querySelector(`script[data-matomo-site="${tracking.matomoSiteId}"]`)) return;
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.src = `${matomoBaseUrl}/matomo.js`;
      script.dataset.matomoSite = tracking.matomoSiteId;
      document.head.appendChild(script);
    };

    loadMatomo();
    window.addEventListener("platzguide-consent-changed", loadMatomo);
    return () => window.removeEventListener("platzguide-consent-changed", loadMatomo);
  }, [tracking]);

  return null;
}
