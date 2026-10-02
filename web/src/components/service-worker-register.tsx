"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA instalável) só em produção: em dev ele atrapalharia o HMR. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // sem service worker o app funciona igual, só não instala/offline
    });
  }, []);
  return null;
}
