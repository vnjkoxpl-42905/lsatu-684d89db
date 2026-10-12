import type { Language } from '../types/drill';

export interface ClassifierResult {
  trigger: string | null;
  language: Language | null;
  protocol: string;
}

const ASSUMPTION = /\b(takes for granted|presumes|presupposes|assumes|fails to establish)\b/i;
const OBJECTION = /\b(fails to consider|fails to rule out|overlooks the possibility|overlooks|ignores|neglects)\b/i;
const MATCH =
  /\b(concludes [^.]{0,120}? on the basis of|infers[^.]{0,80}? that\b|confuses [^.]{0,120}? with\b|treats [^.]{0,120}? as if\b|mistakes [^.]{0,120}? for\b|conflates)\b/i;

export function classifyTriggerPhrase(text: string): ClassifierResult {
  if (!text || !text.trim()) {
    return {
      trigger: null,
      language: null,
      protocol: 'Paste an answer choice or trigger phrase to classify.',
    };
  }

  const a = text.match(ASSUMPTION);
  if (a) {
    return {
      trigger: a[0],
      language: 'assumption',
      protocol: 'Make X FALSE. Does the argument crash?',
    };
  }
  const o = text.match(OBJECTION);
  if (o) {
    return {
      trigger: o[0],
      language: 'objection',
      protocol: 'Take Y to be TRUE. Does the conclusion die?',
    };
  }
  const m = text.match(MATCH);
  if (m) {
    return {
      trigger: m[0],
      language: 'match',
      protocol:
        'Translate the abstract terms back into the specific text. Does it fit perfectly?',
    };
  }
  return {
    trigger: null,
    language: null,
    protocol:
      'No trigger phrase detected. Re-read for the verb the answer choice uses to characterize the flaw.',
  };
}
