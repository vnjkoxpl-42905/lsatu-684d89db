export const MAINHUB_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

export const MAINHUB_ATTACHMENT_ACCEPT = [
  "image/*",
  "application/pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".rtf",
].join(",");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/rtf",
  "text/rtf",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"]);

export function validateStudyThreadFile(file: File): string | null {
  if (file.size > MAINHUB_ATTACHMENT_MAX_BYTES) {
    return "File must be under 20MB.";
  }

  const type = file.type.toLowerCase();
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase()}`
    : "";

  if (type.startsWith("image/") || ALLOWED_MIME_TYPES.has(type) || ALLOWED_EXTENSIONS.has(extension)) {
    return null;
  }

  return "Please attach images, PDFs, or documents.";
}

export function insertEmojiAtSelection(
  value: string,
  emoji: string,
  selectionStart: number | null | undefined,
  selectionEnd: number | null | undefined,
) {
  const start = typeof selectionStart === "number" ? selectionStart : value.length;
  const end = typeof selectionEnd === "number" ? selectionEnd : start;
  const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
  return {
    next,
    cursor: start + emoji.length,
  };
}
