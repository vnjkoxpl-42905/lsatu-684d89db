import type { DrillItem } from "../types";

// Original PT snapshot questions. Source text/key captured in the approved local
// review artifact (2026-10-13); explanations are source-grounded local drafts.
export const APPLIED_SOURCE_QUESTIONS: DrillItem[] = [
  {
    "id": "source_pt103_s1_q18",
    "type": "method",
    "stimulus": "Politician: A government that taxes incomes at a rate of 100 percent will generate no revenue because all economic activity will cease. So it follows that the lower the rate of income tax, the more revenue the government will generate by that tax.\n\nEconomist: Your conclusion cannot be correct, since it would mean that an income tax of 0 percent would generate the maximum revenue.",
    "question": "Which one of the following argumentative strategies is used by the economist in responding to the politician?",
    "options": [
      {
        "text": "stating a general principle that is incompatible with the conclusion the politician derives",
        "explanation": "No incompatible general principle is stated."
      },
      {
        "text": "providing evidence that where the politician’s advice has been adopted, the results have been disappointing",
        "explanation": "No results from places adopting the advice are cited."
      },
      {
        "text": "arguing that the principle derived by the politician, if applied in the limiting case, leads to an absurdly false conclusion",
        "explanation": "The zero-percent limiting case makes the politician’s rule yield maximum revenue when the tax collects none."
      },
      {
        "text": "undermining the credibility of the politician by openly questioning the politician’s understanding of economics",
        "explanation": "The economist challenges a consequence, not the politician’s credibility."
      },
      {
        "text": "attacking the politician’s argument by giving reason to doubt the truth of a premise",
        "explanation": "The response challenges the conclusion, not the 100-percent premise."
      }
    ],
    "correctOptionIndex": 2,
    "explanation": "The zero-percent limiting case makes the politician’s rule yield maximum revenue when the tax collects none.",
    "trapTag": "wrong_method"
  },
  {
    "id": "source_pt139_s1_q23",
    "type": "method",
    "stimulus": "Anthropologist: Every human culture has taboos against eating certain animals. Some researchers have argued that such taboos originated solely for practical reasons, pointing out, for example, that in many cultures it is taboo to eat domestic animals that provide labor and that are therefore worth more alive than dead. But that conclusion is unwarranted; taboos against eating certain animals might instead have arisen for symbolic, ritualistic reasons, and the presence of the taboos might then have led people to find other uses for those animals.",
    "question": "In the argument, the anthropologist",
    "options": [
      {
        "text": "calls an explanation of a phenomenon into question by pointing out that observations cited as evidence supporting it are also compatible with an alternative explanation of the phenomenon",
        "explanation": "The same useful-animal observation can fit symbolic taboos arising first."
      },
      {
        "text": "establishes that an explanation of a phenomenon is false by demonstrating that the evidence that had been cited in support of that explanation was inadequate",
        "explanation": "Unwarranted does not establish false."
      },
      {
        "text": "rejects the reasoning used to justify a hypothesis about the origins of a phenomenon, on the grounds that there exists another, more plausible hypothesis about the origins of that phenomenon",
        "explanation": "The alternative is possible, not established as more plausible."
      },
      {
        "text": "argues in support of one explanation of a phenomenon by citing evidence incompatible with a rival explanation",
        "explanation": "The observations are compatible with both explanations."
      },
      {
        "text": "describes a hypothesis about the sequence of events involved in the origins of a phenomenon, and then argues that those events occurred in a different sequence",
        "explanation": "The alternative sequence might have occurred; it is not established as actual."
      }
    ],
    "correctOptionIndex": 0,
    "explanation": "The same useful-animal observation can fit symbolic taboos arising first.",
    "trapTag": "wrong_method"
  },
  {
    "id": "source_pt118_s4_q12",
    "type": "method",
    "stimulus": "Columnist: If you received an unsigned letter, you would likely have some doubts about the truth of its contents. But news stories often include statements from anonymous sources, and these are usually quoted with the utmost respect. It makes sense to be skeptical of these sources, for, as in the case of the writer of an unsigned letter, their anonymity makes it possible for them to plant inaccurate or slanted statements without ever having to answer for them.",
    "question": "The columnist's argument proceeds by",
    "options": [
      {
        "text": "pointing out that a certain attitude would presumably be adopted in one situation, in order to support the claim that a similar attitude would be justified in an analogous situation",
        "explanation": "Likely doubt about unsigned letters supports justified skepticism toward anonymous news sources with the same accountability problem."
      },
      {
        "text": "drawing an analogy between an attitude commonly adopted in one situation and a different attitude commonly adopted in another situation, and establishing that the latter attitude is better justified than the former",
        "explanation": "The columnist supports skepticism, not better justification for respect toward anonymous sources."
      },
      {
        "text": "inferring that an attitude would be justified in all situations of a given type on the grounds that this attitude is justified in a hypothetical situation of that type",
        "explanation": "The reasoning is an analogy supporting a similar attitude, not a universal inference about all situations of a type."
      },
      {
        "text": "calling into question a certain type of evidence by drawing an analogy between that evidence and other evidence that the argument shows is usually false",
        "explanation": "Doubt about unsigned letters does not establish that they are usually false."
      },
      {
        "text": "calling into question the motives of those presenting certain information, and concluding for this reason that the information is likely to be false",
        "explanation": "The conclusion justifies skepticism; it does not conclude that the information is likely false."
      }
    ],
    "correctOptionIndex": 0,
    "explanation": "Likely doubt about unsigned letters supports justified skepticism toward anonymous news sources with the same accountability problem.",
    "trapTag": "wrong_method"
  }
];

export const getAppliedSourceQuestion = (id: string) => APPLIED_SOURCE_QUESTIONS.find(item => item.id === id);
