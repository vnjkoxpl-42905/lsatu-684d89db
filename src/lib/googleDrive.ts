/**
 * Google Drive file picker helper.
 *
 * Loads gapi + the Picker API + Google Identity Services lazily and
 * idempotently. Opens the Google Picker using an inline OAuth token client, so
 * callers never see or store the access token. No Supabase auth changes.
 *
 * Required env:
 *   VITE_GOOGLE_CLIENT_ID - Google OAuth client ID (for GIS token client)
 *   VITE_GOOGLE_API_KEY   - Google API key (developer key for Picker)
 *
 * Usage:
 *   await loadGooglePickerApi();
 *   openPicker((files) => {
 *     // insert to drive_files here
 *   });
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type PickedFile = {
  id: string;
  name: string;
  mimeType: string;
  url: string;           // webViewLink
  thumbnailUrl?: string;
};

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

const GAPI_SRC = "https://apis.google.com/js/api.js";
const GIS_SRC = "https://accounts.google.com/gsi/client";

let loadPromise: Promise<void> | null = null;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export function loadGooglePickerApi(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await Promise.all([injectScript(GAPI_SRC), injectScript(GIS_SRC)]);
    await new Promise<void>((resolve, reject) => {
      if (!window.gapi) return reject(new Error("gapi unavailable after script load"));
      window.gapi.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("Failed to load gapi picker module")),
      });
    });
  })();
  return loadPromise;
}

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function openPicker(onPick: (files: PickedFile[]) => void): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  if (!clientId || clientId === "placeholder" || !apiKey || apiKey === "placeholder") {
    console.error(
      "[googleDrive] VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_API_KEY are not set. " +
      "Fill them in Lovable env settings before using the picker.",
    );
    return;
  }

  if (!window.google?.accounts?.oauth2 || !window.google?.picker) {
    console.error("[googleDrive] openPicker called before loadGooglePickerApi resolved.");
    return;
  }

  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_FILE_SCOPE,
    callback: (tokenResponse: any) => {
      if (!tokenResponse?.access_token) {
        console.error("[googleDrive] Token response missing access_token", tokenResponse);
        return;
      }

      const appId = clientId.split("-")[0] || "";
      const view = new window.google.picker.DocsView()
        .setIncludeFolders(false)
        .setMimeTypes("*/*");

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(tokenResponse.access_token)
        .setDeveloperKey(apiKey)
        .setAppId(appId)
        .setCallback((data: any) => {
          if (data.action !== window.google.picker.Action.PICKED) return;
          const docs: any[] = data.docs || [];
          const files: PickedFile[] = docs.map((d) => ({
            id: String(d.id),
            name: String(d.name ?? "Untitled"),
            mimeType: String(d.mimeType ?? ""),
            url: String(d.url ?? d.embedUrl ?? ""),
            thumbnailUrl: d.iconUrl ? String(d.iconUrl) : undefined,
          }));
          onPick(files);
        })
        .build();

      picker.setVisible(true);
    },
  });

  tokenClient.requestAccessToken({ prompt: "" });
}
