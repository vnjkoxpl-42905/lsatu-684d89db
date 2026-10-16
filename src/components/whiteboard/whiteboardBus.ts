export interface WhiteboardOpenArgs {
  studentId?: string;
  sessionId?: string;
  title?: string;
}

type Listener = (args?: WhiteboardOpenArgs) => void;
const listeners = new Set<Listener>();

export function openWhiteboard(args?: WhiteboardOpenArgs) {
  for (const l of listeners) l(args);
}

export function subscribeWhiteboard(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
