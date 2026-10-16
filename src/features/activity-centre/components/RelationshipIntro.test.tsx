import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActivityIntro } from "./ActivityIntro";

afterEach(cleanup);
const props = {
  title: "Spot the Relationship", subtitle: "Old subtitle",
  instructions: { task: "Old instructions", rules: ["A conditional says what must be true."] },
  itemCount: 48, maxAttempts: 2, onStart: vi.fn(), onExit: vi.fn(),
};

it("places an accessible, captioned video before the written instructions without autoplay", () => {
  render(<ActivityIntro {...props} />);
  const video = screen.getByLabelText("How to play Spot the Relationship");
  expect(video).toHaveAttribute("controls");
  expect(video).toHaveAttribute("preload", "none");
  expect(video).toHaveAttribute("playsinline");
  expect(video).not.toHaveAttribute("autoplay");
  expect(video).toHaveAttribute("src", "/media/spot-the-relationship/how-to-play-v1.mp4");
  expect(video).toHaveAttribute("poster", "/media/spot-the-relationship/how-to-play-v1.webp");
  const captions = video.querySelector("track");
  expect(captions).toHaveAttribute("kind", "captions");
  expect(captions).toHaveAttribute("srclang", "en");
  expect(captions).toHaveAttribute("default");
  expect(captions).toHaveAttribute("src", "/media/spot-the-relationship/how-to-play-v1.vtt");
  expect(video.compareDocumentPosition(screen.getByRole("heading", { name: "What to write" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("keeps written instructions and Start available after a video error", () => {
  render(<ActivityIntro {...props} />);
  fireEvent.error(screen.getByLabelText("How to play Spot the Relationship"));
  expect(screen.getByRole("status")).toHaveTextContent("The video could not load.");
  expect(screen.getByRole("heading", { name: "What to write" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
});

it("replaces stale snapshot instructions with readable steps, one example and one Start action", () => {
  render(<ActivityIntro {...props} />);
  expect(screen.getByRole("heading", { name: "What to write" })).toBeVisible();
  expect(screen.getByText("Name the type and quote the words.")).toBeVisible();
  expect(screen.getByText("Check for another relationship.")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Worked example" })).toBeVisible();
  expect(screen.getAllByText("Conditional, “only if”")).toHaveLength(1);
  expect(screen.queryByText(/credited answer|After, any of these|Old instructions|what must be true/i)).toBeNull();
  expect(screen.queryByTestId("act-start-dock")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(props.onStart).toHaveBeenCalledTimes(1);
});

it("preserves resume/exit and describes preview without promising saved student work", () => {
  render(<ActivityIntro {...props} preview resumeAt={7} />);
  expect(screen.getByRole("button", { name: "Back to question 7" })).toBeVisible();
  expect(screen.getByText(/Teacher preview:/)).toBeVisible();
  expect(screen.queryByText(/submitted answers save/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Exit" }));
  expect(props.onExit).toHaveBeenCalledTimes(1);
});

it("keeps unrelated activities on their existing intro", () => {
  render(<ActivityIntro {...props} title="Find the Conclusion" />);
  expect(screen.queryByTestId("relationship-intro")).toBeNull();
  expect(screen.getByText("Old instructions")).toBeInTheDocument();
});

it("only promises saved answers when the runner explicitly supports persistence", () => {
  const view = render(<ActivityIntro {...props} canSaveProgress={false} />);
  expect(screen.getByText(/This run does not save answers/)).toBeVisible();
  expect(screen.queryByText(/Teacher preview:/)).toBeNull();
  view.rerender(<ActivityIntro {...props} canSaveProgress />);
  expect(screen.getByText(/Your submitted answers save as you go/)).toBeVisible();
  expect(screen.queryByText(/This run does not save answers/)).toBeNull();
});
