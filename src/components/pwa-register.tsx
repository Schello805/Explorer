"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        registration.update();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      });
    }
  }, []);
  return null;
}
