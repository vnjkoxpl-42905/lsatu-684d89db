import { TranslatorDrillItem } from "../types";

// 14 question-stem translation drills.
//
// stemText is verbatim from
// `~/Documents/Obsidian Vault/raw/curriculum/Abstract/_source/04-homework-14-question-stems.md`
// (mirrors `Homework__Keyword_Extraction_and_Translation_of_Question_Stems_dup1.pdf`).
//
// walkthrough.reasoning paragraphs are verbatim from
// `_source/05-answer-key-15-walkthroughs.md` (mirrors `Answer_Key_Extraction.pdf`).
// Per the spec's "Verbatim content preservation" hard rule the prose is preserved
// without paraphrasing.
//
// walkthrough.example.stimulus and walkthrough.example.explanation are the verbatim
// worked example blocks from each walkthrough. Walkthroughs that do not include an
// explicit worked example use the corresponding example from a sibling walkthrough
// the source author cross-references (per the source's own internal notes).
//
// correctKeywords are the load-bearing words extracted from each walkthrough's
// "keywords stand out" callout. The picker matches case-insensitively against the
// student's clicked words inside stemText, so apostrophe forms and casing do not
// matter.
//
// Walkthrough 15 from source 05 is a reference pattern that doesn't map to any of
// the 14 homework stems (the source itself flags this asymmetry). Included as
// item 15 for the supplemental reference panel, gated off the main 14-item drill.

