import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDecoderProgression } from "../../hooks/useDecoderProgression";
import type { DecoderCard } from "../../types";

const CARDS: DecoderCard[] = [
  {
    id: "a",
    abstract_phrase: "",
    plain_english: "",
    example_stimulus: "",
    x_concrete: "",
    y_concrete: "",
  },
  {
    id: "b",
    abstract_phrase: "",
    plain_english: "",
    example_stimulus: "",
    x_concrete: "",
    y_concrete: "",
  },
  {
    id: "c",
    abstract_phrase: "",
    plain_english: "",
    example_stimulus: "",
    x_concrete: "",
    y_concrete: "",
  },
];

describe("useDecoderProgression", () => {
  it("next wraps around", () => {
    const { result } = renderHook(() => useDecoderProgression(CARDS));
    expect(result.current.cardIndex).toBe(0);
    act(() => result.current.next());
    expect(result.current.cardIndex).toBe(1);
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.cardIndex).toBe(0);
  });

  it("prev wraps to last", () => {
    const { result } = renderHook(() => useDecoderProgression(CARDS));
    act(() => result.current.prev());
    expect(result.current.cardIndex).toBe(CARDS.length - 1);
  });

  it("jumpTo clamps via modulo", () => {
    const { result } = renderHook(() => useDecoderProgression(CARDS));
    act(() => result.current.jumpTo(7));
    expect(result.current.cardIndex).toBe(7 % CARDS.length);
    act(() => result.current.jumpTo(-1));
    expect(result.current.cardIndex).toBe(CARDS.length - 1);
  });
});
