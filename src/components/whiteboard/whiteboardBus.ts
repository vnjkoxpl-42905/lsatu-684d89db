type Listener = () => void;
const listeners = new Set<Listener>();

export function openWhiteboard() {
  for (const l of listeners) l();
}

export function subscribeWhiteboard(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
