import "@testing-library/jest-dom";

// Supabase auth client reads localStorage on init; provide a full implementation
// so it doesn't emit unhandled rejections in the jsdom test environment.
const _localStore: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem:    (k) => _localStore[k] ?? null,
  setItem:    (k, v) => { _localStore[k] = String(v); },
  removeItem: (k) => { delete _localStore[k]; },
  clear:      () => { Object.keys(_localStore).forEach((k) => delete _localStore[k]); },
  get length() { return Object.keys(_localStore).length; },
  key:        (i) => Object.keys(_localStore)[i] ?? null,
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
