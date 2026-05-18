export interface Drill {
  id: string;
  name: string;
  stimulus: string;
  conclusionText: string;
  supportText: string;
  questions: {
    conclusion: {
      prompt: string;
      options: string[];
      correctAnswer: string;
      feedback: Record<string, string>;
    };
    support: {
      prompt: string;
      options: string[];
      correctAnswer: string;
      feedback: Record<string, string>;
    };
    gap: {
      prompt: string;
      options: string[];
      correctAnswer: string;
      feedback: Record<string, string>;
    };
    answer: {
      prompt: string;
      options: string[];
      correctAnswer: string;
      feedback: Record<string, string>;
    };
  };
}

export const DRILLS: Drill[] = [
  {
    id: 'unproven-vs-proven-false',
    name: 'Unproven vs. Proven False',
    stimulus: "Despite years of investigation, safety inspectors have found no conclusive evidence that the old highway bridge is structurally unsound. Therefore, we can rest assured that the bridge is perfectly safe for daily commuter traffic.",
    conclusionText: "the bridge is perfectly safe for daily commuter traffic.",
    supportText: "safety inspectors have found no conclusive evidence that the old highway bridge is structurally unsound.",
    questions: {
      conclusion: {
        prompt: "What is the author trying to prove?",
        options: [
          'Safety inspectors have investigated the bridge for years.',
          'The bridge is perfectly safe for daily commuter traffic.',
          'There is no conclusive evidence that the bridge is unsound.'
        ],
        correctAnswer: 'The bridge is perfectly safe for daily commuter traffic.',
        feedback: {
          'Safety inspectors have investigated the bridge for years.': "Incorrect. This is just background context, not the final takeaway.",
          'The bridge is perfectly safe for daily commuter traffic.': "Correct! The author makes a definitive leap to conclude the bridge is safe.",
          'There is no conclusive evidence that the bridge is unsound.': "Incorrect. This is the premise (evidence), not the conclusion it's trying to support."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'The bridge is used for daily commuter traffic.',
          'Safety inspectors have found no conclusive evidence that the old highway bridge is structurally unsound.',
          'Bridges require constant maintenance to remain safe.'
        ],
        correctAnswer: 'Safety inspectors have found no conclusive evidence that the old highway bridge is structurally unsound.',
        feedback: {
          'The bridge is used for daily commuter traffic.': "Incorrect. This is just what the bridge is used for, not evidence of its safety.",
          'Safety inspectors have found no conclusive evidence that the old highway bridge is structurally unsound.': "Correct! This lack of evidence is precisely what the author uses to support the claim of safety.",
          'Bridges require constant maintenance to remain safe.': "Incorrect. This is not stated in the stimulus at all."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the safety inspectors didn\'t have the right equipment or the bridge just hasn\'t collapsed *yet*?',
          'What if the bridge is closed for repairs during the summer?',
          'What if many commuters actually prefer taking the train instead of driving?'
        ],
        correctAnswer: 'What if the safety inspectors didn\'t have the right equipment or the bridge just hasn\'t collapsed *yet*?',
        feedback: {
          'What if the safety inspectors didn\'t have the right equipment or the bridge just hasn\'t collapsed *yet*?': "Correct! The author assumes that because we haven't PROVEN the bridge is dangerous, it must automatically be safe. Absence of evidence is not evidence of safety.",
          'What if the bridge is closed for repairs during the summer?': "Incorrect. This doesn't attack the logic bridging \"lack of evidence\" to \"perfect safety\".",
          'What if many commuters actually prefer taking the train instead of driving?': "Incorrect. Commuter preference is irrelevant to whether the bridge is safe or structurally unsound."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Treats a failure to prove a claim is true as proof that the claim is false.',
          'Assumes without warrant that what is true of each member of a group is true of the group as a whole.',
          'Confuses a condition that is sufficient to guarantee an outcome with a condition that is necessary.'
        ],
        correctAnswer: 'Treats a failure to prove a claim is true as proof that the claim is false.',
        feedback: {
          'Treats a failure to prove a claim is true as proof that the claim is false.': "Correct! The author says: We failed to prove it structurally unsound (true), so it must be structurally sound/safe (false).",
          'Assumes without warrant that what is true of each member of a group is true of the group as a whole.': "Incorrect. This is the Part vs. Whole fallacy, which deals with group traits, not absence of evidence.",
          'Confuses a condition that is sufficient to guarantee an outcome with a condition that is necessary.': "Incorrect. This describes a Necessary vs. Sufficient flaw, not a leap from lack of proof to definitive truth."
        }
      }
    }
  },
  {
    id: 'sampling-fallacy',
    name: 'Sampling Fallacy',
    stimulus: "We surveyed three students who recently completed our new weekend intensive course. All three reported that they found the logical reasoning strategies incredibly helpful. Clearly, our new course will dramatically improve the score of almost any LSAT student.",
    conclusionText: "our new course will dramatically improve the score of almost any LSAT student.",
    supportText: "all three surveyed students reported that they found the logical reasoning strategies incredibly helpful.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'Our new course will dramatically improve the score of almost any LSAT student.',
          'All three surveyed students reported the strategies were incredibly helpful.',
          'Logical reasoning strategies are the most important part of the LSAT.'
        ],
        correctAnswer: 'Our new course will dramatically improve the score of almost any LSAT student.',
        feedback: {
          'Our new course will dramatically improve the score of almost any LSAT student.': "Correct! The author makes a sweeping conclusion about the course's effectiveness based on the survey.",
          'All three surveyed students reported the strategies were incredibly helpful.': "Incorrect. This is the premise (the survey results), not the final claim.",
          'Logical reasoning strategies are the most important part of the LSAT.': "Incorrect. The author claims the course helps improve scores, but never claims logical reasoning is the most important part."
        }
      },
      support: {
        prompt: "What evidence is given to try and prove that conclusion?",
        options: [
          'All three surveyed students reported that they found the logical reasoning strategies incredibly helpful.',
          'The weekend intensive course is very expensive.',
          'Most students struggle with logical reasoning.'
        ],
        correctAnswer: 'All three surveyed students reported that they found the logical reasoning strategies incredibly helpful.',
        feedback: {
          'All three surveyed students reported that they found the logical reasoning strategies incredibly helpful.': "Correct! The survey of the three students is the sole piece of evidence offered.",
          'The weekend intensive course is very expensive.': "Incorrect. This is not mentioned in the stimulus.",
          'Most students struggle with logical reasoning.': "Incorrect. This is not mentioned in the stimulus."
        }
      },
      gap: {
        prompt: "What alternate possibility breaks this argument?",
        options: [
          'What if students prefer studying during the week rather than the weekend?',
          'What if those three students are not representative and a sample of three is way too small to speak for "almost any" student?',
          'What if the course also covered logic games and reading comprehension?'
        ],
        correctAnswer: 'What if those three students are not representative and a sample of three is way too small to speak for "almost any" student?',
        feedback: {
          'What if students prefer studying during the week rather than the weekend?': "Incorrect. Study preferences don't address the gap between a 3-person sample and an 'almost any student' conclusion.",
          'What if those three students are not representative and a sample of three is way too small to speak for "almost any" student?': "Correct! A group of three people is entirely too small a sample size to make sweeping claims about 'almost any' student.",
          'What if the course also covered logic games and reading comprehension?': "Incorrect. That the course covers other topics doesn't expose the issue with using a tiny 3-person survey."
        }
      },
      answer: {
        prompt: "How will the LSAT phrase this flaw in the answer choices?",
        options: [
          'Draws a causal inference from a mere correlation.',
          'Appeals to the emotion of the audience rather than their reason.',
          'Bases a sweeping generalization on a sample that is too small to be mathematically representative.'
        ],
        correctAnswer: 'Bases a sweeping generalization on a sample that is too small to be mathematically representative.',
        feedback: {
          'Draws a causal inference from a mere correlation.': "Incorrect. A causal flaw mixes up cause and correlation, but the flaw here is expanding a small sample to a massive group.",
          'Appeals to the emotion of the audience rather than their reason.': "Incorrect. There is no emotional appeal here, just bad math and representation.",
          'Bases a sweeping generalization on a sample that is too small to be mathematically representative.': "Correct! The 'sweeping generalization' is that almost any student will improve, based on the unrepresentative sample of three."
        }
      }
    }
  },
  {
    id: 'necessary-vs-sufficient',
    name: 'Necessary vs. Sufficient',
    stimulus: "Every successful entrepreneur must be willing to take risks. Therefore, since Sarah is willing to take risks, she will undoubtedly become a successful entrepreneur.",
    conclusionText: "Sarah will undoubtedly become a successful entrepreneur.",
    supportText: "every successful entrepreneur must be willing to take risks, and Sarah is willing to take risks.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'Every successful entrepreneur must be willing to take risks.',
          'Sarah will undoubtedly become a successful entrepreneur.',
          'Taking risks is the most important part of business.'
        ],
        correctAnswer: 'Sarah will undoubtedly become a successful entrepreneur.',
        feedback: {
          'Every successful entrepreneur must be willing to take risks.': "Incorrect. This is the conditional premise setting up the rule.",
          'Sarah will undoubtedly become a successful entrepreneur.': "Correct! The author makes a guaranteed prediction about Sarah's future.",
          'Taking risks is the most important part of business.': "Incorrect. The text says risk is necessary, not that it's the *most* important part."
        }
      },
      support: {
        prompt: "What evidence does the author provide to support this?",
        options: [
          'Every successful entrepreneur must be willing to take risks, and Sarah is willing to take risks.',
          'Sarah has an excellent business plan.',
          'Taking risks is a guarantee of success.'
        ],
        correctAnswer: 'Every successful entrepreneur must be willing to take risks, and Sarah is willing to take risks.',
        feedback: {
          'Every successful entrepreneur must be willing to take risks, and Sarah is willing to take risks.': "Correct! The author uses the general rule and applies it to Sarah to build the flawed argument.",
          'Sarah has an excellent business plan.': "Incorrect. This is not mentioned in the argument.",
          'Taking risks is a guarantee of success.': "Incorrect. It says risk is a 'must' (necessary), not a overall guarantee (sufficient)."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question exposes the flaw?",
        options: [
          'What if Sarah decides she doesn\'t want to start a business?',
          'What if risk-taking is required, but you also need capital and a solid business plan to succeed?',
          'What if most successful entrepreneurs actually avoid taking risks?'
        ],
        correctAnswer: 'What if risk-taking is required, but you also need capital and a solid business plan to succeed?',
        feedback: {
          'What if Sarah decides she doesn\'t want to start a business?': "Incorrect. We are evaluating the logical connection between taking risks and becoming successful, not Sarah's shifting desires.",
          'What if risk-taking is required, but you also need capital and a solid business plan to succeed?': "Correct! The author assumes that just because Sarah has one required ingredient (risk), she has *all* the ingredients needed for success.",
          'What if most successful entrepreneurs actually avoid taking risks?': "Incorrect. This contradicts the premise, which we must accept as true."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Confuses a correlation with a causal connection.',
          'Treats a condition that is necessary for a certain outcome as if it were sufficient to guarantee that outcome.',
          'Bases a general conclusion on a sample that is too small.'
        ],
        correctAnswer: 'Treats a condition that is necessary for a certain outcome as if it were sufficient to guarantee that outcome.',
        feedback: {
          'Confuses a correlation with a causal connection.': "Incorrect. This describes a Causal Flaw. Risk and success aren't just correlated; risk was stated as a rule (must).",
          'Treats a condition that is necessary for a certain outcome as if it were sufficient to guarantee that outcome.': "Correct! Risk is necessary ('must'), but the author treats it as sufficient ('will undoubtedly become') to guarantee Sarah's success.",
          'Bases a general conclusion on a sample that is too small.': "Incorrect. This is a flaw about conditional logic, not surveys or sampling."
        }
      }
    }
  },
  {
    id: 'causal-flaw',
    name: 'Causal Flaw',
    stimulus: "A recent study found that students who listen to classical music while studying score higher on exams. The researchers concluded that listening to classical music directly improves exam performance.",
    conclusionText: "listening to classical music directly improves exam performance.",
    supportText: "students who listen to classical music while studying score higher on exams.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'Students who listen to classical music while studying score higher on exams.',
          'Listening to classical music directly improves exam performance.',
          'A recent study found a link between music and exam scores.'
        ],
        correctAnswer: 'Listening to classical music directly improves exam performance.',
        feedback: {
          'Students who listen to classical music while studying score higher on exams.': "Incorrect. This is the correlation observed in the study, not the researchers' conclusion.",
          'Listening to classical music directly improves exam performance.': "Correct! The researchers take the correlation and claim a direct causal link.",
          'A recent study found a link between music and exam scores.': "Incorrect. A link was found, but the final claim goes further by stating one *improves* the other."
        }
      },
      support: {
        prompt: "What evidence is given to try and prove that conclusion?",
        options: [
          'The researchers concluded that music helps.',
          'Students who listen to classical music while studying score higher on exams.',
          'Students need to study hard to score well.'
        ],
        correctAnswer: 'Students who listen to classical music while studying score higher on exams.',
        feedback: {
          'The researchers concluded that music helps.': "Incorrect. That is the conclusion, not the evidence.",
          'Students who listen to classical music while studying score higher on exams.': "Correct! The simple correlation (X happens with Y) is the only evidence given.",
          'Students need to study hard to score well.': "Incorrect. This is not mentioned."
        }
      },
      gap: {
        prompt: "Which 'What-if' checks the gap?",
        options: [
          'What if students who choose to listen to classical music just happen to have better baseline study habits?',
          'What if the exams were really difficult?',
          'What if listening to jazz music works even better?'
        ],
        correctAnswer: 'What if students who choose to listen to classical music just happen to have better baseline study habits?',
        feedback: {
          'What if students who choose to listen to classical music just happen to have better baseline study habits?': "Correct! This provides an alternate cause. The correlation might be driven by a third factor—study habits—not the music itself.",
          'What if the exams were really difficult?': "Incorrect. Exam difficulty doesn't explain the correlation between the music and the high scores.",
          'What if listening to jazz music works even better?': "Incorrect. Jazz music is irrelevant to whether classical music is the direct cause of the high scores."
        }
      },
      answer: {
        prompt: "How will the LSAT state this flaw?",
        options: [
          'Infers a causal connection from a mere correlation.',
          'Bases its conclusion on premises that cannot all be true.',
          'Takes for granted that classical music is enjoyable.'
        ],
        correctAnswer: 'Infers a causal connection from a mere correlation.',
        feedback: {
          'Infers a causal connection from a mere correlation.': "Correct! The argument sees two things occurring together (correlation) and wrongly assumes one causes the other (causation).",
          'Bases its conclusion on premises that cannot all be true.': "Incorrect. This describes an Internal Contradiction. Here, the premise (the study) is fine, the leap to conclusion is flawed.",
          'Takes for granted that classical music is enjoyable.': "Incorrect. Enjoyability of the music doesn't matter to its effect on exam scores."
        }
      }
    }
  },
  {
    id: 'part-vs-whole',
    name: 'Part vs. Whole',
    stimulus: "Every brick in this wall is light enough for a child to carry. Therefore, the wall itself must be light enough for a child to carry.",
    conclusionText: "the wall itself must be light enough for a child to carry.",
    supportText: "every brick in this wall is light enough for a child to carry.",
    questions: {
      conclusion: {
        prompt: "What is the author trying to prove?",
        options: [
          'Children should not carry bricks.',
          'The wall itself must be light enough for a child to carry.',
          'Every brick in this wall is light.'
        ],
        correctAnswer: 'The wall itself must be light enough for a child to carry.',
        feedback: {
          'Children should not carry bricks.': "Incorrect. This is a moral claim not found in the text.",
          'The wall itself must be light enough for a child to carry.': "Correct! The author's absolute takeaway concerns the weight of the entire wall.",
          'Every brick in this wall is light.': "Incorrect. This is the premise (evidence) regarding the individual bricks."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'Bricks are small and easy to carry.',
          'Every brick in this wall is light enough for a child to carry.',
          'The wall is made entirely of bricks.'
        ],
        correctAnswer: 'Every brick in this wall is light enough for a child to carry.',
        feedback: {
          'Bricks are small and easy to carry.': "Incorrect. This is a generalization; the evidence is specifically about the bricks *in this wall*.",
          'Every brick in this wall is light enough for a child to carry.': "Correct! A property of individual components is the sole piece of evidence.",
          'The wall is made entirely of bricks.': "Incorrect. While implied, it's not the stated evidence about weight."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the bricks are painted a heavy color?',
          'What if putting thousands of light bricks together makes the overall wall incredibly heavy?',
          'What if some children are stronger than others?'
        ],
        correctAnswer: 'What if putting thousands of light bricks together makes the overall wall incredibly heavy?',
        feedback: {
          'What if the bricks are painted a heavy color?': "Incorrect. The color of paint is irrelevant to the overall physical weight of a wall.",
          'What if putting thousands of light bricks together makes the overall wall incredibly heavy?': "Correct! The author incorrectly assumes that combining light parts retains the property of lightness in the whole.",
          'What if some children are stronger than others?': "Incorrect. The variation in child strength doesn't fix the logical jump from 'light parts' to 'light whole'."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Treats a failure to prove a claim is true as proof that the claim is false.',
          'Assumes without warrant that what is true of each member of a group is true of the group as a whole.',
          'Confuses a condition that is sufficient with one that is necessary.'
        ],
        correctAnswer: 'Assumes without warrant that what is true of each member of a group is true of the group as a whole.',
        feedback: {
          'Treats a failure to prove a claim is true as proof that the claim is false.': "Incorrect. This describes an Unproven vs. Proven False flaw.",
          'Assumes without warrant that what is true of each member of a group is true of the group as a whole.': "Correct! What is true of the parts (light) is incorrectly assumed true of the whole (the entire wall).",
          'Confuses a condition that is sufficient with one that is necessary.': "Incorrect. This describes a Necessary vs. Sufficient flaw."
        }
      }
    }
  },
  {
    id: 'ad-hominem',
    name: 'Ad Hominem',
    stimulus: "Mayor Smith has argued that we need to increase funding for the city's public parks. However, Mayor Smith was recently caught lying about his golf scores. Therefore, his proposal to increase park funding must be a bad idea.",
    conclusionText: "his proposal to increase park funding must be a bad idea.",
    supportText: "Mayor Smith was recently caught lying about his golf scores.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'Mayor Smith lied about his golf scores.',
          'We need to increase funding for the city\'s public parks.',
          'His proposal to increase park funding must be a bad idea.'
        ],
        correctAnswer: 'His proposal to increase park funding must be a bad idea.',
        feedback: {
          'Mayor Smith lied about his golf scores.': "Incorrect. This is the evidence the author uses to discredit him.",
          'We need to increase funding for the city\'s public parks.': "Incorrect. This is Mayor Smith's claim, not the author's final takeaway.",
          'His proposal to increase park funding must be a bad idea.': "Correct! The author is ultimately concluding that the proposal itself is flawed."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'Public parks need more money.',
          'Mayor Smith was recently caught lying about his golf scores.',
          'The city has enough money to fund the parks.'
        ],
        correctAnswer: 'Mayor Smith was recently caught lying about his golf scores.',
        feedback: {
          'Public parks need more money.': "Incorrect. No evidence about park funding is actually provided.",
          'Mayor Smith was recently caught lying about his golf scores.': "Correct! The author uses a personal failure as the only evidence against the proposal.",
          'The city has enough money to fund the parks.': "Incorrect. This is not supported by the text."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the golf scores were fabricated by his opponents?',
          'What if a person is dishonest about trivial things but their policy arguments are actually logically sound?',
          'What if public parks don\'t actually need more funding?'
        ],
        correctAnswer: 'What if a person is dishonest about trivial things but their policy arguments are actually logically sound?',
        feedback: {
          'What if the golf scores were fabricated by his opponents?': "Incorrect. We must accept the premise as true (he did lie); we are attacking the logic used to reach the conclusion.",
          'What if a person is dishonest about trivial things but their policy arguments are actually logically sound?': "Correct! Character flaws do not invalidate the logic of an argument. You can't attack the man instead of the proposal.",
          'What if public parks don\'t actually need more funding?': "Incorrect. If this were true, it would support the author's conclusion, but we are looking for a gap in their reasoning."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Directs its attack against the proponent of a position rather than against the position itself.',
          'Takes a necessary condition for a sufficient condition.',
          'Assumes what it is attempting to prove.'
        ],
        correctAnswer: 'Directs its attack against the proponent of a position rather than against the position itself.',
        feedback: {
          'Directs its attack against the proponent of a position rather than against the position itself.': "Correct! The author Attacks the Mayor (proponent) instead of addressing the merits of the park funding (position).",
          'Takes a necessary condition for a sufficient condition.': "Incorrect. This is Necessary vs. Sufficient, which doesn't apply here.",
          'Assumes what it is attempting to prove.': "Incorrect. This describes Circular Reasoning, not an ad hominem attack."
        }
      }
    }
  },
  {
    id: 'circular-reasoning',
    name: 'Circular Reasoning',
    stimulus: "The new software is the most efficient program on the market because no other application runs as efficiently as it does.",
    conclusionText: "The new software is the most efficient program on the market.",
    supportText: "no other application runs as efficiently as it does.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'The new software is the most efficient program on the market.',
          'No other application runs as efficiently as it does.',
          'Newer software is always more efficient.'
        ],
        correctAnswer: 'The new software is the most efficient program on the market.',
        feedback: {
          'The new software is the most efficient program on the market.': "Correct! This is the statement that precedes the word 'because'.",
          'No other application runs as efficiently as it does.': "Incorrect. This is simply the premise that comes after 'because'.",
          'Newer software is always more efficient.': "Incorrect. The author is not making a claim about all newer software."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'Other programs are slower.',
          'It runs efficiently on old computers.',
          'no other application runs as efficiently as it does.'
        ],
        correctAnswer: 'no other application runs as efficiently as it does.',
        feedback: {
          'Other programs are slower.': "Incorrect. While implied, you must find the exact words used as evidence.",
          'It runs efficiently on old computers.': "Incorrect. This is not stated in the stimulus.",
          'no other application runs as efficiently as it does.': "Correct! The evidence used to support the conclusion is virtually identical to the conclusion itself."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if some older software is just as fast?',
          'What if the premise is literally just repeating the conclusion using different words, providing no real evidence?',
          'What if efficiency isn\'t the most important aspect of a software program?'
        ],
        correctAnswer: 'What if the premise is literally just repeating the conclusion using different words, providing no real evidence?',
        feedback: {
          'What if some older software is just as fast?': "Incorrect. While this attacks the conclusion, it does not address the flaw in the *reasoning* itself.",
          'What if the premise is literally just repeating the conclusion using different words, providing no real evidence?': "Correct! The author essentially said 'A is true because A is true.' No independent evidence was provided.",
          'What if efficiency isn\'t the most important aspect of a software program?': "Incorrect. The relative importance of efficiency is irrelevant to proving whether it's the most efficient."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Presupposes what it sets out to establish.',
          'Bases a conclusion on premises that cannot all be true.',
          'Relies on two different uses of the same term.'
        ],
        correctAnswer: 'Presupposes what it sets out to establish.',
        feedback: {
          'Presupposes what it sets out to establish.': "Correct! 'Presupposing' what you're trying to establish means assuming your conclusion is true in order to prove it's true.",
          'Bases a conclusion on premises that cannot all be true.': "Incorrect. This is an Internal Contradiction. Here, there's only one premise, and it just repeats the conclusion.",
          'Relies on two different uses of the same term.': "Incorrect. This describes Equivocation, not Circular Reasoning."
        }
      }
    }
  },
  {
    id: 'internal-contradiction',
    name: 'Internal Contradiction',
    stimulus: "We must ensure that our citizens have complete freedom of speech to express their opinions without consequence. Furthermore, we must establish strict penalties for anyone who publicly criticizes the government.",
    conclusionText: "We must ensure complete freedom of speech, AND we must establish strict penalties for criticizing the government.",
    supportText: "The speaker is proposing two different policies simultaneously.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'Our citizens should have complete freedom of speech.',
          'We must establish strict penalties for criticizing the government.',
          'We must ensure complete freedom of speech, AND we must establish strict penalties for criticizing the government.'
        ],
        correctAnswer: 'We must ensure complete freedom of speech, AND we must establish strict penalties for criticizing the government.',
        feedback: {
          'Our citizens should have complete freedom of speech.': "Incorrect. This is only half of the author's assertion. You must read the entire passage.",
          'We must establish strict penalties for criticizing the government.': "Incorrect. This is the second half, but the author is proposing both simultaneously.",
          'We must ensure complete freedom of speech, AND we must establish strict penalties for criticizing the government.': "Correct! The author is simultaneously asserting two different policy proposals."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'People need to express their opinions.',
          'Governments need to maintain order.',
          'The speaker is proposing two different policies simultaneously.'
        ],
        correctAnswer: 'The speaker is proposing two different policies simultaneously.',
        feedback: {
          'People need to express their opinions.': "Incorrect. This isn't the core structural issue.",
          'Governments need to maintain order.': "Incorrect. This is not stated in the text.",
          'The speaker is proposing two different policies simultaneously.': "Correct! The argument rests entirely on presenting these two distinct directives as a unified plan."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the government is corrupt and deserves criticism?',
          'What if these two proposals are fundamentally incompatible and cannot logically coexist in reality?',
          'What if citizens don\'t actually want freedom of speech?'
        ],
        correctAnswer: 'What if these two proposals are fundamentally incompatible and cannot logically coexist in reality?',
        feedback: {
          'What if the government is corrupt and deserves criticism?': "Incorrect. This does not address the logical impossibility of having both 'complete freedom' and 'strict penalties' at the same time.",
          'What if these two proposals are fundamentally incompatible and cannot logically coexist in reality?': "Correct! You cannot have 'complete freedom without consequence' while simultaneously punishing citizens for criticism.",
          'What if citizens don\'t actually want freedom of speech?': "Incorrect. This attacks a premise that isn't central to the logical paradox presented."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Bases its conclusion on premises that cannot all be true.',
          'Draws a causal inference from a mere correlation.',
          'Takes for granted that a certain attribute makes something inherently valuable.'
        ],
        correctAnswer: 'Bases its conclusion on premises that cannot all be true.',
        feedback: {
          'Bases its conclusion on premises that cannot all be true.': "Correct! The premises contradict each other. If one is true (complete freedom), the other MUST be false (strict penalties for speech).",
          'Draws a causal inference from a mere correlation.': "Incorrect. This describes a Causal Flaw.",
          'Takes for granted that a certain attribute makes something inherently valuable.': "Incorrect. This does not address the contradiction."
        }
      }
    }
  },
  {
    id: 'equivocation',
    name: 'Equivocation',
    stimulus: "The professor said my essay needed more weight. Therefore, if I print it on heavier cardboard instead of regular paper, I will get a better grade.",
    conclusionText: "if I print it on heavier cardboard ..., I will get a better grade.",
    supportText: "The professor said my essay needed more weight.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'The professor said my essay needed more weight.',
          'if I print it on heavier cardboard ..., I will get a better grade.',
          'Cardboard is heavier than regular paper.'
        ],
        correctAnswer: 'if I print it on heavier cardboard ..., I will get a better grade.',
        feedback: {
          'The professor said my essay needed more weight.': "Incorrect. This is the premise given by the professor.",
          'if I print it on heavier cardboard ..., I will get a better grade.': "Correct! The student concludes that a change in physical medium will result in a better grade.",
          'Cardboard is heavier than regular paper.': "Incorrect. This is true, but it's an unstated assumption, not a claim."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'Heavier paper feels more professional.',
          'The professor said my essay needed more weight.',
          'Some essays are too thin.'
        ],
        correctAnswer: 'The professor said my essay needed more weight.',
        feedback: {
          'Heavier paper feels more professional.': "Incorrect. Not mentioned in the text.",
          'The professor said my essay needed more weight.': "Correct! The student uses the professor's exact words as evidence.",
          'Some essays are too thin.': "Incorrect. Not supported by the text."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the professor actually meant "weight" as in "substance/importance" instead of literal physical mass?',
          'What if the cardboard won\'t fit in the printer?',
          'What if the professor graded the essay solely on grammar?'
        ],
        correctAnswer: 'What if the professor actually meant "weight" as in "substance/importance" instead of literal physical mass?',
        feedback: {
          'What if the professor actually meant "weight" as in "substance/importance" instead of literal physical mass?': "Correct! The student shifted the definition of the word 'weight' midway through the argument.",
          'What if the cardboard won\'t fit in the printer?': "Incorrect. Printer mechanics don't address the flawed logical leap.",
          'What if the professor graded the essay solely on grammar?': "Incorrect. This doesn't highlight the specific changing definition."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Fails to distinguish between two distinct senses of a key term.',
          'Takes for granted that what is true of the parts must be true of the whole.',
          'Appeals inappropriately to emotion rather than to reason.'
        ],
        correctAnswer: 'Fails to distinguish between two distinct senses of a key term.',
        feedback: {
          'Fails to distinguish between two distinct senses of a key term.': "Correct! Equivocation occurs when a key term ('weight') is used with two different definitions in the same argument.",
          'Takes for granted that what is true of the parts must be true of the whole.': "Incorrect. This is Part vs. Whole.",
          'Appeals inappropriately to emotion rather than to reason.': "Incorrect. There is no emotional appeal here."
        }
      }
    }
  },
  {
    id: 'inappropriate-appeal',
    name: 'Inappropriate Appeal',
    stimulus: "My favorite actor, who won an Oscar last year, said that taking this new vitamin supplement will cure cancer. Therefore, we should all start taking this supplement immediately.",
    conclusionText: "we should all start taking this supplement immediately.",
    supportText: "My favorite actor ... said that taking this new vitamin supplement will cure cancer.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'The actor won an Oscar last year.',
          'we should all start taking this supplement immediately.',
          'The vitamin supplement cures cancer.'
        ],
        correctAnswer: 'we should all start taking this supplement immediately.',
        feedback: {
          'The actor won an Oscar last year.': "Incorrect. This is background info on the actor.",
          'we should all start taking this supplement immediately.': "Correct! Based on the actor's statement, the author demands immediate action.",
          'The vitamin supplement cures cancer.': "Incorrect. This is the actor's claim, but the main argument is that *we should take it immediately*."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'Vitamin supplements are generally healthy.',
          'My favorite actor ... said that taking this new vitamin supplement will cure cancer.',
          'Cancer is a terrible disease.'
        ],
        correctAnswer: 'My favorite actor ... said that taking this new vitamin supplement will cure cancer.',
        feedback: {
          'Vitamin supplements are generally healthy.': "Incorrect. Not mentioned in the text.",
          'My favorite actor ... said that taking this new vitamin supplement will cure cancer.': "Correct! The sole piece of evidence given is the testimony of an Oscar-winning actor.",
          'Cancer is a terrible disease.': "Incorrect. This is true but unstated."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the actor was paid to say that?',
          'What if winning an Oscar has absolutely nothing to do with having medical expertise?',
          'What if the supplement is very expensive?'
        ],
        correctAnswer: 'What if winning an Oscar has absolutely nothing to do with having medical expertise?',
        feedback: {
          'What if the actor was paid to say that?': "Incorrect. While relevant, this attacks the actor's motive rather than their qualifications to make the claim.",
          'What if winning an Oscar has absolutely nothing to do with having medical expertise?': "Correct! An actor's endorsement cannot be used as substitute for scientific proof. This is an appeal to an unqualified authority.",
          'What if the supplement is very expensive?': "Incorrect. Expense doesn't address the flawed reliance on an actor's medical claim."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Accepts a claim merely on the authority of an individual who lacks expertise in the relevant area.',
          'Rejects an argument based on the character of the proponent.',
          'Draws a general conclusion from an unrepresentative sample.'
        ],
        correctAnswer: 'Accepts a claim merely on the authority of an individual who lacks expertise in the relevant area.',
        feedback: {
          'Accepts a claim merely on the authority of an individual who lacks expertise in the relevant area.': "Correct! The authority figure (the actor) lacks the relevant expertise (medicine/oncology).",
          'Rejects an argument based on the character of the proponent.': "Incorrect. This describes an Ad Hominem flaw.",
          'Draws a general conclusion from an unrepresentative sample.': "Incorrect. This is a Sampling Fallacy."
        }
      }
    }
  },
  {
    id: 'sleight-of-hand',
    name: 'Sleight of Hand',
    stimulus: "This new diet plan drastically reduces your daily caloric intake. Because of this, it is certain to improve your overall health and longevity.",
    conclusionText: "it is certain to improve your overall health and longevity.",
    supportText: "This new diet plan drastically reduces your daily caloric intake.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'This new diet plan drastically reduces your daily caloric intake.',
          'it is certain to improve your overall health and longevity.',
          'Reducing calories is a good idea.'
        ],
        correctAnswer: 'it is certain to improve your overall health and longevity.',
        feedback: {
          'This new diet plan drastically reduces your daily caloric intake.': "Incorrect. This is the factual premise.",
          'it is certain to improve your overall health and longevity.': "Correct! The author makes a firm prediction about health outcomes.",
          'Reducing calories is a good idea.': "Incorrect. This is an implied judgment, not the stated conclusion."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'The diet was created by experts.',
          'This new diet plan drastically reduces your daily caloric intake.',
          'Health is very important.'
        ],
        correctAnswer: 'This new diet plan drastically reduces your daily caloric intake.',
        feedback: {
          'The diet was created by experts.': "Incorrect. Not mentioned.",
          'This new diet plan drastically reduces your daily caloric intake.': "Correct! Reducing caloric intake is the specific, factual premise.",
          'Health is very important.': "Incorrect. This is a general value, not the evidence used."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if "reducing caloric intake" does NOT automatically equal "improving overall health"?',
          'What if the diet is too hard to follow?',
          'What if people enjoy eating high-calorie foods?'
        ],
        correctAnswer: 'What if "reducing caloric intake" does NOT automatically equal "improving overall health"?',
        feedback: {
          'What if "reducing caloric intake" does NOT automatically equal "improving overall health"?': "Correct! The author swapped concepts mid-argument. 'Fewer calories' doesn't mean 'better health'.",
          'What if the diet is too hard to follow?': "Incorrect. The difficulty of the diet does not address the conceptual gap.",
          'What if people enjoy eating high-calorie foods?': "Incorrect. Enjoyment has nothing to do with the health claim."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Unjustifiably treats two distinct phenomena as though they were equivalent.',
          'Confuses a correlation with a causal connection.',
          'Fails to consider potential disadvantages of a proposed course of action.'
        ],
        correctAnswer: 'Unjustifiably treats two distinct phenomena as though they were equivalent.',
        feedback: {
          'Unjustifiably treats two distinct phenomena as though they were equivalent.': "Correct! The text treats 'reducing calories' as exactly equivalent to 'improving health and longevity'.",
          'Confuses a correlation with a causal connection.': "Incorrect. This is a concepts/scope flaw, not a causal flaw.",
          'Fails to consider potential disadvantages of a proposed course of action.': "Incorrect. While true, treating different ideas as equivalent is the primary structural flaw."
        }
      }
    }
  },
  {
    id: 'value-assumption',
    name: 'Value Assumption',
    stimulus: "The corporation's profit margin has decreased by 15% this quarter due to the new employee benefits package. Therefore, the CEO made a terrible ethical mistake in approving those benefits.",
    conclusionText: "the CEO made a terrible ethical mistake in approving those benefits.",
    supportText: "The corporation's profit margin has decreased by 15% this quarter due to the new employee benefits package.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'The corporation lost 15% of its profits.',
          'the CEO made a terrible ethical mistake in approving those benefits.',
          'Employees should receive better benefits.'
        ],
        correctAnswer: 'the CEO made a terrible ethical mistake in approving those benefits.',
        feedback: {
          'The corporation lost 15% of its profits.': "Incorrect. This is a descriptive fact used as a premise.",
          'the CEO made a terrible ethical mistake in approving those benefits.': "Correct! The author makes a harsh, normative judgment.",
          'Employees should receive better benefits.': "Incorrect. This is not stated anywhere."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'The CEO is bad at their job.',
          'The corporation\'s profit margin has decreased by 15% this quarter due to the new employee benefits package.',
          'The board of directors is angry.'
        ],
        correctAnswer: 'The corporation\'s profit margin has decreased by 15% this quarter due to the new employee benefits package.',
        feedback: {
          'The CEO is bad at their job.': "Incorrect. Not explicitly stated as the premise.",
          'The corporation\'s profit margin has decreased by 15% this quarter due to the new employee benefits package.': "Correct! This is the sole descriptive fact used.",
          'The board of directors is angry.': "Incorrect. Not mentioned at all."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the CEO could have prevented the profit decrease in other ways?',
          'What if a drop in profit (a descriptive fact) does not universally constitute an \'ethical mistake\' (a moral judgment)?',
          'What if the employees didn\'t actually want the new benefits?'
        ],
        correctAnswer: 'What if a drop in profit (a descriptive fact) does not universally constitute an \'ethical mistake\' (a moral judgment)?',
        feedback: {
          'What if the CEO could have prevented the profit decrease in other ways?': "Incorrect. This is irrelevant to whether the original decision was an ethical mistake.",
          'What if a drop in profit (a descriptive fact) does not universally constitute an \'ethical mistake\' (a moral judgment)?': "Correct! Moving from an 'is' (profits decreased) to an 'ought' (ethical mistake) requires assuming that losing profits is morally wrong.",
          'What if the employees didn\'t actually want the new benefits?': "Incorrect. While ironic, it misses the main gap between descriptive facts and normative judgments."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Derives a normative claim solely from descriptive premises.',
          'Takes for granted that every member of a group shares a particular desire.',
          'Directs its attack against the proponent of a position rather than against the position itself.'
        ],
        correctAnswer: 'Derives a normative claim solely from descriptive premises.',
        feedback: {
          'Derives a normative claim solely from descriptive premises.': "Correct! You cannot prove a moral or normative statement using only factual/descriptive statements.",
          'Takes for granted that every member of a group shares a particular desire.': "Incorrect. This describes a Universal Desires Assumption flaw.",
          'Directs its attack against the proponent of a position rather than against the position itself.': "Incorrect. The author is attacking the decision, not necessarily making a pure ad hominem against the CEO's character."
        }
      }
    }
  },
  {
    id: 'sleazy-sales-pitch',
    name: 'Sleazy Sales Pitch',
    stimulus: "You should definitely buy this new sports car. It accelerates to 60 mph in under three seconds, and its exterior design is award-winning.",
    conclusionText: "You should definitely buy this new sports car.",
    supportText: "It accelerates to 60 mph in under three seconds, and its exterior design is award-winning.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'You should definitely buy this new sports car.',
          'The car is very fast.',
          'The exterior design is award-winning.'
        ],
        correctAnswer: 'You should definitely buy this new sports car.',
        feedback: {
          'You should definitely buy this new sports car.': "Correct! The conclusion is a direct recommendation of action.",
          'The car is very fast.': "Incorrect. This is evidence to support the recommendation.",
          'The exterior design is award-winning.': "Incorrect. This is one of the positive aspects listed as support."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'Sports cars are fun to drive.',
          'It accelerates to 60 mph in under three seconds, and its exterior design is award-winning.',
          'The car is affordable.'
        ],
        correctAnswer: 'It accelerates to 60 mph in under three seconds, and its exterior design is award-winning.',
        feedback: {
          'Sports cars are fun to drive.': "Incorrect. A true assumption for some, but not stated.",
          'It accelerates to 60 mph in under three seconds, and its exterior design is award-winning.': "Correct! The author only lists positive features as evidence.",
          'The car is affordable.': "Incorrect. Price is completely ignored in the stimulus."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if the award the car won wasn\'t very prestigious?',
          'What if the car gets terrible gas mileage, breaks down every week, and costs a million dollars?',
          'What if there are faster cars on the market?'
        ],
        correctAnswer: 'What if the car gets terrible gas mileage, breaks down every week, and costs a million dollars?',
        feedback: {
          'What if the award the car won wasn\'t very prestigious?': "Incorrect. Debating the award's prestige doesn't expose the main structural flaw.",
          'What if the car gets terrible gas mileage, breaks down every week, and costs a million dollars?': "Correct! A recommendation to 'definitely buy' requires considering BOTH sides of the ledger, but the author ignored all potential downsides.",
          'What if there are faster cars on the market?': "Incorrect. The car doesn't have to be the fastest to be worth buying."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Fails to consider potential disadvantages of a proposed course of action.',
          'Assumes what it is attempting to prove.',
          'Confuses a correlation with a causal connection.'
        ],
        correctAnswer: 'Fails to consider potential disadvantages of a proposed course of action.',
        feedback: {
          'Fails to consider potential disadvantages of a proposed course of action.': "Correct! The author made a recommendation based entirely on pros while completely ignoring potential cons.",
          'Assumes what it is attempting to prove.': "Incorrect. This describes Circular Reasoning.",
          'Confuses a correlation with a causal connection.': "Incorrect. There is no causal leap here, just a biased recommendation."
        }
      }
    }
  },
  {
    id: 'universal-desires-assumption',
    name: 'Universal Desires Assumption',
    stimulus: "The new transit system will reduce commute times by an average of 15 minutes per day. Since saving time is the most important thing, everyone will choose to ride the new transit system.",
    conclusionText: "everyone will choose to ride the new transit system.",
    supportText: "The new transit system will reduce commute times by an average of 15 minutes per day, and saving time is the most important thing.",
    questions: {
      conclusion: {
        prompt: "What is the author's final claim?",
        options: [
          'everyone will choose to ride the new transit system.',
          'The new transit system is fast.',
          'Saving time is important.'
        ],
        correctAnswer: 'everyone will choose to ride the new transit system.',
        feedback: {
          'everyone will choose to ride the new transit system.': "Correct! The conclusion makes a massive prediction about how everyone will behave.",
          'The new transit system is fast.': "Incorrect. This is the premise.",
          'Saving time is important.': "Incorrect. This is an assumption the author states as a premise."
        }
      },
      support: {
        prompt: "What evidence goes into supporting that conclusion?",
        options: [
          'People hate commuting.',
          'The new transit system will reduce commute times by an average of 15 minutes per day.',
          'The transit system is affordable.'
        ],
        correctAnswer: 'The new transit system will reduce commute times by an average of 15 minutes per day.',
        feedback: {
          'People hate commuting.': "Incorrect. This is assumed, but not explicitly stated as evidence.",
          'The new transit system will reduce commute times by an average of 15 minutes per day.': "Correct! This is the core factual premise.",
          'The transit system is affordable.': "Incorrect. Price is never mentioned."
        }
      },
      gap: {
        prompt: "Which 'What-if' counter-question breaks this logic?",
        options: [
          'What if 15 minutes isn\'t actually a very significant amount of time?',
          'What if some people prioritize things like comfort, privacy, or cost over saving 15 minutes, meaning we can\'t assume they all want the same thing?',
          'What if the transit system doesn\'t go to very many places?'
        ],
        correctAnswer: 'What if some people prioritize things like comfort, privacy, or cost over saving 15 minutes, meaning we can\'t assume they all want the same thing?',
        feedback: {
          'What if 15 minutes isn\'t actually a very significant amount of time?': "Incorrect. The text says saving time 'is the most important thing,' so 15 minutes is treated as significant.",
          'What if some people prioritize things like comfort, privacy, or cost over saving 15 minutes, meaning we can\'t assume they all want the same thing?': "Correct! The author illegitimately projects a single set of values onto the entire population.",
          'What if the transit system doesn\'t go to very many places?': "Incorrect. While true, the primary flaw is projecting a universal desire above all other factors."
        }
      },
      answer: {
        prompt: "Which answer choice correctly identifies the flaw?",
        options: [
          'Presumes without justification that a particular motivation is shared by all members of a group.',
          'Treats a failure to establish that a claim is true as conclusive evidence that the claim is false.',
          'Infers a causal connection from a mere correlation.'
        ],
        correctAnswer: 'Presumes without justification that a particular motivation is shared by all members of a group.',
        feedback: {
          'Presumes without justification that a particular motivation is shared by all members of a group.': "Correct! The argument thinks that just because saving time matters (motivation), EVERYONE shares it equivalently.",
          'Treats a failure to establish that a claim is true as conclusive evidence that the claim is false.': "Incorrect. This characterizes an Unproven vs. Proven False flaw.",
          'Infers a causal connection from a mere correlation.': "Incorrect. This is a Descriptive/Normative or group flaw, not a causal error."
        }
      }
    }
  }
];
