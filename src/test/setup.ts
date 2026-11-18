import "@testing-library/jest-dom/vitest";

const win = globalThis.window ?? globalThis;
Object.defineProperty(win, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(win, "matchMedia", {
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
