export interface StructuredFlashcard {
  front: string;
  role:
    | 'Framework'
    | 'Conclusion Indicator'
    | 'Premise Indicator'
    | 'Pivot Word'
    | 'Opposing Viewpoint'
    | 'Concession'
    | 'Opinion Indicator';
  function: string;
  example: string;
  note: string;
}

export const STRUCTURED_FLASHCARDS: StructuredFlashcard[] = [
  {
    front: 'What is the 2-Point Check for finding a main conclusion?',
    role: 'Framework',
    function:
      "1) Sounds like the Author's Opinion (facts < conclusions).\n2) Is Supported by at least one other explicit claim.",
    example: 'N/A',
    note: 'Always verify support!',
  },
  {
    front: 'What does the word "so" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Indicates the Main Conclusion or an Intermediate Conclusion follows.',
    example: '"The rent is high, so we must move."',
    note: 'Often introduces the main point.',
  },
  {
    front: 'What does the word "thus" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Indicates a logical deduction or conclusion follows.',
    example: '"It is raining; thus, the game is delayed."',
    note: 'A formal way to state a conclusion.',
  },
  {
    front: 'What does the word "hence" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Indicates a conclusion derived from previous premises.',
    example: '"He was late, hence he missed the train."',
    note: 'Similar to "therefore".',
  },
  {
    front: 'What does the word "therefore" usually indicate?',
    role: 'Conclusion Indicator',
    function:
      "Signals that the author's main point or an intermediate conclusion is about to follow.",
    example: '"The roads are icy. Therefore, school should be canceled."',
    note: 'Usually the easiest way to spot the exact claim you need to prove.',
  },
  {
    front: 'What does the phrase "it follows" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Indicates a conclusion deduced from the evidence.',
    example: '"Since A equals B, it follows that B equals A."',
    note: 'Watch for what immediately follows this phrase.',
  },
  {
    front: 'What does the phrase "as a result" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Shows the logical outcome or conclusion of the preceding facts.',
    example: '"Sales dropped; as a result, the store closed."',
    note: 'Can be an intermediate or main conclusion.',
  },
  {
    front: 'What does the word "consequently" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Indicates the consequence or conclusion of an argument.',
    example: "\"He didn't study; consequently, he failed.\"",
    note: 'Flags a direct conclusion.',
  },
  {
    front: 'What does the phrase "this shows that" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Directly points to the conclusion the author is drawing from the evidence.',
    example: '"The fingerprints match. This shows that he was there."',
    note: 'Directly flags a conclusion.',
  },
  {
    front: 'What does the word "conclude" usually indicate?',
    role: 'Conclusion Indicator',
    function: 'Explicitly states the conclusion of the argument.',
    example: '"We must conclude that the earth is round."',
    note: 'Directly flags a conclusion.',
  },
  {
    front: 'What does the word "for" usually indicate?',
    role: 'Premise Indicator',
    function: 'Introduces a reason or support for a preceding claim.',
    example: '"We must leave, for the storm is approaching."',
    note: 'Often follows the conclusion it supports.',
  },
  {
    front: 'What does the phrase "after all" usually indicate?',
    role: 'Premise Indicator',
    function: 'Provides justification or a premise for an earlier claim.',
    example: '"She will win. After all, she trained the hardest."',
    note: 'A classic premise indicator.',
  },
  {
    front: 'What does the word "because" usually indicate?',
    role: 'Premise Indicator',
    function: 'Introduces factual support, evidence, or a reason for a claim.',
    example: '"The proposal should fail because it is too expensive."',
    note: 'Look for the conclusion this support is helping to prove.',
  },
  {
    front: 'What does the word "since" usually indicate?',
    role: 'Premise Indicator',
    function: 'Acts as a premise indicator, supplying a reason.',
    example: '"Since the bridge is out, we must turn back."',
    note: 'The conclusion often comes in the other half of the sentence.',
  },
  {
    front: 'When "and" connects two factual claims, what does it usually indicate?',
    role: 'Premise Indicator',
    function: 'Functions as an additional premise or piece of evidence.',
    example: '"The car is fast, and it is fuel-efficient."',
    note: 'Links multiple pieces of support together.',
  },
  {
    front: 'What does the word "but" usually indicate?',
    role: 'Pivot Word',
    function: "Signals a shift, often away from an opposing view and toward the author's point.",
    example: '"Some like it cold, but I prefer it hot."',
    note: 'Pay close attention to what comes right after it.',
  },
  {
    front: 'What does the word "yet" usually indicate?',
    role: 'Pivot Word',
    function: "Functions as a pivot, shifting the argument's direction.",
    example: '"The plan is costly, yet it is necessary."',
    note: 'Often introduces the main conclusion.',
  },
  {
    front: 'What does the word "however" usually indicate?',
    role: 'Pivot Word',
    function:
      "Signals a turn away from another viewpoint and toward the author's real point.",
    example: '"Some critics oppose the policy. However, the evidence supports it."',
    note: 'Pay close attention to what comes right after it—often the main conclusion.',
  },
  {
    front: 'What does the phrase "some people say" usually indicate?',
    role: 'Opposing Viewpoint',
    function:
      'Frames a view or belief that the author is almost certainly going to attack or rebut.',
    example: '"Some people say video games cause violence. But studies show otherwise."',
    note: 'Expect a pivot word (like "but") to follow shortly after.',
  },
  {
    front: 'What does the phrase "it\'s commonly believed" usually indicate?',
    role: 'Opposing Viewpoint',
    function:
      'Sets up a widespread opinion that the author will likely disagree with.',
    example: "\"It's commonly believed that carrots improve eyesight, but this is a myth.\"",
    note: 'A classic setup for a rebuttal conclusion.',
  },
  {
    front: 'What does the phrase "some economists believe" usually indicate?',
    role: 'Opposing Viewpoint',
    function: 'Introduces a domain-specific opposing viewpoint.',
    example: '"Some economists believe taxes should rise, but they are mistaken."',
    note: 'The author is teeing up an argument against these experts.',
  },
  {
    front: 'What does the phrase "some biologists claim" usually indicate?',
    role: 'Opposing Viewpoint',
    function: 'Introduces a domain-specific opposing viewpoint.',
    example: '"Some biologists claim the species is extinct, yet recent sightings occur."',
    note: "Look for the author's rebuttal.",
  },
  {
    front: 'What does the word "although" usually indicate?',
    role: 'Concession',
    function:
      'Acknowledges a contrary point without adopting it as the main view.',
    example: '"Although the initial cost is high, the long-term savings are substantial."',
    note: 'The author is playing defense. The real point comes after the comma.',
  },
  {
    front: 'When "while" is used as a contrast word, what does it usually indicate?',
    role: 'Concession',
    function: 'Concedes a point before delivering the primary argument.',
    example: '"While it is raining, we must still go outside."',
    note: 'The main point usually follows the concession.',
  },
  {
    front: 'What does the word "despite" usually indicate?',
    role: 'Concession',
    function: 'Acknowledges a hindrance or opposing fact without adopting it.',
    example: '"Despite the risks, the mission was a success."',
    note: "Often followed by the author's main conclusion.",
  },
  {
    front: 'What does the word "granted" usually indicate?',
    role: 'Concession',
    function: 'Admits a point to the opposition before countering it.',
    example: '"Granted, the car is old, but it runs perfectly."',
    note: 'Sets up a pivot to the actual conclusion.',
  },
  {
    front: 'What does the word "naturally" usually indicate?',
    role: 'Concession',
    function: 'Acknowledges an expected objection before proceeding.',
    example: '"Naturally, people are upset, but the law must stay."',
    note: 'Functions similarly to "granted".',
  },
  {
    front: 'What does a word like "clearly" usually indicate?',
    role: 'Opinion Indicator',
    function:
      "Flags the author's strong belief, often pointing directly to the conclusion.",
    example: '"Clearly, the new tax plan will benefit the wealthy."',
    note: 'The author uses these words to persuade you. Find the evidence they use to back it up.',
  },
  {
    front: 'What does a word like "obviously" usually indicate?',
    role: 'Opinion Indicator',
    function: 'Indicates a strong subjective judgment from the author.',
    example: '"Obviously, we cannot fund this project."',
    note: 'Highly likely to be the main conclusion.',
  },
  {
    front: 'What does a word like "evidently" usually indicate?',
    role: 'Opinion Indicator',
    function: 'Signals that the author is drawing a conclusion based on evidence.',
    example: '"Evidently, the policy has failed."',
    note: 'Ties the opinion directly to the reasoning.',
  },
  {
    front: 'What does the word "ought" usually indicate?',
    role: 'Opinion Indicator',
    function:
      'Indicates a prescriptive judgment, highly likely to be the conclusion.',
    example: '"We ought to protect the environment."',
    note: 'Prescriptive claims almost always act as conclusions.',
  },
  {
    front: 'What does the word "must" usually indicate?',
    role: 'Opinion Indicator',
    function:
      'Signals a strong prescriptive or logical necessity, often the conclusion.',
    example: '"The government must lower interest rates."',
    note: `Facts rarely use "must". It's a conclusion needing support.`,
  },
  {
    front: 'What does the word "should" usually indicate?',
    role: 'Opinion Indicator',
    function:
      'Indicates a prescriptive judgment (what the author thinks is right), highly likely to be the conclusion.',
    example: '"The city should invest in more green spaces."',
    note: 'Facts do not use "should". This is a subjective claim that needs support.',
  },
];
