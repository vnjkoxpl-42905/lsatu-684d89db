/**
 * Bootcamp content. All 6 days are production. Lesson chunks port from
 * _HANDOFF/05_compiled_content_voiced.md near-verbatim. Coach overlay copy
 * (cold opens, verdicts, drill prompts) is original, two-register voice.
 */

import type { DayId } from '../../lib/store';

export type DayStatus = 'ready' | 'stub';

interface BaseCalibrationItem {
  id: string;
  prompt: string;
  /** Optional sub-line in protocol mono — courtroom-style aside. */
  context?: string;
  /** Voice-locked feedback shown after answer is locked in. */
  rationale: string;
  /** Optional flaw slug — used by Day 6 to seed SR queue on miss. */
  flawSlug?: string;
}

export interface RecognitionItem extends BaseCalibrationItem {
  kind?: 'recognition' | 'application';
  options: { id: string; label: string }[];
  correct: string;
}

export interface GenerativeItem extends BaseCalibrationItem {
  kind: 'generative';
  stimulus: string;
  canonicalAnswers: string[];
}

export type CalibrationItem = RecognitionItem | GenerativeItem;

export function isGenerative(item: CalibrationItem): item is GenerativeItem {
  return (item as GenerativeItem).kind === 'generative';
}

export interface BootcampDay {
  id: DayId;
  status: DayStatus;
  numeral: string;
  title: string;
  subtitle: string;
  coachOpener: { lead: string; followup: string };
  estMinutes: number;
  outcome: string;
  calibration: CalibrationItem[];
  verdict: {
    calibrationThreshold: number;
    calibratedLead: string;
    repeatLead: string;
    nextStep: string;
  };
}

