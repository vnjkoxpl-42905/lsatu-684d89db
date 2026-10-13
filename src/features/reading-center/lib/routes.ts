/**
 * Reading Center lives in the teacher workspace's Tools room. The reader takes
 * the whole viewport (like the whiteboard); the library, stats and passage
 * manager render inside the workspace shell. The reader sits under /read/ so a
 * passage slug can never collide with "stats" or "manage".
 */
export const TOOLS_PATH = "/teacher/tools";
export const RC_LIBRARY_PATH = "/reading-center";
export const RC_STATS_PATH = "/reading-center/profile";
export const RC_PROFILE_PATH = "/reading-center/profile";
export const RC_TAGS_PATH = "/reading-center/tags";
export const RC_COURSES_PATH = "/reading-center/courses";
export const RC_MANAGE_PATH = "/reading-center/manage";

export function rcTagPath(tag: string): string { return `${RC_TAGS_PATH}/${encodeURIComponent(tag)}`; }

export function rcReaderPath(slug: string): string {
  return `/reading-center/read/${encodeURIComponent(slug)}`;
}
