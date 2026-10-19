import { expect, it } from "vitest";
import { ActiveClock } from "./activeClock";
it("merges verified passage totals without losing newer local practice", () => {
  const clock = new ActiveClock({ sectionMs: 10000, passageMs: 2000 });
  clock.start(1000); clock.restoreMinimum({ sectionMs: 9000, passageMs: 5000 }, 2000);
  expect(clock.snapshot(3000)).toEqual({ sectionMs: 12000, passageMs: 6000 });
});
it("excludes setup, paused time and time away when restored", () => {
  const clock = new ActiveClock();
  expect(clock.snapshot(100000).sectionMs).toBe(0);
  clock.start(100000); clock.pause(103000);
  const restored = new ActiveClock(clock.snapshot(900000));
  restored.start(900000); expect(restored.snapshot(902000)).toEqual({ sectionMs: 5000, passageMs: 5000 });
});
it("resets only the passage clock at the next passage", () => {
  const clock = new ActiveClock({ sectionMs: 10000, passageMs: 10000 });
  clock.start(0); clock.resetPassage(2000);
  expect(clock.snapshot(5000)).toEqual({ sectionMs: 15000, passageMs: 3000 });
});
