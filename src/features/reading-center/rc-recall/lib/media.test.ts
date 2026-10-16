import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CUMULATIVE_EXAMPLES, RC_RECALL_EXAMPLES, RC_RECALL_NOTE, instructionsVerified, mediaBase, mediaUrls,
} from "./media";

afterEach(() => vi.unstubAllEnvs());

describe("media configuration", () => {
  it("is hidden by default", () => {
    expect(mediaBase({})).toBeNull();
    expect(mediaUrls("examples/x", null)).toBeNull();
    expect(instructionsVerified({})).toBe(false);
  });
  it("needs both the base and the verification flag for the instruction video", () => {
    expect(instructionsVerified({ VITE_RC_RECALL_MEDIA_BASE: "http://h", VITE_RC_RECALL_INSTRUCTIONS_VERIFIED: "true" })).toBe(true);
    expect(instructionsVerified({ VITE_RC_RECALL_INSTRUCTIONS_VERIFIED: "true" })).toBe(false);
    expect(instructionsVerified({ VITE_RC_RECALL_MEDIA_BASE: "http://h" })).toBe(false);
  });
  it("builds video, caption, MP3, and transcript URLs", () => {
    expect(mediaUrls("examples/a", "http://h/")).toEqual({ video: "http://h/examples/a.mp4", captions: "http://h/examples/a.vtt", audio: "http://h/examples/a.mp3", transcript: "http://h/examples/a.txt" });
  });
  it("reads the real environment", () => {
    vi.stubEnv("VITE_RC_RECALL_MEDIA_BASE", "http://127.0.0.1:8787/");
    expect(mediaBase()).toBe("http://127.0.0.1:8787");
  });
  it("keeps seven Cumulative Recall and three RC Recall examples, with the note apart", () => {
    expect(CUMULATIVE_EXAMPLES).toHaveLength(7);
    expect(RC_RECALL_EXAMPLES).toHaveLength(3);
    expect(RC_RECALL_NOTE.kind).toBe("note");
    expect(CUMULATIVE_EXAMPLES.every((c) => c.mode === "cumulative_recall" && c.kind === "example")).toBe(true);
    expect(RC_RECALL_EXAMPLES.every((c) => c.mode === "rc_recall")).toBe(true);
  });
});
