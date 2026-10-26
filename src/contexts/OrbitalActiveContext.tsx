import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface OrbitalActiveContextValue {
  active: boolean;
  setActive: (next: boolean) => void;
}

const OrbitalActiveContext = createContext<OrbitalActiveContextValue>({
  active: false,
  setActive: () => {},
});

export function OrbitalActiveProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <OrbitalActiveContext.Provider value={value}>{children}</OrbitalActiveContext.Provider>;
}

export function useOrbitalActive() {
  return useContext(OrbitalActiveContext);
}
