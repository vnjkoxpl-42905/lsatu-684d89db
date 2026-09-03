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
    expect(sliceTranscript(pieces, segments)).toEqual(["first", "second", "third"]);
  });

  it("joins everything said inside one segment, in order", () => {
    const pieces = [piece(100, "say it"), piece(400, "back"), piece(700, "in my own words")];
    expect(sliceTranscript(pieces, [{ startMs: 0, endMs: 1000 }])).toEqual([
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
    expect(sliceTranscript([piece(1500, "only here")], segments)).toEqual(["", "only here"]);
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

/**
 * The failure this cutting had, and the shape of the fix.
 *
 * On the trial run 21 rows in 22 stored the PREVIOUS stimulus's words: the card
 * for the speed-limit stimulus read back an argument about a manufacturing
 * director. Two causes, and both are addressed here. The engine settles a
 * result after the words were spoken, so a piece landed past its own boundary;
 * and each stimulus was sliced against its own windows in isolation, so nothing
 * stopped the next stimulus claiming it.
 */
describe("a piece belongs to exactly one stimulus", () => {
  const STIMULUS_ONE = [
    { startMs: 0, endMs: 4000 },
    { startMs: 4000, endMs: 6000 },
  ];
  const STIMULUS_TWO = [
    { startMs: 6000, endMs: 10000 },
    { startMs: 10000, endMs: 12000 },
  ];
  const ALL = [...STIMULUS_ONE, ...STIMULUS_TWO];

  it("does not let the next stimulus claim the last words of the one before", () => {
    // Said at 5,900ms, inside stimulus one's Recall. Sliced against stimulus
    // two's own windows in isolation there was nothing to stop it landing
    // there, and it did, on 21 rows out of 22.
    const late = [piece(5900, "so the director is wrong about exploiting")];
    expect(sliceTranscript(late, STIMULUS_TWO, ALL)).toEqual(["", ""]);
    expect(sliceTranscript(late, STIMULUS_ONE, ALL)).toEqual(["", "so the director is wrong about exploiting"]);
  });

  it("never stores the same words under two stimuli", () => {
    const spoken = [piece(3000, "a"), piece(5000, "b"), piece(7000, "c"), piece(11000, "d")];
    const one = sliceTranscript(spoken, STIMULUS_ONE, ALL).join(" ");
    const two = sliceTranscript(spoken, STIMULUS_TWO, ALL).join(" ");
    for (const word of ["a", "b", "c", "d"]) {
      expect([one.includes(word), two.includes(word)].filter(Boolean)).toHaveLength(1);
    }
  });

  it("drops nothing that was said inside the run", () => {
    const spoken = [piece(3000, "a"), piece(5000, "b"), piece(7000, "c"), piece(11000, "d")];
    const all = [
      ...sliceTranscript(spoken, STIMULUS_ONE, ALL),
      ...sliceTranscript(spoken, STIMULUS_TWO, ALL),
    ].join(" ");
    expect(all).toContain("a");
    expect(all).toContain("b");
    expect(all).toContain("c");
    expect(all).toContain("d");
  });

  it("ignores anything said after the last window closed", () => {
    // The recogniser keeps running for a moment after she finishes. Those words
    // belong to no stimulus and must not be tacked onto the last one.
    expect(sliceTranscript([piece(20000, "phew")], STIMULUS_TWO, ALL)).toEqual(["", ""]);
  });
});
