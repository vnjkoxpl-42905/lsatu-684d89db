/**
 * Reading Center is the activity hub. Speed Reading keeps its own library and
 * reader; RRC uses its existing section collection and attempts independently.
 * Keep the original reader, tags, profile and manager URLs stable.
 */
export const TOOLS_PATH = "/teacher/tools";
export const RC_HOME_PATH = "/reading-center";
export const RC_LIBRARY_PATH = "/reading-center/speed-reading";
export const RC_RRC_PATH = "/reading-center/rrc";
export const RC_STATS_PATH = "/reading-center/profile";
export const RC_PROFILE_PATH = "/reading-center/profile";
export const RC_TAGS_PATH = "/reading-center/tags";
export const RC_COURSES_PATH = "/reading-center/courses";
export const RC_MANAGE_PATH = "/reading-center/manage";

export function rcTagPath(tag: string): string { return `${RC_TAGS_PATH}/${encodeURIComponent(tag)}`; }

export function rcReaderPath(slug: string): string {
  return `/reading-center/read/${encodeURIComponent(slug)}`;
}
