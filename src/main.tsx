import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { BUILD_SHA } from "@/lib/buildInfo";
import "./index.css";

// ─────────────────────────────────────────────────────────────────────────────
// Service-worker cleanup
//
// The app no longer ships a service worker (PWA was removed because the
// Workbox cache kept serving the retired "Structure" bootcamp UI long after
// the source was removed). To clean up devices that already registered the
// old worker, we ALWAYS unregister any existing service worker on load and
// drop every Cache Storage entry. The kill-switch workers in
// public/sw.js + public/service-worker.js handle the same job from the SW
// side. Together, they guarantee returning users escape the old cached shell.
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    if (regs && regs.length > 0) {
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    }
  } catch {}
})();

let latestBuildCheck: Promise<void> | null = null;

async function reloadIfNewBundleIsAvailable() {
  if (latestBuildCheck) return latestBuildCheck;

  latestBuildCheck = (async () => {
    try {
      const currentScript = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
      const currentBundle = currentScript?.getAttribute("src");
      if (!currentBundle) return;

      const response = await fetch(window.location.href, { cache: "no-store" });
      if (!response.ok) return;

      const html = await response.text();
      const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/i);
      const nextBundle = match?.[1];

      if (nextBundle && nextBundle !== currentBundle) {
        window.location.reload();
      }
    } catch {
      // A failed freshness probe should never block app boot.
    } finally {
      latestBuildCheck = null;
    }
  })();

  return latestBuildCheck;
}

document.documentElement.dataset.buildSha = BUILD_SHA;
window.addEventListener("pageshow", () => {
  void reloadIfNewBundleIsAvailable();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void reloadIfNewBundleIsAvailable();
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
