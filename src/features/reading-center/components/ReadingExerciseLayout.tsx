import { createContext, useContext, useLayoutEffect } from "react";
export const ReadingExerciseLayout = createContext<((active: boolean) => void) | null>(null);
export function useReadingExerciseLayout() {
  const setActive = useContext(ReadingExerciseLayout);
  useLayoutEffect(() => { setActive?.(true); return () => setActive?.(false); }, [setActive]);
}
