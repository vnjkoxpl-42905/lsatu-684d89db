// Best-effort client-side text extraction from common file types so the
// operator chat can reason about uploaded attachments inline.

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "log", "xml", "yml", "yaml",
  "html", "htm", "css", "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs",
  "java", "c", "cpp", "h", "sh", "sql", "ini", "toml", "env",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

const MAX_CHARS = 20_000;

async function extractPdfText(file: File): Promise<string> {
  // Lazy-load pdfjs-dist so we don't pay the cost unless a PDF is attached.
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // Use the bundled worker (Vite handles ?url + worker).
  try {
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  } catch {
    // Fall back to disabling the worker; slower but works.
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  }
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const maxPages = Math.min(doc.numPages, 50);
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    if (out.length > MAX_CHARS) break;
  }
  return out.slice(0, MAX_CHARS);
}

export async function extractFileText(file: File): Promise<string> {
  const ext = extOf(file.name);
  try {
    if (file.type === "application/pdf" || ext === "pdf") {
      const text = await extractPdfText(file);
      return text || "(empty PDF)";
    }
    if (file.type.startsWith("text/") || TEXT_EXTENSIONS.has(ext)) {
      const text = await file.text();
      return text.slice(0, MAX_CHARS);
    }
    return `(binary file — ${(file.size / 1024).toFixed(1)} KB; contents not extracted)`;
  } catch (e: any) {
    return `(failed to read: ${e?.message ?? "unknown error"})`;
  }
}

export async function buildAttachmentBlock(files: File[]): Promise<string> {
  if (!files.length) return "";
  const parts: string[] = ["", "---", "Attached files:"];
  for (const f of files) {
    const text = await extractFileText(f);
    parts.push("", `### ${f.name} (${f.type || "unknown"}, ${(f.size / 1024).toFixed(1)} KB)`);
    parts.push("```");
    parts.push(text);
    parts.push("```");
  }
  return parts.join("\n");
}
