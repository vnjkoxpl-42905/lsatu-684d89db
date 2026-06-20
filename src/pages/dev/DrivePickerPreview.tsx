import { useState } from "react";
import { GoogleDrivePicker } from "@/components/drive/GoogleDrivePicker";

// TEMP dev-only preview of the Google-native Drive picker with stubbed data.
// Not committed. Lets us screenshot the styled picker without auth/edge-function.
const ICON = (mime: string) =>
  `https://drive-thirdparty.googleusercontent.com/16/type/${mime}`;

const DOC = "application/vnd.google-apps.document";
const PDF = "application/pdf";

const SAMPLE = [
  { id: "1", name: "Consultation between Joshua and Isabella Lorenzo - 2026/06/17 15:00 EDT - Notes by Gemini", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-18T15:00:00Z" },
  { id: "2", name: "VS Code as AI Agent Cockpit", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-16T10:00:00Z" },
  { id: "3", name: "[Gemini Canvas] VS Code as AI Agent Cockpit", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-16T10:00:00Z", shared: true },
  { id: "4", name: "Consultation between Joshua and Sofia Minassian - 2026/06/16 16:34 EDT - Notes by Gemini", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-16T16:34:00Z" },
  { id: "5", name: "Meeting started 2026/06/14 16:08 EDT - Notes by Gemini", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-14T16:08:00Z" },
  { id: "6", name: "Untitled document", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-14T09:00:00Z" },
  { id: "7", name: "7sage links students", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-14T08:00:00Z" },
  { id: "8", name: "_scan_Ellen Cassidy - The Loophole in LSAT Logical Reasoning-Elemental Prep (2018).pdf", mimeType: PDF, iconLink: ICON(PDF), webViewLink: "#", modifiedTime: "2026-06-12T10:00:00Z" },
  { id: "9", name: "Dakota - 2026/06/12 18:03 EDT - Notes by Gemini", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-12T18:03:00Z" },
  { id: "10", name: "Logical Reasoning Overview | LSAT Lab.pdf", mimeType: PDF, iconLink: ICON(PDF), webViewLink: "#", modifiedTime: "2026-06-11T10:00:00Z" },
  { id: "11", name: "Indicator word list .pdf", mimeType: PDF, iconLink: ICON(PDF), webViewLink: "#", modifiedTime: "2026-06-11T09:00:00Z" },
  { id: "12", name: "Nicole - 2026/06/10 18:49 EDT - Notes by Gemini", mimeType: DOC, iconLink: ICON(DOC), webViewLink: "#", modifiedTime: "2026-06-10T18:49:00Z", shared: true },
];

// Patch at module load so the stub is in place before the picker's mount effect fires.
if (typeof window !== "undefined" && !(window as unknown as { __drivePatched?: boolean }).__drivePatched) {
  const orig = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url);
    if (url.includes("/functions/v1/gdrive") && url.includes("action=list")) {
      return new Response(JSON.stringify({ ok: true, files: SAMPLE, nextPageToken: null }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    return orig(input as RequestInfo, init);
  }) as typeof window.fetch;
  (window as unknown as { __drivePatched?: boolean }).__drivePatched = true;
}

export default function DrivePickerPreview() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black">
      <GoogleDrivePicker
        open={open}
        onClose={() => setOpen(false)}
        title="Attach from Google Drive"
        confirmLabel="Attach"
        onConfirm={() => {}}
      />
    </div>
  );
}
