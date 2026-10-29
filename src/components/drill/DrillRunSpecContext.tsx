/**
 * How the runner is told what run it is in.
 *
 * `DrillLaunchGate` reads the launch out of the address bar, resolves whatever
 * row it names, and puts the result here. `Drill.tsx` reads it and never parses
 * the query string for anything about the run itself.
 */

import * as React from 'react';

import type { DrillRunSpec } from '@/lib/drillRunSpec';

const EMPTY: DrillRunSpec = {};

const DrillRunSpecContext = React.createContext<DrillRunSpec>(EMPTY);

export function DrillRunSpecProvider({
  spec,
  children,
}: {
  spec: DrillRunSpec;
  children: React.ReactNode;
}) {
  return (
    <DrillRunSpecContext.Provider value={spec}>{children}</DrillRunSpecContext.Provider>
  );
}

/**
 * The run the student is in. An empty spec means the URL named no drill, which
 * the runner already handles by not starting one.
 */
export function useDrillRunSpec(): DrillRunSpec {
  return React.useContext(DrillRunSpecContext);
}
