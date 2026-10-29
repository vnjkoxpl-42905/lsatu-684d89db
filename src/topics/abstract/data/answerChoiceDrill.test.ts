import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANSWER_CHOICE_ITEMS,
  ROLE_CHOICE_INTRO_HTML,
  ROLE_CHOICE_SOURCE_CONTENT_SHA256,
} from "./answerChoiceDrill";

// This is an unchanged copy of Joshua's newest Desktop source, not a second
// authored content bank. Compare against it to catch edits to source wording,
// paragraph structure, emphasis, examples, and the references he asked to keep.
const sourceBytes = readFileSync(
  resolve(process.cwd(), "src/topics/abstract/data/__fixtures__/role_question_answer_choices_complete_transcription.html"),
);
const source = sourceBytes.toString("utf8").replace(/\r\n/g, "\n");
const headings = [...source.matchAll(/<h2>(\d+)\. (.*?)<\/h2>/gs)];

describe("Role answer-choice exact source fidelity", () => {
  it("keeps the complete source fixture unchanged apart from platform line endings", () => {
    expect(createHash("sha256").update(source).digest("hex")).toBe(ROLE_CHOICE_SOURCE_CONTENT_SHA256);
  });

  it("preserves all four introduction paragraphs exactly", () => {
    const intro = source.split("</h1>")[1].split('<ol class="choice-list">')[0].trim();
    expect(intro.match(/<p>/g)).toHaveLength(4);
    expect(ROLE_CHOICE_INTRO_HTML).toBe(intro);
  });

  it("preserves each of the fifteen choices and full breakdown HTML exactly", () => {
    expect(headings).toHaveLength(15);
    expect(ANSWER_CHOICE_ITEMS).toHaveLength(15);
    headings.forEach((heading, index) => {
      const end = headings[index + 1]?.index ?? source.indexOf('<div class="asterisk">');
      const breakdown = source.slice(heading.index! + heading[0].length, end).trim();
      const item = ANSWER_CHOICE_ITEMS[index];
      expect(item.stemNumber).toBe(Number(heading[1]));
      expect(item.stemText).toBe(heading[2]);
      expect(item.breakdownHtml).toBe(breakdown);
    });
  });
});
