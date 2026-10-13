type Listener = () => void;
const listeners = new Set<Listener>();

export function openNotifications() {
  for (const l of listeners) l();
}

export function subscribeNotifications(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
