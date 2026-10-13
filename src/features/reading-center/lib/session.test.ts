import { describe, expect, it } from "vitest";
import { ReadingVisit } from "./session";

describe("reading visit statistics", () => {
  it("counts the final chunk and active/paused intervals without including initial idle time", () => {
    const visit = new ReadingVisit();
    visit.play(10000);
    visit.read(5);
    visit.pause(13000);
    visit.play(17000);
    visit.read(3);
    expect(visit.finish(21000)).toMatchObject({ words_read: 8, active_ms: 7000, paused_ms: 4000, started_at: new Date(10000).toISOString() });
    expect(visit.finish(22000)).toBeNull();
  });
  it("keeps a single fully displayed chunk and discards short or unread visits", () => {
    const visit = new ReadingVisit();
    visit.play(0);
    visit.read(8);
    expect(visit.finish(6000)?.words_read).toBe(8);
    visit.play(7000);
    visit.read(1);
    expect(visit.finish(8000)).toBeNull();
    visit.play(9000);
    expect(visit.finish(16000)).toBeNull();
  });
  it("does not count a repeated play/pause notification twice", () => {
    const visit = new ReadingVisit();
    visit.play(0);
    visit.play(1000);
    visit.read(4);
    visit.pause(6000);
    visit.pause(7000);
    expect(visit.finish(9000)).toMatchObject({ active_ms: 6000, paused_ms: 3000 });
  });
});
