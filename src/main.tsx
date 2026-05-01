import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ─────────────────────────────────────────────────────────────────────────────
// Service-worker safety net
//
// Two situations to handle:
//   1) Lovable preview / iframe contexts: the SW must NEVER stay registered,
//      because it would serve stale shells and break the editor preview.
//   2) Published hosts (lsatu.lovable.app, lsatprep.study, custom domains):
//      the PWA is allowed, BUT a previously-cached SW from an older deploy
//      can keep serving an old `index.html` + JS bundles forever. We detect a
//      build mismatch by comparing __BUILD_SHA__ (baked into THIS bundle at
//      build time) against the SHA we last persisted in localStorage. If they
//      differ, we unregister the SW, drop every Cache Storage entry, and
//      reload once so the user pulls a fresh bundle.
// ─────────────────────────────────────────────────────────────────────────────

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

declare const __BUILD_SHA__: string;

async function nukeCachesAndReload() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
  } catch {}
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {}
  // Loop guard: only reload if we haven't already reloaded for this SHA.
  const reloadKey = `__lu_reloaded_for_${__BUILD_SHA__}`;
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  }
}

if (isPreviewHost || isInIframe) {
  // Always strip the SW in preview/iframe — never let it persist here.
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else {
  // Published host: allow the PWA, but evict stale builds.
  try {
    const SHA_KEY = "__lu_build_sha";
    const last = localStorage.getItem(SHA_KEY);
    if (last && last !== __BUILD_SHA__) {
      // New build detected → purge old SW + caches before mounting.
      void nukeCachesAndReload();
    }
    localStorage.setItem(SHA_KEY, __BUILD_SHA__);
  } catch {}
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
