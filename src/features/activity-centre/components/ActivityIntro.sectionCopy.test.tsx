import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import content from "../content/spot-the-relationship.json";
import type { ActivityInstructions } from "../api/types";
import { ActivityIntro } from "./ActivityIntro";

// This checks the dispatch/props contract, not the unrelated RRC section layout.
// The actual SectionLaunch has its own render/interaction tests.
vi.mock("./SectionLaunch", () => ({
  SectionLaunch: ({ title, subtitle, instructions, onStart }: {
    title: string; subtitle: string; instructions: ActivityInstructions; onStart: () => void;
  }) => <section data-testid="section-launch-contract">
    <h1>{title}</h1><p>{subtitle}</p><p>{instructions.task}</p>
    <button onClick={onStart}>Start section</button>
  </section>,
}));

afterEach(cleanup);
it("retains section dispatch and passes the real revised student copy without coach internals", () => {
  const onStart = vi.fn();
  render(<ActivityIntro title={content.title} subtitle={content.subtitle}
    instructions={content.instructions as ActivityInstructions} mode="section" onStart={onStart} />);
  expect(screen.getByTestId("section-launch-contract")).toBeVisible();
  expect(screen.queryByTestId("relationship-intro")).toBeNull();
  expect(screen.getByText(content.subtitle, { exact: true })).toBeVisible();
  expect(screen.getByText(content.instructions.task, { exact: true })).toBeVisible();
  expect(document.body.textContent).not.toMatch(/signal it|Worked example|What to write/);
  expect(content.instructions.coach.drill).toContain("signal it");
  fireEvent.click(screen.getByRole("button", { name: "Start section" }));
  expect(onStart).toHaveBeenCalledTimes(1);
});
