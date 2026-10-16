import { useState, useRef, useEffect, useCallback } from "react";

export function useReadingClock(args: {
  durations: number[];        // from chunkDurations
  chunkCount: number;
  initialChunk: number;
  onChunkChange: (chunk: number) => void;
  onFinish: () => void;
}): {
  playing: boolean;
  chunk: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  goTo: (chunk: number) => void;   // clamps to 0..chunkCount-1, keeps playing state
  next: () => void;
  prev: () => void;
  restart: () => void;             // goTo(0) and pause
  activeMs: () => number;          // total ms spent playing since mount
  pausedMs: () => number;          // total ms spent paused since the first play
} {
  const [chunk, setChunk] = useState<number>(args.initialChunk);
  const [playing, setPlaying] = useState<boolean>(false);

  const chunkRef = useRef<number>(args.initialChunk);
  const playingRef = useRef<boolean>(false);
  const durationsRef = useRef<number[]>(args.durations);
  const chunkCountRef = useRef<number>(args.chunkCount);
  const onChunkChangeRef = useRef<(chunk: number) => void>(args.onChunkChange);
  const onFinishRef = useRef<() => void>(args.onFinish);

  const animFrameIdRef = useRef<number | null>(null);
  const elapsedInChunkRef = useRef<number>(0);
  const activeMsRef = useRef<number>(0);
  const pausedMsRef = useRef<number>(0);
  const hasPlayedOnceRef = useRef<boolean>(false);
  const pauseStartRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    durationsRef.current = args.durations;
    chunkCountRef.current = args.chunkCount;
    onChunkChangeRef.current = args.onChunkChange;
    onFinishRef.current = args.onFinish;
  });

  const tick = useCallback((now: number) => {
    if (!playingRef.current) return;

    let delta = now - lastFrameRef.current;
    lastFrameRef.current = now;
    if (delta > 1000) delta = 1000;
    if (delta < 0) delta = 0;

    elapsedInChunkRef.current += delta;
    activeMsRef.current += delta;

    let currentChunk = chunkRef.current;
    const durations = durationsRef.current;
    const count = chunkCountRef.current;

    let advanced = false;
    while (
      currentChunk < count &&
      elapsedInChunkRef.current >= (durations[currentChunk] ?? 0)
    ) {
      elapsedInChunkRef.current -= (durations[currentChunk] ?? 0);
      currentChunk++;
      advanced = true;
    }

    if (currentChunk >= count) {
      const lastChunk = Math.max(0, count - 1);
      chunkRef.current = lastChunk;
      setChunk(lastChunk);
      playingRef.current = false;
      setPlaying(false);
      animFrameIdRef.current = null;
      pauseStartRef.current = performance.now();
      if (advanced) {
        onChunkChangeRef.current(lastChunk);
      }
      onFinishRef.current();
      return;
    }

    if (advanced) {
      chunkRef.current = currentChunk;
      setChunk(currentChunk);
      onChunkChangeRef.current(currentChunk);
    }

    animFrameIdRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(() => {
    if (playingRef.current) return;
    const count = chunkCountRef.current;
    if (count <= 0) return;

    if (pauseStartRef.current !== null && hasPlayedOnceRef.current) {
      pausedMsRef.current += performance.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    hasPlayedOnceRef.current = true;
    playingRef.current = true;
    setPlaying(true);
    lastFrameRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setPlaying(false);
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    pauseStartRef.current = performance.now();
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const goTo = useCallback((target: number) => {
    const count = chunkCountRef.current;
    const clamped = Math.max(0, Math.min(count - 1, target));
    elapsedInChunkRef.current = 0;
    if (chunkRef.current !== clamped) {
      chunkRef.current = clamped;
      setChunk(clamped);
      onChunkChangeRef.current(clamped);
    }
  }, []);

  const next = useCallback(() => {
    goTo(chunkRef.current + 1);
  }, [goTo]);

  const prev = useCallback(() => {
    goTo(chunkRef.current - 1);
  }, [goTo]);

  const restart = useCallback(() => {
    pause();
    goTo(0);
  }, [pause, goTo]);

  const activeMs = useCallback((): number => {
    return Math.round(activeMsRef.current);
  }, []);

  const pausedMs = useCallback((): number => {
    let total = pausedMsRef.current;
    if (!playingRef.current && hasPlayedOnceRef.current && pauseStartRef.current !== null) {
      total += performance.now() - pauseStartRef.current;
    }
    return Math.round(total);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return {
    playing,
    chunk,
    play,
    pause,
    toggle,
    goTo,
    next,
    prev,
    restart,
    activeMs,
    pausedMs,
  };
}
