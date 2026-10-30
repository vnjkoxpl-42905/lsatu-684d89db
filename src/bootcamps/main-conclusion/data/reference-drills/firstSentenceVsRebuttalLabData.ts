// Generated from public/references/bootcamps/first-sentence-vs-rebuttal/index.html. Preserve HTML drill wording, flow copy, and review explanations.

export type FirstSentenceVsRebuttalStructureType = 'first' | 'rebuttal';
export type FirstSentenceVsRebuttalRole = 'conclusion' | 'support' | 'opposing' | 'neutral';
export type FirstSentenceVsRebuttalQuestionStatus = 'clean' | 'recovered' | 'assisted';

export interface FirstSentenceVsRebuttalPart {
  id: string;
  text: string;
  role: FirstSentenceVsRebuttalRole;
}

export interface FirstSentenceVsRebuttalReviewExplanation {
  title: string;
  whyConclusion: string;
  whyStructure: string;
  whyFollowUp: string;
}

export interface FirstSentenceVsRebuttalQuestion {
  id: number;
  type: FirstSentenceVsRebuttalStructureType;
  parts: FirstSentenceVsRebuttalPart[];
  feedback: string;
  review: FirstSentenceVsRebuttalReviewExplanation;
  indicatorCount: number;
  /**
   * The single part the student must select on Step 4 (the "cleanest"
   * supporting claim or the opposing view the review prose names). When a
   * question has more than one part sharing the follow-up role, the grader
   * would otherwise demand all of them, contradicting the explanation, which
   * always points at one. Set this to the designated answer's part id.
   * Omit it when the follow-up role has exactly one part (nothing to
   * disambiguate) — the grader falls back to that single part.
   */
  followUpId?: string;
}

export interface FirstSentenceVsRebuttalAttemptStep {
  wrong: number;
}

export interface FirstSentenceVsRebuttalAttemptLog {
  indicators: FirstSentenceVsRebuttalAttemptStep;
  conclusion: FirstSentenceVsRebuttalAttemptStep;
  structure: FirstSentenceVsRebuttalAttemptStep;
  support: FirstSentenceVsRebuttalAttemptStep;
  usedIndicatorReveal: boolean;
  solvedClean: boolean;
  completionStatus: FirstSentenceVsRebuttalQuestionStatus;
}

export interface FirstSentenceVsRebuttalSessionRecord {
  questionOrder: number[];
  completedQuestionIds: number[];
  currentQuestionIndex: number;
  attempts: Record<number, FirstSentenceVsRebuttalAttemptLog>;
  completedAt: string | null;
}

/**
 * The role Step 4 should ask the student to select.
 * First-sentence arguments ask for the supporting claim(s); rebuttals ask for the
 * opposing viewpoint(s). Rebuttal questions are written with a standalone
 * opposing part so the final role step always asks for the rebuttal target.
 */
export function firstSentenceVsRebuttalFollowUpRole(
  question: FirstSentenceVsRebuttalQuestion,
): Extract<FirstSentenceVsRebuttalRole, 'support' | 'opposing'> {
  if (question.type === 'first') return 'support';
  const hasOpposing = question.parts.some((part) => part.role === 'opposing');
  return hasOpposing ? 'opposing' : 'support';
}

/**
 * The part id(s) the student must select to finish Step 4 for this question.
 * When `followUpId` is set, that single designated part is the answer (matches
 * the review prose, which always names one "cleanest" follow-up). Otherwise the
 * follow-up role has a single part and we grade against it.
 */
export function firstSentenceVsRebuttalFollowUpIds(question: FirstSentenceVsRebuttalQuestion): string[] {
  if (question.followUpId) {
    // Trust the explicit answer only if it still exists on the question.
    const designated = question.parts.find((part) => part.id === question.followUpId);
    if (designated) return [designated.id];
  }
  const role = firstSentenceVsRebuttalFollowUpRole(question);
  return question.parts.filter((part) => part.role === role).map((part) => part.id);
}

