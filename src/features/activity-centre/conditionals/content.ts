import authoredQuestions from './questions.json';

export type ConditionalMode = 'linking' | 'missing-link' | 'must-be-true';

export interface ConditionalQuestion {
  id: string;
  mode: ConditionalMode;
  level: 'variables' | 'words';
  premises: string[];
  conclusion?: string;
  prompt: string;
  choices: { id: string; text: string }[];
  correctChoiceId: string;
  explanation: string;
  groupTags?: string[];
}

function linking(
  id: string,
  level: ConditionalQuestion['level'],
  premises: string[],
  conclusion: string,
  choices: string[],
  correctChoiceId: string,
  explanation: string,
  groupTags?: string[],
): ConditionalQuestion {
  return {
    id, mode: 'linking', level, premises, conclusion,
    prompt: "What's the missing link?",
    choices: choices.map((text, index) => ({ id: 'ABCDE'[index], text })),
    correctChoiceId, explanation, groupTags,
  };
}

const linkingQuestions: ConditionalQuestion[] = [
  linking('LINK1', 'variables', ['P → Q', 'R → S'], 'P → S',
    ['R → Q', 'Q → R', 'S → R', 'Q → P', 'S → P'], 'B',
    'P gives Q. The next rule starts at R. Add Q → R to connect P → Q → R → S. The other choices point back along the chain instead of connecting its open ends.'),
  linking('LINK2', 'variables', ['P → Q', 'S̸ → R̸'], 'P → S',
    ['Q → R̸', 'R → Q', 'Q̸ → R', 'R̸ → Q̸', 'S → P'], 'D',
    'Contrapose the second premise to get R → S. The gap is Q → R. Choice D gives its equivalent contrapositive, R̸ → Q̸. Together the rules give P → Q → R → S.'),
  linking('LINK3', 'variables', ['P → Q̸', 'R → S', 'S → T'], 'P → T',
    ['Q → R', 'R → Q̸', 'Q̸ → R', 'T → R', 'R̸ → Q̸'], 'C',
    'P gives Q̸, so the connection must start with Q̸. Add Q̸ → R. The completed chain is P → Q̸ → R → S → T. Matching a letter without matching its negation does not connect the rules.'),
  linking('LINK4', 'variables', ['P → Q', 'Q → R', 'S → T'], 'T̸ → P̸',
    ['S → R', 'R̸ → S', 'T → P', 'R → S̸', 'S̸ → R̸'], 'E',
    'The target is the contrapositive of P → T. Connect R → S to get P → Q → R → S → T. Choice E states that same bridge as S̸ → R̸. The target then follows by contraposition.'),
  linking('LINK5', 'words', ['Whenever a learner registers, a learner account is created.', 'Every verified account receives library access.'],
    'Every learner who registers receives library access.',
    ['Every created learner account is verified.', 'Every verified account belongs to a registered learner.', 'Library access guarantees registration.', 'Every registered learner has an unverified account.', 'Every learner who does not register receives library access.'], 'A',
    'Registration gives an account. Verification gives library access. The missing connection is account created → verified. Add it to get registration → account created → verified → library access. The other choices do not establish verification from account creation.', ['1', '2']),
  linking('LINK6', 'words', ['A project can launch only if funding is approved.', 'A completed review guarantees authorization.'],
    'Every project that can launch has authorization.',
    ['Authorization requires approved funding.', 'A completed review guarantees approved funding.', 'Approved funding guarantees a completed review.', 'Every project without approved funding has a completed review.', 'Authorization guarantees a completed review.'], 'C',
    'Launch → approved funding. Completed review → authorization. Add approved funding → completed review. This connects launch → approved funding → completed review → authorization. A requirement for authorization would run in the opposite direction.', ['1', '2']),
  linking('LINK7', 'words', ['A request cannot proceed unless it is checked.', 'No blocked request is eligible.'],
    'No blocked request can proceed.',
    ['Every eligible request is checked.', 'Every blocked request is checked.', 'Every unchecked request is blocked.', 'Every checked request is eligible.', 'Every eligible request can proceed.'], 'D',
    'Proceed → checked. Blocked → not eligible. Add checked → eligible. A request that proceeds must then be eligible. A blocked request cannot be eligible, so it cannot proceed. Being eligible alone would not prove that the request can proceed.', ['1', '3', '4']),
  linking('LINK8', 'words', ['Every selected proposal receives a review.', 'A permit is issued unless an objection remains.'],
    'Every selected proposal receives a permit.',
    ['Every proposal without an objection receives a review.', 'No reviewed proposal has a remaining objection.', 'Every permitted proposal receives a review.', 'Every reviewed proposal has a remaining objection.', 'Every proposal with an objection receives a review.'], 'B',
    'Selected → reviewed. No remaining objection → permit. Add reviewed → no remaining objection. This gives selected → reviewed → no remaining objection → permit. An objection does not, by itself, establish that a permit is refused.', ['1', '3', '4']),
];

// Stable IDs preserve question identity across saved practice runs and reviews.
const missingLinkOrder = [
  'PHOTO-ML01', 'PHOTO-ML02', 'PHOTO-ML03', 'PHOTO-ML04',
  'ML1', 'PHOTO-ML05', 'PHOTO-ML06', 'ML2', 'ML3', 'ML4',
  'PHOTO-ML07', 'PHOTO-ML08', 'PHOTO-ML09', 'PHOTO-ML10', 'PHOTO-ML11', 'PHOTO-ML12',
  'ML5', 'ML6', 'ML7', 'ML8', 'ML9', 'ML10',
];
const bank = authoredQuestions as ConditionalQuestion[];

export const CONDITIONAL_QUESTIONS: ConditionalQuestion[] = [
  ...missingLinkOrder.map(id => bank.find(question => question.id === id)!),
  ...bank.filter(question => question.mode === 'must-be-true'),
  ...linkingQuestions,
];
