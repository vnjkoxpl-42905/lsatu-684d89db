/** Reviewed single-rule practice after Groups 1 and 2, before contraposition. */
export type MixedDrillError = 'direction' | 'qualification' | 'requirement' | 'equivalence';

export type MixedDrillChoiceItem = {
  id: string;
  stage: 'complete-condition' | 'equivalence' | 'transfer' | 'confirmation';
  skill: MixedDrillError;
  sentence: string;
  prompt: string;
  options: string[];
  correct: number;
  feedback: string[];
  /** Diagnosis for each choice; the correct choice has no error. */
  errorByOption?: Array<MixedDrillError | null>;
};

export const completeConditionItems: MixedDrillChoiceItem[] = [
  {
    id: 'mixed-condition-1', stage: 'complete-condition', skill: 'qualification',
    sentence: 'Every swimmer training before dawn receives a wristband.',
    prompt: 'Who does the rule say will receive a wristband?',
    options: ['Every swimmer', 'Every swimmer training before dawn', 'Anyone who receives a wristband'], correct: 1,
    errorByOption: ['qualification', null, 'direction'],
    feedback: [
      'Swimmer alone includes people training later in the day. The rule covers swimmers training before dawn, so keep the time restriction.',
      'Each swimmer training before dawn receives a wristband. The time restriction matters: the sentence does not tell us what swimmers training later receive.',
      'The wristband is what the rule establishes. Every refers to the swimmers training before dawn, not to everyone who receives a wristband.',
    ],
  },
  {
    id: 'mixed-condition-2', stage: 'complete-condition', skill: 'qualification',
    sentence: 'Only locker keys with yellow tags open the cabinet.',
    prompt: 'What kind of key is needed to open the cabinet?',
    options: ['A locker key', 'A key that opens the cabinet', 'A locker key with a yellow tag'], correct: 2,
    errorByOption: ['qualification', 'direction', null],
    feedback: [
      'A locker key without a yellow tag does not meet this requirement. Keep with a yellow tag attached to locker key.',
      'Opening the cabinet is what needs the required kind of key. Only identifies a locker key with a yellow tag as the requirement.',
      'A key that opens the cabinet has to be a locker key with a yellow tag. That whole description is required. We have not been told that every yellow-tagged locker key opens it.',
    ],
  },
  {
    id: 'mixed-condition-3', stage: 'complete-condition', skill: 'qualification',
    sentence: 'A current safety certificate is required to lead the climbing group.',
    prompt: 'What does someone need to lead the climbing group?',
    options: ['A current safety certificate', 'A safety certificate', 'Leading the climbing group'], correct: 0,
    errorByOption: [null, 'qualification', 'direction'],
    feedback: [
      'Current belongs in the requirement. Leading the climbing group requires a current safety certificate; an expired certificate would not meet the stated requirement. Having a current one does not establish that someone leads the group.',
      'Safety certificate alone allows an expired certificate. The sentence requires a current one, so that qualification must stay in the label.',
      'Leading the group is what needs the certificate. Required refers back to the complete requirement before it: a current safety certificate.',
    ],
  },
];

const envelopeRule = 'Every envelope in the dispatch tray is stamped.';

