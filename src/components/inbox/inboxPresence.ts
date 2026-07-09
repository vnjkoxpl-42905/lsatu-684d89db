import { isUserOnline } from "@/lib/presence";

export function isParticipantOnline(lastSeenAt: string | null | undefined, now = Date.now()) {
  return isUserOnline(lastSeenAt, now);
}
