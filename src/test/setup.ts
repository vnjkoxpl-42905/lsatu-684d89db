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

// jsdom ships no IntersectionObserver. Anything that lazily renders when it
// scrolls into view (library card previews, the carousel) throws on mount
// without this. Nothing is ever "intersecting" here, so components that
// observe visibility stay in their off-screen state unless a test drives them.
class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly scrollMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
// configurable so an individual test can still swap in its own spy.
for (const target of [window, globalThis]) {
  Object.defineProperty(target, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  });
}

// Same story for ResizeObserver, which the carousel uses to measure slides.
class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
for (const target of [window, globalThis]) {
  Object.defineProperty(target, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });
}

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