export function normalizeFirstSentenceVsRebuttalStimulus(text: string) {
  return text
    .replace(/<i-w t="[^"]+">([^<]+)<\/i-w>/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

export function createDefaultFirstSentenceVsRebuttalAttemptLog(): FirstSentenceVsRebuttalAttemptLog {
  return {
    indicators: { wrong: 0 },
    conclusion: { wrong: 0 },
    structure: { wrong: 0 },
    support: { wrong: 0 },
    usedIndicatorReveal: false,
    solvedClean: true,
    completionStatus: 'clean',
  };
}

export function createEmptyFirstSentenceVsRebuttalSessionRecord(): FirstSentenceVsRebuttalSessionRecord {
  return {
    questionOrder: FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.map((question) => question.id),
    completedQuestionIds: [],
    currentQuestionIndex: 0,
    attempts: {},
    completedAt: null,
  };
}

export const FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS: FirstSentenceVsRebuttalQuestion[] = [
  {
    "id": 1,
    "type": "first",
    "followUpId": "p2",
    "parts": [
      {
        "id": "p1",
        "text": "The vision test for obtaining a driver's license <i-w t=\"Opinion Indicator\">should</i-w> not be limited to measuring the adequacy of vision in daylight conditions, as is the current practice. ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "Many people whose daylight vision is adequate have night vision that is inadequate for safe night driving. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "Most car accidents occur at night, and inadequate vision plays a role in 80 percent of these accidents.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The recommendation is stated immediately, and the rest of the paragraph supports it. Follow-up: many people with adequate daylight vision have inadequate night vision.",
    "review": {
      "title": "Vision test, night driving",
      "whyConclusion": "The author opens with a 'should.' That's not data, that's a verdict. Everything after it is the reason. When the first sentence already sounds like an opinion, your job is to check whether the rest of the paragraph is feeding it. It is. Conclusion = sentence 1.",
      "whyStructure": "First-sentence. No opposing view gets named here, nobody is being rebutted. The author has a take, drops it on the table, and props it up with facts about night vision. Classic First-sentence layout.",
      "whyFollowUp": "The supporting fact is the gap the author wants you to feel. Daylight tests pass people whose night vision is dangerous. That's the wedge that justifies the recommendation. The accident statistic is also support, but the night-vision sentence is the cleanest piece."
    },
    "indicatorCount": 1
  },
  {
    "id": 2,
    "type": "first",
    "followUpId": "p2",
    "parts": [
      {
        "id": "p1",
        "text": "Policy Adviser: Freedom of speech is not only a basic human right; it is also the only rational policy for this government to adopt. ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "When ideas are openly aired, good ideas flourish, silly proposals are easily recognized as such, and dangerous ideas can be responded to by rational argument. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "Nothing is ever gained by forcing citizens to disseminate their thoughts in secret.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The policy judgment comes first; the later claims justify it. Follow-up: when ideas are openly aired, good ones flourish and silly ones are exposed.",
    "review": {
      "title": "Freedom of speech",
      "whyConclusion": "'The only rational policy' is the move. Anytime an author calls something the only anything, that's the opinion. Everything underneath is them telling you why they think so. Conclusion = sentence 1.",
      "whyStructure": "First-sentence. No one is being rebutted, no critic is in the room. The Policy Adviser states a position and then defends it with examples of what open speech actually does. First-sentence family.",
      "whyFollowUp": "The flourishing-ideas sentence is the engine. It's the author saying, here's the mechanism that makes free speech rational, not just a right. That's why it's the supporting claim."
    },
    "indicatorCount": 0
  },
  {
    "id": 3,
    "type": "first",
    "followUpId": "p3",
    "parts": [
      {
        "id": "p1",
        "text": "Arguing that there was no trade between Europe and East Asia in the early Middle Ages <i-w t=\"Premise Indicator\">because</i-w> there are no written records of such trade is like arguing that the yeti, an apelike creature supposedly existing in the Himalayas, does not exist <i-w t=\"Premise Indicator\">because</i-w> there have been no scientifically confirmed sightings. ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "A verifiable sighting of the yeti would prove that the creature does exist, ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Pivot\">but</i-w> the absence of sightings cannot prove that it does not.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The analogy claim is stated first; the second sentence supports it. Follow-up: the absence of sightings cannot prove the yeti does not exist.",
    "review": {
      "title": "Europe-Asia trade and the yeti",
      "whyConclusion": "The author is comparing one bad argument to another bad argument. That comparison itself is the point. The yeti sentence isn't background, it's the move. 'Arguing X is like arguing Y' is the conclusion structure.",
      "whyStructure": "First-sentence. The analogy lands immediately. The second sentence defends the analogy by explaining why absence of evidence isn't evidence of absence. Nobody is being rebutted here, the author is making their own affirmative case.",
      "whyFollowUp": "'The absence of sightings cannot prove that it does not' is the load-bearing piece. It's the reason the analogy works. Without it, the comparison falls apart."
    },
    "indicatorCount": 3
  },
  {
    "id": 4,
    "type": "first",
    "followUpId": "p2",
    "parts": [
      {
        "id": "p1",
        "text": "No computer will ever be able to do everything that some human minds can do, ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Premise Indicator\">for</i-w> there are some problems that cannot be solved by following any set of mechanically applicable rules. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Pivot\">Yet</i-w> computers can only solve problems by following some set of mechanically applicable rules.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The conclusion appears first. 'For' introduces the support, and the final sentence adds more. Follow-up: there are some problems that cannot be solved by following any set of mechanically applicable rules.",
    "review": {
      "title": "Computers and human minds",
      "whyConclusion": "The author makes a flat claim about what computers will never do, and then 'for' announces the reason. Conclusion is the front half. 'For' and 'yet' both flag support.",
      "whyStructure": "First-sentence. No opposing view, no critic, just a claim and two reasons. The 'yet' looks like a pivot but it's actually pivoting between two supporting facts, not between a critic and the author.",
      "whyFollowUp": "The mechanical-rules sentence is the wedge. It says there's a category of problems no rule-following system can touch, which is exactly why computers can't catch up to human minds."
    },
    "indicatorCount": 2
  },
  {
    "id": 5,
    "type": "first",
    "followUpId": "p5",
    "parts": [
      {
        "id": "p1",
        "text": "Consumer advocate: The toy-labeling law <i-w t=\"Opinion Indicator\">should</i-w> require manufacturers to provide explicit safety labels on toys to indicate what hazards the toys pose. ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "The only labels currently required by law are labels indicating the age range for which a toy is intended. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "For instance, a \"three and up\" label is required on toys that pose a choking hazard for children under three years of age. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "<i-w t=\"Concession Indicator\">Although</i-w> the current toy-labeling law has indeed reduced the incidence of injuries to children from toys, ",
        "role": "opposing"
      },
      {
        "id": "p5",
        "text": "parents could prevent such injuries almost entirely if toy labels provided explicit safety information.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The recommendation comes right away; later sentences provide background, example, concession, and support. Follow-up: parents could prevent such injuries if labels provided explicit safety information.",
    "review": {
      "title": "Toy-labeling law",
      "whyConclusion": "'Should require' in sentence 1. That's a prescriptive verdict, full stop. Everything after it is context, example, conceded counterpoint, then a final push of support. The conclusion is the rec, and it's sitting right at the start.",
      "whyStructure": "First-sentence. The 'Although' clause looks like a rebuttal hook but it isn't, it's just the author saying 'yes the current law helps a little, but we can do better.' That's a concession inside a first-sentence argument, not a rebuttal.",
      "whyFollowUp": "The 'parents could prevent such injuries' sentence is the close. It tells you why the current law isn't enough and the new requirement matters. That's the cleanest piece of support."
    },
    "indicatorCount": 2
  },
  {
    "id": 6,
    "type": "first",
    "followUpId": "p2",
    "parts": [
      {
        "id": "p1",
        "text": "It is inaccurate to say that a diet high in refined sugar cannot cause adult-onset diabetes, ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Premise Indicator\">since</i-w> a diet high in refined sugar can make a person overweight, ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "and being overweight can predispose a person to adult-onset diabetes.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The main clause is the conclusion; the 'since' clause gives the support. Follow-up: a diet high in refined sugar can make a person overweight.",
    "review": {
      "title": "Sugar and diabetes",
      "whyConclusion": "Two clauses, one sentence. The first half is the verdict (saying X is inaccurate), the second half explains why. 'Since' tells you the support side. Conclusion is the main clause.",
      "whyStructure": "First-sentence. There's no critic on stage. The author is rebutting an idea ('that sugar cannot cause diabetes'), sure, but they're doing it as their own claim, not as a response to a named opponent. First-sentence family.",
      "whyFollowUp": "The overweight link. That's step one of the chain. Sugar makes you overweight, overweight makes you diabetic. The supporting claim is the first link in that chain."
    },
    "indicatorCount": 1
  },
  {
    "id": 7,
    "type": "first",
    "followUpId": "p2",
    "parts": [
      {
        "id": "p1",
        "text": "Legal theorist: It is unreasonable to incarcerate anyone for any other reason than that he or she is a serious threat to the property or lives of other people. ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "The breaking of a law does not justify incarceration, ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Premise Indicator\">for</i-w> lawbreaking proceeds either from ignorance of the law or of the effects of one's actions, or from the free choice on the part of the lawbreaker. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "Obviously mere ignorance cannot justify incarcerating a lawbreaker, and even free choice on the part of the lawbreaker fails to justify incarceration, ",
        "role": "support"
      },
      {
        "id": "p5",
        "text": "<i-w t=\"Premise Indicator\">for</i-w> free choice proceeds from the desires of an agent, and the desires of an agent are products of genetics and environmental conditioning, neither of which is controlled by the agent.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The broad claim is sentence 1; later sentences build a support chain underneath it, including an intermediate conclusion. Follow-up: the breaking of a law does not justify incarceration.",
    "review": {
      "title": "Legal theorist on incarceration",
      "whyConclusion": "Big opinion in sentence 1: 'It is unreasonable.' Everything after that is the theorist building the chain of reasons. Conclusion = sentence 1.",
      "whyStructure": "First-sentence. The theorist has a position and then walks down it. There's an intermediate conclusion sitting in the middle ('the breaking of a law does not justify incarceration'), but the main verdict is still the opener.",
      "whyFollowUp": "The breaking-of-a-law sentence. That's the intermediate conclusion, which makes it the cleanest single supporting claim for the main one. Everything below it props it up, and it props up the top."
    },
    "indicatorCount": 2
  },
  {
    "id": 8,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "Nylon industry spokesperson: <i-w t=\"Concession Indicator\">Even though</i-w> cotton and nylon are used for similar purposes, <i-w t=\"Opposing Viewpoint\">some people say</i-w> cotton is natural but nylon is not. ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Pivot\">However</i-w>, nylon's main components come from petroleum and from the nitrogen in the atmosphere. ",
        "role": "conclusion"
      },
      {
        "id": "p3",
        "text": "Clearly the atmosphere is natural. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "And petroleum comes from oil, which in turn comes from ancient plants—a natural source.",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The first sentence sets up the mistaken view; 'However' introduces the author's actual position. Follow-up: some people say cotton is natural but nylon is not.",
    "review": {
      "title": "Nylon spokesperson",
      "whyConclusion": "Sentence 1 sets up the mistaken belief. 'However' announces the spokesperson's actual claim. The conclusion is the 'However' sentence, full stop. Whenever 'however' shows up right after a 'some people think,' you've found the rebuttal verdict.",
      "whyStructure": "Rebuttal. The opposing view is named in sentence 1 (the claim about nylon and cotton). The author pivots and says no, here's what nylon actually is. Then they back it up. Pure rebuttal pattern.",
      "whyFollowUp": "The view being rejected is the cotton/nylon mistaken-notion line. That's the position the author is pushing against, and what the follow-up question is asking for."
    },
    "indicatorCount": 3
  },
  {
    "id": 9,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "Mayor McKinney's policies have often been criticized on the grounds that they benefit only wealthy city residents, ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Pivot\">but</i-w> that is not a fair evaluation. ",
        "role": "conclusion"
      },
      {
        "id": "p3",
        "text": "Some of McKinney's policies have clearly benefited the city's less affluent residents. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "McKinney actively supported last year's proposal to lower the city's high property taxes. ",
        "role": "support"
      },
      {
        "id": "p5",
        "text": "<i-w t=\"Premise Indicator\">Because</i-w> of this tax decrease, more development is taking place in the city, helping to end the housing shortage and stabilize the rents in the city.",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The criticism comes first; the author pushes back with 'but that is not a fair evaluation.' Follow-up: critics say McKinney's policies benefit only wealthy residents.",
    "review": {
      "title": "Mayor McKinney",
      "whyConclusion": "The critics get the front half of the sentence. The author gets the back half: 'that is not a fair evaluation.' That's the conclusion. Tiny, blunt, sitting right after the pivot.",
      "whyStructure": "Rebuttal. Critics named first ('have often been criticized'), author flips with 'but,' then defends the flip with examples. The structure could not be more textbook rebuttal.",
      "whyFollowUp": "The opposing view is the criticism: McKinney's policies benefit only wealthy residents. The author is rejecting exactly that, and the follow-up wants you to name it."
    },
    "indicatorCount": 2
  },
  {
    "id": 10,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "<i-w t=\"Opposing Viewpoint\">Some people say</i-w> legislators should refuse to commit public funds for new scientific research if they cannot be assured that the research will contribute to the public welfare. ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "Such a position ignores the lessons of experience. ",
        "role": "conclusion"
      },
      {
        "id": "p3",
        "text": "Many important contributions to the public welfare that resulted from scientific research were never predicted as potential outcomes of that research. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "Suppose that a scientist in the early twentieth century had applied for public funds to study molds: who would have predicted that such research would lead to the discovery of antibiotics—one of the greatest contributions ever made to the public welfare?",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The first sentence presents a position; the second rejects it. Follow-up: the position that public funds shouldn't be committed without assurance of public-welfare benefit.",
    "review": {
      "title": "Legislators and scientific research",
      "whyConclusion": "'Such a position ignores the lessons of experience.' That's the rebuttal verdict. Short, mean, and pointed at sentence 1. Conclusion = sentence 2.",
      "whyStructure": "Rebuttal. A position is described in sentence 1. The author rejects that position in sentence 2. Then they tell you why with the antibiotics illustration. Even though there's no 'however' or 'but,' the rebuttal shape is unmistakable.",
      "whyFollowUp": "The opposing view is that legislators should refuse to fund unguaranteed research. That's what 'such a position' refers to, and that's what the author is attacking."
    },
    "indicatorCount": 1
  },
  {
    "id": 11,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "Letter to the editor: I was shocked to learn that Judge Mosston was convicted of criminal assault, ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Pivot\">but</i-w> I disagree with my fellow citizens who believe that he should be forced to resign. ",
        "role": "conclusion"
      },
      {
        "id": "p3",
        "text": "I have played cards with Judge Mosston for many years, and he has always shown himself to be fair toward me and our fellow cardplayers. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "Our judicial system simply cannot afford to lose any just and fair judges.",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The first clause is concession/background; the real point comes after 'but.' Follow-up: the fellow citizens' view that Judge Mosston should be forced to resign.",
    "review": {
      "title": "Letter to the editor about Judge Mosston",
      "whyConclusion": "'But I disagree' is the move. Front half is the author setting the table (shock at the conviction), back half after 'but' is the actual point: don't make him resign. Conclusion sits in the second half of sentence 1.",
      "whyStructure": "Rebuttal. The opposing view is named ('my fellow citizens who believe he should resign') and the author pushes back. Concession in the first clause, conclusion in the second.",
      "whyFollowUp": "The view the author is rejecting is the fellow citizens' position: that Mosston should be forced to resign. That's the rebuttal target."
    },
    "indicatorCount": 1
  },
  {
    "id": 12,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "<i-w t=\"Opposing Viewpoint\">Some people say</i-w> that witnessing violence in movies will discharge aggressive energy. ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "Does watching someone else eat fill one's own stomach? ",
        "role": "conclusion"
      },
      {
        "id": "p3",
        "text": "The viewer remains hungry no matter how vivid the scene is.",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The second sentence is a rhetorical-question rebuttal of the first sentence's view, and the final sentence supports the analogy. Follow-up: the view that witnessing movie violence discharges aggressive energy.",
    "review": {
      "title": "Movie violence",
      "whyConclusion": "The conclusion is a question. Yes, really. The rhetorical question ('Does watching someone else eat fill one's own stomach?') is the author's rebuttal. The expected answer is no, and that's what the author wants you to hear.",
      "whyStructure": "Rebuttal. The first sentence is the view being attacked ('Some people say'). The second sentence is the attack. The final sentence backs up the analogy instead of introducing a new conclusion.",
      "whyFollowUp": "The opposing view is the catharsis claim: violent movies discharge aggression. That's the target the rhetorical question is mocking."
    },
    "indicatorCount": 1
  },
  {
    "id": 13,
    "type": "rebuttal",
    "followUpId": "p1",
    "parts": [
      {
        "id": "p1",
        "text": "Behind the hope that computers can replace teachers is the idea that the student's understanding of the subject being taught consists in knowing facts and rules, the job of a teacher being to make the facts and rules explicit and convey them to the student, either by practice drills or by coaching. ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "If that were indeed the way the mind works, the teacher could transfer facts and rules to the computer, which would replace the teacher as drillmaster and coach. ",
        "role": "opposing"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Pivot\">But</i-w> <i-w t=\"Premise Indicator\">since</i-w> understanding does not consist merely of knowing facts and rules, but of the grasp of the general concepts underlying them, ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "the hope that the computer will eventually replace the teacher is fundamentally misguided.",
        "role": "conclusion"
      }
    ],
    "feedback": "Rebuttal. The paragraph explains the hope being criticized; the final sentence rejects it. Follow-up: the hope that computers can replace teachers.",
    "review": {
      "title": "Computers replacing teachers",
      "whyConclusion": "Last sentence. 'The hope is fundamentally misguided.' That's the verdict. Everything before it sets up the hope being criticized so the author can knock it down at the end.",
      "whyStructure": "Rebuttal. The whole first half is the opposing position (the hope). Then 'But since' pivots. Then the final clause delivers the verdict. The author wrote the opposing view themselves, in detail, just to wreck it.",
      "whyFollowUp": "The view being rejected is the hope itself: that computers can replace teachers. That's what the entire paragraph is dismantling."
    },
    "indicatorCount": 2
  },
  {
    "id": 14,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "So-called environmentalists have argued that the proposed Golden Lake Development would interfere with bird-migration patterns. ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Pivot\">However</i-w>, the fact that these same people have raised environmental objections to virtually every development proposal brought before the council in recent years indicates that their expressed concern for bird migration patterns is nothing but a mask for their antidevelopment, antiprogress agenda. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "Their claim, <i-w t=\"Conclusion Indicator\">therefore</i-w>, <i-w t=\"Opinion Indicator\">should</i-w> be dismissed without further consideration.",
        "role": "conclusion"
      }
    ],
    "feedback": "Rebuttal. The opposing claim is introduced first; the author attacks it, then reaches the final dismissal. Follow-up: environmentalists' claim that the development would interfere with bird-migration patterns.",
    "review": {
      "title": "Golden Lake Development",
      "whyConclusion": "'Their claim, therefore, should be dismissed.' Last sentence. 'Therefore' is doing exactly what it usually does, marking the verdict.",
      "whyStructure": "Rebuttal. Environmentalists' claim in sentence 1. Author's attack in sentence 2 (the pattern argument). Final verdict in sentence 3. Classic three-part rebuttal.",
      "whyFollowUp": "The view being rejected is the environmentalists' bird-migration claim. That's the position 'their claim' points back at."
    },
    "indicatorCount": 3
  },
  {
    "id": 15,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "That long-term cigarette smoking can lead to health problems including cancer and lung disease is a scientifically well-established fact. ",
        "role": "support"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Opposing Viewpoint\">Some people say</i-w> tobacco companies should be held either morally or legally responsible for the poor health of smokers. ",
        "role": "opposing"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Pivot\">However</i-w>, it is not necessary to deny the health risks of smoking in order to reject that view. ",
        "role": "conclusion"
      },
      {
        "id": "p4",
        "text": "<i-w t=\"Premise Indicator\">After all</i-w>, excessive consumption of candy undeniably leads to such health problems as tooth decay, ",
        "role": "support"
      },
      {
        "id": "p5",
        "text": "but no one seriously believes that candy eaters who get cavities should be able to sue candy manufacturers.",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The first sentence is background fact; the second sentence gives the opposing view, and the 'However' sentence rejects it. Follow-up: the view that tobacco companies should be held morally or legally responsible for smokers' poor health.",
    "review": {
      "title": "Cigarettes and tobacco companies",
      "whyConclusion": "The conclusion is the 'However' sentence: it is not necessary to deny the health risks of smoking in order to reject tobacco-company liability. The candy stuff at the end is the analogy support.",
      "whyStructure": "Rebuttal. The opposing view is named in sentence 2. The author then pivots with 'However' and rejects that popular view. Background fact in sentence 1, rebuttal conclusion in sentence 3, analogy in the rest.",
      "whyFollowUp": "The view being rejected is the popular position: that tobacco companies should be held morally or legally responsible for smokers' poor health. That's the target."
    },
    "indicatorCount": 3
  },
  {
    "id": 16,
    "type": "rebuttal",
    "followUpId": "p1",
    "parts": [
      {
        "id": "p1",
        "text": "Patient: Pharmacists maintain that doctors should not be permitted to sell the medicine that they prescribe ",
        "role": "opposing"
      },
      {
        "id": "p2",
        "text": "<i-w t=\"Premise Indicator\">because</i-w> doctors would then be tempted to prescribe unnecessary medicines in order to earn extra income. ",
        "role": "opposing"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Pivot\">But</i-w> pharmacists have a financial interest in having a monopoly on the sale of prescription medicines, ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "<i-w t=\"Conclusion Indicator\">so</i-w> their objection to the sale of medicines by doctors cannot be taken seriously.",
        "role": "conclusion"
      }
    ],
    "feedback": "Rebuttal. The pharmacists' position is introduced first; the author then pivots and rejects it. Follow-up: pharmacists' position that doctors should not be permitted to sell the medicine they prescribe.",
    "review": {
      "title": "Patient on pharmacists",
      "whyConclusion": "Last clause. 'Their objection cannot be taken seriously.' That's the patient's verdict. 'So' announces it, like it usually does.",
      "whyStructure": "Rebuttal. Pharmacists' position first. Author's pivot ('But'). Author's reason. Author's verdict. The opposing view is named, supported, then knocked down by turning its own logic back on it.",
      "whyFollowUp": "The opposing view is the pharmacists' position: doctors shouldn't be allowed to sell what they prescribe. That's what the patient is rejecting."
    },
    "indicatorCount": 3
  },
  {
    "id": 17,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "Broadcaster: Our radio station has a responsibility to serve the public interest. ",
        "role": "support"
      },
      {
        "id": "p2",
        "text": "When our critics contend that our recent exposé of events in the private lives of local celebrities was excessively intrusive, ",
        "role": "opposing"
      },
      {
        "id": "p3",
        "text": "we can only reply that the overwhelming public interest in these matters makes it our responsibility to publicize them.",
        "role": "conclusion"
      }
    ],
    "feedback": "Rebuttal. The station's duty is the principle; the real conclusion is the reply to the critics. Follow-up: critics' contention that the exposé was excessively intrusive.",
    "review": {
      "title": "Broadcaster on the exposé",
      "whyConclusion": "'We can only reply that' is the move. Last clause is the reply, which is the actual verdict. The duty principle in sentence 1 isn't the conclusion, it's the support.",
      "whyStructure": "Rebuttal. Critics named explicitly ('our critics contend'). Author replies. That's the rebuttal pattern, even if the broadcaster opens with a principle instead of opening with the critics.",
      "whyFollowUp": "The view being rejected is the critics' contention that the exposé was excessively intrusive. That's the position the broadcaster is replying to."
    },
    "indicatorCount": 0
  },
  {
    "id": 18,
    "type": "rebuttal",
    "parts": [
      {
        "id": "p1",
        "text": "The fire that destroyed the Municipal Building started before dawn this morning, and the last fire fighters did not leave until late this afternoon. ",
        "role": "support"
      },
      {
        "id": "p2",
        "text": "No one could have been anywhere in the vicinity of a fire like that one and fail to notice it. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "Thomas must have seen it, ",
        "role": "conclusion"
      },
      {
        "id": "p4",
        "text": "whatever he now says to the contrary. ",
        "role": "opposing"
      },
      {
        "id": "p5",
        "text": "He admits that, as usual, he went from his apartment to the library this morning, and there is no way for him to get from his apartment to the library without going past the Municipal Building.",
        "role": "support"
      }
    ],
    "feedback": "Rebuttal. The conclusion explicitly pushes against Thomas's contrary position. Follow-up: whatever he now says to the contrary.",
    "review": {
      "title": "The fire and Thomas",
      "whyConclusion": "'Thomas must have seen it.' That's the move. The sentence is the author's verdict, and 'whatever he now says to the contrary' makes it explicitly a rebuttal of Thomas's own denial.",
      "whyStructure": "Rebuttal. This one is sneaky because no critic is named with a clean 'some people' phrase. The opposing view is Thomas himself. The author is pushing against Thomas's denial. That makes it rebuttal.",
      "whyFollowUp": "The view being rejected is whatever Thomas now says to the contrary. That's the contrary position the author is rejecting."
    },
    "indicatorCount": 0
  },
  {
    "id": 19,
    "type": "first",
    "followUpId": "p2",
    "parts": [
      {
        "id": "p1",
        "text": "There is no mystery as to why figurative painting revived in the late 1970s. ",
        "role": "conclusion"
      },
      {
        "id": "p2",
        "text": "People want to look at recognizable images. ",
        "role": "support"
      },
      {
        "id": "p3",
        "text": "Sorting out art theories reflected in abstract paintings is no substitute for the sense of empathy that comes from looking at a realistic painting of a figure in a landscape. ",
        "role": "support"
      },
      {
        "id": "p4",
        "text": "Perhaps members of the art-viewing public resented abstract art <i-w t=\"Premise Indicator\">because</i-w> they felt that its lack of realistic subject matter was a rejection of the viewers and their world.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The author's evaluative point comes first; the rest explains it. Follow-up: people want to look at recognizable images.",
    "review": {
      "title": "Figurative painting",
      "whyConclusion": "'There is no mystery as to why' is the verdict. Confident, top-of-paragraph, the author telling you they have the answer. The rest is the author explaining what the non-mystery is.",
      "whyStructure": "First-sentence. No critic, no opposing view, no rebuttal hook. The author drops a confident claim and then walks you through the reasons. First-sentence family.",
      "whyFollowUp": "The clearest supporting claim is the recognizable-images line. That's the engine, the actual mechanism the author is pointing to."
    },
    "indicatorCount": 1
  },
  {
    "id": 20,
    "type": "first",
    "followUpId": "p1",
    "parts": [
      {
        "id": "p1",
        "text": "<i-w t=\"Premise Indicator\">Since</i-w> multinational grain companies operate so as to maximize profits, ",
        "role": "support"
      },
      {
        "id": "p2",
        "text": "they cannot be relied on to initiate economic changes that would reform the world's food-distribution system. ",
        "role": "conclusion"
      },
      {
        "id": "p3",
        "text": "<i-w t=\"Concession Indicator\">Although</i-w> it is true that the actions of multinational companies sometimes do result in such economic change, ",
        "role": "opposing"
      },
      {
        "id": "p4",
        "text": "this result is incidental, arising not from the desire for reform <i-w t=\"Pivot\">but</i-w> from the desire to maximize profits. ",
        "role": "support"
      },
      {
        "id": "p5",
        "text": "The maximization of profits normally depends on a stable economic environment, one that discourages change.",
        "role": "support"
      }
    ],
    "feedback": "First-sentence. The sentence opens with support, but the main clause is still the conclusion. Follow-up: multinational grain companies operate so as to maximize profits.",
    "review": {
      "title": "Multinational grain companies",
      "whyConclusion": "Conclusion is in the middle. After the 'Since...' clause, the actual claim is 'they cannot be relied on to initiate economic changes.' That's the main verdict. The 'although' that follows is a concession, not the conclusion.",
      "whyStructure": "First-sentence. The sentence opens with support ('Since...'), but the conclusion still arrives early and the rest of the paragraph defends it. The author isn't rebutting a named opponent, they're making their own affirmative case. First-sentence family.",
      "whyFollowUp": "The supporting claim is the profit-maximization premise. That's the 'Since...' clause, and it's the whole reason the author thinks reform won't come from these companies."
    },
    "indicatorCount": 3
  }
];
