import { TimedWorkClient } from './timedWorkClient';
import { TimedPracticeTestStore, timedPracticeTestChildLaunch, type TimedPracticeTestSnapshot } from './timedPracticeTestStore';
import { getPracticeTestDeviceId } from './practiceTestStore';
import type { PracticeTestPaceId } from './practiceTest';

export function officialTimedStore(ownerId: string, runId: string) {
  return new TimedPracticeTestStore(new TimedWorkClient(ownerId, runId), getPracticeTestDeviceId());
}
/** Persist creation before navigation. The parent can retry this UUID after a lost reply. */
export async function prepareOfficialPracticeTest(ownerId: string, pt: number, pace: PracticeTestPaceId, sectionSeconds: number | null): Promise<string> {
  const id = crypto.randomUUID();
  const client = new TimedWorkClient(ownerId, id);
  await client.requireCapability('create');
  await new TimedPracticeTestStore(client, getPracticeTestDeviceId()).prepare('create', { pt, pace, sectionSeconds }, null);
  return id;
}
export function officialTimedChildPath(snapshot: TimedPracticeTestSnapshot): string {
  const child = timedPracticeTestChildLaunch(snapshot, getPracticeTestDeviceId());
  return `/testing/test/${encodeURIComponent(child.runId)}/${child.kind}/${child.legIndex}`;
}