export const BOOTCAMP_DAYS: BootcampDay[] = [
  /* ─────────────────────────────── DAY 01 ─────────────────────────────── */
  {
    id: 1,
    status: 'ready',
    numeral: 'DAY 01',
    title: 'Hostile Mode & the Key',
    subtitle:
      'Logical Hostility · Cake-on-Blocks · "What if..." · Three Commandments',
    coachOpener: {
      lead:
        "Day one. You came in able to read an LSAT argument cooperatively. By the end of today you won't be able to anymore — and that's the point.",
      followup:
        'One mindset shift, one mental model, one method, one contract. Hostility, blocks, the key, the rules. Read with your shoulders down, then go straight at the drill. No skim. The coach is watching.',
    },
    estMinutes: 60,
    outcome:
      'Read any LSAT stimulus in hostile mode, locate the gap with the Cake-on-Blocks lens, and generate a valid loophole that does not violate the Three Commandments.',
    calibration: [
      {
        id: 'd1-q1',
        prompt: 'Before you read a Flaw stimulus, the right mental move is to assume:',
        options: [
          { id: 'a', label: 'The argument is probably fine; check carefully.' },
          { id: 'b', label: 'The argument might have a flaw worth checking for.' },
          { id: 'c', label: 'The argument has done something wrong. Not might have. Has. 100%.' },
          { id: 'd', label: 'The argument is too tricky to assume anything; reserve judgment.' },
        ],
        correct: 'c',
        rationale:
          "Logical Hostility is binary. Not 'might have.' Has. The premise of the protocol is that the LSAT writer planted a flaw on purpose, so your job is to assume it and find it.",
      },
      {
        id: 'd1-q2',
        prompt: 'In the Cake-on-Blocks model, what role do the premises play?',
        options: [
          { id: 'a', label: 'The cake — the thing being argued for.' },
          { id: 'b', label: 'The blocks — solid, given, not to be argued with.' },
          { id: 'c', label: 'The walkway between blocks — where validity lives.' },
          { id: 'd', label: 'The floor — what we are trying to keep the cake off of.' },
        ],
        correct: 'b',
        rationale:
          'The blocks are the premises. They are given as true. Burning them down (saying "what if that premise is wrong?") is the rookie move. You argue with whether the blocks hold up the cake.',
      },
      {
        id: 'd1-q3',
        prompt: 'Where does validity live?',
        options: [
          { id: 'a', label: 'Inside whichever premise is most central.' },
          { id: 'b', label: 'Inside the conclusion itself.' },
          { id: 'c', label: 'In the connection between the premises and the conclusion — the space between them.' },
          { id: 'd', label: 'In whether the premises are factually true in the real world.' },
        ],
        correct: 'c',
        rationale:
          'Validity lives in the relationship, not in any single premise. The Land of Validity Lives Upon the Intersection of the Premises. If the conclusion brings in a fresh term the premises never set up, the cake is on the floor.',
      },
      {
        id: 'd1-r1',
        kind: 'recognition',
        prompt:
          'Stimulus: "Coffee is delicious. I love anything delicious. Therefore, I will drink coffee tomorrow." Which what-if violates Commandment I (do not negate the premises)?',
        options: [
          { id: 'a', label: 'What if all the coffee tomorrow is too hot to drink?' },
          { id: 'b', label: 'What if I actually find coffee disgusting, not delicious?' },
          { id: 'c', label: 'What if a doctor tells me I cannot have caffeine tomorrow?' },
          { id: 'd', label: 'What if I am fasting for a procedure tomorrow?' },
        ],
        correct: 'b',
        rationale:
          'Option (b) attacks the premise that the speaker finds coffee delicious. The premises are blocks; you do not burn them down. (a), (c), (d) all attack the connection between premises and conclusion — that is where loopholes legally live.',
      },
      {
        id: 'd1-r2',
        kind: 'recognition',
        prompt: 'Which sentence violates Commandment II (do not just negate the conclusion)?',
        options: [
          { id: 'a', label: 'What if individual ability does not predict team-level performance under pressure?' },
          { id: 'b', label: 'What if the conclusion does not have to be true?' },
          { id: 'c', label: 'What if a stronger team also entered this year and the championship is competitive?' },
          { id: 'd', label: 'What if past wins do not carry forward to a new lineup?' },
        ],
        correct: 'b',
        rationale:
          'Saying "what if the conclusion is not true" is showing up at the finish line and declaring yourself the winner. Of course it does not have to be true. Your job is to show why. (a), (c), (d) show why.',
      },
      {
        id: 'd1-g1',
        kind: 'generative',
        prompt:
          'Your turn. Read the stimulus. Write one what-if that destroys the conclusion without violating either Commandment. Self-grade honestly when you submit.',
        stimulus:
          'Most successful tech founders dropped out of college. Therefore, dropping out of college is a smart move for anyone who wants to start a tech company.',
        canonicalAnswers: [
          "What if the founders who succeeded would have succeeded with or without the dropout — the dropping out wasn't what caused the success?",
          'What if survivor bias hides a much larger group who dropped out and failed, making the move look smart only in hindsight?',
          'What if "anyone" is a much wider group than the founders we hear about, and the move that worked for outliers does not generalize?',
        ],
        rationale:
          'Any loophole that drives a wedge between the premise (success of founders who dropped out) and the conclusion (dropping out is smart for anyone) is valid. The canonical loopholes attack causation, selection bias, and overgeneralization.',
      },
    ],
    verdict: {
      calibrationThreshold: 0.8,
      calibratedLead:
        'Calibrated. Hostile mode is on, the blocks are loaded, the key fits. Tomorrow you learn what the lock looks like — three different ones, in fact.',
      repeatLead:
        'Not calibrated yet. The catalog is loaded for review of the moves you missed — sit with them, then re-run Day 1. No streak penalty. No timer. The work is the work.',
      nextStep:
        "Next · Day 02 · Three Languages — every Flaw answer choice speaks one of three languages. You're about to learn all of them.",
    },
  },

  /* ─────────────────────────────── DAY 02 ─────────────────────────────── */
  {
    id: 2,
    status: 'ready',
    numeral: 'DAY 02',
    title: 'Three Languages',
    subtitle: 'Assumption · Objection · Match — the trigger-phrase rule',
    coachOpener: {
      lead:
        "Day two. You can read hostilely and you can pick the lock. Today you learn that the LSAT writes its right answers in three different languages, and if you don't know which one is on the screen, you'll apply the wrong test and pick a trap.",
      followup:
        "Three languages. Three protocols. One trigger-phrase rule that decides which protocol runs. Memorize the verbs. The verbs are load-bearing. Half of the wrong-answer patterns on hard Flaw questions exploit students who can't tell Assumption from Objection in under five seconds.",
    },
    estMinutes: 45,
    outcome:
      'Classify any Flaw answer choice as Assumption, Objection, or Match within five seconds, and apply the right test.',
    calibration: [
      {
        id: 'd2-r1',
        kind: 'recognition',
        prompt:
          'Trigger phrase: "takes for granted that X". Which language is the answer choice speaking?',
        options: [
          { id: 'a', label: 'Assumption' },
          { id: 'b', label: 'Objection' },
          { id: 'c', label: 'Match' },
          { id: 'd', label: 'Cannot be determined from the trigger alone' },
        ],
        correct: 'a',
        rationale:
          '"Takes for granted" is one of the four canonical Assumption verbs (along with presumes, assumes, fails to establish). The test is the Two-Step Check: make X FALSE, ask if the argument crashes.',
      },
      {
        id: 'd2-r2',
        kind: 'recognition',
        prompt: 'Trigger phrase: "fails to consider that Y". Which language?',
        options: [
          { id: 'a', label: 'Assumption' },
          { id: 'b', label: 'Objection' },
          { id: 'c', label: 'Match' },
          { id: 'd', label: 'Either Assumption or Objection — context decides' },
        ],
        correct: 'b',
        rationale:
          '"Fails to consider" is Objection language (along with overlooks, ignores, neglects). The test is the Weakener Test: take Y to be TRUE, ask if the conclusion dies.',
      },
      {
        id: 'd2-a1',
        kind: 'application',
        prompt:
          'Real LSAT answer choice: "The argument confuses a condition that ensures the truth of another condition with one that is necessary for the truth of that condition." What language and what test?',
        options: [
          { id: 'a', label: 'Assumption · Two-Step Check (make X FALSE)' },
          { id: 'b', label: 'Objection · Weakener Test (take Y TRUE)' },
          { id: 'c', label: 'Match · Translation Test (does the abstract fit the text?)' },
          { id: 'd', label: 'None of the above; this is a Trap pattern.' },
        ],
        correct: 'c',
        rationale:
          'The verb "confuses" is Match-language. The choice is describing the structural error. Run the Translation Test: take the abstract terms ("ensures" and "necessary") and check whether they fit the actual conditional move in the stimulus.',
      },
      {
        id: 'd2-a2',
        kind: 'application',
        prompt:
          'Real LSAT answer choice: "The argument takes for granted that a labeling error is proof of an intention to deceive." Apply the Negation Test. If the claim is FALSE, what should happen?',
        options: [
          { id: 'a', label: 'The argument should still hold up — the claim is incidental.' },
          { id: 'b', label: 'The argument should crash — the claim is load-bearing.' },
          { id: 'c', label: 'The conclusion should still be probable, just not certain.' },
          { id: 'd', label: 'You cannot tell without seeing the stimulus.' },
        ],
        correct: 'b',
        rationale:
          'The Two-Step Check on an Assumption answer: if making the claim FALSE crashes the argument, this is the right answer. That is exactly how you confirm Assumption answers — by negating and watching the structure collapse.',
      },
      {
        id: 'd2-a3',
        kind: 'application',
        prompt:
          'You see two answer choices that say roughly the same thing about the same hidden gap. (A) starts with "fails to consider that..." (B) starts with "takes for granted that..." Which test do you run on each?',
        options: [
          { id: 'a', label: '(A) Negation Test · (B) Weakener Test' },
          { id: 'b', label: '(A) Weakener Test · (B) Negation Test' },
          { id: 'c', label: 'Same test on both — same answer.' },
          { id: 'd', label: 'No test until you read the stimulus again.' },
        ],
        correct: 'b',
        rationale:
          'Same correct answer, different test. Objection ("fails to consider") → take Y TRUE, does the conclusion die. Assumption ("takes for granted") → make X FALSE, does the argument crash. Apply the wrong test and you eliminate the right answer because it failed your wrong protocol.',
      },
    ],
    verdict: {
      calibrationThreshold: 0.8,
      calibratedLead:
        'Calibrated. You speak three languages. Tomorrow we name the six big flaws the LSAT actually writes about, and you start naming them on sight.',
      repeatLead:
        'Not calibrated. The trigger verbs are the whole game on this day — sit with the four Assumption verbs and the four Objection verbs until they are reflex, then re-run.',
      nextStep:
        'Next · Day 03 · The Heavy Hitters — six Group 1 flaws, recognized from the stimulus before you read a single answer choice.',
    },
  },

  /* ─────────────────────────────── DAY 03 ─────────────────────────────── */
  {
    id: 3,
    status: 'ready',
    numeral: 'DAY 03',
    title: 'The Heavy Hitters',
    subtitle:
      'Group 1 catalog · Necessary/Sufficient · Causal · Part/Whole · Unproven · Ad Hominem · Sampling',
    coachOpener: {
      lead:
        'Day three. The catalog opens. Six flaws account for most of the right answers in Group 1, and once you recognize the stimulus tells, you can name the flaw before you read a single answer choice.',
      followup:
        "These are the heavy hitters because they show up over and over and the LSAT writers don't bother hiding them. Six tells, six names, six counters. Memorize the tells the way a card-counter memorizes the deck. You aren't reading the stimulus anymore, you're scanning for fingerprints.",
    },
    estMinutes: 60,
    outcome:
      'Name any Group 1 flaw on sight from the stimulus tells, before reading a single answer choice.',
    calibration: [
      {
        id: 'd3-1',
        kind: 'application',
        prompt:
          'Stimulus: "All highway exits are marked. Therefore, anything marked is a highway exit." Which Group 1 flaw is this?',
        options: [
          { id: 'a', label: 'Necessary vs. Sufficient' },
          { id: 'b', label: 'Causal' },
          { id: 'c', label: 'Part vs. Whole' },
          { id: 'd', label: 'Sampling' },
        ],
        correct: 'a',
        rationale:
          'Classic conditional reversal. "All A are B" does not mean "all B are A." The argument flips a sufficient relationship into a necessary one. Tell: an "all X are Y" rule that gets read backwards in the conclusion.',
        flawSlug: 'necessary-vs-sufficient',
      },
      {
        id: 'd3-2',
        kind: 'application',
        prompt:
          'Stimulus: "Cities with more police officers per capita have higher crime rates. Clearly, hiring more police officers increases crime." Which flaw?',
        options: [
          { id: 'a', label: 'Necessary vs. Sufficient' },
          { id: 'b', label: 'Causal' },
          { id: 'c', label: 'Ad Hominem' },
          { id: 'd', label: 'Unproven vs. Proven False' },
        ],
        correct: 'b',
        rationale:
          'Correlation between two variables, conclusion picks one causal direction (police → crime), ignores reverse causation (high crime → more police hired) and third-factor explanations. Whenever the LSAT names a single cause for a correlation, 99.9% of the time it is wrong.',
        flawSlug: 'causal',
      },
      {
        id: 'd3-3',
        kind: 'application',
        prompt:
          'Stimulus: "Every player on the all-star team is the best at their position. Therefore, the all-star team is the best team in the league." Which flaw?',
        options: [
          { id: 'a', label: 'Sampling' },
          { id: 'b', label: 'Causal' },
          { id: 'c', label: 'Part vs. Whole' },
          { id: 'd', label: 'Necessary vs. Sufficient' },
        ],
        correct: 'c',
        rationale:
          'A property of every individual member (best at their position) gets transferred to the group as a whole (best team). The all-stars might never have played together. Coordination, chemistry, and roles are properties of the team, not the individuals.',
        flawSlug: 'part-vs-whole',
      },
      {
        id: 'd3-4',
        kind: 'application',
        prompt:
          'Stimulus: "Despite years of investigation, no one has proven that aliens have visited Earth. Therefore, aliens have never visited Earth." Which flaw?',
        options: [
          { id: 'a', label: 'Ad Hominem' },
          { id: 'b', label: 'Unproven vs. Proven False' },
          { id: 'c', label: 'Sampling' },
          { id: 'd', label: 'Causal' },
        ],
        correct: 'b',
        rationale:
          'Absence of evidence is not evidence of absence. "Not proven true" is not the same as "proven false." The author treats a failure to establish a claim as a demonstration of its opposite.',
        flawSlug: 'unproven-vs-proven-false',
      },
      {
        id: 'd3-5',
        kind: 'application',
        prompt:
          'Stimulus: "The senator argues that the new tax bill will hurt small businesses. But she has accepted donations from major corporations. Therefore, her argument should be dismissed." Which flaw?',
        options: [
          { id: 'a', label: 'Ad Hominem' },
          { id: 'b', label: 'Sampling' },
          { id: 'c', label: 'Unproven vs. Proven False' },
          { id: 'd', label: 'Causal' },
        ],
        correct: 'a',
        rationale:
          'The author rejects the senator\'s argument by attacking the source (her donor history) instead of the substance of the argument. Her donors do not make her wrong about the tax bill. Address the claim, not the speaker.',
        flawSlug: 'ad-hominem',
      },
    ],
    verdict: {
      calibrationThreshold: 0.8,
      calibratedLead:
        'Calibrated. Six fingerprints, six names. Tomorrow we add five more — the ones the LSAT writes constantly but never bothers to label.',
      repeatLead:
        'Not calibrated. Open the catalog and re-read the stimulus tells for the flaws you missed. The tells are the trick, not memorization. Then re-run.',
      nextStep:
        'Next · Day 04 · The House Five — five high-frequency flaws without textbook names. Sleight of Hand alone may be the #1 LR flaw on the test.',
    },
  },

  /* ─────────────────────────────── DAY 04 ─────────────────────────────── */
  {
    id: 4,
    status: 'ready',
    numeral: 'DAY 04',
    title: 'The House Five',
    subtitle:
      'Group 3 · Sleight of Hand · Sleazy Sales Pitch · Universal Desires · Value Assumptions · Secret Downsides',
    coachOpener: {
      lead:
        "Day four. Five flaws nobody taught you in undergrad logic, because they don't have textbook names. The LSAT writes them anyway. Sleight of Hand alone might be the single most common LR flaw on the test.",
      followup:
        'Today is the day where students who memorized the Big Six and stopped find out they were missing half the catalog. We pull the curtain on the moves the LSAT writers make all day, every day, with no fanfare. Nothing is basically the same. Nothing.',
    },
    estMinutes: 55,
    outcome:
      'Spot Sleight of Hand inside any conclusion that introduces a new term, and disambiguate it from Equivocation and Value Assumption.',
    calibration: [
      {
        id: 'd4-1',
        kind: 'application',
        prompt:
          'Stimulus: "Companies with high employee satisfaction scores have higher revenue per employee. Therefore, treating employees well is the most ethical business strategy." Which flaw?',
        options: [
          { id: 'a', label: 'Causal' },
          { id: 'b', label: 'Sleight of Hand' },
          { id: 'c', label: 'Sampling' },
          { id: 'd', label: 'Sleazy Sales Pitch' },
        ],
        correct: 'b',
        rationale:
          'New term in the conclusion: "ethical." Premise talks about revenue and satisfaction. Where did "ethical" come from? Nowhere. The author equates "high revenue + happy employees" with "ethical" without showing the link. Put a ≠ between the premise concept and the conclusion concept.',
        flawSlug: 'sleight-of-hand',
      },
      {
        id: 'd4-2',
        kind: 'application',
        prompt:
          'Stimulus: "Studies show that people who exercise regularly have higher life satisfaction. Therefore, exercise is morally required for the good life." Which flaw?',
        options: [
          { id: 'a', label: 'Sleight of Hand' },
          { id: 'b', label: 'Value Assumption' },
          { id: 'c', label: 'Either of the above could be defended' },
          { id: 'd', label: 'Causal' },
        ],
        correct: 'b',
        rationale:
          'The conclusion uses an evaluative term ("morally required") that the premises never defined. Value Assumption is the specific case of Sleight of Hand where the dangling variable is a moral or normative word. (a) is technically defensible but (b) is more precise — when the new term is evaluative, name it Value Assumption.',
        flawSlug: 'value-assumptions',
      },
      {
        id: 'd4-3',
        kind: 'application',
        prompt:
          'Stimulus: "We should hire Marcus over Lily. Marcus has a stronger technical background and Lily lacks Marcus\'s industry connections." Which flaw?',
        options: [
          { id: 'a', label: 'Ad Hominem' },
          { id: 'b', label: 'Sampling' },
          { id: 'c', label: 'Sleazy Sales Pitch' },
          { id: 'd', label: 'Universal Desires' },
        ],
        correct: 'c',
        rationale:
          'Marcus\'s strengths and Lily\'s weaknesses are listed. Lily\'s strengths and Marcus\'s weaknesses are nowhere on the page. Classic one-sided comparison. The author is selling Marcus like a used car, full of upside, no downside listed.',
        flawSlug: 'sleazy-sales-pitch',
      },
      {
        id: 'd4-4',
        kind: 'application',
        prompt:
          'Stimulus: "Everyone should adopt the new productivity app. It will help them get more work done in less time." Which flaw?',
        options: [
          { id: 'a', label: 'Universal Desires' },
          { id: 'b', label: 'Sleight of Hand' },
          { id: 'c', label: 'Sleazy Sales Pitch' },
          { id: 'd', label: 'Secret Downsides' },
        ],
        correct: 'a',
        rationale:
          'The argument concludes "everyone should" because the app delivers a commonly-marketed goal (more output, less time). It never establishes that everyone wants this. Some people prefer slower, more deliberate work. The conclusion pretends maximum productivity is a universal goal.',
        flawSlug: 'universal-desires',
      },
      {
        id: 'd4-5',
        kind: 'application',
        prompt:
          'Stimulus: "The city should switch all its buses to electric. Electric buses produce no tailpipe emissions." Which flaw is the BEST description?',
        options: [
          { id: 'a', label: 'Sleight of Hand' },
          { id: 'b', label: 'Causal' },
          { id: 'c', label: 'Secret Downsides' },
          { id: 'd', label: 'Universal Desires' },
        ],
        correct: 'c',
        rationale:
          'The argument recommends an action based on one benefit (zero tailpipe emissions) and never addresses costs or unintended consequences (battery sourcing, grid emissions, range issues, capital expense). Secret Downsides — single-option pitch missing the downsides.',
        flawSlug: 'secret-downsides',
      },
    ],
    verdict: {
      calibrationThreshold: 0.8,
      calibratedLead:
        'Calibrated. The catalog is loaded — Group 1 plus the House Five. Tomorrow we turn the lens on the wrong answers.',
      repeatLead:
        'Not calibrated. Sleight of Hand is the #1 LR flaw and you almost certainly have not internalized it yet. Re-read the catalog entry, run the new-term-in-the-conclusion check on five fresh stimuli, then come back.',
      nextStep:
        'Next · Day 05 · Trap School — five fast eliminators, four Group 2 distractors, and the Disambiguation Matrix that closes the gap between 80% and 95% on Flaw.',
    },
  },

  /* ─────────────────────────────── DAY 05 ─────────────────────────────── */
  {
    id: 5,
    status: 'ready',
    numeral: 'DAY 05',
    title: 'Trap School',
    subtitle:
      'Five Fast Eliminators · Group 2 distractors · Disambiguation Matrix',
    coachOpener: {
      lead:
        "Day five. You can spot flaws. You can name them. Today you learn what the wrong answers look like, because that's where the points are.",
      followup:
        'Five trap patterns the LSAT writes over and over. Four "famous" flaws (Circular, Internal Contradiction, Equivocation, Inappropriate Appeal) that almost never show up as the right answer but constantly show up as bait. And the ten disambiguation pairs that are responsible for most of the missed Flaw questions in the 165-170 band. This is where 80% becomes 95%.',
    },
    estMinutes: 50,
    outcome:
      'Eliminate two answer choices in under ten seconds by trap-pattern recognition before applying any protocol.',
    calibration: [
      {
        id: 'd5-1',
        kind: 'application',
        prompt:
          'Answer choice: "The argument relies SOLELY on the testimony of a single witness." The stimulus mentioned the witness as one of three pieces of evidence. Which trap pattern?',
        options: [
          { id: 'a', label: '1 · Too Strong' },
          { id: 'b', label: '2 · Bad Match' },
          { id: 'c', label: '5 · Contradicted' },
          { id: 'd', label: '4 · Wrong Flaw' },
        ],
        correct: 'a',
        rationale:
          '"Solely" is the tell. Extreme words (only, solely, merely, always, never, impossible) push the answer beyond what the stimulus says. Even if the witness is mentioned, "solely" overstates the role and kills the answer.',
      },
      {
        id: 'd5-2',
        kind: 'application',
        prompt:
          'Answer choice: "The argument confuses correlation with causation." The stimulus is a conditional logic argument that never mentions correlation or causation. Which trap?',
        options: [
          { id: 'a', label: '1 · Too Strong' },
          { id: 'b', label: '2 · Bad Match' },
          { id: 'c', label: '4 · Wrong Flaw' },
          { id: 'd', label: '5 · Contradicted' },
        ],
        correct: 'c',
        rationale:
          'Wrong Flaw. The label sounds familiar (correlation/causation is famous), so your brain accepts it. But the stimulus is a conditional argument, not a causal one. Verify the flaw is actually committed before selecting. Group 2 distractors live here.',
      },
      {
        id: 'd5-3',
        kind: 'application',
        prompt:
          'Stimulus: "Every player on the championship team is undefeated this season. Therefore, the team is undefeated this season." Disambiguate: which is it?',
        options: [
          { id: 'a', label: 'Sampling' },
          { id: 'b', label: 'Part vs. Whole' },
          { id: 'c', label: 'Causal' },
          { id: 'd', label: 'Sleight of Hand' },
        ],
        correct: 'b',
        rationale:
          "Part-to-whole hierarchy. Each player is undefeated individually, the team's collective record could differ. (Imagine a 50% win-rate team where each individual won at least one game.) Sampling is sample → population, not part → whole. Ask: sample-to-population or part-to-whole?",
        flawSlug: 'part-vs-whole',
      },
      {
        id: 'd5-4',
        kind: 'application',
        prompt:
          'Stimulus: "The bank refused to honor the check. Clearly, the bank does not honor its commitments." Disambiguate Equivocation vs. Sleight of Hand.',
        options: [
          { id: 'a', label: 'Equivocation' },
          { id: 'b', label: 'Sleight of Hand' },
          { id: 'c', label: 'Either is defensible' },
          { id: 'd', label: 'Neither — this is a different flaw' },
        ],
        correct: 'a',
        rationale:
          'The word "honor" is used twice with shifting meaning: refusing to pay a check (financial sense) vs. failing to keep promises (ethical sense). Same word, two meanings. That is Equivocation. Sleight of Hand uses two DIFFERENT words; Equivocation uses the SAME word with shifting meaning.',
        flawSlug: 'equivocation',
      },
      {
        id: 'd5-5',
        kind: 'application',
        prompt:
          'Stimulus: "Three of the five Olympic gold medalists from 2024 trained at the same facility. Therefore, that facility produces the best athletes in the world." Disambiguate Sampling vs. Causal.',
        options: [
          { id: 'a', label: 'Sampling — the sample is too small to support the conclusion' },
          { id: 'b', label: 'Causal — the facility may not be what produced the athletes' },
          { id: 'c', label: 'Both apply equally; pick the one named in the answer choices' },
          { id: 'd', label: 'Neither — this is Part vs. Whole' },
        ],
        correct: 'b',
        rationale:
          "The leap is from a co-occurrence (medalists trained there) to a causal claim (the facility produces the athletes). The athletes might have been world-class before they arrived; the facility might attract talent rather than create it. Causal is the right diagnosis. Sampling would apply if the conclusion were a population claim; here it's a causal claim.",
        flawSlug: 'causal',
      },
    ],
    verdict: {
      calibrationThreshold: 0.8,
      calibratedLead:
        'Calibrated. You can name the trap before testing the answer. Tomorrow is live fire. Bring water.',
      repeatLead:
        'Not calibrated. The Disambiguation Matrix is the highest-leverage drill on this day. Open it, run forced-choice on every row, then re-run.',
      nextStep:
        'Next · Day 06 · Live Fire — five worked walkthroughs, then a mixed-difficulty drill that seeds your spaced-repetition queue.',
    },
  },

  /* ─────────────────────────────── DAY 06 ─────────────────────────────── */
  {
    id: 6,
    status: 'ready',
    numeral: 'DAY 06',
    title: 'Live Fire',
    subtitle:
      'Five worked walkthroughs · mixed calibration · misses seed the spaced-repetition queue',
    coachOpener: {
      lead:
        "Day six. The contract day. Eighty percent on this drill or we run it again. The misses you log here are the flaws you'll see again next week, and the week after, until the spaced-repetition queue is empty.",
      followup:
        "No new lessons today. Five worked walkthroughs to remind you what maximum performance looks like, then eight stimuli with mixed difficulty, mixed flaws, and no scaffolding. Hostile read, formulate the objection, classify the language, run the test, lock the answer. The way you'll do it on test day.",
    },
    estMinutes: 90,
    outcome:
      '≥80% on the live-fire calibration drill. Misses seed your spaced-repetition queue for the weeks ahead.',
    calibration: [
      {
        id: 'd6-1',
        kind: 'application',
        prompt:
          'Stimulus: "Cafeteria patron: The apples sold here are greasy. The cashier said the apples come in that condition and the cafeteria does not wash them. Most fruit is sprayed with dangerous pesticides before harvest, and is dangerous until washed. Clearly, the cafeteria is selling pesticide-covered fruit." Name the flaw.',
        options: [
          { id: 'a', label: 'Sampling — the patron only knows about these apples' },
          { id: 'b', label: 'Sleight of Hand — "greasy" is treated as evidence for "pesticide-covered"' },
          { id: 'c', label: 'Causal — the conclusion picks one cause for the grease' },
          { id: 'd', label: 'Ad Hominem — the cashier might not be reliable' },
        ],
        correct: 'b',
        rationale:
          'Premise establishes that the apples are greasy and that most fruit has pesticides. Conclusion says the apples have pesticides. Grease ≠ pesticides. The author silently equates two different concepts. Classic Sleight of Hand. (PT 17, S2, Q10 territory.)',
        flawSlug: 'sleight-of-hand',
      },
      {
        id: 'd6-2',
        kind: 'application',
        prompt:
          'Stimulus: "On average, animals raised on grain must be fed sixteen pounds of grain to produce one pound of meat. Sixteen pounds of grain could feed many more people. With grain yields leveling off and population expanding, we must accept that consumption of meat will soon be morally unacceptable." Name the flaw.',
        options: [
          { id: 'a', label: 'Causal' },
          { id: 'b', label: 'Sleight of Hand / Value Assumption' },
          { id: 'c', label: 'Sampling' },
          { id: 'd', label: 'Necessary vs. Sufficient' },
        ],
        correct: 'b',
        rationale:
          '"Morally unacceptable" appears in the conclusion. The premises never set up morality. The author treats "doesn\'t feed the most people" as equivalent to "morally unacceptable." That is the dangling-variable move, and because the new term is evaluative, the most precise label is Value Assumption (a specific case of Sleight of Hand). (June 2007, S3, Q21.)',
        flawSlug: 'value-assumptions',
      },
      {
        id: 'd6-3',
        kind: 'application',
        prompt:
          'Stimulus: "A fundamental illusion in robotics is the belief that improvements in robots will liberate humanity from hazardous and demeaning work. Engineers are designing only those types of robots that can be properly maintained with the least expensive, least skilled human labor possible. Therefore, robots will not eliminate demeaning work — only substitute one type of demeaning work for another." Name the flaw.',
        options: [
          { id: 'a', label: 'Value Assumption — "demeaning" is the author\'s judgment, not a fact in evidence' },
          { id: 'b', label: 'Necessary vs. Sufficient' },
          { id: 'c', label: 'Causal' },
          { id: 'd', label: 'Internal Contradiction' },
        ],
        correct: 'a',
        rationale:
          'The premise describes labor as "least expensive, least skilled." The conclusion calls it "demeaning." That is a value judgment, not a description in evidence. Cleaning floors is unskilled and many people find it perfectly fine. The label is the author\'s judgment, not a fact. (PT 16, S2, Q10.)',
        flawSlug: 'value-assumptions',
      },
      {
        id: 'd6-4',
        kind: 'application',
        prompt:
          'Stimulus: "The Volunteers for Literacy Program would benefit if Dolores takes Victor\'s place as director, since Dolores is far more skillful than Victor at securing financial support and Dolores does not have Victor\'s propensity for alienating dedicated volunteers." Name the flaw.',
        options: [
          { id: 'a', label: 'Causal' },
          { id: 'b', label: 'Sampling' },
          { id: 'c', label: 'Sleazy Sales Pitch' },
          { id: 'd', label: 'Sleight of Hand' },
        ],
        correct: 'c',
        rationale:
          "Dolores's strengths and Victor's weaknesses are listed. Dolores's weaknesses and Victor's strengths are nowhere. Classic one-sided pitch. The argument hides half the picture and hopes we don't notice. (PT 16, S2, Q19.)",
        flawSlug: 'sleazy-sales-pitch',
      },
      {
        id: 'd6-5',
        kind: 'application',
        prompt:
          'Stimulus: "The latest Connolly Report suggests Ocksenfrey prepackaged meals are virtually devoid of nutritional value. But the Connolly Report is commissioned by Danto Foods, Ocksenfrey\'s largest corporate rival, and early drafts are submitted for approval to Danto\'s PR department. Because of the obvious bias of this report, it is clear that Ocksenfrey\'s prepackaged meals really are nutritious." Name the flaw.',
        options: [
          { id: 'a', label: 'Ad Hominem only' },
          { id: 'b', label: 'Unproven vs. Proven False — bias makes the report unreliable, not its claim false' },
          { id: 'c', label: 'Equivocation' },
          { id: 'd', label: 'Sampling' },
        ],
        correct: 'b',
        rationale:
          'The author rejects the Connolly Report by attacking the source\'s bias, then concludes the OPPOSITE of what the report says. Even if the report is biased, that does not mean the meals are nutritious. It just means we do not know either way. Showing a witness has an axe to grind does not prove the witness was lying. Best label: Unproven vs. Proven False (with an Ad Hominem move along the way).',
        flawSlug: 'unproven-vs-proven-false',
      },
      {
        id: 'd6-6',
        kind: 'application',
        prompt:
          'Stimulus: "All seasoned trial lawyers can think on their feet. Maya is a seasoned trial lawyer. Therefore, anyone who can think on their feet is a seasoned trial lawyer." Name the flaw.',
        options: [
          { id: 'a', label: 'Necessary vs. Sufficient' },
          { id: 'b', label: 'Part vs. Whole' },
          { id: 'c', label: 'Sleight of Hand' },
          { id: 'd', label: 'Sampling' },
        ],
        correct: 'a',
        rationale:
          '"All seasoned trial lawyers can think on their feet" is sufficient → necessary. The conclusion reverses it. Plenty of people who think on their feet are not seasoned trial lawyers. Maya is a red herring; the structural error is in the conditional reversal.',
        flawSlug: 'necessary-vs-sufficient',
      },
      {
        id: 'd6-7',
        kind: 'application',
        prompt:
          'Stimulus: "A recent survey of subscribers to Adventure Sports Magazine found that 78% had taken at least one extreme-sport vacation in the past year. Therefore, extreme sports are far more popular among the general public than previously believed." Name the flaw.',
        options: [
          { id: 'a', label: 'Causal' },
          { id: 'b', label: 'Sampling' },
          { id: 'c', label: 'Part vs. Whole' },
          { id: 'd', label: 'Inappropriate Appeal' },
        ],
        correct: 'b',
        rationale:
          'The sample (Adventure Sports Magazine subscribers) is unrepresentative of the general public. People who subscribe to Adventure Sports Magazine self-select for an interest in adventure sports. Generalizing from this sample to "the general public" is the textbook Sampling error.',
        flawSlug: 'sampling',
      },
      {
        id: 'd6-8',
        kind: 'application',
        prompt:
          'Stimulus: "Either the company adopts the new safety protocol or it faces a regulatory fine. The company will not face a regulatory fine. Therefore, the company will adopt the new safety protocol AND productivity will increase." Name the flaw.',
        options: [
          { id: 'a', label: 'Necessary vs. Sufficient' },
          { id: 'b', label: 'Sleight of Hand — productivity appears in the conclusion but never in the premises' },
          { id: 'c', label: 'Causal' },
          { id: 'd', label: 'Internal Contradiction' },
        ],
        correct: 'b',
        rationale:
          'The conditional logic part is fine: not-fine therefore protocol is a valid disjunctive syllogism. But "productivity will increase" appears in the conclusion with no premise support whatsoever. The author smuggles in productivity as if it follows from adopting the protocol. It does not. Sleight of Hand.',
        flawSlug: 'sleight-of-hand',
      },
    ],
    verdict: {
      calibrationThreshold: 0.8,
      calibratedLead:
        "Calibrated. You hit the contract. The misses are now in your spaced-repetition queue and you'll see them again at intervals over the coming weeks. The bootcamp closes; the practice continues.",
      repeatLead:
        'Not yet at 80%. The misses are in the SR queue, the catalog is loaded, and Day 06 is fully re-runnable. Most students need two passes at the live-fire drill. The contract is not optional, but it is not a deadline either. Take the day, then come back.',
      nextStep:
        'Bootcamp complete. Spaced-repetition queue active. Open the catalog or browse the drill suite for ongoing practice.',
    },
  },
];

export function getDay(id: DayId): BootcampDay {
  const day = BOOTCAMP_DAYS.find((d) => d.id === id);
  if (!day) throw new Error(`Bootcamp day ${id} not defined`);
  return day;
}
