/**
 * Google Drive file picker helper.
 *
 * Loads gapi + the Picker API + Google Identity Services lazily and
 * idempotently. Opens the Google Picker using an inline OAuth token client, so
 * callers never see or store the access token. No Supabase auth changes.
 *
 * Credentials are public-by-design (Client ID is shown in OAuth URLs; browser
 * API keys are meant for client bundles). Security is enforced by Google via
 * Authorized JavaScript origins (OAuth client) and HTTP referrer restrictions
 * (API key) configured in Google Cloud Console.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const GOOGLE_CLIENT_ID = "713853007100-eb2du7s87d926tfld7hd4h3h6ve2g7eb.apps.googleusercontent.com";
const GOOGLE_API_KEY = "REDACTED_CREDENTIAL";

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
const LEGACY_TOKEN_STORAGE_KEY = "lsatu.gdrive.token.v1";

type CachedToken = { access_token: string; expires_at: number };

// The Google OAuth access token lives in memory for the life of the tab and
// nowhere else. Persisting it in localStorage left a usable Drive credential on
// disk for any script on the origin to read, and survived sign-out.
let cachedToken: CachedToken | null = null;

// Clear any token written by the previous localStorage-backed version.
try {
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
} catch {
  /* ignore */
}

function readCachedToken(): string | null {
  // Keep a 60s safety buffer.
  if (cachedToken && cachedToken.expires_at - 60_000 > Date.now()) {
    return cachedToken.access_token;
  }
  return null;
}

function writeCachedToken(access_token: string, expires_in: number) {
  cachedToken = {
    access_token,
    expires_at: Date.now() + Math.max(0, expires_in) * 1000,
  };
}

function clearCachedToken() {
  cachedToken = null;
}

function requestToken(forceConsent = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_FILE_SCOPE,
      callback: (tokenResponse: any) => {
        if (!tokenResponse?.access_token) {
          reject(new Error(tokenResponse?.error || "No access token"));
          return;
        }
        writeCachedToken(tokenResponse.access_token, Number(tokenResponse.expires_in) || 3600);
        resolve(tokenResponse.access_token);
      },
      error_callback: (err: any) => reject(new Error(err?.message || "OAuth error")),
    });
    tokenClient.requestAccessToken({ prompt: forceConsent ? "consent" : "" });
  });
}

function showPicker(accessToken: string, onPick: (files: PickedFile[]) => void) {
  const appId = GOOGLE_CLIENT_ID.split("-")[0] || "";
  const view = new window.google.picker.DocsView()
    .setIncludeFolders(false)
    .setMimeTypes("*/*");

  const picker = new window.google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken)
    .setDeveloperKey(GOOGLE_API_KEY)
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
}

export async function openPicker(onPick: (files: PickedFile[]) => void): Promise<void> {
  if (!window.google?.accounts?.oauth2 || !window.google?.picker) {
    console.error("[googleDrive] openPicker called before loadGooglePickerApi resolved.");
    return;
  }

  const cached = readCachedToken();
  if (cached) {
    try {
      showPicker(cached, onPick);
      return;
    } catch (err) {
      console.warn("[googleDrive] Cached token failed, re-requesting", err);
      clearCachedToken();
    }
  }

  try {
    const token = await requestToken(false);
    showPicker(token, onPick);
  } catch (err) {
    clearCachedToken();
    throw err;
  }
}

export function clearGoogleDriveAuth() {
  clearCachedToken();
}

