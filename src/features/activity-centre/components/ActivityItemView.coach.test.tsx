import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../content";
import { ActivityItemView } from "./ActivityItemView";

// The activity-coach edge function judges by whatever rubric it is given, and
// its built-in default is Negation Station's. Before per-Activity briefs
// existed, every Activity was judged as a negation drill. These tests pin the
// wiring that fixes that: the Activity's own brief has to reach the function
// body, and a legacy Activity that has none must still send nothing so the
// function falls back to its negation default.

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

function renderItem(activityIndex: number, withCoach: boolean) {
  const activity = SEED_ACTIVITIES[activityIndex];
  const item = activity.items[0];
  render(
    <ActivityItemView
      item={item}
      format={activity.item_format}
      isLast={false}
      coach={withCoach ? activity.instructions.coach : undefined}
      onResolved={vi.fn()}
      onRecord={vi.fn().mockResolvedValue(undefined)}
      onNext={vi.fn()}
    />,
  );
  return { activity, item };
}

async function submit(text: string) {
  const field = screen.getByRole("textbox");
  fireEvent.change(field, { target: { value: text } });
  const button = screen
    .getAllByRole("button")
    .find((b) => /check|submit/i.test(b.textContent ?? ""));
  fireEvent.click(button!);
  await waitFor(() => expect(invoke).toHaveBeenCalled());
  return invoke.mock.calls[0][1].body as Record<string, unknown>;
}

describe("ActivityItemView sends the Activity's own Coach brief", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
  });

  /**
   * The spoken Activity is excluded, and not for convenience.
   *
   * `ActivityItemView` is the typed path: it renders a textarea and asks the
   * Coach about what was written in it. Read, Recall, Colour never reaches this
   * component at all, because `ActivityRunner` hands it the whole screen on
   * `item_format` (ADR 0009), and it has no textbox to type into. Its Coach
   * brief is exercised by the recall module's own tests instead.
   *
   * Filtered on the format rather than the slug so spoken sections and the
   * paper-first Conditional Rephrase activity never enter this prose path.
   */
  it.each(
    SEED_ACTIVITIES.map((a, i) => [a.slug, i, a.item_format] as const)
      .filter(([, , format]) => format === "free-text")
      .map(([slug, i]) => [slug, i] as const),
  )(
    "%s sends its own rubric, not the negation default",
    async (slug, index) => {
      const { activity, item } = renderItem(index, true);
      const body = await submit("a student response");

      expect(body.statement).toBe(item.prompt);
      expect(body.creditedAnswers).toEqual(item.credited_answers);
      expect(body.category).toBe(item.category);

      const coach = body.coach as { drill: string; rubric: string[]; partial_rule: string };
      expect(coach).toBeDefined();
      expect(coach.drill).toBe(activity.instructions.coach!.drill);
      expect(coach.rubric.length).toBeGreaterThanOrEqual(3);
      // The tell that this is not being judged as Negation Station.
      expect(coach.drill).not.toMatch(/statement-negation/);
      expect(slug).toBe(activity.slug);
    },
  );

  it("omits coach for a legacy Activity so the negation default still applies", async () => {
    renderItem(0, false);
    const body = await submit("a student response");
    expect(body.coach).toBeUndefined();
  });
});
