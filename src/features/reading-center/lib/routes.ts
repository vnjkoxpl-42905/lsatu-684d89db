/**
 * Reading Center lives in the teacher workspace's Tools room. The reader takes
 * the whole viewport (like the whiteboard); the library, stats and passage
 * manager render inside the workspace shell. The reader sits under /read/ so a
 * passage slug can never collide with "stats" or "manage".
 */
export const TOOLS_PATH = "/teacher/tools";
export const RC_LIBRARY_PATH = "/teacher/tools/reading-center";
export const RC_STATS_PATH = "/teacher/tools/reading-center/stats";
export const RC_MANAGE_PATH = "/teacher/tools/reading-center/manage";

export function rcReaderPath(slug: string): string {
  return `/teacher/tools/reading-center/read/${slug}`;
}
