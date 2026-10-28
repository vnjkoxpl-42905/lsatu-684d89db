import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExamplePlayer from "./ExamplePlayer";
import { RC_RECALL_EXAMPLES } from "./lib/media";

const clip = RC_RECALL_EXAMPLES[0];

describe("example player", () => {
  it("renders nothing without a media server", () => {
    const { container } = render(<ExamplePlayer clip={clip} base={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers captions, audio and a transcript alongside the video", () => {
    render(<ExamplePlayer clip={clip} base="http://127.0.0.1:8787" />);
    expect(document.querySelector("track")?.getAttribute("kind")).toBe("captions");
    expect(screen.getByRole("link", { name: /download mp3 audio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read transcript/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("when the video cannot play, says so and points to the audio and transcript", () => {
    render(<ExamplePlayer clip={clip} base="http://127.0.0.1:8787" />);
    fireEvent.error(document.querySelector("video")!);
    expect(screen.getByRole("alert")).toHaveTextContent(/could not be played.*audio.*transcript/i);
    expect(screen.getByRole("link", { name: /download mp3 audio/i })).toBeInTheDocument();
  });
});
