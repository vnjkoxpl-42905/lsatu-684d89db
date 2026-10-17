import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActivityIntro } from "./ActivityIntro";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const props = {
  title: "Spot the Relationship", subtitle: "Old subtitle",
  instructions: { task: "Old instructions", rules: ["A conditional says what must be true."] },
  itemCount: 48, maxAttempts: 2, onStart: vi.fn(), onExit: vi.fn(),
};

it("keeps an accessible, captioned inline video supplementary to the written instructions", () => {
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
  const aside = screen.getByRole("complementary", { name: "Video instructions" });
  expect(aside).toContainElement(video);
  const writtenContent = [
    screen.getByRole("heading", { name: "Instructions" }),
    screen.getByRole("heading", { name: "Example" }),
    screen.getByText("Review the three relationship types"),
    screen.getByRole("button", { name: "Start" }),
  ];
  for (const element of writtenContent) {
    expect(element.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(video).toHaveTextContent("Read the written instructions on this page.");
  expect(video).not.toHaveTextContent(/below/i);
});

it("keeps written instructions and Start available after a video error", () => {
  render(<ActivityIntro {...props} />);
  fireEvent.error(screen.getByLabelText("How to play Spot the Relationship"));
  expect(screen.getByRole("status")).toHaveTextContent("The video could not load. You can use the written instructions on this page.");
  expect(screen.getByRole("heading", { name: "Instructions" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(props.onStart).toHaveBeenCalledTimes(1);
});

it("replaces stale snapshot instructions with readable steps, one example and one Start action", () => {
  render(<ActivityIntro {...props} />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 1, name: props.title })).toBeVisible();
  expect(screen.getAllByText(props.title)).toHaveLength(1);
  expect(screen.getByText("Decide whether each sentence contains a conditional, causal, or comparative relationship.")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Instructions" })).toBeVisible();
  const steps = screen.getAllByRole("listitem");
  expect(steps).toHaveLength(2);
  expect(steps[0]).toHaveTextContent(/^Read the whole sentence\.$/);
  expect(screen.getByText("Read the whole sentence.")).toBeVisible();
  expect(screen.getByText("Give the type and a quotation.")).toBeVisible();
  expect(screen.getByText(/If you find more than one type, include each one with its own quotation/)).toBeVisible();
  expect(screen.getByRole("heading", { name: "Example" })).toBeVisible();
  expect(screen.getByText("Answer", { exact: true })).toBeVisible();
  expect(screen.getAllByText("Conditional, “only if”")).toHaveLength(1);
  expect(screen.getByText("The wick has to be dry for the lantern to be lit. “Only if” tells us that. A dry wick alone does not guarantee that the lantern can be lit.")).toBeVisible();
  expect(document.body.textContent).not.toMatch(/Worked example|What to write|signal it|words.{0,20}create it|Name the relationship\.|transcript|attempt/i);
  expect(screen.queryByText(/credited answer|After, any of these|Old instructions|what must be true/i)).toBeNull();
  expect(screen.queryByTestId("act-start-dock")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(props.onStart).toHaveBeenCalledTimes(1);
});

it("preserves resume/exit and describes preview without promising saved student work", () => {
  render(<ActivityIntro {...props} preview canSaveProgress resumeAt={7} />);
  const resume = screen.getByRole("button", { name: "Back to question 7" });
  expect(resume).toBeVisible();
  expect(screen.getByText("Preview only. Student progress is unchanged.")).toBeVisible();
  expect(screen.queryByText(/submitted answers save/)).toBeNull();
  expect(resume.compareDocumentPosition(screen.getByLabelText("How to play Spot the Relationship")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(resume);
  expect(props.onStart).toHaveBeenCalledTimes(1);
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
  expect(screen.queryByText(/Preview only/)).toBeNull();
  view.rerender(<ActivityIntro {...props} canSaveProgress />);
  expect(screen.getByText(/Your submitted answers save as you go/)).toBeVisible();
  expect(screen.queryByText(/This run does not save answers/)).toBeNull();
});

it("omits Exit when no exit callback is provided and keeps the relationship reference optional", () => {
  render(<ActivityIntro {...props} onExit={undefined} />);
  expect(screen.queryByRole("button", { name: "Exit" })).toBeNull();
  const reference = screen.getByText("Review the three relationship types").closest("details");
  expect(reference).not.toHaveAttribute("open");
  expect(reference).toHaveTextContent("Conditional");
  expect(reference).toHaveTextContent("Causal");
  expect(reference).toHaveTextContent("Comparative");
  expect(reference).toHaveTextContent("what is enough or what is required");
  expect(reference).toHaveTextContent("The comparison does not always use “than.”");
});