/** The four reviewed comparisons retain the existing envelope example. */
export const equivalenceItems: MixedDrillChoiceItem[] = [
  {
    id: 'mixed-equivalence-1', stage: 'equivalence', skill: 'equivalence',
    sentence: 'Only stamped envelopes go into the dispatch tray.',
    prompt: `Original rule: ${envelopeRule} Does the new sentence preserve it?`,
    options: ['Same rule', 'Reversed rule'], correct: 0,
    errorByOption: [null, 'equivalence'],
    feedback: [
      'Only makes a stamp necessary for an envelope in the tray. An envelope in the tray must be stamped, just as in the original. A stamped envelope can still be elsewhere.',
      'This has not made a stamp enough for going into the tray. Only limits tray envelopes to stamped ones, so the starting condition remains being in the tray.',
    ],
  },
  {
    id: 'mixed-equivalence-2', stage: 'equivalence', skill: 'equivalence',
    sentence: 'An envelope goes into the dispatch tray if it is stamped.',
    prompt: `Original rule: ${envelopeRule} Does the new sentence preserve it?`,
    options: ['Same rule', 'Reversed rule'], correct: 1,
    errorByOption: ['equivalence', null],
    feedback: [
      'If now makes a stamp sufficient for going into the tray. The original allowed a stamped envelope elsewhere. This sentence sends every stamped envelope into the tray, so it changes the rule.',
      'The new sentence starts from the stamp and establishes the tray. The original starts from the tray and establishes the stamp. A stamped envelope elsewhere fits the original but conflicts with this reverse.',
    ],
  },
  {
    id: 'mixed-equivalence-3', stage: 'equivalence', skill: 'equivalence',
    sentence: 'The only envelopes in the dispatch tray are stamped envelopes.',
    prompt: `Original rule: ${envelopeRule} Does the new sentence preserve it?`,
    options: ['Reversed rule', 'Same rule'], correct: 1,
    errorByOption: ['equivalence', null],
    feedback: [
      'The only refers to envelopes in the dispatch tray. Pick an envelope in that group and it must be stamped. Starting from a stamp instead would add a claim about where stamped envelopes go.',
      'The only identifies the tray envelopes as the complete starting group. Each has a stamp. This keeps the original relationship and leaves stamped envelopes elsewhere possible.',
    ],
  },
  {
    id: 'mixed-equivalence-4', stage: 'equivalence', skill: 'equivalence',
    sentence: 'An envelope goes into the dispatch tray only if it is stamped.',
    prompt: `Original rule: ${envelopeRule} Does the new sentence preserve it?`,
    options: ['Same rule', 'Reversed rule'], correct: 0,
    errorByOption: [null, 'equivalence'],
    feedback: [
      'Only if makes being stamped a requirement for going into the tray. Every envelope in the tray must meet that requirement. It does not promise a place there to every stamped envelope.',
      'Read only if as the whole expression. The stamp is required for the tray, rather than enough for it. That preserves the original rule.',
    ],
  },
];

export const transferItems: MixedDrillChoiceItem[] = [
  {
    id: 'mixed-transfer-1', stage: 'transfer', skill: 'direction',
    sentence: 'The heater runs if the timer reaches six.',
    prompt: 'Which diagram preserves what the sentence says?',
    options: ['Heater runs → Timer reaches six', 'Timer reaches six → Heater runs', 'Timer has not reached six → Heater does not run'], correct: 1,
    errorByOption: ['direction', null, 'direction'],
    feedback: [
      'The sentence has not said the timer is the only way to start the heater. A running heater before six could fit the rule. Start from the complete if-clause: the timer reaches six.',
      'The if-clause is enough even though it comes last. If the timer reaches six, the heater runs. A running heater alone leaves the timer reading open.',
      'You made the absence of six enough to establish that the heater is off. It could run at another time without breaking the rule. The sentence only establishes running when the timer reaches six.',
    ],
  },
  {
    id: 'mixed-transfer-2', stage: 'transfer', skill: 'qualification',
    sentence: 'Any trainee certified for night work receives a shift badge.',
    prompt: 'Which diagram gives a badge to the trainees this rule covers?',
    options: ['Trainee → Receives shift badge', 'Receives shift badge → Trainee certified for night work', 'Trainee certified for night work → Receives shift badge'], correct: 2,
    errorByOption: ['qualification', 'direction', null],
    feedback: [
      'Trainee alone extends the rule to trainees without night-work certification. Keep certified for night work in the starting condition.',
      'Receiving the badge is the result, not proof of this certification. A badge recipient without that certification could fit the rule. Start from the complete group the sentence covers.',
      'The rule covers every trainee certified for night work. That full condition establishes a shift badge. It leaves the badge status of other trainees open.',
    ],
  },
  {
    id: 'mixed-transfer-3', stage: 'transfer', skill: 'requirement',
    sentence: 'Only electric vehicles are permitted inside the courtyard.',
    prompt: 'A vehicle is electric. What does this rule establish about its permission to enter?',
    options: ['It is permitted inside.', 'It is not permitted inside.', 'Its permission remains open.'], correct: 2,
    errorByOption: ['requirement', 'requirement', null],
    feedback: [
      'Electric is required for permission, but the sentence does not make it enough. An electric vehicle denied permission still fits the rule. Actual entry is a separate question.',
      'The rule does not deny permission to electric vehicles. Some could be permitted and others denied. It only restricts permitted vehicles to electric ones.',
      'Any permitted vehicle has to be electric. Knowing a vehicle is electric does not settle whether it has permission. An electric vehicle denied permission fits the sentence, as does an electric vehicle with permission.',
    ],
  },
  {
    id: 'mixed-transfer-4', stage: 'transfer', skill: 'equivalence',
    sentence: 'Finalists must attend the safety interview.',
    prompt: 'Someone rewrites this as: Every finalist attended the safety interview. Does the rewrite keep the original meaning?',
    options: ['Yes. A requirement proves that the action happened.', 'No. The rewrite reports attendance instead of an obligation.'], correct: 1,
    errorByOption: ['equivalence', null],
    feedback: [
      'Must gives finalists an obligation to attend. It does not supply a fact showing they complied. Keep required to attend in the result rather than reporting completed attendance.',
      'The original establishes an obligation for each finalist. A finalist who has not attended could still have that obligation. The rewrite reports completed attendance, so it adds something the original did not establish.',
    ],
  },
];

