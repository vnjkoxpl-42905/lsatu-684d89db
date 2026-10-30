/**
 * Narration for the three Chapter 2 lesson films, one sentence per entry, grouped by the scene it plays over.
 * The media workspace (conditional-and-or-video-20261019/<slug>/script.json) is built from these exact sentences,
 * and its prepare script refuses to run if the two drift apart. Original wording: nothing here is adapted from the
 * Contrapositive lecture. Keep every film between 60 and 90 seconds when narrated.
 */
export interface AndOrLectureScene { id: string; sentences: string[] }
export interface AndOrLecture { slug: string; title: string; scenes: AndOrLectureScene[] }

export const andOrLectures: Record<string, AndOrLecture> = {
  'and-or-both-or-either': {
    slug: 'and-both',
    title: 'AND needs both',
    scenes: [
      { id: 'rule', sentences: [
        "Here's a rule: a visitor gets a library card if the visitor shows photo ID and proof of address.",
        "AND conjoins those two conditions. On the left side, the card follows only when both are met.",
      ] },
      { id: 'cases', sentences: [
        "Photo ID shown. Proof of address shown. Both conditions are met, so the card is guaranteed.",
        "Photo ID shown, but no proof of address. Only one condition is met, so this rule guarantees nothing.",
        "The visitor might still get a card some other way. The rule just doesn't say.",
      ] },
      { id: 'unknown', sentences: [
        "Now photo ID shown, and nothing said about proof of address.",
        "Unknown is not the same as missing. We don't know yet whether both conditions are met.",
      ] },
      { id: 'broken', sentences: [
        "So when is the rule broken? Only when both conditions are met and the visitor still gets no card.",
      ] },
      { id: 'necessary', sentences: [
        "AND works on the right side too. If a visitor gets a card, then the visitor has shown photo ID and proof of address.",
        "On that side, both conditions follow together.",
      ] },
      { id: 'habit', sentences: [
        "So when you see AND, check the facts for both conditions.",
        "One alone does not trigger the rule.",
      ] },
    ],
  },
  'and-or-either-condition': {
    slug: 'or-inclusion',
    title: 'OR includes at least one',
    scenes: [
      { id: 'statement', sentences: [
        "Here's a statement: Mia will study on Saturday or on Sunday.",
        "On the LSAT, OR means at least one of the two. Mia could study on Saturday, on Sunday, or on both days.",
      ] },
      { id: 'rules-out', sentences: [
        "So what does this statement rule out? Only one case: Mia skips both days.",
        "That's the whole job of OR. It won't let you drop both.",
      ] },
      { id: 'write', sentences: [
        "Now turn it into a conditional. Take one half away, and the other has to be there.",
        "Negate one half and put it on the left: Mia does not study on Saturday.",
        "Keep the other half exactly as it is on the right: Mia studies on Sunday.",
        "If Mia does not study on Saturday, then she studies on Sunday.",
      ] },
      { id: 'flip', sentences: [
        "You can start with either half. If Mia does not study on Sunday, then she studies on Saturday.",
        "That's the contrapositive of the first rule, so the two say the same thing.",
      ] },
      { id: 'trap', sentences: [
        "Here's the trap. Mia studied on Saturday. What about Sunday?",
        "The statement doesn't say. She might study on Sunday too. OR never limits her to one.",
      ] },
      { id: 'habit', sentences: [
        "So when you see OR, ask one question: what if one half is missing?",
        "Then the other half has to be there.",
      ] },
    ],
  },
  'and-or-either-side': {
    slug: 'group-placement',
    title: 'Where the group sits',
    scenes: [
      { id: 'left', sentences: [
        "Picture a regional round. A team is in it if it submits a project and passes inspection.",
        "The group sits on the left, and it's joined by AND. Both together are enough. A project alone is not.",
      ] },
      { id: 'left-or', sentences: [
        "Change the rule: a team is in the round if it wins its local round or gets a judge's invitation.",
        "That's a different rule. The group is still on the left, but now either one is enough on its own.",
      ] },
      { id: 'right', sentences: [
        "Now move the group to the right. Every team in the regional round has a signed safety form and a registered coach.",
        "On the right, AND means the rule guarantees every member. A team in the round has both.",
        "So if a team has no safety form, it can't be in the round. That runs backward through the rule, while going forward still needs the whole left side.",
      ] },
      { id: 'right-or', sentences: [
        "One more rule: every team in the round has a laptop or a tablet.",
        "On the right, OR guarantees at least one. It doesn't say which one.",
      ] },
      { id: 'close', sentences: [
        "Before you decide what follows, ask which whole side your facts reach.",
      ] },
    ],
  },
  'and-or-negate-group': {
    slug: 'whole-group-negation',
    title: 'Deny the whole group',
    scenes: [
      { id: 'fails', sentences: [
        "A parade float is approved if its brakes pass and its lights work.",
        "To deny a group, ask when it fails. This one fails when at least one member is missing.",
      ] },
      { id: 'or', sentences: [
        "Now a different rule: a float is approved if its brakes pass or its lights work.",
        "An OR fails only when every member fails. So its denial is: the brakes don't pass, and the lights don't work.",
      ] },
      { id: 'flip', sentences: [
        "Back to the float. To take its contrapositive, follow three steps.",
        "Step one: flip the sides. Step two: put a NOT on every member. Step three: switch the group's connector.",
        "If the float is not approved, then the brakes don't pass, or the lights don't work.",
      ] },
      { id: 'double', sentences: [
        "Here's a rule that already has a not in it: if the pool is open, then the lifeguard is on duty or the pool is not crowded.",
        "Flip the sides and deny the requirement as a whole: no lifeguard, and the pool is crowded. The old not and the new not cancel, and the pool is not open.",
      ] },
      { id: 'close', sentences: [
        "Deny the whole group, member by member.",
      ] },
    ],
  },
};

export const andOrLectureTranscript = (lessonId: string) => andOrLectures[lessonId]?.scenes.flatMap(scene => scene.sentences).join(' ') ?? '';
export const andOrLectureMedia = (slug: string) => ({
  video: `/media/conditionals/and-or/${slug}.mp4`,
  captions: `/media/conditionals/and-or/${slug}.vtt`,
  poster: `/media/conditionals/and-or/${slug}.jpg`,
});
