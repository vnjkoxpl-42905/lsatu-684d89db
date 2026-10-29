import { supabase } from "@/integrations/supabase/client";

/** A Google Drive file as the `gdrive` edge function returns it. */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  shared?: boolean;
}

/** Headers for calling the `gdrive` edge function: Supabase session + anon key. */
export async function driveAuthHeaders() {
  const { waitForAccessToken } = await import("@/lib/waitForSession");
  const token = await waitForAccessToken();
  return {
    Authorization: `Bearer ${token ?? ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

/**
 * Downloads a Drive file's bytes (Google-native types export to PDF) and returns
 * a base64 payload ready to attach. Used by callers that need the file content,
 * not just a reference.
 */
export async function downloadDriveFile(
  file: DriveFile,
): Promise<{ filename: string; mimeType: string; dataBase64: string; size: number }> {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
  url.searchParams.set("action", "download");
  url.searchParams.set("id", file.id);
  // Default export: gdrive picks PDF for Google-native formats.
  if (file.mimeType.startsWith("application/vnd.google-apps.")) {
    url.searchParams.set("format", "pdf");
  }
  const res = await fetch(url.toString(), { headers: await driveAuthHeaders() });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* binary */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  // Suggested filename from Content-Disposition; fallback to name (with .pdf for native).
  const disp = res.headers.get("Content-Disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disp);
  const suggestedName = m?.[1]
    ? decodeURIComponent(m[1])
    : file.mimeType.startsWith("application/vnd.google-apps.")
      ? `${file.name}.pdf`
      : file.name;
  const mimeType = res.headers.get("Content-Type")?.split(";")[0]?.trim()
    || (file.mimeType.startsWith("application/vnd.google-apps.") ? "application/pdf" : file.mimeType);

  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Encode in 32KB chunks to avoid blowing the call stack on large files.
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const dataBase64 = btoa(bin);
  return { filename: suggestedName, mimeType, dataBase64, size: bytes.length };
}
