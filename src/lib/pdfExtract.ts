/**
 * Lazy PDF text extraction for the Teaching Library.
 *
 * pdfjs-dist is ~400KB; dynamic import keeps it out of the main bundle so
 * the admin-only library page pays the cost only when a PDF is uploaded.
 * The worker URL is pinned to the loaded version via CDN to avoid
 * "worker version mismatch" errors under strict Service Worker caches.
 */
const MAX_CHARS = 200_000;

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it: any) => it.str || "").join(" "));
  }
  return parts.join("\n\n").slice(0, MAX_CHARS);
}
