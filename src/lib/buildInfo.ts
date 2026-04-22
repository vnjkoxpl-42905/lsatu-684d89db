// Build-time metadata injected by Vite `define` in vite.config.ts.
// Used to render a short SHA badge so production bugs can be triaged
// against a specific commit without guessing which bundle is live.

declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

export const BUILD_SHA: string =
  typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "dev";

export const BUILD_TIME: string =
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";