export const TRANSLATOR_ITEMS: TranslatorDrillItem[] = [
  {
    stemNumber: 1,
    stemText: "It is used to illustrate the general principle that the argument presupposes:",
    correctKeywords: ["illustrate", "general", "principle", "presupposes"],
    idealTranslation:
      "The statement is an example of a broad rule, and the argument requires that rule to be true in order to work.",
    walkthrough: {
      reasoning: [
        "Whenever we are faced with an answer choice that looks super abstract, the first thing to do is to always extract what keywords we can to try to make sense of the whole thing. Three words stand out in this answer choice: \"illustrate\", \"general principle\", and \"presuppose\".",
        "Now certain words have specific meanings within the LSAT. All three of these words appear repeatedly in LR questions and we need to memorize them.",
        "For example, \"John is always tired in the morning, he should go to bed earlier\" is not a principle, we are just talking about one person here. \"Those who are tired in the morning should strive to get to bed earlier\" is a principle. It's no longer just about John anymore, it is a recommendation for a certain category of people.",
        "So now there are three requirements that must be met if we were to select this hypothetical answer choice as the correct answer: first, the statement in question must be an example; second, behind this example is a principle on what we should or shouldn't do; and lastly, this principle is required in order for the author to advance their argument.",
      ],
      vocab: [
        {
          term: "Presuppose",
          meaning: "Require. A necessary condition.",
          note: "In daily usage, a presupposition can mean either an assumption or something that is necessary. On the LSAT, presuppose simply means require.",
        },
        {
          term: "Illustrate",
          meaning: "An example, or examples.",
          note: "An illustration, as it appears in an LR question, is simply referring to an example or examples.",
        },
        {
          term: "General Principle",
          meaning: "A rule on what we should or shouldn't do, applied across multiple cases.",
          note: "A principle is a rule on what we should or shouldn't do, and it applies to multiple conditions and scenarios.",
        },
      ],
      requirements: [
        "The statement in question must be an example.",
        "Behind this example is a principle on what we should or shouldn't do.",
        "This principle is required in order for the author to advance their argument.",
      ],
      example: {
        stimulus:
          "Despite a high-paying job, John was extremely stressed out and depressed, so there are intangible things in life that we must pursue to find true happiness.",
        explanation:
          "John's situation is the illustration of a general principle, namely that having a lot of money isn't enough to make you happy. Is this principle required in order for the conclusion to stand? Yes, the conclusion says factors other than money must be considered in order to be happy. The underlined statement satisfies all three requirements and if this was a Role question, this would be the correct answer.",
      },
    },
  },
  {
    stemNumber: 2,
    stemText: "It is an illustration of a premise that is used to support the argument's conclusion:",
    correctKeywords: ["illustration", "premise", "support", "conclusion"],
    idealTranslation:
      "The statement is an example of a premise, and that premise supports the conclusion.",
    walkthrough: {
      reasoning: [
        "Again, \"illustration\" means example. So we know this answer choice is referring to an example in the stimulus. Furthermore, it is an illustration of a premise. So when examining this answer choice, we must isolate the premise/premises that appear in the argument and ask ourselves, is the quoted statement an example of what the premise is trying to say?",
      ],
      vocab: [
        {
          term: "Illustration",
          meaning: "Example.",
          note: "Same LSAT meaning as illustrate from stem 1.",
        },
      ],
      requirements: [
        "The stimulus must contain a premise.",
        "The quoted statement must be an example of that premise.",
        "The premise must support the conclusion.",
      ],
      example: {
        stimulus:
          "John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer. Smoking is a direct cause of lung cancer. We must avoid cigarettes at all costs if we want to stay healthy.",
        explanation:
          "What is the premise here? Smoking causes lung cancer. What is the conclusion? Don't smoke. John's case is an illustration of the causal relationship between smoking and lung cancer. Requirement satisfied.",
      },
    },
  },
  {
    stemNumber: 3,
    stemText: "It is used to counter a consideration that might be taken to undermine the argument's conclusion:",
    correctKeywords: ["counter", "consideration", "undermine", "conclusion"],
    idealTranslation:
      "The statement preemptively shuts down a possible objection to the author's conclusion.",
    walkthrough: {
      reasoning: [
        "So right away, we should realize that \"a consideration that might be taken to undermine the argument's conclusion\" is referring to a real or potential counter-argument. A counter-argument runs contrary to the author's conclusion. If I say \"going to college is a great way to enjoy a higher standard of living down the road,\" but you respond with \"but many college graduates have to take years to pay back debt\", you are making a counter argument in opposition to me.",
        "Continuing with our example, if I had anticipated your potential objection/counter argument, I can say something along the lines of \"college graduates enjoy higher income than their non-college counterparts even with the cost of debt factored in.\" What I'm doing, essentially, is anticipating your potential objection and shutting you down in advance. That's what is meant by countering a consideration that might be taken to undermine the argument's conclusion.",
      ],
      vocab: [],
      requirements: [
        "There must be a possible objection to the author's conclusion.",
        "That objection, if true, would weaken the conclusion.",
        "The quoted statement must push back against that objection in advance.",
      ],
      example: {
        stimulus:
          "College graduates make more money than they would if they didn't go to college, even if they are paying off student loans plus interest. So going to college is a great way to make more money and enjoy a better life.",
        explanation:
          "Here, the underlined statement is both a premise as well as a pre-emptive strike against a potential objection, namely that graduates end up with so much debt that going to college doesn't make sense.",
      },
    },
  },
  {
    stemNumber: 4,
    stemText: "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false:",
    correctKeywords: ["observation", "insufficient", "justify", "claim", "false"],
    idealTranslation:
      "Someone offers an observation to support a claim, but the author says that observation is not enough and concludes the claim is false.",
    walkthrough: {
      reasoning: [
        "A key piece of information we can extract from this answer choice is that there is a claim that the argument concludes is false. In other words, the author of this argument is arguing AGAINST a claim. Someone has made a claim, and the author is saying that claim is false.",
        "So we have two viewpoints in this potential stimulus. The author's argument is directed against an adversary.",
        "Further, we know that the opponent made an observation in support of their view, but the author is saying that observation is not enough to prove anything, and subsequently goes on to argue that the opponent's claim is false.",
        "So in order for this answer choice to be correct, the stimulus must satisfy the following requirements: there must be an opposing view, the author must be arguing against this opposing view and declaring it false. The opponent must have provided an observation as a basis of support for their view, and the author must have made the claim that this observation is not enough to demonstrate the truth of the opponent's view.",
      ],
      vocab: [],
      requirements: [
        "There must be an opposing claim in the stimulus.",
        "The opponent must give an observation as support for that claim.",
        "The author must say that observation is not enough.",
        "The author must conclude the opposing claim is false.",
      ],
      example: {
        stimulus:
          "John: Celebrities have the biggest smiles in front of the camera, so they must be the happiest people alive.\nDavid: That is not true. Many celebrities suffer from depression and substance abuse. Smiling in front of the camera doesn't mean a thing, they could simply be putting on a show for the audience.",
        explanation:
          "Does the underlined statement fit the requirement for this answer choice? Yes, David is arguing that John's claim is false. David also suggests that the observation John makes in support of his claim is insufficient to justify his claim.",
      },
    },
  },
  {
    stemNumber: 5,
    stemText: "It describes a phenomenon for which the argument's conclusion is offered as an explanation:",
    correctKeywords: ["describes", "phenomenon", "conclusion", "explanation"],
    idealTranslation:
      "The statement describes an observed result, and the conclusion proposes a cause for it.",
    walkthrough: {
      reasoning: [
        "Here is another key term that we must familiarize ourselves with: explanation.",
        "So whenever you see the word \"explanation\" in an answer choice, check the stimulus for cause-effect reasoning. If it's not there, then this answer would be wrong.",
        "What this answer choice is referring to is something we have seen before. We talked about questions where there is a cause and effect relationship in the argument, but instead of the cause being the premise and the effect being the conclusion, the order is reversed. The author describes a phenomenon and concludes what caused it.",
      ],
      vocab: [
        {
          term: "Explanation",
          meaning: "Cause.",
          note: "On the LSAT, the word explanation has a very strict and precise meaning: it simply means cause.",
        },
        {
          term: "Phenomenon",
          meaning: "An observed effect or result that needs explaining.",
          note: "The effect side of a cause-effect pair; what the conclusion is trying to give a cause for.",
        },
      ],
      requirements: [
        "There must be a phenomenon or result described in the stimulus.",
        "The conclusion must propose a cause for that phenomenon.",
        "The argument must rely on cause-effect reasoning.",
      ],
      example: {
        stimulus:
          "Smoking is a leading cause of lung cancer, John has lung cancer, therefore he must surely have been a heavy smoker.",
        explanation:
          "John having lung cancer is the phenomenon, the author subsequently concludes that it must be smoking which caused his lung cancer. The cause-effect relationship goes like this: smoking causes lung cancer, and the cause/explanation is in fact the conclusion in this example.",
      },
    },
  },
  {
    stemNumber: 6,
    stemText: "It is a general principle whose validity the argument questions:",
    correctKeywords: ["general", "principle", "validity", "questions"],
    idealTranslation:
      "The statement is a broad rule, and the argument is challenging whether that rule is true.",
    walkthrough: {
      reasoning: [
        "Again, this answer choice is referring to a general principle, but it's a general principle that the argument is questioning/attacking. So if we are confronted with this answer choice, we must go back to the stimulus to make sure it satisfies two requirements: one, the quoted statement is indeed a general principle; and two, the author is arguing against the truth of this principle.",
      ],
      vocab: [],
      requirements: [
        "The quoted statement must be a general principle that applies across multiple cases.",
        "The author must challenge or attack the validity of that principle.",
      ],
      example: {
        stimulus:
          "It has been said that the best way to approach any situation is to be yourself. But this cannot be true. What if you are a selfish, egotistical or horrible person? Surely we must strive to better ourselves and be the best we can be?",
        explanation:
          "The quoted statement \"the best way to approach any situation is to be yourself\" is a general principle. The author goes on to challenge that principle by raising a hypothetical case (a selfish or horrible person) where the principle would lead to a bad outcome.",
      },
    },
  },
  {
    stemNumber: 7,
    stemText: "It denies a claim that the argument takes to be assumed in the reasoning it rejects:",
    correctKeywords: ["denies", "assumed", "reasoning", "rejects"],
    idealTranslation:
      "The author attacks an unstated assumption inside someone else's reasoning, rather than going after their premise or conclusion directly.",
    walkthrough: {
      reasoning: [
        "This one is very similar to example 4. The argument is rejecting another person's reasoning. So the author is arguing against someone else here. But are they rejecting that view outright? No, the author does something much more nuanced than that. The author thinks the reasoning used by their opponent has made an assumption, and instead of going after the opponent's argument, our author is going after the opponent's assumption.",
        "So this answer choice is describing a stimulus in which there's two arguments, the author's argument and the opponent's argument. This particular statement is the author rejecting an assumption made by the opponent's argument.",
      ],
      vocab: [],
      requirements: [
        "There must be another person's reasoning in the stimulus.",
        "That reasoning must rely on an unstated assumption.",
        "The quoted statement must deny that assumption.",
      ],
      example: {
        stimulus:
          "John: I've studied so hard for the finals, I'm definitely going to ace the exam!\nDavid: Studying hard doesn't guarantee you will do well. The exams are graded on a curve, and everyone else has studied just as hard.",
        explanation:
          "John's reasoning assumes that studying hard is enough to ace the exam. David is not denying that John studied hard, and David is not denying that John might do well. David is denying the unstated assumption that hard study alone is sufficient. He does so by pointing to the curve and the fact that everyone else worked just as hard.",
      },
    },
  },
  {
    stemNumber: 8,
    stemText: "It is a claim for which no justification is provided but that is required to establish the argument's main conclusion:",
    correctKeywords: ["justification", "required", "establish", "conclusion"],
    idealTranslation:
      "The statement is an unsupported premise that the main conclusion depends on.",
    walkthrough: {
      reasoning: [
        "There are two important pieces of information in this answer choice that can help us determine whether it's the correct answer. First, it is \"required\" to establish the argument's main conclusion. That means it's necessary in order for the main conclusion to be valid. So there's no way this answer choice is talking about the conclusion itself, it's therefore either a premise or an intermediate conclusion.",
        "Second, the answer choice says it's a claim for which no justification is provided. Remember what we said about how to differentiate between premises and intermediate conclusions in the previous chapter? Premises support the conclusion but do not have any other statements supporting them, whereas intermediate conclusions both support the conclusion and are supported by premises. So when we have a statement which supports the conclusion but is not supported by others, it can only mean one thing: we are talking about a premise here.",
        "So we are essentially talking about a premise that is required to establish the truth of the conclusion. In other words, if the premise was untrue, the conclusion would not stand.",
      ],
      vocab: [],
      requirements: [
        "The statement must support the main conclusion.",
        "No other statement in the stimulus supports the statement.",
        "The conclusion depends on the statement being true.",
      ],
      example: {
        stimulus:
          "I found an Olympic gold medal in the swim team locker room. It must have originally belonged to John. John is always losing things and he participated in the Olympics.",
        explanation:
          "John's participation in the Olympics is a requirement for the example's conclusion to stand. In order for John to be the original owner of the medal, he MUST have been a participant at least. John's participation in the Olympics is also a premise that supports the example argument's conclusion.",
      },
    },
  },
  {
    stemNumber: 9,
    stemText: "It is a claim for which justification is provided and that, if true, establishes the truth of the argument's main conclusion:",
    correctKeywords: ["justification", "establishes", "main", "conclusion"],
    idealTranslation:
      "The statement is supported by evidence, and if it is true it guarantees the main conclusion. It is an intermediate conclusion.",
    walkthrough: {
      reasoning: [
        "This is very similar to the example listed above, but with two important caveats. This answer choice HAS justification provided, while supporting the main conclusion, so it's an intermediate conclusion. It also guarantees/establishes the truth of the conclusion.",
      ],
      vocab: [],
      requirements: [
        "The statement must be supported by another statement (a premise).",
        "The statement must itself support the main conclusion.",
        "If the statement is true, it establishes the main conclusion.",
      ],
      example: {
        stimulus:
          "All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.",
        explanation:
          "John being a practicing lawyer is supported by the fact that he is a partner at a law firm. This satisfies the intermediate conclusion requirement. Does John being a practicing lawyer establish the fact that he has passed the bar? Yes, it is mentioned in the first statement/premise that all practicing lawyers must have passed the bar.",
      },
    },
  },
  {
    stemNumber: 10,
    stemText: "It is what the author's argument purports to explain:",
    correctKeywords: ["author's", "argument", "purports", "explain"],
    idealTranslation:
      "The statement is the phenomenon the argument is trying to explain. The conclusion proposes its cause.",
    walkthrough: {
      reasoning: [
        "This is identical to example 5: the author describes an effect/result/phenomenon, and argues for a specific cause.",
      ],
      vocab: [
        {
          term: "Purports to explain",
          meaning: "Claims to give a cause for.",
          note: "Same explanation = cause translation as stem 5. The argument is offering a causal account.",
        },
      ],
      requirements: [
        "There must be a phenomenon, result, or fact stated in the stimulus.",
        "The argument must offer a causal explanation for it.",
        "The quoted statement is the phenomenon, not the explanation.",
      ],
      example: {
        stimulus:
          "Smoking is a leading cause of lung cancer, John has lung cancer, therefore he must surely have been a heavy smoker.",
        explanation:
          "John having lung cancer is what the author's argument purports to explain. The conclusion (he must have been a heavy smoker) is the proposed cause.",
      },
    },
  },
  {
    stemNumber: 11,
    stemText: "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence:",
    correctKeywords: ["hypothesis", "undermine", "sufficiency", "evidence"],
    idealTranslation:
      "The statement is a proposed causal explanation, and the argument weakens it by saying the available evidence is not strong enough to support it.",
    walkthrough: {
      reasoning: [
        "What is a hypothesis? In science, a hypothesis is offered by scientists to try to explain a phenomenon in the physical world or universe. Why did different types of birds have physical features that are adapted to their physical environments? Darwin hypothesized that it is due to the fact that species can change over time, adapting to their environments via physical modifications generation after generation. Darwin came up with a hypothesis, which today we know as The Theory of Evolution, that has been supported by evidence gathered both by him and subsequent scientists. In other words, a hypothesis is simply a posited causal explanation of a phenomenon, explaining WHY something is the way it is.",
        "On the LSAT, the word \"hypothesis\" can be understood as a \"potential explanation/potential causation\"; it usually appears in science/medicine themed LR stimuli.",
        "So what is this answer choice saying? The argument is attempting to undermine this hypothesis. It does so by saying that the evidence out there is not enough to support such a hypothesis. So when we are going through answer choices and come to this, we must make sure that there is a hypothesis present in the stimulus (the quoted statement being that hypothesis), the author is challenging this hypothesis, and the author does so by suggesting that the available evidence is not enough to support this hypothesis.",
      ],
      vocab: [
        {
          term: "Hypothesis",
          meaning: "Potential explanation or potential causation.",
          note: "A posited causal explanation of a phenomenon, explaining why something is the way it is. Usually appears in science or medicine stimuli on the LSAT.",
        },
        {
          term: "Undermine",
          meaning: "Weaken or attack.",
          note: "The argument is not supporting the hypothesis. It is pushing against it.",
        },
        {
          term: "Sufficiency of the evidence",
          meaning: "Whether the evidence is strong enough.",
          note: "The issue is not whether evidence exists; the issue is whether it is enough.",
        },
      ],
      requirements: [
        "There must be a hypothesis (a potential causal explanation) in the stimulus.",
        "The argument must challenge that hypothesis.",
        "The challenge must be that the available evidence is insufficient, not that the hypothesis is directly contradicted.",
      ],
      example: {
        stimulus:
          "Darwin hypothesized that species change over time, adapting to their environments. Critics counter that we have not yet gathered enough fossil evidence across enough time periods to support such a sweeping claim about adaptation across all species.",
        explanation:
          "Darwin's claim that species adapt over time is the hypothesis. The critics attempt to undermine it. They do so by calling the sufficiency of the fossil evidence into question, not by directly contradicting the hypothesis with a counterexample.",
      },
    },
  },
  {
    stemNumber: 12,
    stemText: "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion of the argument:",
    correctKeywords: ["conclusion", "whole", "explicitly", "stated"],
    idealTranslation:
      "The statement is the main conclusion, and the argument also contains an intermediate conclusion.",
    walkthrough: {
      reasoning: [
        "Two pieces of key information here. The first is straightforward: we are talking about the main conclusion here. But note that it \"is not the only explicitly stated conclusion in the argument\". That can only mean one thing: we have an intermediate conclusion in the argument as well. So if confronted with this answer choice, make sure that one, the statement we are talking about is in fact the main conclusion of the argument; and two, the argument contains a separate intermediate conclusion.",
      ],
      vocab: [],
      requirements: [
        "The quoted statement must be the main conclusion of the argument.",
        "The argument must contain another explicitly stated conclusion (an intermediate conclusion).",
      ],
      example: {
        stimulus:
          "All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.",
        explanation:
          "John being a practicing lawyer is supported by the fact that he is a partner at a law firm. This satisfies the intermediate conclusion requirement. Does John being a practicing lawyer establish the fact that he has passed the bar? Yes, it is mentioned in the first statement/premise that all practicing lawyers must have passed the bar.",
      },
    },
  },
  {
    stemNumber: 13,
    stemText: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole:",
    correctKeywords: ["intended", "support", "conclusion", "whole"],
    idealTranslation:
      "The argument supports this statement, but this statement is not the main conclusion. It is an intermediate conclusion.",
    walkthrough: {
      reasoning: [
        "Supported by the argument but not the main conclusion: this is the classic intermediate conclusion profile. The argument provides reasons that lead to this statement, and the statement in turn helps support the main conclusion. To verify, walk the support chain and confirm there is a further claim being argued toward beyond this one.",
        "Source note: in the source answer key, walkthrough entry 13 reuses the explanation from entry 5 verbatim. The functional reading above captures the intended structural meaning of the stem.",
      ],
      vocab: [],
      requirements: [
        "The statement must be supported by the argument.",
        "The statement must not be the main conclusion.",
        "Another claim, supported in part by this statement, must be the actual main conclusion.",
      ],
      example: {
        stimulus:
          "All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.",
        explanation:
          "John being a practicing lawyer is supported by the fact that he is a partner at a law firm. That makes it the intermediate conclusion: a statement the argument is intended to support, but not the main conclusion of the argument as a whole.",
      },
    },
  },
  {
    stemNumber: 14,
    stemText: "It is a statement for which some evidence is provided and that is the conclusion of the argument as a whole:",
    correctKeywords: ["evidence", "provided", "conclusion", "whole"],
    idealTranslation:
      "The statement is the main conclusion of the argument, and the argument provides some evidence for it.",
    walkthrough: {
      reasoning: [
        "Same as example 12. The statement in question is supported by support, and is the conclusion of the argument as a whole. The phrase \"some evidence is provided\" is a soft cue: it doesn't say the evidence is sufficient or that the support chain is multi-layered, only that some support exists.",
        "When faced with this answer choice, make sure the quoted statement is in fact the main conclusion (not an intermediate one) and that at least one supporting statement exists in the stimulus.",
      ],
      vocab: [],
      requirements: [
        "The quoted statement must be the main conclusion of the argument.",
        "At least one statement in the stimulus must support it.",
      ],
      example: {
        stimulus:
          "All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.",
        explanation:
          "John having passed the bar is the main conclusion of the argument. The argument provides evidence for it: that all practicing lawyers must have passed the bar, and that John is a practicing lawyer.",
      },
    },
  },
];

