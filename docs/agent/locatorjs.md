# LocatorJS Click-to-Source

## Current LSAT U Setup

- Runtime package: `@locator/runtime`
- Runtime location: dev-only dynamic import in `src/main.tsx`
- Editor target: `vscode://file/${projectPath}${filePath}:${line}:${column}`
- React adapter: forced with `adapter: "react"`
- React compiler: `@vitejs/plugin-react-swc`; do not switch to Babel for this cockpit feature.

## Verified Behavior

2026-06-17 headed Chromium verification against `http://localhost:8080` found React
fiber source metadata on rendered elements, for example:

```text
/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/src/pages/Auth.tsx:427
```

The same headed Option/Alt-click probe still produced:

```text
[LocatorJS]: Could not find element info. Element: JSHandle@node
```

That means the LSAT U runtime helper is installed and configured, but the SWC runtime
path does not reliably turn the browser click target into a LocatorJS element record.

## Working Path

Use the LocatorJS browser extension as the click-to-source path for LSAT U.

1. Install the LocatorJS browser extension in the browser used for local LSAT U QA.
2. Open `http://localhost:8080`.
3. Confirm VS Code is the selected editor target.
4. Option/Alt-click a rendered app element.
5. If prompted by the browser, allow the `vscode://file/...` external-app link.

The repo runtime remains useful because it is dev-only, points at VS Code, and stays
tree-shaken out of production builds. The browser extension is required when the SWC
runtime path cannot resolve an element.

## Do Not Change

- Do not install BlockNote/demo packages.
- Do not switch `@vitejs/plugin-react-swc` to Babel for LocatorJS.
- Do not add product-only attributes or UI behavior just to satisfy click-to-source.
