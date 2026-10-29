/**
 * Type shims for the Deno edge-function code that the app's Vitest specs import
 * directly (e.g. `supabase/functions/_shared/singleSessionCore.ts`).
 *
 * Those files run under Deno, where `npm:`-prefixed specifiers and the `Deno`
 * global are built in. The browser TypeScript program has no idea about either,
 * so it reported "Cannot find module 'npm:react@18.3.1'" and "Cannot find name
 * 'Deno'". These declarations only satisfy the type checker; they change no
 * runtime behaviour and are never bundled.
 */

// React is a real dependency here, so point its Deno specifier at the installed
// types rather than `any`; the email templates use React.ReactNode etc.
declare module "npm:react@18.3.1" {
  import React = require("react");
  export = React;
}

// Everything else pulled in over the Deno registries is untyped for the browser
// program's purposes.
declare module "npm:*";
declare module "jsr:*";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
  [key: string]: unknown;
};