// Bonus item 15: from source 05 walkthrough 15. Doesn't map to any homework
// stem; preserved as a reference pattern for the supplemental panel. The
// 14-item drill loop in TranslatorWorkspace stops at item 14.
export const TRANSLATOR_BONUS_ITEM: TranslatorDrillItem = {
  stemNumber: 15,
  stemText: "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered:",
  correctKeywords: ["conclusion", "whole", "supported", "support", "offered"],
  idealTranslation:
    "The statement is the main conclusion, and the statement that supports it is itself supported by yet another statement.",
  walkthrough: {
    reasoning: [
      "Same as example 12: the statement referred to by the answer choice is the main conclusion, and is supported by another statement for which support is offered. So the main conclusion is supported by an intermediate conclusion. When faced with an answer choice like this, make sure it is indeed the main conclusion that the question is asking us to analyze, and make sure the argument contains an intermediate conclusion.",
    ],
    vocab: [],
    requirements: [
      "The quoted statement must be the main conclusion of the argument.",
      "It must be supported by another statement (an intermediate conclusion).",
      "That supporting statement must itself have support (a premise).",
    ],
    example: {
      stimulus:
        "All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.",
      explanation:
        "John must have passed the bar is the main conclusion. It is supported by John being a practicing lawyer (an intermediate conclusion). The intermediate conclusion is itself supported by John being a partner at a prestigious law firm.",
    },
  },
};
