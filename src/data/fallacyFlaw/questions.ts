import { Question, QuestionModuleId } from '../../types/fallacyFlaw';

const makeStub = (
  id: string,
  moduleId: QuestionModuleId,
  flavor: string,
): Question => ({
  id,
  moduleId,
  stem: `[PLACEHOLDER: short stimulus that exemplifies a ${flavor} flaw]`,
  choices: [
    { text: '[PLACEHOLDER: choice A]' },
    { text: '[PLACEHOLDER: choice B]' },
    { text: '[PLACEHOLDER: choice C]' },
    { text: '[PLACEHOLDER: choice D]' },
    { text: '[PLACEHOLDER: choice E]' },
  ],
  correctIndex: 0,
  explanation:
    '[PLACEHOLDER: explanation of why the correct choice names the flaw and what makes the others wrong]',
  difficulty: 'Medium',
  deconstruction: {
    prompt: 'Name the flaw in this argument.',
    cause: '[PLACEHOLDER: the unsupported leap]',
    effect: '[PLACEHOLDER: the conclusion that depends on the leap]',
  },
});

const makeCapstoneStub = (id: string): Question => ({
  id,
  moduleId: 'famous-flaws-capstone',
  stem: '[PLACEHOLDER: short summary of the stimulus]',
  stimulus: '[PLACEHOLDER: full LSAT-format stimulus paragraph]',
  question: '[PLACEHOLDER: LSAT question stem, e.g. "The reasoning in the argument is flawed in that it..."]',
  sourcePT: '[PLACEHOLDER: PT XX | Sec X | Q XX]',
  choices: [
    { text: '[PLACEHOLDER: choice A]' },
    { text: '[PLACEHOLDER: choice B]' },
    { text: '[PLACEHOLDER: choice C]' },
    { text: '[PLACEHOLDER: choice D]' },
    { text: '[PLACEHOLDER: choice E]' },
  ],
  correctIndex: 0,
  explanation:
    '[PLACEHOLDER: explanation of why the correct choice names the flaw and what makes the others wrong]',
  difficulty: 'Medium',
  deconstruction: {
    prompt: 'Name the flaw in this argument.',
    cause: '[PLACEHOLDER: the unsupported leap]',
    effect: '[PLACEHOLDER: the conclusion that depends on the leap]',
  },
});

const module1Questions: Question[] = [
  makeStub('M1-Q01', 'causal-flaws', 'causal'),
  makeStub('M1-Q02', 'causal-flaws', 'causal'),
  makeStub('M1-Q03', 'causal-flaws', 'causal'),
];

const module2Questions: Question[] = [
  makeStub('M2-Q01', 'conditional-flaws', 'conditional'),
  makeStub('M2-Q02', 'conditional-flaws', 'conditional'),
  makeStub('M2-Q03', 'conditional-flaws', 'conditional'),
];

const module3Questions: Question[] = [
  makeStub('M3-Q01', 'sampling-comparison-scope', 'sampling / comparison / scope'),
  makeStub('M3-Q02', 'sampling-comparison-scope', 'sampling / comparison / scope'),
  makeStub('M3-Q03', 'sampling-comparison-scope', 'sampling / comparison / scope'),
];

const module4Questions: Question[] = [
  makeCapstoneStub('M4-Q01'),
  makeCapstoneStub('M4-Q02'),
  makeCapstoneStub('M4-Q03'),
];

export const ALL_QUESTIONS: Record<QuestionModuleId, Question[]> = {
  'causal-flaws': module1Questions,
  'conditional-flaws': module2Questions,
  'sampling-comparison-scope': module3Questions,
  'famous-flaws-capstone': module4Questions,
};

const allQuestionsFlat = Object.values(ALL_QUESTIONS).flat();

export const getQuestionById = (id: string): Question | undefined => {
  return allQuestionsFlat.find(q => q.id === id);
};
