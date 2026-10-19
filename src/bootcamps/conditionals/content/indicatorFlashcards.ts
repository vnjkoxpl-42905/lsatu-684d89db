// 2026-10-03 teaching pass: g2-only-when uses the state "is on" consistently, not the event "switches on". Archived reviewed JSON is unchanged.
// Reviewed original adaptations of NotebookLM cards. Raw evidence stays in the vault.
export const indicatorFlashcardProvenance = {
  "title": "Read the complete condition",
  "reviewedDate": "2026-10-03",
  "sourceCardIndexBase": 0,
  "scope": [
    "foundation",
    "group-1",
    "group-2"
  ],
  "status": "Reviewed local teaching derivative; not a scored assessment or proof of mastery",
  "sources": [
    {
      "artifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
      "path": "2026-10-03-opening-flashcards-downloaded.json",
      "sha256": "ec9e1a12498f55ec98a98f546e7f692baaeffa3e2fd222f0701c0463693859f5",
      "cardCount": 80
    },
    {
      "artifactId": "53a08bbf-5e99-443f-bd7b-276a721cc9b0",
      "path": "2026-10-03-conditional-flashcards-downloaded.json",
      "sha256": "89da1af3ca3d1864259bdb5b645b0f3875c52b5e45ebb1c82e8a73841ff7051a",
      "cardCount": 60
    }
  ]
};
export const indicatorFlashcards = [
  {
    "id": "foundation-enough",
    "group": "foundation",
    "front": "Every folder marked complete contains a signed form. Which condition is enough to prove the other one?",
    "back": "Being a folder marked complete is enough to prove that the folder contains a signed form. The rule covers every folder with that label. Sufficient goes left; necessary goes right: Folder marked complete → Contains signed form.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 12,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "foundation-required",
    "group": "foundation",
    "front": "Every folder marked complete contains a signed form. What is required for a folder marked complete?",
    "back": "It must contain a signed form. That is the necessary condition for a folder with the complete label. Necessary goes right: Folder marked complete → Contains signed form. The rule does not make every folder with a signed form complete.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 17,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "foundation-reverse",
    "group": "foundation",
    "front": "Every folder marked complete contains a signed form. This folder contains a signed form. Do we know that it is marked complete? Why?",
    "back": "No. The folder could have the signed form while other work remains. The rule tells us what a complete folder contains; it does not give the complete label to every folder containing a signed form. Keep the arrow: Folder marked complete → Contains signed form. Do not reverse it.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 19,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "foundation-rule-not-fact",
    "group": "foundation",
    "front": "Every folder marked complete contains a signed form. Does that rule report that any folder is marked complete?",
    "back": "No. It tells us what would follow if a folder had the complete label. We need a separate fact to know whether an actual folder has that label. Folder marked complete is the sufficient condition on the left; Contains signed form is the necessary condition on the right.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 2,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-if-first",
    "group": "group-1",
    "front": "If a visitor books a morning tour, the visitor receives a map. What complete condition does if refer to, and where does it go?",
    "back": "If refers to a visitor booking a morning tour. That is enough for receiving a map under this rule, so keep morning tour with booking and put the condition left: Books morning tour → Receives map.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 27,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-if-last",
    "group": "group-1",
    "front": "A visitor receives a map if the visitor books a morning tour. Which condition goes left? Explain why.",
    "back": "Books a morning tour goes left. It is the if-condition even though it comes last in the rule. Booking that tour is enough to prove the map: Books morning tour → Receives map. Sentence order has not changed the rule.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 28,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-when-first",
    "group": "group-1",
    "front": "When the kitchen clock chimes, the oven light switches on. Identify both conditions and place them.",
    "back": "The kitchen clock chiming is sufficient; the oven light switching on is necessary under this rule. Clock chimes → Oven light switches on. When refers to the clock chiming, so that condition goes left. The rule does not say the chime caused the light.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 29,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-when-last",
    "group": "group-1",
    "front": "The oven light switches on when the kitchen clock chimes. Does putting the light first make it the sufficient condition?",
    "back": "No. When still refers to the clock chiming. That is the condition that proves the light, so it goes left: Clock chimes → Oven light switches on. The first phrase in English does not choose the arrow direction.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 65,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-where",
    "group": "group-1",
    "front": "Where a path crosses the stream, there is a footbridge. What is enough, and what must be there under this stated rule?",
    "back": "A path crossing the stream is enough to prove a footbridge at that crossing. Where identifies the crossing condition, which goes left: Path crosses stream → Footbridge at crossing. A footbridge alone does not prove that a path crosses the stream there.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 30,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-all",
    "group": "group-1",
    "front": "All notebooks on the display shelf have numbered pages. Find the complete sufficient condition.",
    "back": "Notebook on the display shelf is the complete sufficient condition. Notebook alone would include notebooks elsewhere, which this rule does not cover. Put the complete condition left: Notebook on display shelf → Has numbered pages.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 31,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-every",
    "group": "group-1",
    "front": "Every student who reserves a front-row seat receives a name card. Someone writes Student → Receives name card. What did they lose?",
    "back": "They lost who reserves a front-row seat. The rule gives name cards to that group, not to every student. Keep the complete sufficient condition on the left: Student reserves front-row seat → Receives name card.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 68,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-any",
    "group": "group-1",
    "front": "Any parcel collected after closing is stored in the side locker. What complete idea does any refer to?",
    "back": "Any refers to parcels collected after closing. Keep after closing; collecting a parcel at another time is not covered. The qualified collection condition goes left: Parcel collected after closing → Stored in side locker.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 33,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-the-only",
    "group": "group-1",
    "front": "The only mugs on the top shelf are blue mugs. Which condition does the only identify, and where does it go?",
    "back": "The only refers to mugs on the top shelf. A mug in that group must be blue, so the shelf condition goes left: Mug on top shelf → Blue mug. A blue mug can be on another shelf without breaking the rule.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 35,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g1-target-later",
    "group": "group-1",
    "front": "A name card is given to every student who reserves a front-row seat. Does every still identify the same sufficient condition?",
    "back": "Yes. Every refers to students who reserve a front-row seat. That complete condition is enough for a name card even though it appears later: Student reserves front-row seat → Receives name card. Put the condition left, not the word every.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 73,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-only",
    "group": "group-2",
    "front": "Only visitors with a morning-tour booking receive maps. What is required for receiving a map?",
    "back": "Having a morning-tour booking is required. Only restricts map recipients to visitors with that booking. Put receiving a map left and the requirement right: Receives map → Has morning-tour booking. A booking alone does not prove that the visitor receives a map.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 46,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-only-if",
    "group": "group-2",
    "front": "A visitor receives a map only if the visitor has a morning-tour booking. Which complete condition belongs on the right?",
    "back": "Has a morning-tour booking belongs right because it is required for receiving a map. Receives map → Has morning-tour booking. Read only if as one phrase. It contains if, but it does not make the booking enough for a map.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 40,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-if-contrast",
    "group": "group-2",
    "front": "Compare: A visitor receives a map if they book a morning tour. A visitor receives a map only if they book a morning tour. How does the booking condition change roles?",
    "back": "In the first sentence, booking is enough: Books morning tour → Receives map. It goes left. In the second, booking is required: Receives map → Books morning tour. It goes right. Adding only changes what the rule promises.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 41,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-only-when",
    "group": "group-2",
    "front": "The reading light is on only when the desk drawer is closed. What must be true if the light is on?",
    "back": "The desk drawer must be closed. Only when makes a closed drawer necessary for the light: Reading light on → Desk drawer closed. A closed drawer alone does not prove that the light is on.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 48,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-only-where",
    "group": "group-2",
    "front": "The bike racks are installed only where there is a paved area. Identify the necessary condition and place it.",
    "back": "Having a paved area at that location is necessary for an installed bike rack. Put it right: Bike rack installed → Paved area at that location. Only where restricts the locations with racks; it does not put a rack in every paved area.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 49,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-always",
    "group": "group-2",
    "front": "A folder marked complete always contains a signed form. Which condition goes on each side?",
    "back": "Folder marked complete goes left; Contains signed form goes right. Always makes this an exceptionless claim about folders with the complete label. Read the subject and the whole rule: Folder marked complete → Contains signed form. Always is not a rule to put whichever words come next on the right.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 50,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-requires",
    "group": "group-2",
    "front": "Borrowing a studio microphone requires a current booking. What complete condition does requires identify?",
    "back": "Having a current booking is the requirement. Keep current; an expired booking would not meet it. The requirement goes right: Borrows studio microphone → Has current booking. A current booking alone does not prove that someone borrowed a microphone.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 42,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-required-before",
    "group": "group-2",
    "front": "A current booking is required for borrowing a studio microphone. Does the first condition in this rule go left?",
    "back": "No. Having a current booking is required, so it goes right even though it appears first. Borrows studio microphone → Has current booking. Ask what is required for borrowing instead of taking the words after required.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 43,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-must-instruction",
    "group": "group-2",
    "front": "The class rule says: A student presenting today must bring a printed outline. Maya is presenting today. What is required, and do we know she brought it?",
    "back": "Maya is required to bring a printed outline. The instruction does not report that she did it. Keep that meaning: Presents today → Required to bring printed outline. The requirement goes right; actual compliance needs a separate fact.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 47,
    "adapted": true,
    "note": "Original instruction example. Corrects the downloaded card that diagrammed required attendance as completed attendance; source cards 53 and 54 repeat that modality risk."
  },
  {
    "id": "g2-only-the-only",
    "group": "group-2",
    "front": "Only blue mugs are on the top shelf. The only mugs on the top shelf are blue mugs. Do these rules give different arrows?",
    "back": "No. Both say a mug on the top shelf is blue: Mug on top shelf → Blue mug. Only refers to blue mugs, the required group on the right. The only refers to mugs on the top shelf, the sufficient group on the left. The complete indicators have different groups but keep the same rule.",
    "sourceArtifactId": "cca0a9e6-888b-4607-b8e7-2ab94a97b0e3",
    "sourceCardIndex": 45,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
    "id": "g2-necessary-before",
    "group": "group-2",
    "front": "A battery is necessary for this desk lamp to work. Which complete condition is required, and which condition is enough to prove it?",
    "back": "Having a battery is required for the lamp to work. Knowing the lamp works is enough, under this rule, to prove that it has a battery. Lamp works → Has battery. The required idea comes before necessary but still goes right. A battery alone does not prove that the lamp works.",
    "sourceArtifactId": "53a08bbf-5e99-443f-bd7b-276a721cc9b0",
    "sourceCardIndex": 1,
    "adapted": true,
    "note": "Original example adapting the source concept; wording and reasoning reviewed."
  },
  {
  "id": "g1-whenever",
  "group": "group-1",
  "front": "Whenever a visitor books a morning tour, the visitor receives a map. Which complete condition is sufficient?",
  "back": "Booking a morning tour is sufficient. Whenever covers every occasion that meets this condition: Books morning tour → Receives map. The indicator is whenever; the condition is booking a morning tour.",
  "adapted": true,
  "note": "2026-10-11 local extension using the existing Group 1 lesson rules; not a downloaded source card."
},
{
  "id": "g1-anytime",
  "group": "group-1",
  "front": "Anytime a visitor books a morning tour, the visitor receives a map. What goes on the left of the arrow?",
  "back": "Books a morning tour goes on the left. Anytime covers each occasion of booking that tour: Books morning tour → Receives map. Receiving a map alone does not prove a booking.",
  "adapted": true,
  "note": "2026-10-11 local extension using the existing Group 1 lesson rules; not a downloaded source card."
},
{
  "id": "g1-every-time",
  "group": "group-1",
  "front": "Every time a visitor books a morning tour, the visitor receives a map. What does every time tell you?",
  "back": "The rule covers every occasion of booking a morning tour. That whole condition is sufficient: Books morning tour → Receives map. Every time is the indicator, not the condition to place beside the arrow.",
  "adapted": true,
  "note": "2026-10-11 local extension using the existing Group 1 lesson rules; not a downloaded source card."
},
{
  "id": "g1-in-order-to",
  "group": "group-1",
  "front": "In order to borrow a locker, a person needs a key. Which condition goes on the left, and what is required?",
  "back": "Borrowing a locker goes on the left; having a key is required on the right: Borrows locker → Has key. In order to introduces the goal whose requirement is stated. Having a key does not guarantee borrowing a locker.",
  "adapted": true,
  "note": "2026-10-11 local extension using the existing Group 1 lesson rules; not a downloaded source card."
},
{
  "id": "g1-people-who",
  "group": "group-1",
  "front": "People who borrow a locker have a key. Which complete group does the rule describe?",
  "back": "People who borrow a locker. Keep borrow a locker with people: the rule is not about every person. Borrows locker → Has key. Borrowing a locker is sufficient for having a key under this rule.",
  "adapted": true,
  "note": "2026-10-11 local extension using the existing Group 1 lesson rules; not a downloaded source card."
},
{
  "id": "g1-each",
  "group": "group-1",
  "front": "Each person who borrows a locker has a key. What does each prove about locker borrowers?",
  "back": "Every individual who borrows a locker has a key. Borrowing a locker is the sufficient condition: Borrows locker → Has key. The rule does not say everyone with a key borrows a locker.",
  "adapted": true,
  "note": "2026-10-11 local extension using the existing Group 1 lesson rules; not a downloaded source card."
}
];
