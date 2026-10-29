import { describe, expect, it } from "vitest";
import {
  insertEmojiAtSelection,
  validateStudyThreadFile,
} from "./mainhubComposer";

function file(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("mainhub composer helpers", () => {
  it("accepts images, PDFs, and common study documents", () => {
    expect(validateStudyThreadFile(file("diagram.png", "image/png"))).toBeNull();
    expect(validateStudyThreadFile(file("notes.pdf", "application/pdf"))).toBeNull();
    expect(
      validateStudyThreadFile(
        file(
          "outline.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ),
    ).toBeNull();
  });

  it("rejects unsupported or oversized files", () => {
    expect(validateStudyThreadFile(file("archive.zip", "application/zip"))).toMatch(
      /images, PDFs, or documents/i,
    );
    expect(validateStudyThreadFile(file("large.pdf", "application/pdf", 25 * 1024 * 1024))).toMatch(
      /under 20MB/i,
    );
  });

  it("inserts an emoji at the current selection", () => {
    expect(insertEmojiAtSelection("Hello there", "🙂", 6, 11)).toEqual({
      next: "Hello 🙂",
      cursor: 8,
    });
  });
});
