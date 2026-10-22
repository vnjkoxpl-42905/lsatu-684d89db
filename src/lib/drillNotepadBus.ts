// Tiny bus so the floating DrillNotepad can follow the active drill question
// without coupling it to the Drill page's internal state.

type Listener = (qid: string | null) => void;

let activeQid: string | null = null;
const listeners = new Set<Listener>();

export function setActiveDrillQid(qid: string | null) {
  if (qid === activeQid) return;
  activeQid = qid;
  for (const l of listeners) l(qid);
}

export function getActiveDrillQid(): string | null {
  return activeQid;
}

export function subscribeActiveDrillQid(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