/** New cases confirm a repaired skill without repeating the question just solved. */
export const confirmationItemsByError: Record<MixedDrillError, MixedDrillChoiceItem[]> = {
  direction: [{
    id: 'mixed-confirm-direction', stage: 'confirmation', skill: 'direction',
    sentence: 'An invitation is printed when the registration is accepted.',
    prompt: 'Which diagram keeps what acceptance tells us about the invitation?',
    options: ['Invitation printed → Registration accepted', 'Registration accepted → Invitation printed', 'Registration accepted → Registration accepted'], correct: 1,
    errorByOption: ['direction', null, 'direction'],
    feedback: [
      'Printing is what acceptance establishes. The rule has not said every printed invitation proves acceptance. Start from the complete when-clause: the registration is accepted.',
      'Acceptance is enough for printing, so put registration accepted on the left and invitation printed on the right. A printed invitation alone leaves acceptance open.',
      'Both sides name acceptance. That leaves out what the rule establishes about the invitation. Keep acceptance on the left, then put invitation printed on the right.',
    ],
  }],
  qualification: [{
    id: 'mixed-confirm-qualification', stage: 'confirmation', skill: 'qualification',
    sentence: 'Every courier delivering refrigerated medicine carries an insulated pack.',
    prompt: 'Which couriers does the rule say carry an insulated pack?',
    options: ['Courier delivering refrigerated medicine', 'Courier', 'Courier delivering medicine'], correct: 0,
    errorByOption: [null, 'qualification', 'qualification'],
    feedback: [
      'Keep delivering refrigerated medicine attached to courier. The rule establishes an insulated pack for each courier in that complete group. It leaves other couriers outside this promise.',
      'Courier alone includes couriers carrying other deliveries. The rule covers couriers delivering refrigerated medicine, so retain both delivery and refrigeration.',
      'Medicine alone includes medicine that is not refrigerated. That would broaden the group beyond the sentence. Keep refrigerated when you describe which couriers the rule covers.',
    ],
  }],
  requirement: [{
    id: 'mixed-confirm-requirement', stage: 'confirmation', skill: 'requirement',
    sentence: 'A reader books a study room only if the reader has a verified account.',
    prompt: 'A reader has a verified account. Does the rule establish a booking?',
    options: ['No. A booking remains open.', 'Yes. Verification is enough for a booking.'], correct: 0,
    errorByOption: [null, 'requirement'],
    feedback: [
      'Only if makes verification required for booking. A reader with a verified account could make a booking or never make one. Verification alone leaves booking open.',
      'You made the requirement enough. A verified reader who does not book fits the sentence. The rule tells us what a booking needs, not that verification establishes booking.',
    ],
  }],
  equivalence: [{
    id: 'mixed-confirm-equivalence', stage: 'confirmation', skill: 'equivalence',
    sentence: 'Only registered boats use the slipway.',
    prompt: 'Does this say the same thing as: Every boat using the slipway is registered?',
    options: ['No. The second sentence reverses the rule.', 'Yes. Both require registration for using the slipway.'], correct: 1,
    errorByOption: ['equivalence', null],
    feedback: [
      'Only restricts slipway users to registered boats. Every boat using the slipway must therefore be registered. Both start from use, rather than from registration.',
      'Both require registration for a boat using the slipway. A registered boat that never uses it fits both sentences. Neither makes registration enough for use.',
    ],
  }],
};


/** Use this instead of the general equivalence case after an obligation/compliance error. */
export const obligationConfirmationItem: MixedDrillChoiceItem = {
  id: 'mixed-confirm-obligation', stage: 'confirmation', skill: 'equivalence',
  sentence: 'Volunteers must bring identification to the orientation.',
  prompt: 'Nadia is a volunteer. Which conclusion keeps the meaning of must?',
  options: ['Nadia brought identification.', 'Nadia is required to bring identification.'], correct: 1,
  errorByOption: ['equivalence', null],
  feedback: [
    'The rule gives Nadia an obligation. It does not tell us that she complied. A volunteer who has not brought identification could still be required to bring it.',
    'Being a volunteer gives Nadia the stated obligation to bring identification. Whether she actually brought it remains open. Keep required to bring in the result so your conclusion does not report an action we have not been told happened.',
  ],
};
