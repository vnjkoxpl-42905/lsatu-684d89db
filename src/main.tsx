import React from "react";
import { createRoot } from "react-dom/client";
import { isRunLive } from "./lib/liveRun";
import App from "./App.tsx";
import { BUILD_SHA } from "@/lib/buildInfo";
import { markSafeLazyReloaded } from "@/lib/safeLazy";
import "./index.css";

// LocatorJS (dev only): Option/Alt+click a rendered element to jump to its source
// component in VS Code. Dynamically imported and guarded by import.meta.env.DEV so it
// is fully stripped from production builds.
if (import.meta.env.DEV) {
  import("@locator/runtime")
    .then(({ default: setupLocatorUI }) =>
      setupLocatorUI({
        adapter: "react",
        showIntro: false,
        targets: {
          vscode: {
            label: "VS Code",
            url: "vscode://file/${projectPath}${filePath}:${line}:${column}",
          },
        },
      }),
    )
    .catch((err) => console.error("[locatorjs] failed to initialize", err));
}

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
  /*
   * Never over the top of a live recording.
   *
   * This check exists so a student is not running a build from two deploys
   * ago, and everywhere else in the app the cost of it is a flicker. On a Read,
   * Recall, Colour section the cost is the section: the recorder lives in this
   * tab, nothing is written until she finishes, and a reload ends up to
   * twenty-five minutes of an unrepeatable take. It only takes publishing while
   * she is working and her glancing at another tab.
   *
   * Deferred, not cancelled. She stays on the bundle she started on until the
   * run ends, and the next return to the tab picks the new one up.
   */
  if (isRunLive()) return;

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

// Stale lazy-chunk recovery. After a deploy the cached index.html can still
// reference hashed chunk filenames (e.g. TeacherTemplates-XXXX.js) that no
// longer exist, causing "Failed to fetch dynamically imported module" and a
// blank screen. Reload once to pick up the fresh manifest; sessionStorage
// guards against reload loops if the failure is something else.
const CHUNK_RELOAD_KEY = "__chunk_reload_attempted__";
function handleChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  const stale =
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    // React.lazy mounts a resolved chunk by reading `.default`. After a deploy
    // the cached app shell can resolve a lazy import to `undefined` (chunk
    // manifest mismatch), producing this exact TypeError. Treat it as stale.
    /Cannot read propert(?:y|ies) of undefined \(reading 'default'\)/i.test(message) ||
    /undefined is not an object \(evaluating '.*\.default'\)/i.test(message);
  if (!stale) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {}
  window.location.reload();
  return true;
}
window.addEventListener("vite:preloadError", (event) => {
  (event as Event).preventDefault();
  handleChunkLoadError("Failed to fetch dynamically imported module");
});
window.addEventListener("error", (event) => {
  handleChunkLoadError(event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = (event as PromiseRejectionEvent).reason;
  const message = typeof reason === "string" ? reason : reason?.message;
  handleChunkLoadError(message);
});
window.addEventListener("pageshow", () => {
  try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch {}
  markSafeLazyReloaded();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
