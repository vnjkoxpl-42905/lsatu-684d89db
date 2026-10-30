import { questionBank, type LRQuestion } from "@/lib/questionLoader";
import { scheduleData, type DayTargets } from "../data";

// Deterministic shuffle: same seed → same order. Lets us pick a stable
// daily set without server state. Mulberry32 PRNG seeded by FNV-1a hash of
// the seed string.
function deterministicShuffle<T>(items: T[], seed: string): T[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let s = h >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dayTargets(day: number): DayTargets | undefined {
  return scheduleData.find((d) => d.day === day)?.targets as DayTargets | undefined;
}

function filterByTargets(targets: DayTargets): LRQuestion[] {
  if (!targets.generates || !targets.qtypes?.length) return [];
  const base = questionBank.getQuestionsByFilter({
    qtypes: targets.qtypes,
    difficulties: targets.difficulties,
    pts: [],
  });
  return base.filter((q) => {
    if (targets.questionFeatures?.length) {
      const features = q.questionFeatures ?? [];
      if (!targets.questionFeatures.some((f) => features.includes(f))) return false;
    }
    if (targets.reasoningTypes?.length) {
      const rt = q.reasoningType ?? [];
      if (!targets.reasoningTypes.some((r) => rt.includes(r))) return false;
    }
    return true;
  });
}

function pickForDay(
  day: number,
  kind: "homework" | "practice",
  count: number,
  excludeQids: Set<string>,
): string[] {
  const targets = dayTargets(day);
  if (!targets?.generates) return [];
  const candidates = filterByTargets(targets).filter((q) => !excludeQids.has(q.qid));
  const shuffled = deterministicShuffle(candidates, `pf:day-${day}:${kind}`);
  return shuffled.slice(0, count).map((q) => q.qid);
}

// Wave-3 hook: `excludeQids` is the 500-question cooldown filter. Passes
// through to the candidate filter unchanged; the cooldown reader plugs in
// at the call site without changing this signature.
export function pickHomeworkForDay(
  day: number,
  count?: number,
  excludeQids: Set<string> = new Set(),
): string[] {
  const finalCount = count ?? dayTargets(day)?.defaultHomeworkCount ?? 10;
  return pickForDay(day, "homework", finalCount, excludeQids);
}

export function pickPracticeForDay(
  day: number,
  count?: number,
  excludeQids: Set<string> = new Set(),
): string[] {
  const finalCount = count ?? dayTargets(day)?.defaultPracticeCount ?? 25;
  return pickForDay(day, "practice", finalCount, excludeQids);
}

export function dayHasGenerator(day: number): boolean {
  return !!dayTargets(day)?.generates;
}

export function dayHomeworkCount(day: number): number {
  return dayTargets(day)?.defaultHomeworkCount ?? 10;
}

export function dayPracticeCount(day: number): number {
  return dayTargets(day)?.defaultPracticeCount ?? 25;
}
