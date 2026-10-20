import * as React from 'react';

/**
 * Remounts its children whenever the signed-in actor changes. The drill
 * runner keeps per-question cross-outs, highlights and their undo history in
 * component state; without a fresh mount, one account's marks would stay on
 * screen, and be saved, under the next.
 */
export default function DrillActorScope({
  actorId,
  children,
}: {
  actorId: string | null | undefined;
  children: React.ReactNode;
}) {
  return <React.Fragment key={actorId ?? 'signed-out'}>{children}</React.Fragment>;
}
