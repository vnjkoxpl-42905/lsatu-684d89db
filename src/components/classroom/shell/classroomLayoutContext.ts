import { createContext, useContext } from "react";

export type ClassroomSection = "notes" | "work" | "flagged" | "journal";

type ClassroomLayoutContextValue = {
  displayName: string;
  setDisplayName: (name: string) => void;
  testDate: string | null;
  setTestDate: (date: string | null) => void;
  openSection: (section: ClassroomSection) => void;
};

// Keep the context outside the refreshed layout component module so its
// provider and consumers retain the same identity during live updates.
export const ClassroomLayoutContext =
  createContext<ClassroomLayoutContextValue | null>(null);

export function useClassroomLayout() {
  const value = useContext(ClassroomLayoutContext);
  if (!value) {
    throw new Error("useClassroomLayout must be used inside ClassroomLayout");
  }
  return value;
}

export function useOptionalClassroomLayout() {
  return useContext(ClassroomLayoutContext);
}