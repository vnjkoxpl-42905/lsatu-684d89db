import { describe, expect, it } from "vitest";
import { matchesRecordedSession } from "./sessionPersistence";
import type { ReadingSession } from "./types";

const visit: ReadingSession = { id: "stable-visit", passage_id: "text", reading_mode: "serial", wpm: 200, words_read: 20, active_ms: 6000, paused_ms: 1000, started_at: "2026-10-14T12:00:00.000Z", ended_at: "2026-10-14T12:00:07.000Z" };
describe("confirmed reading visit retries", () => {
  it("accepts the exact persisted visit with database timestamp formatting", () => {
    expect(matchesRecordedSession({ ...visit, user_id: "student", started_at: "2026-10-14T12:00:00+00:00" }, visit, "student")).toBe(true);
  });
  it("rejects another user's row or a changed visit using the same ID", () => {
    expect(matchesRecordedSession({ ...visit, user_id: "other" }, visit, "student")).toBe(false);
    expect(matchesRecordedSession({ ...visit, user_id: "student", words_read: 21 }, visit, "student")).toBe(false);
    expect(matchesRecordedSession(null, visit, "student")).toBe(false);
  });
});
