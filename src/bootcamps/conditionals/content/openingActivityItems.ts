import { DIAGRAM_ITEMS, type DiagramItem } from '@/features/conditional-refresher/content';

// Reviewed individually for the opening after both indicator families. Keep
// source IDs and sentences stable; never select by group alone, since groups
// also contain compound conditions that this opening has not taught.
export const openingActivityIds = ['d1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8'] as const;

export const openingActivityItems: DiagramItem[] = openingActivityIds.map(id => {
  const item = DIAGRAM_ITEMS.find(candidate => candidate.id === id);
  if (!item) throw new Error(`Missing reviewed opening Activity item: ${id}`);
  return item;
});

export const openingActivityExplanations: Record<(typeof openingActivityIds)[number], string> = {
  d1: "If Mia trains, she qualifies. Training is enough under this rule. Qualifying alone doesn't tell us whether she trains.",
  d2: "If someone is a dancer, that person stretches. The rule covers every dancer. It doesn't say that everyone who stretches is a dancer.",
  d3: "If a student is admitted, that student is a senior. An admitted student who isn't a senior would break the rule. Being a senior alone doesn't establish admission.",
  d5: "If someone votes, that person is a member. Membership is required for voting. The sentence doesn't say that every member votes.",
  d6: "If the bridge opens, it has been inspected. Inspection is required for opening. An inspected bridge could still stay closed.",
  d7: "If there is funding, there is approval. The sentence makes approval a requirement for funding. Approval alone doesn't establish funding.",
  d8: "If someone is a hiker, that person brings a map. Here, 'always' states what hikers do. It doesn't merely tell them what they ought to do, and bringing a map alone doesn't establish that someone is a hiker.",
};
