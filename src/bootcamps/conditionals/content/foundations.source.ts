import type { ConditionalQuestion, ConditionalUnit } from './types';

/**
 * Original LSAT U drafts, 2026-10-01. Pedagogical provenance: ai-os/wiki/teaching-voice.md,
 * ai-os/wiki/COPY-CORRECTIONS.md, and ai-os/brainstorms/2026-09-30-conditional-curriculum/.
 * Group taxonomy is taken from src/features/conditional-refresher/content.ts.
 * All scenarios, questions and explanations below are newly authored, not official LSAT items.
 * Difficulty concerns interpretation and inference. These sets prescribe no mastery threshold or clock.
 */
const question = (
  id: string, prompt: string, options: string[], answerIndex: number,
  hint: string, reasoningSteps: string[],
): ConditionalQuestion => ({ id, prompt, options, answerIndex, hint, reasoningSteps, explanation: reasoningSteps.join(' ') });

export const foundationUnits: ConditionalUnit[] = [
  {
    id: 'orientation', title: 'Find the Guarantee', area: 'understanding', phase: 'conditional', prerequisites: [],
    goal: 'Separate a guarantee, a case fact and a prediction before drawing a conclusion.',
    teaching: [
      'A conditional rule tells you what follows when a condition is met. If a parcel is scanned at intake, its tracking record is updated. Scanning is the starting condition. Updating the record is the guaranteed result.',
      'The rule does not tell you that any parcel was scanned. A case fact supplies that information: Parcel 18 was scanned at intake. Together, the rule and the fact establish that Parcel 18\'s tracking record was updated.',
      'Probably and usually express weaker claims. They do not give an exceptionless guarantee. Keep the whole claim, including its limits. An unknown result is not a false result.',
    ],
    method: ['Underline what the statement promises.', 'Separate any rule from a fact about one case.', 'Match the fact to the complete starting condition.', 'State only the promised result about that case.'],
    workedExample: { statements: ['Every calibrated gauge receives a blue seal.', 'Gauge 6 is calibrated.'], reasoning: ['The rule applies to calibrated gauges.', 'Gauge 6 meets that condition.'], conclusion: 'Gauge 6 receives a blue seal.' },
    guidedExample: question('orientation-guide', 'If a card is activated, its number is registered. Card L is activated. What follows?', ['Card L\'s number is registered.', 'Every registered number belongs to an activated card.', 'No other card is registered.'], 0, 'Match Card L to the condition after if.', ['Card L satisfies the activation condition.', 'The rule guarantees registration for that card.']),
    commonMistake: { mistake: 'Treating a rule as evidence that its starting condition occurred.', repair: 'Read the rule as a promise about qualifying cases. Look separately for a fact identifying one.' },
    drills: {
      beginner: [
        question('orientation-b1', 'Which statement gives an exceptionless rule?', ['The desk is staffed now.', 'If the desk is staffed, the bell is answered.', 'The bell is usually answered.'], 1, 'Look for a guaranteed connection.', ['The if statement links staffing to answering.', 'The other statements report a case or a tendency.']),
        question('orientation-b2', 'Every numbered crate has a label. Which additional fact lets you conclude that Crate M has a label?', ['Crate M is numbered.', 'Crate M is heavy.', 'Crate M might be numbered.'], 0, 'Find a fact that meets the entire starting condition.', ['Being numbered is enough for a label.', 'The first fact establishes that condition for Crate M.']),
        question('orientation-b3', 'Which claim reports a case fact?', ['All restored books have new bindings.', 'Book 4 has a new binding.', 'Restored books generally look newer.'], 1, 'A case fact identifies a particular subject.', ['Book 4 is one specified book.', 'The statement reports its binding rather than a general relationship.']),
      ],
      medium: [
        question('orientation-m1', 'Most inspected lifts operate quietly. Lift 2 was inspected. Is quiet operation guaranteed?', ['Yes.', 'No; quiet operation is impossible.', 'No; it remains unsettled.'], 2, 'Most allows exceptions.', ['The claim permits some inspected lifts to operate noisily.', 'Nothing identifies which kind Lift 2 is.']),
        question('orientation-m2', 'If a roof has a solar panel, it has a support frame. A roof has a support frame. What is established?', ['It has a solar panel.', 'It has no solar panel.', 'Its panel status is unknown.'], 2, 'The promised result does not establish its source.', ['The rule promises a frame for panel-equipped roofs.', 'It does not exclude frames on other roofs.']),
        question('orientation-m3', 'Every sealed sample is logged. No sample is said to be sealed. Which conclusion follows?', ['A logged sample exists.', 'Every sealed sample is logged, but existence remains unknown.', 'No samples are logged.'], 1, 'Distinguish a relationship from an existing member.', ['The rule governs any sealed sample.', 'It does not assert that a sample of that kind exists.']),
      ],
      advanced: [
        question('orientation-a1', 'Every visitor authorized to enter the archive may request a copy. Imani is a visitor authorized to enter the archive. What is guaranteed?', ['Imani requests a copy.', 'Imani may request a copy.', 'Imani receives a copy.'], 1, 'Permission is not an action or a completed outcome.', ['The rule grants permission to authorized visitors.', 'It says neither that Imani uses it nor that a request succeeds.']),
        question('orientation-a2', 'Every sensor certified for underwater use has a sealed housing. Sensor K is certified for indoor use. What follows about its housing?', ['It is sealed.', 'It is not sealed.', 'Neither conclusion is established.'], 2, 'Compare the two certification scopes.', ['Indoor certification does not establish underwater certification.', 'The supplied rule therefore gives no housing result for K.']),
        question('orientation-a3', 'The manual says: If the warning light flashes, shut down the machine. The light flashes. What follows from this instruction alone?', ['The machine has shut down.', 'The instruction calls for shutdown.', 'The machine cannot shut down.'], 1, 'Keep an instruction separate from compliance.', ['The flashing light satisfies the instruction\'s condition.', 'That establishes the required response, not whether anyone performed it.']),
      ],
    },
  },
  {
    id: 'rules-facts', title: 'Facts, Rules, and What Follows', area: 'understanding', phase: 'conditional', prerequisites: ['orientation'],
    goal: 'Apply rules to case facts and distinguish case conclusions from new rules.',
    teaching: [
      'A fact tells you something about a case. A rule connects conditions. Every digitized map is searchable is a rule. Map R is digitized is a fact. Match the fact to the rule\'s starting condition to conclude that Map R is searchable.',
      'For digitized → searchable, digitized establishes searchable. Not searchable rules out digitized: a digitized map would have to be searchable. Searchable alone leaves digitization unknown. Not digitized alone leaves searchability unknown.',
      'Two rules can create a new rule. Digitized → searchable and searchable → indexed give digitized → indexed. They do not establish that an indexed map exists. Add a digitized case as a separate fact to establish an indexed case.',
    ],
    method: ['List rules separately from case facts.', 'Keep the same subject and exact predicates when matching.', 'Use a present trigger or an absent required result.', 'Label the output as a case conclusion or a conditional rule.'],
    workedExample: { statements: ['Every waterproof notebook has coated pages.', 'Notebook A does not have coated pages.'], reasoning: ['Waterproof status would require coated pages.', 'That required result is absent for A.'], conclusion: 'Notebook A is not waterproof.' },
    guidedExample: question('rules-facts-guide', 'Every translated notice is archived. Notice H is archived. What follows about translation?', ['H is translated.', 'H is not translated.', 'Translation is unknown.'], 2, 'Archiving is the required result, not the trigger.', ['Translated notices must be archived.', 'Other notices may also be archived, so the fact settles neither translation nor its absence.']),
    commonMistake: { mistake: 'Calling an allowed case a proven case.', repair: 'Ask whether every situation fitting the information includes the conclusion. If both outcomes fit, say unknown.' },
    drills: {
      beginner: [
        question('rules-facts-b1', 'Every tested battery has a sticker. Battery P was tested. What follows?', ['P has a sticker.', 'P is the only tested battery.', 'All stickered batteries were tested.'], 0, 'Apply the rule to P without adding a reverse rule.', ['P meets the tested condition.', 'The sticker follows for P alone.']),
        question('rules-facts-b2', 'Every polished lens is clear. Lens J is not clear. What follows?', ['J is polished.', 'J is not polished.', 'J is clear after all.'], 1, 'Could a polished lens lack the required clarity?', ['Polishing would require clarity.', 'J lacks clarity, so J cannot be polished under the rule.']),
        question('rules-facts-b3', 'Every reserved seat has a marker. Seat W is not reserved. Its marker status is:', ['Guaranteed present.', 'Guaranteed absent.', 'Unknown.'], 2, 'The rule speaks only about reserved seats.', ['An unreserved seat does not activate the rule.', 'A marker may be present or absent without breaking it.']),
      ],
      medium: [
        question('rules-facts-m1', 'Every encrypted file is restricted. Every restricted file is logged. No case fact is supplied. Which follows?', ['Some logged files exist.', 'Every encrypted file is logged.', 'Every logged file is encrypted.'], 1, 'Match the shared restricted condition.', ['Encryption leads to restriction, which leads to logging.', 'The resulting rule does not assert a file exists.']),
        question('rules-facts-m2', 'Every approved replacement part is stocked. Part D is a replacement part, but approval is unknown. What follows?', ['D is stocked.', 'D is not stocked.', 'Stocking remains unknown.'], 2, 'Replacement part and approved replacement part differ.', ['The trigger includes approval.', 'The supplied fact does not meet that entire trigger.']),
        question('rules-facts-m3', 'Every public hearing is recorded. Hearing N is recorded. A student concludes it is public. Which repair is accurate?', ['Recorded → public was never given.', 'Public hearings cannot be recorded.', 'The rule has no starting condition.'], 0, 'Identify the direction the student added.', ['The rule runs from public status to recording.', 'The student used its unsupported reverse.']),
      ],
      advanced: [
        question('rules-facts-a1', 'Every eligible applicant may appeal. Tavi is an eligible applicant. Which follows?', ['Tavi has appealed.', 'Tavi may appeal.', 'Tavi\'s appeal was accepted.'], 1, 'Preserve the modal word may.', ['Tavi satisfies the complete eligible-applicant condition, which grants appeal permission.', 'Permission establishes neither action nor acceptance.']),
        question('rules-facts-a2', 'Every licensed guide must carry a radio. Guide Z carries no radio. What follows about compliance?', ['Z cannot be licensed in real life.', 'If Z is licensed, Z violates the stated requirement.', 'Z must be unlicensed in real life.'], 1, 'A requirement can be violated; it is not a physical impossibility.', ['A licensed Z would be required to carry a radio.', 'The fact would show noncompliance, rather than proving absence of a license.']),
        question('rules-facts-a3', 'Every shortlisted design is displayed. Every displayed design is catalogued. Design E is not catalogued. What follows?', ['E is shortlisted.', 'E is not shortlisted.', 'No design is displayed.'], 1, 'Trace what shortlisting would force for E.', ['Shortlisting would lead through display to cataloguing.', 'E lacks the final required result, so E is not shortlisted.']),
      ],
    },
  },
  {
    id: 'sufficient-necessary', title: 'Enough to Guarantee, Required to Follow', area: 'understanding', phase: 'conditional', prerequisites: ['rules-facts'],
    goal: 'Identify sufficient and necessary roles and test the four case combinations.',
    teaching: [
      'If a window is impact-rated, it has reinforced glass. Impact-rated is sufficient for reinforced glass: it is enough to guarantee it. Reinforced glass is necessary for impact-rated status: the rating cannot occur without it under this descriptive rule.',
      'Sufficient and necessary name roles in a particular relationship. Reinforced glass may be the sufficient condition of a different rule. It is not permanently a necessary condition.',
      'The single forbidden combination is impact-rated with no reinforced glass. The other three combinations fit the rule. Reinforced glass alone does not prove the rating. No rating does not prove no reinforced glass.',
    ],
    method: ['Read the rule as if this starting condition holds, that result must hold.', 'Name the sufficient condition and necessary condition completely.', 'Look for a trigger paired with an absent required result.', 'Distinguish consistency with the rule from a fact established by the rule.'],
    workedExample: { statements: ['Every certified helmet has an inner liner.', 'A helmet has an inner liner but is not certified.'], reasoning: ['Certification requires a liner.', 'The rule does not require every lined helmet to be certified.'], conclusion: 'This combination fits the rule; it does not reverse it.' },
    guidedExample: question('sufficient-necessary-guide', 'Every verified account has a recovery code. Which combination violates the rule?', ['Verified, with a recovery code.', 'Verified, without a recovery code.', 'Unverified, with a recovery code.'], 1, 'Look for the trigger without its required result.', ['Verification is sufficient for a recovery code.', 'A verified account without one breaks that guarantee.']),
    commonMistake: { mistake: 'Treating a necessary condition as sufficient.', repair: 'A required ingredient need not be a complete recipe. Ask whether the reverse relationship was actually supplied.' },
    drills: {
      beginner: [
        question('sufficient-necessary-b1', 'If a cabinet is fire-rated, it has a steel shell. Which condition does this rule identify as guaranteeing a steel shell?', ['Being fire-rated.', 'Having a steel shell.', 'Not being fire-rated.'], 0, 'Find the condition the if clause presents as its trigger.', ['Fire-rated status is the condition the rule presents as sufficient.', 'It guarantees the steel-shell result; the result itself is not the starting condition identified by this rule.']),
        question('sufficient-necessary-b2', 'Every accredited course has an assessment. What is necessary for accreditation?', ['Absence of an assessment.', 'Having an assessment.', 'Being an evening course.'], 1, 'What must an accredited course have?', ['Accreditation cannot occur without an assessment under the rule.', 'An assessment is therefore necessary, though not stated sufficient.']),
        question('sufficient-necessary-b3', 'Every packaged tube has a cap. Which case fits the rule?', ['Packaged, no cap.', 'Not packaged, with a cap.', 'Packaged, no cap, but small.'], 1, 'The rule restricts packaged tubes only.', ['A capped unpackaged tube does not break the guarantee.', 'Both packaged uncapped cases do.']),
      ],
      medium: [
        question('sufficient-necessary-m1', 'For polished → reflective and reflective → visible, reflective is:', ['Necessary in both rules.', 'Necessary in the first; sufficient in the second.', 'Sufficient in both rules.'], 1, 'Name its role separately on each arrow.', ['Reflective is the required result of polishing.', 'It is the starting condition that guarantees visibility.']),
        question('sufficient-necessary-m2', 'Every tagged specimen is stored. Specimen F is stored. Tagged status is:', ['Guaranteed.', 'Ruled out.', 'Unknown.'], 2, 'Can an untagged specimen also be stored?', ['Storage is necessary for tagging, but not stated sufficient.', 'Both tagged and untagged stored specimens fit.']),
        question('sufficient-necessary-m3', 'If a seat is upgraded, it has extra legroom. A seat is not upgraded and has no extra legroom. This case is:', ['Forbidden.', 'Allowed, but not established by the rule alone.', 'Required for every seat.'], 1, 'Neither condition of the forbidden combination is present.', ['The sufficient condition is absent.', 'The rule allows this case but does not assert it occurred.']),
      ],
      advanced: [
        question('sufficient-necessary-a1', 'Every paper accepted for the student symposium has a faculty sponsor. Which is sufficient for sponsorship under this rule?', ['Acceptance for any conference.', 'Acceptance for the student symposium.', 'Merely being a paper.'], 1, 'Keep the named event inside the condition.', ['The rule is restricted to acceptance for this symposium.', 'It gives no guarantee for papers accepted elsewhere.']),
        question('sufficient-necessary-a2', 'Every authenticated token is valid. A token is valid but not authenticated. What does that show?', ['The rule is false.', 'Validity can hold without authentication consistently with the rule.', 'Authentication is necessary for validity.'], 1, 'Only authentication without validity would contradict the rule.', ['The rule does not run from validity to authentication.', 'The described case fits its one-way relationship.']),
        question('sufficient-necessary-a3', 'Every priority packet is routed through Server C. No priority packets are known to exist. Which is accurate?', ['Routing through C is necessary for priority status; no such packet is established.', 'A packet through C must exist.', 'Routing through C is sufficient for priority status.'], 0, 'Separate the role of a condition from membership in it.', ['Priority status requires routing through C.', 'A universal rule alone creates no existing priority packet.']),
      ],
    },
  },
  {
    id: 'truth-validity', title: 'Does the Conclusion Have to Follow?', area: 'understanding', phase: 'conditional', prerequisites: ['sufficient-necessary'],
    goal: 'Test whether true premises could coexist with a false conclusion.',
    teaching: [
      'Truth concerns whether a statement matches the facts. Validity concerns the connection between premises and conclusion. To test a deduction, temporarily accept its premises. Ask whether its conclusion could still be false.',
      'Every copper key is magnetic. This key is copper. Therefore this key is magnetic. The reasoning follows the given rule, even if the first premise is false outside the exercise. We are testing the inference, not endorsing the premise.',
      'A counterexample keeps every premise true while making the conclusion false. For A → B and B, therefore A, a case with B but no A does that. Invalid does not mean the conclusion must be false. It means the premises do not establish it.',
    ],
    method: ['Accept the supplied premises for the inference test.', 'Identify the exact conclusion.', 'Try to keep all premises true while making that conclusion false.', 'If such a case is possible, the conclusion is not guaranteed.'],
    workedExample: { statements: ['Every circular tile is blue.', 'Tile P is blue.', 'Claim: Tile P is circular.'], reasoning: ['The rule allows a blue square tile.', 'That case preserves the premises and defeats the claim.'], conclusion: 'Circularity is not guaranteed.' },
    guidedExample: question('truth-validity-guide', 'Every enrolled swimmer has a locker. Ren is enrolled as a swimmer. Therefore Ren has a locker. The inference is:', ['Valid from the premises.', 'Invalid because lockers may be expensive.', 'Invalid because enrollment is not necessary for a locker.'], 0, 'Only test the direction actually used.', ['Ren meets the rule\'s sufficient condition.', 'The conclusion is the required result, so it follows.']),
    commonMistake: { mistake: 'Rejecting an inference because a premise sounds unrealistic.', repair: 'First assess whether the conclusion follows if the premises are true. Assess premise truth as a separate question.' },
    drills: {
      beginner: [
        question('truth-validity-b1', 'Every gold leaf is transparent. Leaf R is gold. Therefore R is transparent. Does the conclusion follow from these premises?', ['Yes.', 'No, because gold is not normally transparent.', 'Only if transparent leaves are gold.'], 0, 'Treat the unusual premise as given.', ['R satisfies the gold condition.', 'Transparency follows by the stated rule regardless of real-world plausibility.']),
        question('truth-validity-b2', 'Every bound booklet has a cover. Booklet D has a cover. Therefore D is bound. The problem is:', ['The conclusion contradicts the rule.', 'The rule was reversed without support.', 'The premises establish no cover.'], 1, 'A cover may have another source.', ['The premises allow an unbound covered booklet.', 'They therefore do not guarantee binding.']),
        question('truth-validity-b3', 'An invalid argument\'s conclusion must be:', ['False.', 'True.', 'Neither; validity alone does not settle its truth.'], 2, 'Failure of proof is not proof of falsity.', ['Invalidity means the premises do not force the conclusion.', 'The conclusion may still be true for other reasons.']),
      ],
      medium: [
        question('truth-validity-m1', 'Every laminated card resists water. Card B resists water. Claim: B is laminated. Which counterexample works?', ['B is laminated and resists water.', 'B is not laminated and resists water.', 'B is laminated and does not resist water.'], 1, 'Keep the rule and the resistance fact true.', ['An unlaminated resistant card is permitted by the rule.', 'It makes the proposed conclusion false while preserving both premises.']),
        question('truth-validity-m2', 'Every active beacon transmits. Beacon H does not transmit. Therefore H is not active. This is:', ['Valid.', 'An unsupported reverse.', 'Invalid because it uses a negative fact.'], 0, 'Would activity be compatible with no transmission?', ['Activity would require transmission.', 'The absent required result excludes activity.']),
        question('truth-validity-m3', 'Every reserved bicycle has a lock. Bicycle Y is not reserved. Claim: Y has no lock. Which test defeats the claim?', ['Y is unreserved but locked.', 'Y is reserved but unlocked.', 'Y is reserved and locked.'], 0, 'Keep the explicit unreserved fact.', ['An unreserved locked bicycle violates no premise.', 'It shows that absence of reservation does not force absence of a lock.']),
      ],
      advanced: [
        question('truth-validity-a1', 'Every approved design is documented. Every documented design is archived. Design C is archived. Claim: C is approved. Which is accurate?', ['The chain proves approval.', 'An archived unapproved design is a counterexample.', 'Archiving contradicts approval.'], 1, 'The final result need not identify the initial trigger.', ['Both rules permit archiving designs that were never approved.', 'Such a design defeats the reverse conclusion.']),
        question('truth-validity-a2', 'Every enrolled adult in this workshop has a badge. Kira is an enrolled child with a badge. Claim: Kira is an adult. Which explains the failure?', ['The rule\'s adult condition cannot be inferred from a badge.', 'Children cannot have badges.', 'Workshop enrollment always establishes adulthood.'], 0, 'A modifier remains part of the sufficient condition.', ['The premise restricts what enrolled adults have.', 'It neither prohibits children\'s badges nor makes a badge proof of adulthood.']),
        question('truth-validity-a3', 'All encrypted backups are remote. No encrypted backup is known to exist. Claim: Some remote backup exists. Which possibility defeats the claim?', ['There are no backups.', 'There is an encrypted remote backup.', 'Every backup is encrypted.'], 0, 'A universal premise can hold with no qualifying cases.', ['With no backups, the universal rule has no counterexample.', 'The existential conclusion is nevertheless false.']),
      ],
    },
  },
  {
    id: 'negation', title: 'Say Exactly What Is Not True', area: 'understanding', phase: 'conditional', prerequisites: ['truth-validity'],
    goal: 'Negate a complete simple predicate without substituting an everyday opposite.',
    teaching: [
      'Negation denies the claim you actually have. The opposite of the room is warm is the room is not warm. The room is cold is stronger: a room can be neither warm nor cold.',
      'Keep the subject, time and scope. The panel is approved for outdoor use becomes the panel is not approved for outdoor use. It does not become the panel is not approved for any use.',
      'Negating a negative removes that negative: not not registered means registered. This lesson works with simple complete conditions. Negating AND/OR combinations and entire conditional rules requires the later lessons devoted to those structures.',
    ],
    method: ['Write the exact predicate being denied.', 'Add not to that predicate without changing its subject or scope.', 'Cancel a double negative when one is created.', 'Check that the claim and its negation cannot both be true or both be false.'],
    workedExample: { statements: ['The package arrived before noon.'], reasoning: ['Deny arrival before noon.', 'Arrival at noon, later arrival and nonarrival all fail the original claim.'], conclusion: 'The package did not arrive before noon.' },
    guidedExample: question('negation-guide', 'What is the exact negation of The sculpture is not insured?', ['The sculpture is expensive.', 'The sculpture is insured.', 'The sculpture is damaged.'], 1, 'Negate the existing not.', ['Denying not insured cancels that negative.', 'The result is insured, with no further claim.']),
    commonMistake: { mistake: 'Replacing not good with bad, or not required with forbidden.', repair: 'Deny the exact claim. Leave middle cases and different modal claims available.' },
    drills: {
      beginner: [
        question('negation-b1', 'Negate: The corridor is wide.', ['The corridor is narrow.', 'The corridor is not wide.', 'The corridor is short.'], 1, 'Do not replace the predicate with a stronger opposite.', ['Not wide denies exactly wide.', 'Narrow and short are additional claims.']),
        question('negation-b2', 'Negate: This badge is valid.', ['This badge is not valid.', 'No badge is valid.', 'This badge is old.'], 0, 'Keep this one badge as the subject.', ['The original concerns this badge alone.', 'Its denial is that this badge is not valid.']),
        question('negation-b3', 'Negate: The key is not missing.', ['The key is found.', 'The key is missing.', 'The key is not lost.'], 1, 'Remove the negative you are denying.', ['Not missing is the full predicate.', 'Its negation is missing; found adds a different claim.']),
      ],
      medium: [
        question('negation-m1', 'Negate: Permit P is valid for night access.', ['P is invalid for all access.', 'P is not valid for night access.', 'P is valid for daytime access.'], 1, 'Retain the night-access restriction.', ['Only validity for night access is denied.', 'Other permissions remain unsettled.']),
        question('negation-m2', 'Negate: Rowan must submit a report.', ['Rowan must not submit a report.', 'It is not required that Rowan submit a report.', 'Rowan did not submit a report.'], 1, 'Deny the requirement, not the action.', ['Not required removes the obligation.', 'It neither prohibits a report nor establishes noncompliance.']),
        question('negation-m3', 'Negate: The route is not unsafe.', ['The route is unsafe.', 'The route is safe.', 'The route is not safe.'], 0, 'Unsafe is the predicate inside not.', ['Denying not unsafe yields unsafe.', 'No separate definition equating safe with not unsafe is needed.']),
      ],
      advanced: [
        question('negation-a1', 'Negate: Shipment T arrived by 4 p.m. on Monday.', ['T arrived after 4 p.m. Monday.', 'T did not arrive by 4 p.m. Monday.', 'T arrived Tuesday.'], 1, 'Nonarrival must remain a possible way to deny the original.', ['The exact denial retains the same deadline.', 'Arrival later is only one possibility; nonarrival also fits.']),
        question('negation-a2', 'Negate: Device J is certified to operate at temperatures below zero.', ['J cannot operate below zero.', 'J is not certified to operate below zero.', 'J is certified only above zero.'], 1, 'Certification and physical ability differ.', ['The original is about a certification.', 'Denying it establishes neither inability nor another certification.']),
        question('negation-a3', 'Negate: It is not the case that Record Q is absent from the index.', ['Q is absent from the index.', 'Q is absent from every record system.', 'Q is present in the index.'], 0, 'First identify the claim inside the outer not.', ['The original denies absence from this index.', 'Negating that denial restores absence from this same index.']),
      ],
    },
  },
  {
    id: 'contraposition', title: 'Follow a Missing Requirement Backward', area: 'inference', phase: 'conditional', prerequisites: ['negation', 'sufficient-necessary'],
    goal: 'Form an equivalent rule by reversing the conditions and negating both.',
    teaching: [
      'Every verified invoice is recorded. If an invoice were verified, it would have to be recorded. An invoice that is not recorded therefore cannot be verified. Verified → recorded and not recorded → not verified make the same guarantee.',
      'To form a contrapositive, reverse the two complete conditions and negate both. Reversing alone gives an unsupported converse. Negating both without reversing gives an unsupported inverse.',
      'Keep existing negatives and cancel double negatives. If a sensor is active, it is not silent becomes if it is silent, it is not active. Keep the same device and time throughout. A normative requirement establishes what must be done, not automatic factual compliance.',
    ],
    method: ['Write both complete conditions.', 'Exchange their positions.', 'Negate each condition, cancelling double negatives.', 'Read the new rule in ordinary language and check the missing-required-result reasoning.'],
    workedExample: { statements: ['Every listed product is not discontinued.'], reasoning: ['Listed → not discontinued.', 'Reverse and negate: discontinued → not listed.'], conclusion: 'Every discontinued product is not listed.' },
    guidedExample: question('contraposition-guide', 'Every restored clock keeps time. Which is equivalent?', ['Every timekeeping clock is restored.', 'Every clock not keeping time is not restored.', 'Every unrestored clock fails to keep time.'], 1, 'Begin with absence of the required result.', ['Keeping time is required for restoration under this rule.', 'A clock lacking it cannot be restored.']),
    commonMistake: { mistake: 'Reversing the arrow but leaving both conditions unchanged.', repair: 'Reverse and negate both. Check that the new trigger is the absence of the old required result.' },
    drills: {
      beginner: [
        question('contraposition-b1', 'Every sealed envelope is stamped. Its contrapositive is:', ['Stamped → sealed.', 'Not stamped → not sealed.', 'Not sealed → not stamped.'], 1, 'Reverse the conditions and negate both.', ['Stamping is required for sealing in this rule.', 'No stamp therefore excludes sealing.']),
        question('contraposition-b2', 'If a lamp is on, it draws current. The lamp draws no current. What follows?', ['The lamp is not on.', 'The lamp is broken.', 'The lamp has no bulb.'], 0, 'Use the missing required result, without inventing a cause.', ['Being on would require current.', 'No current excludes on, but does not establish why.']),
        question('contraposition-b3', 'Every checked form is complete. Which is the unsupported inverse?', ['Not complete → not checked.', 'Checked → complete.', 'Not checked → not complete.'], 2, 'The inverse negates without swapping.', ['The original starts with checked.', 'Not checked → not complete adds a direction the original does not guarantee.']),
      ],
      medium: [
        question('contraposition-m1', 'If a unit is refrigerated, it is not overheated. Which is equivalent?', ['Overheated → not refrigerated.', 'Not refrigerated → overheated.', 'Not overheated → refrigerated.'], 0, 'The negation of not overheated is overheated.', ['Swap the conditions and deny each.', 'The double negative on overheated cancels.']),
        question('contraposition-m2', 'If a ticket is not cancelled, it is logged. Which is equivalent?', ['Not logged → cancelled.', 'Logged → not cancelled.', 'Cancelled → not logged.'], 0, 'Negate the original negative trigger after swapping.', ['No logging excludes not cancelled.', 'Denying not cancelled yields cancelled.']),
        question('contraposition-m3', 'If a signal is not stable, it is not accepted. Which is equivalent?', ['Accepted → stable.', 'Stable → accepted.', 'Not accepted → not stable.'], 0, 'Both negatives cancel in the contrapositive.', ['The old result\'s denial is accepted.', 'That requires denial of not stable, namely stable.']),
      ],
      advanced: [
        question('contraposition-a1', 'Every driver certified for Route 8 is listed on its roster. Ivo is a driver who is not listed on the Route 8 roster. Which follows?', ['Ivo is not certified for any route.', 'Ivo is not certified for Route 8.', 'Ivo cannot drive.'], 1, 'Preserve Route 8 in both conditions.', ['Ivo is a driver, so Route 8 certification would require that roster listing.', 'Its absence excludes only that certification.']),
        question('contraposition-a2', 'Every application approved for expedited review is not missing its declaration. Which is equivalent?', ['Missing declaration → not approved for expedited review.', 'Not missing declaration → approved for expedited review.', 'Not approved for expedited review → missing declaration.'], 0, 'Negate the whole approved-for-expedited-review condition.', ['Approval of this kind excludes a missing declaration.', 'A missing declaration therefore excludes that kind of approval.']),
        question('contraposition-a3', 'If the device is running at noon, its display is lit at noon. Its display is dark at midnight. What follows about noon?', ['It was not running at noon.', 'It was running at noon.', 'Neither is established.'], 2, 'The contrapositive must keep the original time.', ['The rule requires a lit display at noon.', 'A midnight observation does not establish the absence of that noon requirement.']),
      ],
    },
  },
  {
    id: 'group-1', title: 'Group 1: Identify What Guarantees What', area: 'translation', phase: 'conditional', prerequisites: ['contraposition'],
    goal: 'Translate sufficient-condition wording while preserving full predicates and contextual meaning.',
    teaching: [
      'Group 1 includes if, when, where, all, the only, every and any in their conditional uses. If a probe restarts, its log resets gives probe restarts → its log resets. The sufficient idea can appear second: its log resets whenever a probe restarts has the same direction.',
      'Preserve the whole subject. Every permit renewed through the regional office receives a new number starts with permit renewed through the regional office, not permit. The modifier limits which permits receive the guarantee.',
      'An indicator list is a starting aid. We asked if the gate was open is an indirect question, not an if-then rule. When I arrived, the gate was open reports an event. The only paintings exhibited are restored paintings means exhibited painting → restored painting. Read the whole grammatical claim rather than attaching an arrow to an isolated noun.',
    ],
    method: ['Find the guarantee in the complete sentence.', 'Write the complete sufficient condition, including modifiers and negatives.', 'Write the required result about the same subject.', 'Read the arrow as if-then and compare its scope with the original.'],
    workedExample: { statements: ['Any parcel collected from the north depot receives a receipt.'], reasoning: ['The trigger is being a parcel collected from that depot.', 'The result is receiving a receipt for that same parcel.'], conclusion: 'Parcel collected from north depot → receives receipt.' },
    guidedExample: question('group-1-guide', 'A checkpoint report appears when a rover crosses the ridge. Which translates the rule?', ['Report appears → rover crosses ridge.', 'Rover crosses ridge → checkpoint report appears.', 'Rover does not cross ridge → no report appears.'], 1, 'When introduces the sufficient event here, despite appearing second.', ['Crossing the ridge triggers the report.', 'The sentence does not establish that reports occur only for crossings.']),
    commonMistake: { mistake: 'Dropping a modifier or reversing the rule because the result appears first.', repair: 'Write the complete if clause first. Let meaning, rather than word order, determine its role.' },
    drills: {
      beginner: [
        question('group-1-b1', 'If a locker is reserved, it displays a nameplate. Choose the rule.', ['Reserved locker → displays nameplate.', 'Nameplate displayed → reserved locker.', 'Unreserved locker → no nameplate.'], 0, 'Start with the complete idea after if.', ['Reservation is sufficient for the nameplate.', 'The other arrows add a reverse or inverse.']),
        question('group-1-b2', 'Every woven basket has a reinforced rim. What follows for a woven basket?', ['It has a reinforced rim.', 'Every rimmed basket is woven.', 'It is the only basket with a rim.'], 0, 'Apply every in its stated direction.', ['The basket belongs to the woven group.', 'That guarantees its reinforced rim without excluding other rimmed baskets.']),
        question('group-1-b3', 'A notice is printed whenever the schedule changes. What triggers printing under this rule?', ['A notice being printed.', 'The schedule changing.', 'The schedule staying unchanged.'], 1, 'Whenever introduces the sufficient idea.', ['The schedule change is the trigger.', 'Printing is the promised result.']),
      ],
      medium: [
        question('group-1-m1', 'Any invoice submitted through the portal is time-stamped. Which translation preserves scope?', ['Invoice → time-stamped.', 'Invoice submitted through portal → time-stamped.', 'Time-stamped → submitted through portal.'], 1, 'Keep how the invoice was submitted.', ['The rule covers portal-submitted invoices.', 'It neither covers every invoice nor identifies the source of every time stamp.']),
        question('group-1-m2', 'The only rehearsals recorded are rehearsals held in Studio B. Which follows?', ['Held in Studio B → recorded.', 'Recorded rehearsal → held in Studio B.', 'Held outside Studio B → recorded.'], 1, 'Ask which rehearsals are excluded from the recorded group.', ['Recorded rehearsals are restricted to Studio B rehearsals.', 'Studio B alone is not stated enough for recording.']),
        question('group-1-m3', 'Where a monitoring station detects ice, its warning flag rises. A station\'s flag rises. What follows?', ['It detected ice.', 'It detected no ice.', 'Ice detection is unknown.'], 2, 'A raised flag may have another cause.', ['Detection guarantees a flag, not the reverse.', 'The raised flag therefore leaves detection unsettled.']),
      ],
      advanced: [
        question('group-1-a1', 'Every film selected for the outdoor series is captioned. Film V is selected for an indoor series. Which follows?', ['V is captioned.', 'V is not captioned.', 'Captioning is not settled by this rule.'], 2, 'The series modifier belongs inside the trigger.', ['Indoor selection does not satisfy outdoor-series selection.', 'The rule provides no captioning result for V.']),
        question('group-1-a2', 'The curator asked if the painting was insured. Which rule can be extracted from that sentence alone?', ['Painting insured → curator asks.', 'Curator asks → painting insured.', 'Neither; it reports an inquiry.'], 2, 'Ask whether if expresses a guarantee or an indirect question.', ['The curator asks about insurance status.', 'The sentence asserts no conditional relationship between asking and insurance.']),
        question('group-1-a3', 'If a component is not certified for heat exposure, it is stored indoors. Component E is not stored indoors. What follows?', ['E is certified for heat exposure.', 'E is certified for every use.', 'E is not certified for heat exposure.'], 0, 'Use the contrapositive and cancel the negative.', ['No indoor storage excludes not certified for heat exposure.', 'The result is certification for that specific exposure, not universal certification.']),
      ],
    },
  },
  {
    id: 'group-2', title: 'Group 2: Keep the Requirement on the Right', area: 'translation', phase: 'conditional', prerequisites: ['group-1'],
    goal: 'Translate necessary-condition wording without mistaking a requirement for a guarantee of success.',
    teaching: [
      'Group 2 includes only, only if, only when, only where, always, requires and must in their relevant uses. The vault opens only if its code is verified gives vault opens → code verified. Verification is required for opening, but may not be enough to open it.',
      'Only members receive this newsletter restricts recipients to members: receives newsletter → member. Compare the only recipients are members, a Group 1 grammatical form with the same result. Meaning decides the direction.',
      'Read requires and must carefully. Certification requires an exam pass states a requirement for certification. A staff member must wear a badge states an obligation; a person can violate it. Do not turn must wear into actually wears unless compliance is separately assumed. Always can describe a universal pattern; its placement and scope still matter.',
    ],
    method: ['Identify the event, status or permission being restricted.', 'Write what that event requires as the necessary condition.', 'Place the restricted event left and its requirement right.', 'Check that meeting the requirement alone is not being treated as success.'],
    workedExample: { statements: ['A package is released only after its clearance is recorded.'], reasoning: ['Release requires recorded clearance.', 'Recorded clearance alone does not promise release.'], conclusion: 'Package released → its clearance recorded.' },
    guidedExample: question('group-2-guide', 'Only subscribers can access the recording. Which follows?', ['Subscriber → can access recording.', 'Can access recording → subscriber.', 'Subscriber → has accessed recording.'], 1, 'Only restricts who can have the permission.', ['Access permission is restricted to subscribers.', 'The claim guarantees neither permission for every subscriber nor an actual access event.']),
    commonMistake: { mistake: 'Using a requirement as sufficient for the restricted result.', repair: 'Read only if as cannot occur without. Then ask what additional requirements could still exist.' },
    drills: {
      beginner: [
        question('group-2-b1', 'The display activates only if the battery is charged. Translate.', ['Display activates → battery charged.', 'Battery charged → display activates.', 'Display inactive → battery uncharged.'], 0, 'Only if introduces the requirement.', ['Activation requires charging.', 'Charging is not stated enough for activation.']),
        question('group-2-b2', 'Only residents receive a parking sticker. What is necessary for receiving one?', ['Being a resident.', 'Driving daily.', 'Already having a sticker.'], 0, 'Identify the group to which recipients are restricted.', ['Recipients must be residents under this rule.', 'No guarantee is made for every resident.']),
        question('group-2-b3', 'Every registered buoy always broadcasts its identifier. Which rule follows?', ['Broadcasts identifier → registered buoy.', 'Registered buoy → broadcasts identifier.', 'Unregistered buoy → no broadcast.'], 1, 'Always describes what registered buoys do.', ['Registration is the starting condition.', 'Broadcasting is the universal result assigned to that group.']),
      ],
      medium: [
        question('group-2-m1', 'Entry to the final round requires a qualifying score. Mira has a qualifying score. What follows?', ['Mira enters the final round.', 'Mira cannot enter.', 'Entry is not established.'], 2, 'A required score might not be the only requirement.', ['A qualifying score is necessary for entry.', 'The rule does not make it sufficient.']),
        question('group-2-m2', 'The camera records only when motion is detected. No motion is detected. What follows?', ['The camera does not record.', 'The camera records.', 'The camera is broken.'], 0, 'Use absence of the required detection.', ['Recording would require motion detection.', 'Its absence excludes recording without identifying a fault.']),
        question('group-2-m3', 'The beacon operates only where satellite contact is available. It operates at Site P. What follows?', ['Satellite contact is available at P.', 'It operates at all sites with contact.', 'P is the only site with contact.'], 0, 'Keep where as a restriction on the operation site.', ['Operation at P requires contact there.', 'No claim identifies every operation site or every contact site.']),
      ],
      advanced: [
        question('group-2-a1', 'Only reviewers appointed for the emergency panel may inspect these records. Nia is a reviewer appointed to another panel. Which follows?', ['Nia may inspect these records.', 'This rule excludes Nia\'s permission unless she also has the emergency appointment.', 'Nia cannot be a reviewer.'], 1, 'The appointment modifier is part of the necessary condition.', ['Inspection permission requires the emergency-panel appointment.', 'Another appointment alone does not meet that requirement.']),
        question('group-2-a2', 'Agency policy obliges every holder of a night-filming permit to submit a signed safety declaration. Rowan holds a night-filming permit. What follows?', ['Rowan is obliged to submit a signed safety declaration.', 'Rowan actually submitted a signed declaration.', 'Everyone who submits a signed declaration receives a night-filming permit.'], 0, 'An explicit policy obligation does not establish compliance.', ['Rowan is a holder covered by the stated policy.', 'The policy establishes Rowan\'s obligation, not whether Rowan performed it.']),
        question('group-2-a3', 'A claim is eligible only if it was not filed after the deadline. Claim Q was filed after the deadline. What follows?', ['Q is eligible.', 'Q is not eligible.', 'Every timely claim is eligible.'], 1, 'Negate the negative necessary condition.', ['Eligibility requires not filed after deadline.', 'Filing after deadline defeats that requirement and excludes eligibility.']),
      ],
    },
  },
  {
    id: 'group-3', title: 'Group 3: Negate the Sufficient Idea', area: 'translation', phase: 'conditional', prerequisites: ['group-2', 'contraposition'],
    goal: 'Translate unless, until and without while retaining existing negatives and temporal scope.',
    teaching: [
      'The Refresher calls Group 3 negate sufficient. It includes unless, until and without in their conditional uses. The audit proceeds unless its authorization is withdrawn means not withdrawn → proceeds. Its contrapositive is not proceeds → withdrawn.',
      'You can choose either complete idea, negate it and make it sufficient, while keeping the other unchanged. For proceeds unless authorization withdrawn, negating proceeds gives not proceeds → authorization withdrawn. The two forms are contrapositives, not competing interpretations.',
      'Preserve negatives already in the sentence. The gate does not open without a clearance means no clearance → no opening, equivalent to opening → clearance. Until also sets a time boundary: it does not promise that the withheld action happens immediately after the boundary. Without can merely describe circumstances, so first verify what the sentence actually guarantees.',
    ],
    method: ['Write the two complete ideas with any existing negatives.', 'Choose one idea, negate it and put it on the left.', 'Keep the other idea unchanged on the right.', 'Check the equivalent contrapositive and preserve any time boundary.'],
    workedExample: { statements: ['The meeting proceeds unless its venue becomes unavailable.'], reasoning: ['Choose venue becomes unavailable and negate it.', 'No venue unavailability → meeting proceeds.', 'The equivalent direction is meeting does not proceed → venue becomes unavailable.'], conclusion: 'A venue becoming unavailable does not by itself prove cancellation.' },
    guidedExample: question('group-3-guide', 'The pump fails without coolant. Which is guaranteed?', ['Coolant present → pump does not fail.', 'No coolant → pump fails.', 'Pump fails → no coolant.'], 1, 'Without supplies the absent condition that triggers failure.', ['Coolant absence is sufficient for failure.', 'Presence may still coexist with failure from another cause.']),
    commonMistake: { mistake: 'Making unless exclusive or treating the exception as guaranteed success.', repair: 'Translate the stated guarantee and its contrapositive. Do not add a reverse or a promise about what happens once the exception occurs.' },
    drills: {
      beginner: [
        question('group-3-b1', 'The delivery proceeds unless the road closes. Translate.', ['Road not closed → delivery proceeds.', 'Road closed → delivery does not proceed.', 'Delivery proceeds → road not closed.'], 0, 'Negate road closes and keep proceeds unchanged.', ['The rule promises delivery when closure is absent.', 'It does not establish the outcome when closure occurs.']),
        question('group-3-b2', 'The display dims without external power. Which follows?', ['External power → no dimming.', 'No external power → display dims.', 'Display dims → no external power.'], 1, 'Start with absence of external power.', ['Without external power supplies the sufficient condition.', 'The result is dimming, without excluding other causes.']),
        question('group-3-b3', 'The briefing ends unless another speaker arrives. No other speaker arrives. What follows?', ['The briefing ends.', 'The briefing continues.', 'A speaker must arrive.'], 0, 'Use the nonexception case.', ['No arrival meets the negated exception.', 'The promised ending follows.']),
      ],
      medium: [
        question('group-3-m1', 'The ticket is not issued without identification. Which is equivalent?', ['Ticket issued → identification supplied.', 'Identification supplied → ticket issued.', 'Ticket not issued → no identification.'], 0, 'First write no identification → not issued.', ['Negating the not-issued result gives issued.', 'Its contrapositive requires identification.']),
        question('group-3-m2', 'Unless the upload fails, the receipt appears. No receipt appears. What follows?', ['The upload fails.', 'The upload succeeds.', 'The upload was never attempted.'], 0, 'Use the contrapositive of no failure → receipt appears.', ['Receipt absence excludes no upload failure.', 'It therefore establishes failure under the stated rule, not a different explanation.']),
        question('group-3-m3', 'Lena does not sign until the price is fixed. The price has been fixed. What follows?', ['Lena has signed.', 'Lena cannot sign.', 'Whether Lena signs is still unknown.'], 2, 'Removing a barrier is not a promise to act.', ['The rule bars signing before the price is fixed.', 'It does not guarantee signing after fixation.']),
      ],
      advanced: [
        question('group-3-a1', 'Unless the parcel is not cleared for export, it is loaded. It is not loaded. Which follows?', ['The parcel is not cleared for export.', 'The parcel is cleared for export.', 'The parcel is not cleared for any use.'], 0, 'Negating not cleared gives cleared as the original trigger.', ['Cleared for export → loaded.', 'No loading therefore gives not cleared for export, retaining that scope.']),
        question('group-3-a2', 'At a site, no repair begins until that site\'s inspection is complete. A repair begins at Site K. What follows?', ['Every site has completed inspection.', 'Site K\'s inspection is complete.', 'Site K\'s inspection caused the repair.'], 1, 'Keep the site identity in the temporal requirement.', ['A repair at K requires the boundary condition for K.', 'Neither inspections elsewhere nor causation is established.']),
        question('group-3-a3', 'The technician described a visit without her assistant. What conditional rule follows from this sentence alone?', ['No assistant → technician visits.', 'Technician visits → no assistant.', 'Neither; it describes one visit.'], 2, 'Does without express a general guarantee here?', ['The sentence describes the circumstances of a particular visit.', 'It supplies no exceptionless rule about other visits.']),
      ],
    },
  },
  {
    id: 'group-4', title: 'Group 4: Keep Two Conditions Apart', area: 'translation', phase: 'conditional', prerequisites: ['group-3'],
    goal: 'Translate exclusions as a sufficient condition requiring the other condition\'s absence.',
    teaching: [
      'Group 4 in the Refresher is negate necessary: no, none, not both, never and cannot in their relevant uses. No archived sample is disposable gives archived sample → not disposable. Choosing disposable as the trigger gives disposable → not archived sample.',
      'Not both says two conditions cannot occur together. The west hatch and the east hatch are not both open gives west open → east not open and east open → west not open. It permits both to be closed. It does not require exactly one to be open.',
      'Never and cannot need context. A descriptive rule that the device never runs uncooled excludes that combination. An instruction that a visitor cannot enter means entry is forbidden; it does not physically prevent an unauthorized entry. Keep the claim\'s modal meaning rather than changing permission into behavior.',
    ],
    method: ['Identify the two complete conditions that cannot coexist.', 'Keep one unchanged as sufficient.', 'Negate the other as the required result.', 'Check that the rule excludes coexistence without inventing existence or exactly-one requirements.'],
    workedExample: { statements: ['No reusable vial is marked for disposal.'], reasoning: ['Reusable vial → not marked for disposal.', 'Marked for disposal → not reusable vial is equivalent.'], conclusion: 'The two categories do not overlap; neither category is asserted to have members.' },
    guidedExample: question('group-4-guide', 'The front pump and rear pump are not both active. Which case is allowed?', ['Both active.', 'Front active and rear active.', 'Both inactive.'], 2, 'Not both does not mean at least one.', ['The rule excludes joint activity.', 'Joint inactivity violates no stated condition.']),
    commonMistake: { mistake: 'Reading no overlap as exactly one condition must hold.', repair: 'State the prohibited combination. Ask whether the rule also supplied an at-least-one claim; if it did not, allow neither.' },
    drills: {
      beginner: [
        question('group-4-b1', 'No rented instrument is for sale. Which translates this?', ['Rented instrument → not for sale.', 'Not rented → for sale.', 'For sale → rented.'], 0, 'Keep rented unchanged; deny the excluded property.', ['Rental and for-sale status cannot coexist.', 'The rule does not assign sale status to nonrentals.']),
        question('group-4-b2', 'None of the overnight shipments are uninsured. What follows for an overnight shipment?', ['It is uninsured.', 'It is insured.', 'It is delayed.'], 1, 'Negate uninsured as not insured.', ['Overnight shipment → not uninsured.', 'Using uninsured to mean not insured, the double negative yields insured.']),
        question('group-4-b3', 'A recorder never stores an unverified clip. Which follows?', ['Stored clip → verified clip.', 'Verified clip → stored clip.', 'Unstored clip → unverified clip.'], 0, 'Storage excludes being unverified.', ['The forbidden pair is stored and unverified.', 'A stored clip therefore must be verified under this descriptive rule.']),
      ],
      medium: [
        question('group-4-m1', 'The gallery and workshop are not both open. The gallery is closed. What follows about the workshop?', ['It is open.', 'It is closed.', 'Its status is unknown.'], 2, 'Only joint opening is excluded.', ['The gallery\'s closure removes the prohibited combination.', 'The workshop may be open or closed.']),
        question('group-4-m2', 'No locked folder is publicly readable. Folder C is publicly readable. What follows?', ['C is locked.', 'C is not locked.', 'Every unlocked folder is public.'], 1, 'Use the equivalent exclusion from the other direction.', ['Public readability cannot coexist with locking.', 'C\'s readability therefore excludes locking.']),
        question('group-4-m3', 'No metal tool approved for this scan is magnetic. Which condition belongs on the left?', ['Every metal tool.', 'Metal tool approved for this scan.', 'Every nonmagnetic object.'], 1, 'Retain the approval modifier.', ['Only the specified approved metal tools are excluded from magnetism.', 'Dropping approval would extend the rule to other tools.']),
      ],
      advanced: [
        question('group-4-a1', 'No equipment not certified for outdoor use is deployed outdoors. Which follows?', ['Deployed outdoors → certified for outdoor use.', 'Certified for outdoor use → deployed outdoors.', 'Not deployed outdoors → not certified.'], 0, 'Write not certified → not deployed, then contrapose.', ['Outdoor deployment excludes absence of outdoor certification.', 'The resulting positive certification retains its original scope.']),
        question('group-4-a2', 'The policy says visitors cannot enter the vault. A visitor enters. Which follows about that event?', ['The event is physically impossible.', 'The visitor violates the policy.', 'The entrant cannot be a visitor.'], 1, 'The policy establishes a prohibition, not factual compliance.', ['The visitor is subject to the entry prohibition.', 'The event breaches that prohibition without changing the person\'s status.']),
        question('group-4-a3', 'No artwork on loan is insured by the museum\'s local policy. Which follows from the rule alone?', ['Some artwork has no insurance at all.', 'On-loan artwork is not insured by that local policy; existence is not established.', 'All artwork without local insurance is on loan.'], 1, 'Keep both the insurance scope and the absence of an existence fact.', ['The exclusion concerns one named policy.', 'It establishes neither an existing artwork nor absence of other insurance.']),
      ],
    },
  },
  {
    id: 'mixed-translation', title: 'Choose the Direction from the Meaning', area: 'translation', phase: 'conditional', prerequisites: ['group-4'],
    goal: 'Select the appropriate translation procedure without relying on a single familiar word.',
    teaching: [
      'Mixed practice asks you to read the relationship before choosing a procedure. If a hearing is televised, it is recorded puts televised left. A hearing is televised only if it is recorded has the same direction, although the wording points you to a necessary condition.',
      'A hearing is not televised without a recording also gives televised → recorded. No televised hearing is unrecorded excludes the same forbidden combination. Different indicator groups can express equivalent relationships.',
      'Keep full predicates before abbreviating. Approved for trial use differs from approved for routine use. A word such as only or without is evidence about structure, not permission to discard modifiers, existing negatives or obligations.',
    ],
    method: ['Identify whether the sentence gives a guarantee, a requirement or an exclusion.', 'Write both complete conditions.', 'Apply the matching group procedure and preserve existing negatives.', 'Read the result back and test the forbidden combination.'],
    workedExample: { statements: ['Only documents cleared for public release appear on the portal.'], reasoning: ['The restricted event is appearing on the portal.', 'Its necessary condition is clearance for public release.'], conclusion: 'Document appears on portal → document cleared for public release.' },
    guidedExample: question('mixed-translation-guide', 'The server does not restart unless its update is complete. Which is equivalent?', ['Update complete → server restarts.', 'Server restarts → update complete.', 'Server does not restart → update incomplete.'], 1, 'Write update incomplete → no restart first.', ['Incomplete update prevents restart.', 'Its contrapositive makes completed update necessary for restart, not sufficient.']),
    commonMistake: { mistake: 'Choosing an arrow from the first keyword without rereading the claim.', repair: 'Read the proposed arrow as a complete English sentence. Check whether it adds a reverse guarantee or changes a negative.' },
    drills: {
      beginner: [
        question('mixed-translation-b1', 'Every inspected ladder has a tag. Choose the equivalent statement.', ['A tag guarantees inspection.', 'If a ladder is inspected, it has a tag.', 'An uninspected ladder has no tag.'], 1, 'Every introduces the sufficient group.', ['Inspection is sufficient for tagging.', 'Neither the reverse nor the inverse is supplied.']),
        question('mixed-translation-b2', 'Only stamped forms are accepted. Translate.', ['Accepted form → stamped form.', 'Stamped form → accepted form.', 'Unaccepted form → unstamped form.'], 0, 'Only restricts the accepted group.', ['Acceptance requires stamping.', 'Stamping alone is not a guarantee of acceptance.']),
        question('mixed-translation-b3', 'No transparent container is opaque. Which follows?', ['Transparent → not opaque.', 'Not transparent → opaque.', 'Not opaque → transparent.'], 0, 'This is an exclusion, not a complete division into two groups.', ['Transparency excludes opacity.', 'The rule gives no exhaustive classification of other containers.']),
      ],
      medium: [
        question('mixed-translation-m1', 'The exhibit remains open unless the alarm is activated. Which is equivalent?', ['Alarm activated → exhibit closes.', 'Exhibit not open → alarm activated.', 'Exhibit open → alarm not activated.'], 1, 'Translate no activation → open, then contrapose.', ['No activation guarantees openness.', 'Lack of openness therefore requires activation, but activation alone does not prove closure.']),
        question('mixed-translation-m2', 'The only bids selected are bids with a deposit. Which inference is unsupported?', ['Selected → has deposit.', 'No deposit → not selected.', 'Has deposit → selected.'], 2, 'A deposit is required, not promised sufficient.', ['The restriction gives selected → deposit and its contrapositive.', 'The reverse would make every deposit-bearing bid selected without support.']),
        question('mixed-translation-m3', 'Without verification, the transfer is not processed. The transfer is processed. What follows?', ['It was verified.', 'Every verified transfer is processed.', 'It was not verified.'], 0, 'Existing not processed stays negative in the first arrow.', ['No verification → no processing.', 'Processing therefore requires verification.']),
      ],
      advanced: [
        question('mixed-translation-a1', 'No proposal not approved for the pilot is implemented in the pilot. Which translation is equivalent?', ['Implemented in pilot → approved for pilot.', 'Approved for pilot → implemented in pilot.', 'Implemented anywhere → approved for pilot.'], 0, 'Cancel double negatives without broadening implementation scope.', ['Not approved for pilot → not implemented in pilot.', 'Its contrapositive is pilot implementation → pilot approval.']),
        question('mixed-translation-a2', 'Only applicants licensed in Region N qualify for this role. Kai is licensed in Region M. No other license information is given. What follows?', ['Kai qualifies.', 'Kai does not qualify.', 'Qualification is unknown.'], 2, 'A license in M does not exclude also having a license in N.', ['The role requires Region N licensing.', 'The fact about M establishes neither N licensing nor its absence.']),
        question('mixed-translation-a3', 'The agency requires every field observer to carry a beacon. Which claim keeps the statement\'s force?', ['Every field observer actually carries a beacon.', 'Every field observer is obliged to carry a beacon.', 'Anyone carrying a beacon is a field observer.'], 1, 'Requirements and performance are different predicates.', ['The agency imposes an obligation on field observers.', 'The statement does not guarantee compliance or identify beacon carriers.']),
      ],
    },
  },
  {
    id: 'implicit-conditionals', title: 'Recognize a Guarantee without a Familiar Indicator', area: 'translation', phase: 'conditional', prerequisites: ['mixed-translation'],
    goal: 'Translate guarantees expressed through verbs, definitions and restricted subjects.',
    teaching: [
      'The relationship can appear without if or only if. A certified seal guarantees traceability gives certified seal → traceability. Traceability is a prerequisite for listing gives listed → traceable. Ask what the sentence makes enough and what it makes required.',
      'Definitions can supply both directions, but only when the definition is explicit. Here, a dormant account means an account with no transactions for a year identifies the defined category. Do not turn a loose description such as dormant accounts tend to be old into a definition or an exceptionless rule.',
      'Preserve the distinction between guarantee, permission and evidence. A grant authorizes travel gives a permission; it does not prove the traveler leaves. A wet pavement suggests rain does not guarantee rain. Active and passive phrasing can express the same rule without changing the subject involved.',
    ],
    method: ['Find the guarantee, prerequisite, exclusion or explicit definition.', 'Write what is enough and what is required in complete predicates.', 'Retain the force of verbs such as authorizes, suggests and requires.', 'Test whether a counterexample would violate the actual wording.'],
    workedExample: { statements: ['A checksum match ensures that the stored copy is intact.'], reasoning: ['The match supplies a guarantee, rather than a mere clue.', 'The result concerns the stored copy\'s integrity.'], conclusion: 'Checksum matches → stored copy intact.' },
    guidedExample: question('implicit-conditionals-guide', 'Identity verification is a prerequisite for issuing a replacement card. Which follows?', ['Verified identity → card issued.', 'Replacement card issued → identity verified.', 'No card issued → identity unverified.'], 1, 'A prerequisite must be met for the restricted outcome.', ['Issuance requires verification.', 'Verification is not stated sufficient for issuance.']),
    commonMistake: { mistake: 'Treating any association as a guarantee.', repair: 'Compare ensures with suggests. Translate the author\'s degree of commitment, not a stronger relationship.' },
    drills: {
      beginner: [
        question('implicit-conditionals-b1', 'A successful self-test guarantees that the indicator lights. Choose the rule.', ['Self-test succeeds → indicator lights.', 'Indicator lights → self-test succeeds.', 'Self-test fails → indicator does not light.'], 0, 'Guarantees identifies the sufficient event.', ['Self-test success supplies the guarantee.', 'The sentence leaves other ways to light the indicator open.']),
        question('implicit-conditionals-b2', 'A signature is a prerequisite for approval. Which follows?', ['Signed → approved.', 'Approved → signed.', 'Not approved → not signed.'], 1, 'A prerequisite belongs on the necessary side.', ['Approval requires a signature.', 'A signature alone is not declared sufficient.']),
        question('implicit-conditionals-b3', 'A valid access token ensures successful entry. Entry is unsuccessful. What follows?', ['The token was not valid.', 'The token was valid.', 'The entrant was not a person.'], 0, 'Apply absence of the guaranteed result.', ['A valid token would ensure entry.', 'Unsuccessful entry excludes token validity under this stipulated rule.']),
      ],
      medium: [
        question('implicit-conditionals-m1', 'A sealed housing is ensured by factory certification. Which is the direction?', ['Housing sealed → factory certification.', 'Factory certification → housing sealed.', 'No certification → housing unsealed.'], 1, 'By identifies the source of the guarantee in this passive sentence.', ['Factory certification is what ensures sealing.', 'The passive phrasing does not reverse that relationship.']),
        question('implicit-conditionals-m2', 'Residue on a filter suggests that the intake was blocked. What rule is established?', ['Residue → blocked intake.', 'Blocked intake → residue.', 'Neither exceptionless rule.'], 2, 'Suggests is weaker than guarantees.', ['The statement treats residue as evidence.', 'It does not rule out residue without blockage or blockage without residue.']),
        question('implicit-conditionals-m3', 'A digital pass authorizes its holder to use the express lane. Which follows for a holder?', ['The holder uses the lane.', 'The holder is authorized to use the lane.', 'Everyone using the lane has a digital pass.'], 1, 'Keep authorizes in the result.', ['Holding the pass guarantees the stated authorization.', 'It establishes neither exercise of that permission nor an exclusive source of permission.']),
      ],
      advanced: [
        question('implicit-conditionals-a1', 'A device\'s eligibility for the rebate depends on certification for indoor operation. Device T is certified only for outdoor operation. What follows?', ['T is eligible.', 'T is not eligible.', 'Outdoor certification guarantees indoor certification.'], 1, 'Only outdoor means the required indoor certification is absent.', ['Eligibility requires indoor certification.', 'The stated restriction to outdoor certification excludes that requirement.']),
        question('implicit-conditionals-a2', 'In this catalogue, a pending record is defined as a record awaiting review. Record B awaits review. What follows?', ['B is a pending record under this definition.', 'B has been reviewed.', 'Every catalogue uses that definition.'], 0, 'An explicit definition applies within its stated setting.', ['The catalogue definition identifies awaiting-review records as pending.', 'It applies to B without extending the definition to other catalogues.']),
        question('implicit-conditionals-a3', 'A transfer\'s completion is contingent on the receiving bank accepting it. The receiving bank accepted Transfer L. Which follows?', ['L completed.', 'L did not complete.', 'Completion remains unknown.'], 2, 'Contingent on states a requirement rather than a sufficient cause.', ['Completion requires acceptance.', 'Acceptance alone does not rule out other barriers to completion.']),
      ],
    },
  },
  {
    id: 'direct-linking', title: 'Connect Rules through the Same Condition', area: 'linking', phase: 'conditional', prerequisites: ['implicit-conditionals'],
    goal: 'Build a directed chain and distinguish its new conditional from a case conclusion.',
    teaching: [
      'Every calibrated meter is registered. Every registered meter is listed. A calibrated meter must therefore be listed: calibrated → registered → listed. The middle condition matches exactly and the arrows continue in the same direction.',
      'That chain creates a rule, not an existing calibrated meter. Meter D is calibrated adds the fact needed to conclude that D is listed. A listed meter alone does not prove calibration.',
      'Match complete meanings, not shared words. Registered for field use differs from registered for laboratory use. Keep the same subject through the chain. Rules concerning an object\'s owner or maker do not automatically transfer that property back to the object.',
      'A link can be hidden until you take a contrapositive. Every tagged specimen is retained. Every discarded specimen is not retained. The second rule is equivalent to retained → not discarded. Now tagged → retained → not discarded is a forward chain. Write the equivalent rule first; do not simply reverse an arrow. If both sides already contain negatives, cancel the double negatives when contraposing.',
    ],
    method: ['Translate each rule into complete conditions.', 'Find a result-to-trigger match; if needed, form an equivalent contrapositive to expose it.', 'Follow only forward arrows in the rules or their valid contrapositives to create a new rule.', 'Apply a separately supplied case fact, or preserve the result as a rule if no fact is given.'],
    workedExample: { statements: ['Every audited report is certified.', 'Every certified report is published.', 'Report R is audited.'], reasoning: ['Audited → certified → published.', 'R satisfies the first condition, so both required results follow for R.'], conclusion: 'Report R is certified and published.' },
    guidedExample: question('direct-linking-guide', 'Every keyed cabinet is numbered. Every numbered cabinet is catalogued. Which follows from these rules alone?', ['Some catalogued cabinet exists.', 'Every keyed cabinet is catalogued.', 'Every catalogued cabinet is keyed.'], 1, 'Link the shared numbered condition without adding a case.', ['Keyed leads to numbered and then catalogued.', 'The result is a new conditional, without existence or a reverse direction.']),
    commonMistake: { mistake: 'Joining rules merely because they use similar nouns.', repair: 'Compare the full middle predicates and subject identities. A link needs the same condition, not a related topic.' },
    drills: {
      beginner: [
        question('direct-linking-b1', 'Every glazed tile is polished. Every polished tile is inspected. What follows?', ['Glazed tile → inspected tile.', 'Inspected tile → glazed tile.', 'Unglazed tile → uninspected tile.'], 0, 'Follow the polished middle condition.', ['Glazing guarantees polishing.', 'Polishing guarantees inspection, so glazing guarantees inspection.']),
        question('direct-linking-b2', 'Every sealed bottle is labelled. Every labelled bottle is boxed. Bottle A is sealed. What follows?', ['A is boxed.', 'Every boxed bottle is sealed.', 'A is the only boxed bottle.'], 0, 'Move A forward through both rules.', ['A\'s sealing gives labelling.', 'That labelling gives boxing, without identifying other bottles.']),
        question('direct-linking-b3', 'Every enrolled intern is assigned a desk. Every person assigned a desk has an entry code. Which is the middle condition?', ['Having an entry code.', 'Being assigned a desk.', 'Being an intern regardless of enrollment.'], 1, 'Find the first rule\'s result repeated as the second trigger.', ['Desk assignment is the shared condition.', 'It connects enrolled interns to entry codes.']),
      ],
      medium: [
        question('direct-linking-m1', 'Every registered instrument is calibrated. Every calibrated instrument is tagged. Instrument Q is tagged. What follows about registration?', ['Q is registered.', 'Q is not registered.', 'Registration is unknown.'], 2, 'Being at the end of a chain does not establish its beginning.', ['Registration guarantees tagging through calibration.', 'Tagging may also occur without registration.']),
        question('direct-linking-m2', 'Every compact sensor is portable. Every portable sensor is battery-powered. No compact sensor is known to exist. Which follows?', ['A battery-powered sensor exists.', 'Every compact sensor is battery-powered.', 'All battery-powered sensors are compact.'], 1, 'Preserve the output as a rule.', ['Compact → portable → battery-powered.', 'No case fact supports an existence conclusion.']),
        question('direct-linking-m3', 'Every archived file is signed. Every restricted file is unsigned. Which new rule follows?', ['Archived file → not restricted.', 'Archived file → restricted.', 'Not archived → restricted.'], 0, 'Contrapose restricted → not signed to expose a signed trigger.', ['Restricted → not signed has the equivalent form signed → not restricted.', 'Archived → signed now links to signed → not restricted, so archived → not restricted.']),
      ],
      advanced: [
        question('direct-linking-a1', 'Every vessel certified for coastal service is entered in Register C. Every vessel entered in Register C is assigned an identifier. Vessel R is certified for coastal service. Which follows?', ['R has an assigned identifier.', 'R is certified for ocean service.', 'Every identified vessel is coastal-certified.'], 0, 'Retain coastal certification and follow the exact register match.', ['Coastal certification gives Register C entry.', 'That entry gives R an identifier, without another certification or a reverse rule.']),
        question('direct-linking-a2', 'Every authorized visitor may request a transcript. Everyone who may request a transcript receives a request code. Jo is an authorized visitor. What follows?', ['Jo requested a transcript.', 'Jo receives a request code.', 'Jo receives the transcript itself.'], 1, 'The middle condition is permission to request, not an actual request.', ['Jo satisfies the complete authorized-visitor condition and receives permission to request.', 'The second rule explicitly applies to that permission and yields a request code.']),
        question('direct-linking-a3', 'Every field-certified sensor is logged. Every uncalibrated sensor is unlogged. Every calibrated sensor has an identifier. Sensor F is field-certified. What follows?', ['F is calibrated and has an identifier.', 'F is uncalibrated and has no identifier.', 'Every identified sensor is field-certified.'], 0, 'Expose a logged → calibrated link by contraposing the uncalibrated rule.', ['Uncalibrated → not logged becomes logged → calibrated after reversal and double-negation cancellation.', 'F follows field-certified → logged → calibrated → has an identifier. No reverse identifier rule is supplied.']),
      ],
    },
  },
  {
    id: 'no-link', title: 'Know When Rules Do Not Connect', area: 'linking', phase: 'conditional', prerequisites: ['direct-linking'],
    goal: 'Reject false links caused by shared results, shared triggers, scope changes or subject changes.',
    teaching: [
      'Every trained guide is insured. Every licensed guide is insured. Both rules end at insured. They do not establish that trained guides are licensed or licensed guides are trained. Insurance can be shared by different groups.',
      'A shared trigger produces two results, not a new relationship between those results. Every approved item is tagged and every approved item is boxed establish both results for an approved item. They do not establish tagged → boxed for all items.',
      'An apparent mismatch may be real or may be resolved by a valid contrapositive. Check exact scope and subjects before declaring no link. The preceding linking lesson showed how contraposition exposes hidden connections. Use that procedure before deciding that a shared word supplies no valid path.',
    ],
    method: ['Write the direction of each rule.', 'Compare complete predicates, including qualifiers and subjects.', 'Look for an actual result-to-trigger connection, including a taught equivalent form.', 'If none exists, preserve separate rules and draw only conclusions supported by any case fact.'],
    workedExample: { statements: ['Every approved device is registered.', 'Every inspected device is registered.', 'Device J is approved.'], reasoning: ['Approval gives registration for J.', 'Registration is also a result of inspection, not proof of inspection.'], conclusion: 'J is registered; inspection remains unknown.' },
    guidedExample: question('no-link-guide', 'Every red folder is indexed. Every blue folder is indexed. Which follows?', ['Every red folder is blue.', 'Every indexed folder is red or blue.', 'Neither cross-group claim follows.'], 2, 'A shared result does not connect the starting groups.', ['Both colors imply indexing.', 'The rules allow indexed folders of other colors and do not identify one color with the other.']),
    commonMistake: { mistake: 'Turning a common result into a bridge between its possible sources.', repair: 'Draw the arrows. Two arrowheads meeting at a result do not provide a forward path from one source to the other.' },
    drills: {
      beginner: [
        question('no-link-b1', 'Every bronze medal is numbered. Every silver medal is numbered. Does bronze imply silver?', ['Yes.', 'No; the shared result supplies no such link.', 'Yes, if no medal fact is supplied.'], 1, 'Both arrows point toward numbered.', ['Numbering can result from either medal category.', 'It does not establish a connection between those categories.']),
        question('no-link-b2', 'Every registered boat is painted. Every registered boat is inspected. Which follows for a registered boat?', ['It is painted and inspected.', 'Every painted boat is inspected.', 'Every inspected boat is registered.'], 0, 'Apply both rules to the same supplied trigger.', ['Registration guarantees both results.', 'The shared trigger does not link all painted boats to inspection.']),
        question('no-link-b3', 'Every approved poster is mounted. Every laminated poster is mounted. Poster D is approved. What follows?', ['D is laminated.', 'D is mounted.', 'D is not laminated.'], 1, 'Use D\'s actual sufficient condition.', ['Approval guarantees mounting.', 'The lamination rule has no established trigger for D.']),
      ],
      medium: [
        question('no-link-m1', 'Every battery tested at Site A is labelled. Every battery tested at Site B is shipped. Battery J was tested at A. What follows?', ['J was shipped.', 'J was labelled; shipping remains unknown.', 'Testing at A is the same condition as testing at B.'], 1, 'The site qualifier changes the predicate.', ['J meets only the supplied Site A trigger.', 'The Site B rule cannot be activated without Site B testing.']),
        question('no-link-m2', 'Every certified helmet has padding. Every certified helmet has a serial number. A helmet has padding. Which follows about its serial number?', ['It has one.', 'It lacks one.', 'Unknown.'], 2, 'Padding is a result, not the shared trigger.', ['Padding alone does not establish certification.', 'Without certification, the serial-number rule has no confirmed trigger.']),
        question('no-link-m3', 'Every catalogued specimen is photographed. Every photographed specimen is labelled for storage. Is there a link?', ['Yes: catalogued → labelled for storage.', 'No: labelled must appear first.', 'Yes: labelled for storage → catalogued.'], 0, 'Do not reject a genuine result-to-trigger match.', ['Photographed connects the two rules directly.', 'The path runs from cataloguing to storage labelling, not backward.']),
      ],
      advanced: [
        question('no-link-a1', 'Every inspected vehicle has an authorized owner. Every authorized owner holds a permit. Which follows?', ['Every inspected vehicle holds a permit.', 'The owner of every inspected vehicle holds a permit.', 'Every permitted owner has an inspected vehicle.'], 1, 'Track which subject receives the second property.', ['Inspection establishes authorization of that vehicle\'s owner.', 'The permit belongs to the owner, not automatically to the vehicle.']),
        question('no-link-a2', 'Every sample documented in the research register is retained. Every sample certified for export is documented in the export register. Which link is justified without another premise?', ['Export-certified → retained.', 'Retained → export-certified.', 'Neither: documentation in the two different registers is not the same condition.'], 2, 'Compare the complete register-specific predicates.', ['The second result is documentation in the export register.', 'The first trigger requires documentation in the research register, and no rule connects them.']),
        question('no-link-a3', 'Every active terminal is connected. Every connected terminal is logged. Terminal R is not active. Which follows?', ['R is not logged.', 'R is logged.', 'Logging remains unknown.'], 2, 'The absence of the first trigger does not settle later results.', ['The chain guarantees logging for active terminals.', 'Inactive terminals may be connected and logged, or neither, consistently with both rules.']),
      ],
    },
  },
];
