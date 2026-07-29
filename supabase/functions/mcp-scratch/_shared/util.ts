export const VERSION = "v2";
export function payload() {
  return { version: VERSION, ts: new Date().toISOString(), files: ["index.ts", "_shared/util.ts"] };
}
