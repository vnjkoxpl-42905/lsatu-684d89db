import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntroLrAttempt } from "./introLrReviewSource";

const { from, insert } = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

import { buildIntroLrReviewQueue, fetchOwnedIntroLrAttempt, getAuthoredIntroLrQuestion, loadIntroLrReviewQueue } from "./introLrReviewSource";

const attempt = (id: string, overrides: Partial<IntroLrAttempt> = {}): IntroLrAttempt => ({
  id, user_id: "student-1", drill_id: "MC-DRL-3.3", question_id: "D33-S1-Q1", mode: "first_sentence_check",
  selected_answer: "false", correct: false, time_ms: null, created_at: "2026-09-28T12:00:00Z", ...overrides,
});

describe("Intro to LR Review source", () => {
  beforeEach(() => { from.mockReset(); insert.mockReset(); });

  it("keeps repeated missed attempts separate and excludes unknown or correct answers", () => {
    const rows = [attempt("a"), attempt("b", { selected_answer: null }), attempt("retired", { question_id: "retired" }), attempt("correct", { correct: true })];
    const items = buildIntroLrReviewQueue(rows);
    expect(items.map((item) => item.key)).toEqual(["intro-lr:a", "intro-lr:b"]);
    expect(items[1].firstAnswer).toBeNull();
    expect(getAuthoredIntroLrQuestion("retired")).toBeNull();
  });

  it("includes historical pronoun replacement misses with exact authored wording", () => {
    const [item] = buildIntroLrReviewQueue([attempt("pronoun", { question_id: "D37-Q1", mode: "pronoun_replacement", selected_answer: "unclear rewrite" })]);
    expect(item?.key).toBe("intro-lr:pronoun");
    expect(item?.firstAnswer).toBe("unclear rewrite");
    expect(getAuthoredIntroLrQuestion("D37-Q1")?.mode).toBe("pronoun_replacement");
  });

  it("queries only the signed-in owner's missed rows", async () => {
    const filters: Array<[string, unknown]> = [];
    const chain = {
      select: vi.fn().mockReturnThis(), eq: vi.fn((name: string, value: unknown) => { filters.push([name, value]); return chain; }),
      order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [attempt("a")], error: null }),
      insert,
    };
    from.mockReturnValue(chain);
    expect(await loadIntroLrReviewQueue("student-1")).toHaveLength(1);
    expect(filters).toContainEqual(["user_id", "student-1"]);
    expect(filters).toContainEqual(["correct", false]);
    expect(from).toHaveBeenCalledWith("intro_lr_attempts");
    expect(insert).not.toHaveBeenCalled();
  });

  it("fetches a single exact owned miss, never writing on review", async () => {
    const filters: Array<[string, unknown]> = [];
    const chain = {
      select: vi.fn().mockReturnThis(), eq: vi.fn((name: string, value: unknown) => { filters.push([name, value]); return chain; }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), insert,
    };
    from.mockReturnValue(chain);
    expect(await fetchOwnedIntroLrAttempt("student-1", "someone-elses-row")).toBeNull();
    expect(filters).toEqual([["id", "someone-elses-row"], ["user_id", "student-1"], ["correct", false]]);
    expect(insert).not.toHaveBeenCalled();
  });

  it("reports read failures instead of an empty successful queue", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error("network unavailable") }),
    };
    from.mockReturnValue(chain);
    await expect(loadIntroLrReviewQueue("student-1")).rejects.toThrow("network unavailable");
  });
});
