import { describe, expect, it } from "vitest";
import { sliceTranscript, type TranscriptPiece } from "./useSectionTranscript";

// Cutting the transcript at the recording's own boundaries.
//
// This is where the text channel and the audio channel are made to agree. If
// they disagree, a scorer reads her recall of one line as her Read of another,
// which is a wrong grade that looks like a right one.

const piece = (atMs: number, text: string): TranscriptPiece => ({ atMs, text });

describe("cutting her words at the same places as the audio", () => {
  it("files each piece under the segment it was spoken in", () => {
    const pieces = [piece(500, "first"), piece(2500, "second"), piece(4500, "third")];
    const segments = [
      { startMs: 0, endMs: 1000 },
      { startMs: 1000, endMs: 3000 },
      { startMs: 3000, endMs: 5000 },
    ];
    expect(sliceTranscript(pieces, segments, 0)).toEqual(["first", "second", "third"]);
  });

  it("joins everything said inside one segment, in order", () => {
    const pieces = [piece(100, "say it"), piece(400, "back"), piece(700, "in my own words")];
    expect(sliceTranscript(pieces, [{ startMs: 0, endMs: 1000 }], 0)).toEqual([
      "say it back in my own words",
    ]);
  });

  it("keeps a late final result with the turn it belongs to", () => {
    // Recognition settles a final result after the words were spoken, so her
    // last few words land just past the boundary. Filing them under the next
    // segment would put the end of her colour inside a silent read.
    const pieces = [piece(1050, "what if we are not Ireland")];
    const segments = [
      { startMs: 0, endMs: 1000 },
      { startMs: 1000, endMs: 2000 },
    ];
    expect(sliceTranscript(pieces, segments)).toEqual(["what if we are not Ireland", ""]);
  });

  it("returns an empty string for a segment she said nothing in", () => {
    // A silent read is the ordinary case, not a fault, and the scorer has to be
    // able to tell it apart from a recall she skipped.
    const segments = [
      { startMs: 0, endMs: 1000 },
      { startMs: 1000, endMs: 2000 },
    ];
    expect(sliceTranscript([piece(1500, "only here")], segments, 0)).toEqual(["", "only here"]);
  });

  it("returns one empty string per segment when nothing was captured at all", () => {
    // No recognition in this browser. Every segment is blank, and blank has to
    // mean "not captured" rather than "she was silent".
    const segments = [
      { startMs: 0, endMs: 1000 },
      { startMs: 1000, endMs: 2000 },
    ];
    expect(sliceTranscript([], segments)).toEqual(["", ""]);
  });
});
