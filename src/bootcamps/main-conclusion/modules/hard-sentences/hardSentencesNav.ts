/**
 * Hard Sentences module manifest. Single source of truth for the hub roster
 * and the per-page prev/next navigation. Routes are absolute app routes.
 */

export type HardEntryKind = 'note' | 'lab' | 'drill' | 'capstone';

export interface HardEntry {
  id: string; // '5.1' .. '5.7', 'capstone'
  kind: HardEntryKind;
  title: string;
  description: string;
  route: string;
  /** Key recorded in module progress when the entry is completed. */
  completionKey: string;
  /** Which progress list the completionKey lives in. */
  completionList: 'hard_sections' | 'drills' | 'capstones';
}

const BASE = '/bootcamp/intro-to-lr/hard-sentences';

export const HARD_ENTRIES: HardEntry[] = [
  {
    id: '5.1',
    kind: 'note',
    title: 'Why Hard Sentences',
    description: 'What makes an LSAT sentence hard, and why the core is always still in there.',
    route: `${BASE}/5.1`,
    completionKey: '5.1',
    completionList: 'hard_sections',
  },
  {
    id: '5.2',
    kind: 'note',
    title: 'What Is a Cluster',
    description: 'One core thought, wrapped in specifiers. Learn the core test and try your first lift.',
    route: `${BASE}/5.2`,
    completionKey: '5.2',
    completionList: 'hard_sections',
  },
  {
    id: '5.3',
    kind: 'note',
    title: 'The Six Specifiers',
    description: 'Possessive, prepositional, relative, parenthetical, reduced relative, appositive.',
    route: `${BASE}/5.3`,
    completionKey: '5.3',
    completionList: 'hard_sections',
  },
  {
    id: '5.4',
    kind: 'note',
    title: 'The Jordan Move',
    description: 'Find the main verb first. Two students, one sentence, two very different reads.',
    route: `${BASE}/5.4`,
    completionKey: '5.4',
    completionList: 'hard_sections',
  },
  {
    id: '5.5',
    kind: 'note',
    title: 'Optional vs Core',
    description: 'Some specifiers are load-bearing. Strip one and the claim becomes a different claim.',
    route: `${BASE}/5.5`,
    completionKey: '5.5',
    completionList: 'hard_sections',
  },
  {
    id: '5.6',
    kind: 'lab',
    title: 'Decomposer Lab',
    description: 'Guided practice with the Cluster Decomposer. Hints on, no scoring, take your time.',
    route: `${BASE}/5.6`,
    completionKey: '5.6',
    completionList: 'hard_sections',
  },
  {
    id: '5.7',
    kind: 'drill',
    title: 'Cluster Drill',
    description: 'Six fresh sentences, graded. Lift the decoration, keep what is load-bearing.',
    route: `${BASE}/5.7`,
    completionKey: 'MC-DRL-HS-CLUSTER',
    completionList: 'drills',
  },
  {
    id: 'capstone',
    kind: 'capstone',
    title: 'Capstone',
    description: 'Five exam-style questions that test the whole module at once.',
    route: `${BASE}/capstone`,
    completionKey: 'M5.8',
    completionList: 'capstones',
  },
];

export const HARD_SENTENCES_HUB_ROUTE = BASE;

export function entryById(id: string): HardEntry | undefined {
  return HARD_ENTRIES.find((e) => e.id === id);
}

export function prevOf(id: string): HardEntry | null {
  const i = HARD_ENTRIES.findIndex((e) => e.id === id);
  return i > 0 ? HARD_ENTRIES[i - 1]! : null;
}

export function nextOf(id: string): HardEntry | null {
  const i = HARD_ENTRIES.findIndex((e) => e.id === id);
  return i >= 0 && i < HARD_ENTRIES.length - 1 ? HARD_ENTRIES[i + 1]! : null;
}

export interface HardCompletionSnapshot {
  hardSections: string[];
  drills: string[];
  capstones: string[];
}

export function isEntryComplete(entry: HardEntry, snap: HardCompletionSnapshot): boolean {
  switch (entry.completionList) {
    case 'hard_sections':
      return snap.hardSections.includes(entry.completionKey);
    case 'drills':
      return snap.drills.includes(entry.completionKey);
    case 'capstones':
      return snap.capstones.includes(entry.completionKey);
  }
}

export function firstIncomplete(snap: HardCompletionSnapshot): HardEntry {
  return HARD_ENTRIES.find((e) => !isEntryComplete(e, snap)) ?? HARD_ENTRIES[0]!;
}
