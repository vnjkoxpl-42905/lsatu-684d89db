import type { ConditionalDifficulty, ConditionalQuestion } from './types';

export interface LegacyConditionalQuestion extends ConditionalQuestion {
  unitId: string;
  unitTitle: string;
  difficulty: ConditionalDifficulty;
}

// Original questions remain available only to saved runs and attempt review.
// They require later inference and must never enter newly assigned practice.
const historicalQuestions: LegacyConditionalQuestion[] = [
  {
    "id": "group-1-a3",
    "prompt": "If a component is not certified for heat exposure, it is stored indoors. Component E is not stored indoors. What follows?",
    "options": [
      "E is certified for heat exposure.",
      "E is certified for every use.",
      "E is not certified for heat exposure."
    ],
    "answerIndex": 0,
    "hint": "Use the contrapositive and cancel the negative.",
    "reasoningSteps": [
      "No indoor storage excludes not certified for heat exposure.",
      "The result is certification for that specific exposure, not universal certification."
    ],
    "explanation": "No indoor storage excludes not certified for heat exposure. The result is certification for that specific exposure, not universal certification.",
    "unitId": "group-1",
    "unitTitle": "Group 1: Identify What Guarantees What",
    "difficulty": "advanced"
  },
  {
    "id": "group-2-m2",
    "prompt": "The camera records only when motion is detected. No motion is detected. What follows?",
    "options": [
      "The camera does not record.",
      "The camera records.",
      "The camera is broken."
    ],
    "answerIndex": 0,
    "hint": "Use absence of the required detection.",
    "reasoningSteps": [
      "Recording would require motion detection.",
      "Its absence excludes recording without identifying a fault."
    ],
    "explanation": "Recording would require motion detection. Its absence excludes recording without identifying a fault.",
    "unitId": "group-2",
    "unitTitle": "Group 2: Keep the Requirement on the Right",
    "difficulty": "medium"
  },
  {
    "id": "group-2-a3",
    "prompt": "A claim is eligible only if it was not filed after the deadline. Claim Q was filed after the deadline. What follows?",
    "options": [
      "Q is eligible.",
      "Q is not eligible.",
      "Every timely claim is eligible."
    ],
    "answerIndex": 1,
    "hint": "Negate the negative necessary condition.",
    "reasoningSteps": [
      "Eligibility requires not filed after deadline.",
      "Filing after deadline defeats that requirement and excludes eligibility."
    ],
    "explanation": "Eligibility requires not filed after deadline. Filing after deadline defeats that requirement and excludes eligibility.",
    "unitId": "group-2",
    "unitTitle": "Group 2: Keep the Requirement on the Right",
    "difficulty": "advanced"
  },
  {
    "id": "group-2-a1",
    "prompt": "Only reviewers appointed for the emergency panel may inspect these records. Nia is a reviewer appointed to another panel. Which follows?",
    "options": [
      "Nia may inspect these records.",
      "This rule excludes Nia's permission unless she also has the emergency appointment.",
      "Nia cannot be a reviewer."
    ],
    "answerIndex": 1,
    "hint": "The appointment modifier is part of the necessary condition.",
    "reasoningSteps": [
      "Inspection permission requires the emergency-panel appointment.",
      "Another appointment alone does not meet that requirement."
    ],
    "explanation": "Inspection permission requires the emergency-panel appointment. Another appointment alone does not meet that requirement.",
    "unitId": "group-2",
    "unitTitle": "Group 2: Keep the Requirement on the Right",
    "difficulty": "advanced"
  }
];

export function findLegacyConditionalQuestion(id: string): LegacyConditionalQuestion | undefined {
  return historicalQuestions.find(question => question.id === id);
}
