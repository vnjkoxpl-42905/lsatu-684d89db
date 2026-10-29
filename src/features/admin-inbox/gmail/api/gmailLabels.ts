import { invokeGmail } from "./gmailClient";
import type { GmailLabel } from "./types";

export function listLabels(): Promise<GmailLabel[]> {
  return invokeGmail<{ ok: true; labels: GmailLabel[] }>({ action: "listLabels" })
    .then((r) => r.labels);
}
