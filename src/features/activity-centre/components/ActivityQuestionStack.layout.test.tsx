import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityQuestionStack } from "./ActivityQuestionStack";
import type { ActivityItem } from "../api/types";

// Below md the world and the answer column stack, and the answer column was
// centred inside a full-screen flex box. Beside the world on a wide screen that
// is right; beneath it on a phone it added ~700px of empty space above the
// question, on top of an 864px world.

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const items: ActivityItem[] = [
  {
    order: 1,
    prompt: "Whenever the greenhouse fans run overnight, the orchids bloom by morning.",
    credited_answers: ["If the fans run overnight, then the orchids bloom by morning."],
    explanation: '"Whenever" (sufficient).',
  },
];

describe("where the question card sits", () => {
  it("does not reserve a full screen above the question on a phone", () => {
    const { container } = render(
      <ActivityQuestionStack
        items={items}
        format="free-text"
        activeIndex={0}
        onResolved={vi.fn()}
        onRecord={async () => {}}
        onNext={vi.fn()}
      />,
    );
    const wrap = container.firstElementChild as HTMLElement;
    // The full-screen floor and the vertical centring are both md-and-up only.
    expect(wrap.className).toContain("md:min-h-screen");
    expect(wrap.className).toContain("md:items-center");
    expect(wrap.className).toContain("items-start");
    expect(wrap.className).not.toMatch(/(^|\s)min-h-screen/);
    expect(wrap.className).not.toMatch(/(^|\s)items-center/);
  });
});
