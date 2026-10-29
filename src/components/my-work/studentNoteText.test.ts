import { describe, expect, it } from "vitest";
import { noteBodyToText, textToNoteBody } from "./studentNoteText";

describe("student note text", () => {
  it("round trips paragraphs and blank lines without merging words", () => {
    const original = "Argument structure\n\nI missed the conclusion.";
    expect(noteBodyToText(textToNoteBody(original))).toBe(original);
  });

  it("reads existing rich text as editable plain text", () => {
    expect(noteBodyToText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "First", marks: [{ type: "bold" }] }] }, { type: "paragraph", content: [{ type: "text", text: "Second" }] }] })).toBe("First\nSecond");
  });
});
