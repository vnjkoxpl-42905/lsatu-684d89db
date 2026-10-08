import type { TiptapDoc } from "@/lib/journalService";

type TextNode = { type?: string; text?: string; content?: unknown[] };

function readNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const value = node as TextNode;
  if (value.type === "text") return value.text ?? "";
  if (value.type === "hardBreak") return "\n";
  const children = Array.isArray(value.content) ? value.content.map(readNode).join("") : "";
  if (value.type === "paragraph" || value.type === "heading") return `${children}\n`;
  if (value.type === "listItem") return `• ${children.trimEnd()}\n`;
  return children;
}

export function noteBodyToText(body: TiptapDoc): string {
  return (body.content ?? []).map(readNode).join("").replace(/\n$/, "");
}

export function textToNoteBody(value: string): TiptapDoc {
  return {
    type: "doc",
    content: value.replace(/\r\n/g, "\n").split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
