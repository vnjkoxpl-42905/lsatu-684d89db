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
    slug: 'both-or-either',
    title: 'Both, or at least one',
    scenes: [
      { id: 'rule', sentences: [
        "Here's a rule: a visitor gets a library card if the visitor shows photo ID and proof of address.",
        "That word if covers a whole group, and the word and joins its two members.",
      ] },
      { id: 'and', sentences: [
        "AND needs both. Photo ID shown, proof of address shown: the group is established, and the rule applies.",
        "Photo ID shown, nothing about proof of address. The group is not established yet. That doesn't mean it fails. We're still waiting on the second member. Unknown is not the same as denied, so a member the facts never mention hasn't been ruled out.",
        "No photo ID at all? Then the group fails, whatever the address says.",
      ] },
      { id: 'or', sentences: [
        "Now a different rule: a pass is valid if it is stamped or signed.",
        "OR needs at least one. Stamped is enough. Stamped and signed is enough too, because an OR doesn't push the second one away.",
        "An OR fails only when every member fails.",
      ] },
      { id: 'habit', sentences: [
        "So before you decide anything, find the whole group the word if covers.",
        "Then say it out loud: both, or at least one?",
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
