import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ActivityIntro } from "./ActivityIntro";

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const props = {
  title: "Spot the Relationship", subtitle: "Old subtitle",
  instructions: { task: "Old instructions", rules: ["A conditional says what must be true."] },
  itemCount: 48, maxAttempts: 2, onStart: vi.fn(), onExit: vi.fn(),
};

it("exposes controls and a named dialog only when expanded, preserving a paused player on reopen", () => {
  render(<ActivityIntro {...props} />);
  const video = screen.getByLabelText("How to play Spot the Relationship") as HTMLVideoElement;
  const play = vi.spyOn(video, "play").mockResolvedValue(undefined);
  const shell = screen.getByLabelText("How to play Spot the Relationship").closest("dialog")!;
  expect(shell).toHaveAttribute("role", "group");
  expect(shell).not.toHaveAttribute("aria-label");
  expect(screen.queryByRole("dialog")).toBeNull();
  video.currentTime = 31;
  fireEvent.click(video);
  expect(screen.getByRole("dialog", { name: "Video instructions" })).toBe(shell);
  expect(video).toHaveAttribute("controls");
  fireEvent.click(screen.getByRole("button", { name: "Close video" }));
  expect(video.pause).toHaveBeenCalled();
  expect(video.currentTime).toBe(31);
  expect(video).not.toHaveAttribute("controls");
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  expect(screen.getByLabelText("How to play Spot the Relationship")).toBe(video);
  expect(video.currentTime).toBe(31);
  expect(play).not.toHaveBeenCalled();
  // Native close events from both earlier close() calls may arrive later.
  fireEvent(shell, new Event("close"));
  expect(screen.getByRole("dialog")).toBe(shell);
});

it("normalizes unexpected native close without recursively closing the inline shell", () => {
  render(<ActivityIntro {...props} />);
  const expand = screen.getByRole("button", { name: "Expand video" });
  fireEvent.click(expand);
  const shell = screen.getByRole("dialog") as HTMLDialogElement;
  const close = vi.spyOn(shell, "close");
  shell.removeAttribute("open");
  fireEvent(shell, new Event("close"));
  expect(shell).toHaveAttribute("open");
  expect(shell).not.toHaveAttribute("data-expanded");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(expand).toHaveFocus();
  expect(close).not.toHaveBeenCalled();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  fireEvent(shell, new Event("close"));
  expect(close).not.toHaveBeenCalled();
});

it.each([true, false])("restores inline immediately on repeated Escape (cancelable=%s) during animated close", async (cancelable) => {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const cancel = vi.fn();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 320, height: 180 } as DOMRect);
  render(<ActivityIntro {...props} />);
  const shell = screen.getByLabelText("How to play Spot the Relationship").closest("dialog")!;
  expect(shell).toHaveAttribute("role", "group");
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  Object.defineProperty(shell, "animate", { value: () => ({ finished, cancel }), configurable: true });
  fireEvent(shell, new Event("cancel", { cancelable: true }));
  expect(screen.getByRole("dialog")).toBe(shell);
  fireEvent(shell, new Event("cancel", { cancelable }));
  expect(shell).toHaveAttribute("open");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Expand video" })).toHaveFocus();
  // Emulate a noncancelable native default action after the handler returns.
  if (!cancelable) {
    shell.removeAttribute("open");
    fireEvent(shell, new Event("close"));
    expect(shell).toHaveAttribute("open");
  }
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  await act(async () => { finish(); await finished; });
  expect(screen.getByRole("dialog")).toBe(shell);
  expect(cancel).toHaveBeenCalled();
});

it("does not close a detached shell or schedule focus after unmount during animated close", async () => {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 320, height: 180 } as DOMRect);
  const frame = vi.spyOn(window, "requestAnimationFrame");
  const view = render(<ActivityIntro {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  const shell = screen.getByRole("dialog");
  const close = vi.spyOn(shell as HTMLDialogElement, "close");
  const cancel = vi.fn();
  Object.defineProperty(shell, "animate", { value: () => ({ finished, cancel }), configurable: true });
  fireEvent.click(screen.getByRole("button", { name: "Close video" }));
  view.unmount();
  await act(async () => { finish(); await finished; });
  expect(cancel).toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(frame).not.toHaveBeenCalled();
});

it("keeps an accessible, captioned inline video supplementary to the written instructions", () => {
  render(<ActivityIntro {...props} />);
  const video = screen.getByLabelText("How to play Spot the Relationship");
  expect(video).not.toHaveAttribute("controls");
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

it("expands and closes the same player without resetting playback, with focus return", () => {
  render(<ActivityIntro {...props} />);
  const video = screen.getByLabelText("How to play Spot the Relationship") as HTMLVideoElement;
  video.currentTime = 23;
  const expand = screen.getByRole("button", { name: "Expand video" });
  fireEvent.click(expand);
  expect(expand).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Close video" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Close video" }));
  expect(expand).toHaveFocus();
  expect(expand).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByLabelText("How to play Spot the Relationship")).toBe(video);
  expect(video.currentTime).toBe(23);
  fireEvent.click(video);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(expand).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(expand);
  fireEvent.click(screen.getByRole("dialog"), { clientX: -1, clientY: -1 });
  expect(expand).toHaveAttribute("aria-expanded", "false");
  expect(video.currentTime).toBe(23);
});

it("clears a stale failure only after successful media loading", () => {
  render(<ActivityIntro {...props} />);
  const video = screen.getByLabelText("How to play Spot the Relationship");
  fireEvent.error(video);
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  expect(screen.getByRole("status")).toBeVisible();
  expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("status"));
  fireEvent.loadedData(video);
  expect(screen.queryByRole("status")).toBeNull();
});

it("uses a deliberate 450ms expansion and skips it for reduced motion", () => {
  const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  const bounds = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 320, bottom: 180, width: 320, height: 180, x: 0, y: 0, toJSON: () => ({}),
  });
  const view = render(<ActivityIntro {...props} />);
  const dialog = screen.getByLabelText("How to play Spot the Relationship").closest("dialog")!;
  Object.defineProperty(dialog, "animate", { value: animate, configurable: true });
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  expect(animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ duration: 450 }));
  view.unmount();
  animate.mockClear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  render(<ActivityIntro {...props} />);
  Object.defineProperty(screen.getByLabelText("How to play Spot the Relationship").closest("dialog")!, "animate", { value: animate, configurable: true });
  fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
  expect(animate).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Close video" })).toBeVisible();
  bounds.mockRestore();
});

it("restores focus after queued native dialog teardown", () => {
  let restoreFocus: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => { restoreFocus = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const view = render(<ActivityIntro {...props} />);
  const expand = screen.getByRole("button", { name: "Expand video" });
  fireEvent.click(expand);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expand.blur();
  expect(expand).not.toHaveFocus();
  restoreFocus?.(0);
  expect(expand).toHaveFocus();
  fireEvent.click(expand);
  fireEvent.click(screen.getByRole("button", { name: "Close video" }));
  view.unmount();
  expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
});
