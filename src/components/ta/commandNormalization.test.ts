import { describe, expect, it } from "vitest";
import {
  commandRequiresComingSoon,
  normalizeTACommand,
  type ComposerMention,
} from "./commandNormalization";
import type { TAStudentRow } from "@/hooks/useTAStudents";

const students: TAStudentRow[] = [
  { class_id: "student-sofia", display_name: "Sofia Medina" },
  { class_id: "student-maya", display_name: "Maya Chen" },
];

const sofiaMention: ComposerMention = {
  studentId: "student-sofia",
  displayName: "Sofia Medina",
  token: "@Sofia",
};

function normalize(text: string, mentions: ComposerMention[] = [sofiaMention]) {
  return normalizeTACommand({
    text,
    backend: "ta-agent",
    mentions,
    students,
  });
}

describe("normalizeTACommand", () => {
  it("normalizes mentioned assignments to the deterministic assignment command", () => {
    const intent = normalize("assign causal flaw to @Sofia");

    expect(intent.kind).toBe("assign");
    expect(intent.preview).toBe("Prepare assignment proposal: causal flaw for Sofia");
    expect(intent.sendText).toBe("assign causal flaw to Sofia Medina");
  });

  it("normalizes rough give-student-work phrasing", () => {
    const intent = normalize("give sofia causal flaw", []);

    expect(intent.kind).toBe("assign");
    expect(intent.preview).toBe("Prepare assignment proposal: causal flaw for Sofia");
    expect(intent.sendText).toBe("assign causal flaw to Sofia Medina");
  });

  it("normalizes next-work questions", () => {
    const intent = normalize("what should sofia work on", []);

    expect(intent.kind).toBe("analyze");
    expect(intent.preview).toBe("Recommend next work for Sofia");
  });

  it("normalizes prep requests", () => {
    const intent = normalize("prep for my session with sofia", []);

    expect(intent.kind).toBe("analyze");
    expect(intent.preview).toBe("Prepare session briefing for Sofia");
  });

  it("recognizes existing slash-menu diagnostic prefills", () => {
    const intent = normalize("Give me a full diagnostic of this student.", []);

    expect(intent.kind).toBe("analyze");
    expect(intent.preview).toBe("Run diagnostic for the selected student");
  });

  it("marks unsupported message actions as coming soon", () => {
    const intent = normalize("send sofia a message account ready", []);

    expect(intent.kind).toBe("draft_or_message");
    expect(intent.preview).toBe('Draft message for Sofia: "account ready"');
    expect(commandRequiresComingSoon(intent)).toBe(true);
  });
});
