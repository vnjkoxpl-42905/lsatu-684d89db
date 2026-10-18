/** Reviewed derivatives of Joshua's Group 1/2 worksheets. Original source text and hashes are retained.
 * NOT (...) negates the entire proposition, including qualifiers and compound predicates.
 * Sets before contraposition contain its reference data for later use; the UI must gate its display by taskKind.
 */
export type SourceWorksheetTaskKind = 'identify' | 'indicators' | 'forward' | 'roles' | 'rephrase' | 'contrapositive';
export interface SourceWorksheetItem {
  id: string; sourceId: string; originalStatement: string; statement: string;
  indicators: { text: string; group: 1 | 2 }[];
  sufficient: string; necessary: string; diagram: string; contrapositive: string;
  ifThen: string; contrapositiveWords: string; explanation: string; correctionNotes: string[];
  source: { file: string; sha256: string; part: string; item: number };
}
export interface SourceWorksheetDrillSet {
  id: string; title: string; shortTitle: string; stage: string; taskKind: SourceWorksheetTaskKind;
  instructions: string; items: SourceWorksheetItem[];
}
export const sourceWorksheetDrills: SourceWorksheetDrillSet[] = [
  {
    "id": "source-intro-identify",
    "title": "Find the indicators",
    "shortTitle": "Intro training",
    "stage": "Recognize",
    "taskKind": "identify",
    "instructions": "Select the indicators and choose each one’s group. Then compare your answers with the explanation.",
    "items": [
      {
        "id": "source-intro-identify-01",
        "sourceId": "intro-p1-01",
        "originalStatement": "A warranty is valid if the product is registered within 30 days.",
        "statement": "A warranty is valid if the product is registered within 30 days.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the product is registered within 30 days",
        "necessary": "the warranty is valid",
        "diagram": "the product is registered within 30 days → the warranty is valid",
        "contrapositive": "NOT (the warranty is valid) → NOT (the product is registered within 30 days)",
        "ifThen": "If the product is registered within 30 days, then the warranty is valid.",
        "contrapositiveWords": "If the warranty is not valid, then the product is not registered within 30 days.",
        "explanation": "The deadline belongs inside the sufficient condition. Registration after 30 days does not meet this trigger.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 1
        }
      },
      {
        "id": "source-intro-identify-02",
        "sourceId": "intro-p1-02",
        "originalStatement": "Whenever you see lightning, expect thunder to follow.",
        "statement": "Whenever you see lightning, you should expect thunder to follow.",
        "indicators": [
          {
            "text": "Whenever",
            "group": 1
          }
        ],
        "sufficient": "you see lightning",
        "necessary": "you should expect thunder to follow",
        "diagram": "you see lightning → you should expect thunder to follow",
        "contrapositive": "NOT (you should expect thunder to follow) → NOT (you see lightning)",
        "ifThen": "If you see lightning, then you should expect thunder to follow.",
        "contrapositiveWords": "If it is not true that you should expect thunder to follow, then you do not see lightning.",
        "explanation": "The result is that you should expect thunder. The rule does not promise that thunder actually follows.",
        "correctionNotes": [
          "The key strengthens “expect thunder” to “thunder will follow.” Preserve the expectation.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 2
        }
      },
      {
        "id": "source-intro-identify-03",
        "sourceId": "intro-p1-03",
        "originalStatement": "The gate opens only if the correct code is entered.",
        "statement": "The gate opens only if the correct code is entered.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "the gate opens",
        "necessary": "the correct code is entered",
        "diagram": "the gate opens → the correct code is entered",
        "contrapositive": "NOT (the correct code is entered) → NOT (the gate opens)",
        "ifThen": "If the gate opens, then the correct code is entered.",
        "contrapositiveWords": "If the correct code is not entered, then the gate does not open.",
        "explanation": "Opening requires the correct code. Entering a code alone does not prove that the gate opens.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 3
        }
      },
      {
        "id": "source-intro-identify-04",
        "sourceId": "intro-p1-04",
        "originalStatement": "All managers must undergo annual training.",
        "statement": "All managers must undergo annual training.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          },
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a person is a manager",
        "necessary": "that person is required to undergo annual training",
        "diagram": "a person is a manager → that person is required to undergo annual training",
        "contrapositive": "NOT (that person is required to undergo annual training) → NOT (a person is a manager)",
        "ifThen": "If a person is a manager, then that person is required to undergo annual training.",
        "contrapositiveWords": "If that person is not required to undergo annual training, then that person is not a manager.",
        "explanation": "Keep the requirement in the outcome. A manager who skips training can still be a manager.",
        "correctionNotes": [
          "Preserve the training requirement; a duty does not prove actual compliance."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 4
        }
      },
      {
        "id": "source-intro-identify-05",
        "sourceId": "intro-p1-05",
        "originalStatement": "The scholarship applies to any student who maintains a 4.0 GPA.",
        "statement": "The scholarship applies to any student who maintains a 4.0 GPA.",
        "indicators": [
          {
            "text": "any",
            "group": 1
          }
        ],
        "sufficient": "a person is a student who maintains a 4.0 GPA",
        "necessary": "the scholarship applies to that person",
        "diagram": "a person is a student who maintains a 4.0 GPA → the scholarship applies to that person",
        "contrapositive": "NOT (the scholarship applies to that person) → NOT (a person is a student who maintains a 4.0 GPA)",
        "ifThen": "If a person is a student who maintains a 4.0 GPA, then the scholarship applies to that person.",
        "contrapositiveWords": "If the scholarship does not apply to that person, then that person is not a student who maintains a 4.0 GPA.",
        "explanation": "Keep student and maintains a 4.0 GPA together. The rule does not cover every person with that GPA.",
        "correctionNotes": [
          "Keep “student who maintains a 4.0 GPA.”"
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 5
        }
      },
      {
        "id": "source-intro-identify-06",
        "sourceId": "intro-p1-06",
        "originalStatement": "You can access the VIP area only when your ID is verified.",
        "statement": "You can access the VIP area only when your ID is verified.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "you can access the VIP area",
        "necessary": "your ID is verified",
        "diagram": "you can access the VIP area → your ID is verified",
        "contrapositive": "NOT (your ID is verified) → NOT (you can access the VIP area)",
        "ifThen": "If you can access the VIP area, then your ID is verified.",
        "contrapositiveWords": "If your ID is not verified, then you cannot access the VIP area.",
        "explanation": "Can access is the condition. Permission to enter is different from actually entering.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 6
        }
      },
      {
        "id": "source-intro-identify-07",
        "sourceId": "intro-p1-07",
        "originalStatement": "Only after the agreement is signed will the project commence.",
        "statement": "Only after the agreement is signed will the project commence.",
        "indicators": [
          {
            "text": "Only after",
            "group": 2
          }
        ],
        "sufficient": "the project commences",
        "necessary": "the agreement has been signed before commencement",
        "diagram": "the project commences → the agreement has been signed before commencement",
        "contrapositive": "NOT (the agreement has been signed before commencement) → NOT (the project commences)",
        "ifThen": "If the project commences, then the agreement has been signed before commencement.",
        "contrapositiveWords": "If the agreement has not been signed before commencement, then the project does not commence.",
        "explanation": "The signature must precede commencement. A signature at some later time would not meet the requirement.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 7
        }
      },
      {
        "id": "source-intro-identify-08",
        "sourceId": "intro-p1-08",
        "originalStatement": "Members who pay their dues can attend the meeting.",
        "statement": "Members who pay their dues can attend the meeting.",
        "indicators": [
          {
            "text": "who",
            "group": 1
          }
        ],
        "sufficient": "a person is a member who pays their dues",
        "necessary": "that person can attend the meeting",
        "diagram": "a person is a member who pays their dues → that person can attend the meeting",
        "contrapositive": "NOT (that person can attend the meeting) → NOT (a person is a member who pays their dues)",
        "ifThen": "If a person is a member who pays their dues, then that person can attend the meeting.",
        "contrapositiveWords": "If that person cannot attend the meeting, then that person is not a member who pays their dues.",
        "explanation": "Keep both membership and payment. Can attend does not say that the member attends.",
        "correctionNotes": [
          "Keep membership and “can attend.”"
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 8
        }
      },
      {
        "id": "source-intro-identify-09",
        "sourceId": "intro-p1-09",
        "originalStatement": "If the alarm sounds, the building should be evacuated immediately.",
        "statement": "If the alarm sounds, the building should be evacuated immediately.",
        "indicators": [
          {
            "text": "If",
            "group": 1
          }
        ],
        "sufficient": "the alarm sounds",
        "necessary": "the building should be evacuated immediately",
        "diagram": "the alarm sounds → the building should be evacuated immediately",
        "contrapositive": "NOT (the building should be evacuated immediately) → NOT (the alarm sounds)",
        "ifThen": "If the alarm sounds, then the building should be evacuated immediately.",
        "contrapositiveWords": "If it is not the case that the building should be evacuated immediately, then the alarm does not sound.",
        "explanation": "Keep should in the result. Failure to evacuate does not prove that evacuation was not called for or that the alarm was silent.",
        "correctionNotes": [
          "“Should be evacuated” is an obligation, not proof of evacuation."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 9
        }
      },
      {
        "id": "source-intro-identify-10",
        "sourceId": "intro-p1-10",
        "originalStatement": "Passengers must present a ticket to board the train.",
        "statement": "Passengers must present a ticket to be allowed to board the train.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a passenger is allowed to board the train",
        "necessary": "that passenger presents a ticket",
        "diagram": "a passenger is allowed to board the train → that passenger presents a ticket",
        "contrapositive": "NOT (that passenger presents a ticket) → NOT (a passenger is allowed to board the train)",
        "ifThen": "If a passenger is allowed to board the train, then that passenger presents a ticket.",
        "contrapositiveWords": "If that passenger does not present a ticket, then that passenger is not allowed to board the train.",
        "explanation": "This is a boarding requirement. Keep presents a ticket, rather than merely owns a ticket.",
        "correctionNotes": [
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 10
        }
      },
      {
        "id": "source-intro-identify-11",
        "sourceId": "intro-p1-11",
        "originalStatement": "A refund is issued only if the item is returned unopened.",
        "statement": "A refund is issued only if the item is returned unopened.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "a refund is issued",
        "necessary": "the item is returned unopened",
        "diagram": "a refund is issued → the item is returned unopened",
        "contrapositive": "NOT (the item is returned unopened) → NOT (a refund is issued)",
        "ifThen": "If a refund is issued, then the item is returned unopened.",
        "contrapositiveWords": "If the item is not returned unopened, then that refund is not issued.",
        "explanation": "Not returned unopened includes no return at all. It does not mean only returned opened.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 11
        }
      },
      {
        "id": "source-intro-identify-12",
        "sourceId": "intro-p1-12",
        "originalStatement": "The team goes to the finals if they win the semifinals.",
        "statement": "The team goes to the finals if they win the semifinals.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the team wins the semifinals",
        "necessary": "the team goes to the finals",
        "diagram": "the team wins the semifinals → the team goes to the finals",
        "contrapositive": "NOT (the team goes to the finals) → NOT (the team wins the semifinals)",
        "ifThen": "If the team wins the semifinals, then the team goes to the finals.",
        "contrapositiveWords": "If the team does not go to the finals, then the team does not win the semifinals.",
        "explanation": "The sufficient condition appears last in the rule but still goes on the left.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 12
        }
      },
      {
        "id": "source-intro-identify-13",
        "sourceId": "intro-p1-13",
        "originalStatement": "Every applicant who passes the test will receive an interview call.",
        "statement": "Every applicant who passes the test will receive an interview call.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a person is an applicant who passes the test",
        "necessary": "that person receives an interview call",
        "diagram": "a person is an applicant who passes the test → that person receives an interview call",
        "contrapositive": "NOT (that person receives an interview call) → NOT (a person is an applicant who passes the test)",
        "ifThen": "If a person is an applicant who passes the test, then that person receives an interview call.",
        "contrapositiveWords": "If that person does not receive an interview call, then that person is not an applicant who passes the test.",
        "explanation": "Keep applicant who passes the test together. Passing alone is not the whole trigger.",
        "correctionNotes": [
          "Keep the applicant restriction."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 13
        }
      },
      {
        "id": "source-intro-identify-14",
        "sourceId": "intro-p1-14",
        "originalStatement": "You must be over 18 to vote in the election.",
        "statement": "You must be over 18 to vote in the club election.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a person votes in the club election",
        "necessary": "that person is over 18",
        "diagram": "a person votes in the club election → that person is over 18",
        "contrapositive": "NOT (that person is over 18) → NOT (a person votes in the club election)",
        "ifThen": "If a person votes in the club election, then that person is over 18.",
        "contrapositiveWords": "If a person is not over 18, then that person does not vote in the club election.",
        "explanation": "Over 18 means older than 18. Voting requires being over 18, but being over 18 does not prove that a person votes.",
        "correctionNotes": [
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 14
        }
      },
      {
        "id": "source-intro-identify-15",
        "sourceId": "intro-p1-15",
        "originalStatement": "If you plant trees, you will support the environment.",
        "statement": "If you plant trees, you will support the environment.",
        "indicators": [
          {
            "text": "If",
            "group": 1
          }
        ],
        "sufficient": "you plant trees",
        "necessary": "you support the environment",
        "diagram": "you plant trees → you support the environment",
        "contrapositive": "NOT (you support the environment) → NOT (you plant trees)",
        "ifThen": "If you plant trees, then you support the environment.",
        "contrapositiveWords": "If you do not support the environment, then you do not plant trees.",
        "explanation": "Use the supplied rule. Planting trees is enough for its stated result; the result alone does not prove planting.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 1",
          "item": 15
        }
      },
      {
        "id": "source-indicators-01",
        "sourceId": "indicator-p1-01",
        "originalStatement": "Only if employees complete training do they qualify for promotion.",
        "statement": "Only if employees complete training do they qualify for promotion.",
        "indicators": [
          {
            "text": "Only if",
            "group": 2
          }
        ],
        "sufficient": "employees qualify for promotion",
        "necessary": "those employees complete training",
        "diagram": "employees qualify for promotion → those employees complete training",
        "contrapositive": "NOT (those employees complete training) → NOT (employees qualify for promotion)",
        "ifThen": "If employees qualify for promotion, then those employees complete training.",
        "contrapositiveWords": "If those employees do not complete training, then employees do not qualify for promotion.",
        "explanation": "The training requirement comes first in the rule, but qualification goes on the left of the arrow.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 1
        }
      },
      {
        "id": "source-indicators-02",
        "sourceId": "indicator-p1-02",
        "originalStatement": "Any student who misses a lesson receives notes.",
        "statement": "Any student who misses a lesson receives notes.",
        "indicators": [
          {
            "text": "Any",
            "group": 1
          }
        ],
        "sufficient": "a person is a student who misses a lesson",
        "necessary": "that student receives notes",
        "diagram": "a person is a student who misses a lesson → that student receives notes",
        "contrapositive": "NOT (that student receives notes) → NOT (a person is a student who misses a lesson)",
        "ifThen": "If a person is a student who misses a lesson, then that student receives notes.",
        "contrapositiveWords": "If that student does not receive notes, then that person is not a student who misses a lesson.",
        "explanation": "Keep the student and missed-lesson restriction in the trigger.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 2
        }
      },
      {
        "id": "source-indicators-03",
        "sourceId": "indicator-p1-03",
        "originalStatement": "Houseguests can enter the backyard only when the gate is unlocked.",
        "statement": "Houseguests can enter the backyard only when the gate is unlocked.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "houseguests can enter the backyard",
        "necessary": "the gate is unlocked",
        "diagram": "houseguests can enter the backyard → the gate is unlocked",
        "contrapositive": "NOT (the gate is unlocked) → NOT (houseguests can enter the backyard)",
        "ifThen": "If houseguests can enter the backyard, then the gate is unlocked.",
        "contrapositiveWords": "If the gate is not unlocked, then houseguests cannot enter the backyard.",
        "explanation": "The rule concerns whether entry is possible. It does not claim anyone actually enters.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 3
        }
      },
      {
        "id": "source-indicators-04",
        "sourceId": "indicator-p1-04",
        "originalStatement": "The only foods that spoil quickly are those without preservatives.",
        "statement": "The only foods that spoil quickly are those without preservatives.",
        "indicators": [
          {
            "text": "The only",
            "group": 1
          }
        ],
        "sufficient": "a food spoils quickly",
        "necessary": "that food has no preservatives",
        "diagram": "a food spoils quickly → that food has no preservatives",
        "contrapositive": "NOT (that food has no preservatives) → NOT (a food spoils quickly)",
        "ifThen": "If a food spoils quickly, then that food has no preservatives.",
        "contrapositiveWords": "If that food has preservatives, then that food does not spoil quickly.",
        "explanation": "Here the only foods that spoil quickly identifies the sufficient category. Quickly spoiling food requires no preservatives; the reverse is not given.",
        "correctionNotes": [
          "The source key conflicts over the classification of “the only.”"
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 4
        }
      },
      {
        "id": "source-indicators-05",
        "sourceId": "indicator-p1-05",
        "originalStatement": "Servers restart where maintenance is complete.",
        "statement": "Servers restart where maintenance is complete.",
        "indicators": [
          {
            "text": "where",
            "group": 1
          }
        ],
        "sufficient": "maintenance is complete",
        "necessary": "servers restart",
        "diagram": "maintenance is complete → servers restart",
        "contrapositive": "NOT (servers restart) → NOT (maintenance is complete)",
        "ifThen": "If maintenance is complete, then servers restart.",
        "contrapositiveWords": "If servers do not restart, then maintenance is not complete.",
        "explanation": "Where introduces the situation sufficient for restarting in this supplied rule.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 5
        }
      },
      {
        "id": "source-indicators-06",
        "sourceId": "indicator-p1-06",
        "originalStatement": "Drivers must wear seatbelts to avoid fines.",
        "statement": "Drivers must wear seatbelts to avoid fines.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a driver avoids fines under this rule",
        "necessary": "that driver wears a seatbelt",
        "diagram": "a driver avoids fines under this rule → that driver wears a seatbelt",
        "contrapositive": "NOT (that driver wears a seatbelt) → NOT (a driver avoids fines under this rule)",
        "ifThen": "If a driver avoids fines under this rule, then that driver wears a seatbelt.",
        "contrapositiveWords": "If that driver does not wear a seatbelt, then that driver does not avoid fines under this rule.",
        "explanation": "Avoiding fines requires a seatbelt. Wearing one alone does not guarantee avoiding every fine.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 6
        }
      },
      {
        "id": "source-indicators-07",
        "sourceId": "indicator-p1-07",
        "originalStatement": "Workers evacuate if the alarm sounds.",
        "statement": "Workers evacuate if the alarm sounds.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the alarm sounds",
        "necessary": "workers evacuate",
        "diagram": "the alarm sounds → workers evacuate",
        "contrapositive": "NOT (workers evacuate) → NOT (the alarm sounds)",
        "ifThen": "If the alarm sounds, then workers evacuate.",
        "contrapositiveWords": "If workers do not evacuate, then the alarm does not sound.",
        "explanation": "Read the if-clause first when drawing the arrow, even though it appears last.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 7
        }
      },
      {
        "id": "source-indicators-08",
        "sourceId": "indicator-p1-08",
        "originalStatement": "Borrowing requires collateral to secure a loan.",
        "statement": "Granting a loan requires collateral to be provided.",
        "indicators": [
          {
            "text": "requires",
            "group": 2
          }
        ],
        "sufficient": "a loan is granted",
        "necessary": "collateral is provided",
        "diagram": "a loan is granted → collateral is provided",
        "contrapositive": "NOT (collateral is provided) → NOT (a loan is granted)",
        "ifThen": "If a loan is granted, then collateral is provided.",
        "contrapositiveWords": "If collateral is not provided, then that loan is not granted.",
        "explanation": "The loan requires collateral. Providing collateral alone does not guarantee a loan.",
        "correctionNotes": [
          "The borrowing/collateral wording needs clarification before grading.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 8
        }
      },
      {
        "id": "source-indicators-09",
        "sourceId": "indicator-p1-09",
        "originalStatement": "All applications submitted on time will be reviewed.",
        "statement": "All applications submitted on time will be reviewed.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "an application is submitted on time",
        "necessary": "that application is reviewed",
        "diagram": "an application is submitted on time → that application is reviewed",
        "contrapositive": "NOT (that application is reviewed) → NOT (an application is submitted on time)",
        "ifThen": "If an application is submitted on time, then that application is reviewed.",
        "contrapositiveWords": "If that application is not reviewed, then that application is not submitted on time.",
        "explanation": "On time belongs to the sufficient condition. The rule does not cover late applications.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 9
        }
      },
      {
        "id": "source-indicators-10",
        "sourceId": "indicator-p1-10",
        "originalStatement": "Visitors can enter when they show ID.",
        "statement": "Visitors can enter when they show ID.",
        "indicators": [
          {
            "text": "when",
            "group": 1
          }
        ],
        "sufficient": "visitors show ID",
        "necessary": "those visitors can enter",
        "diagram": "visitors show ID → those visitors can enter",
        "contrapositive": "NOT (those visitors can enter) → NOT (visitors show ID)",
        "ifThen": "If visitors show ID, then those visitors can enter.",
        "contrapositiveWords": "If those visitors cannot enter, then visitors do not show ID.",
        "explanation": "Keep can enter. Permission is not proof that entry occurs.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 10
        }
      },
      {
        "id": "source-indicators-11",
        "sourceId": "indicator-p1-11",
        "originalStatement": "Always document errors before troubleshooting.",
        "statement": "Errors must always be documented before troubleshooting begins.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          },
          {
            "text": "always",
            "group": 2
          }
        ],
        "sufficient": "troubleshooting begins",
        "necessary": "errors have been documented before troubleshooting",
        "diagram": "troubleshooting begins → errors have been documented before troubleshooting",
        "contrapositive": "NOT (errors have been documented before troubleshooting) → NOT (troubleshooting begins)",
        "ifThen": "If troubleshooting begins, then errors have been documented before troubleshooting.",
        "contrapositiveWords": "If errors have not been documented before troubleshooting, then troubleshooting does not begin.",
        "explanation": "Must and always both point to the requirement. Before is part of it: documentation after troubleshooting would not meet it.",
        "correctionNotes": [
          "This is an instruction. Do not treat it as proof of actual compliance.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 11
        }
      },
      {
        "id": "source-indicators-12",
        "sourceId": "indicator-p1-12",
        "originalStatement": "The park is accessible only where pathways lead.",
        "statement": "The park is accessible only where pathways lead.",
        "indicators": [
          {
            "text": "only where",
            "group": 2
          }
        ],
        "sufficient": "the park is accessible at a location",
        "necessary": "pathways lead to that location",
        "diagram": "the park is accessible at a location → pathways lead to that location",
        "contrapositive": "NOT (pathways lead to that location) → NOT (the park is accessible at a location)",
        "ifThen": "If the park is accessible at a location, then pathways lead to that location.",
        "contrapositiveWords": "If pathways do not lead to that location, then the park is not accessible at that location.",
        "explanation": "Keep the same location on both sides. Accessible park locations require pathways leading there.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 12
        }
      },
      {
        "id": "source-indicators-13",
        "sourceId": "indicator-p1-13",
        "originalStatement": "Every author who publishes gains recognition.",
        "statement": "Every author who publishes gains recognition.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a person is an author who publishes",
        "necessary": "that author gains recognition",
        "diagram": "a person is an author who publishes → that author gains recognition",
        "contrapositive": "NOT (that author gains recognition) → NOT (a person is an author who publishes)",
        "ifThen": "If a person is an author who publishes, then that author gains recognition.",
        "contrapositiveWords": "If that author does not gain recognition, then that person is not an author who publishes.",
        "explanation": "The publishing restriction is part of the sufficient condition.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 1",
          "item": 13
        }
      }
    ]
  },
  {
    "id": "source-intro-diagrams",
    "title": "Put the conditions beside the arrow",
    "shortTitle": "Intro training revisited",
    "stage": "Diagram",
    "taskKind": "forward",
    "instructions": "Return to the 15 intro rules. Shorten each supplied complete condition, then build the original diagram with your short versions. It is checked for direction and complete meaning.",
    "items": [
      {
        "id": "source-intro-diagrams-01",
        "sourceId": "intro-p2-01",
        "originalStatement": "A warranty is valid if the product is registered within 30 days.",
        "statement": "A warranty is valid if the product is registered within 30 days.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the product is registered within 30 days",
        "necessary": "the warranty is valid",
        "diagram": "the product is registered within 30 days → the warranty is valid",
        "contrapositive": "NOT (the warranty is valid) → NOT (the product is registered within 30 days)",
        "ifThen": "If the product is registered within 30 days, then the warranty is valid.",
        "contrapositiveWords": "If the warranty is not valid, then the product is not registered within 30 days.",
        "explanation": "The deadline belongs inside the sufficient condition. Registration after 30 days does not meet this trigger.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 1
        }
      },
      {
        "id": "source-intro-diagrams-02",
        "sourceId": "intro-p2-02",
        "originalStatement": "Whenever you see lightning, expect thunder to follow.",
        "statement": "Whenever you see lightning, you should expect thunder to follow.",
        "indicators": [
          {
            "text": "Whenever",
            "group": 1
          }
        ],
        "sufficient": "you see lightning",
        "necessary": "you should expect thunder to follow",
        "diagram": "you see lightning → you should expect thunder to follow",
        "contrapositive": "NOT (you should expect thunder to follow) → NOT (you see lightning)",
        "ifThen": "If you see lightning, then you should expect thunder to follow.",
        "contrapositiveWords": "If it is not true that you should expect thunder to follow, then you do not see lightning.",
        "explanation": "The result is that you should expect thunder. The rule does not promise that thunder actually follows.",
        "correctionNotes": [
          "The key strengthens “expect thunder” to “thunder will follow.” Preserve the expectation.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 2
        }
      },
      {
        "id": "source-intro-diagrams-03",
        "sourceId": "intro-p2-03",
        "originalStatement": "The gate opens only if the correct code is entered.",
        "statement": "The gate opens only if the correct code is entered.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "the gate opens",
        "necessary": "the correct code is entered",
        "diagram": "the gate opens → the correct code is entered",
        "contrapositive": "NOT (the correct code is entered) → NOT (the gate opens)",
        "ifThen": "If the gate opens, then the correct code is entered.",
        "contrapositiveWords": "If the correct code is not entered, then the gate does not open.",
        "explanation": "Opening requires the correct code. Entering a code alone does not prove that the gate opens.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 3
        }
      },
      {
        "id": "source-intro-diagrams-04",
        "sourceId": "intro-p2-04",
        "originalStatement": "All managers must undergo annual training.",
        "statement": "All managers must undergo annual training.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          },
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a person is a manager",
        "necessary": "that person is required to undergo annual training",
        "diagram": "a person is a manager → that person is required to undergo annual training",
        "contrapositive": "NOT (that person is required to undergo annual training) → NOT (a person is a manager)",
        "ifThen": "If a person is a manager, then that person is required to undergo annual training.",
        "contrapositiveWords": "If that person is not required to undergo annual training, then that person is not a manager.",
        "explanation": "Keep the requirement in the outcome. A manager who skips training can still be a manager.",
        "correctionNotes": [
          "Preserve the training requirement; a duty does not prove actual compliance."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 4
        }
      },
      {
        "id": "source-intro-diagrams-05",
        "sourceId": "intro-p2-05",
        "originalStatement": "The scholarship applies to any student who maintains a 4.0 GPA.",
        "statement": "The scholarship applies to any student who maintains a 4.0 GPA.",
        "indicators": [
          {
            "text": "any",
            "group": 1
          }
        ],
        "sufficient": "a person is a student who maintains a 4.0 GPA",
        "necessary": "the scholarship applies to that person",
        "diagram": "a person is a student who maintains a 4.0 GPA → the scholarship applies to that person",
        "contrapositive": "NOT (the scholarship applies to that person) → NOT (a person is a student who maintains a 4.0 GPA)",
        "ifThen": "If a person is a student who maintains a 4.0 GPA, then the scholarship applies to that person.",
        "contrapositiveWords": "If the scholarship does not apply to that person, then that person is not a student who maintains a 4.0 GPA.",
        "explanation": "Keep student and maintains a 4.0 GPA together. The rule does not cover every person with that GPA.",
        "correctionNotes": [
          "Keep “student who maintains a 4.0 GPA.”"
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 5
        }
      },
      {
        "id": "source-intro-diagrams-06",
        "sourceId": "intro-p2-06",
        "originalStatement": "You can access the VIP area only when your ID is verified.",
        "statement": "You can access the VIP area only when your ID is verified.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "you can access the VIP area",
        "necessary": "your ID is verified",
        "diagram": "you can access the VIP area → your ID is verified",
        "contrapositive": "NOT (your ID is verified) → NOT (you can access the VIP area)",
        "ifThen": "If you can access the VIP area, then your ID is verified.",
        "contrapositiveWords": "If your ID is not verified, then you cannot access the VIP area.",
        "explanation": "Can access is the condition. Permission to enter is different from actually entering.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 6
        }
      },
      {
        "id": "source-intro-diagrams-07",
        "sourceId": "intro-p2-07",
        "originalStatement": "Only after the agreement is signed will the project commence.",
        "statement": "Only after the agreement is signed will the project commence.",
        "indicators": [
          {
            "text": "Only after",
            "group": 2
          }
        ],
        "sufficient": "the project commences",
        "necessary": "the agreement has been signed before commencement",
        "diagram": "the project commences → the agreement has been signed before commencement",
        "contrapositive": "NOT (the agreement has been signed before commencement) → NOT (the project commences)",
        "ifThen": "If the project commences, then the agreement has been signed before commencement.",
        "contrapositiveWords": "If the agreement has not been signed before commencement, then the project does not commence.",
        "explanation": "The signature must precede commencement. A signature at some later time would not meet the requirement.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 7
        }
      },
      {
        "id": "source-intro-diagrams-08",
        "sourceId": "intro-p2-08",
        "originalStatement": "Members who pay their dues can attend the meeting.",
        "statement": "Members who pay their dues can attend the meeting.",
        "indicators": [
          {
            "text": "who",
            "group": 1
          }
        ],
        "sufficient": "a person is a member who pays their dues",
        "necessary": "that person can attend the meeting",
        "diagram": "a person is a member who pays their dues → that person can attend the meeting",
        "contrapositive": "NOT (that person can attend the meeting) → NOT (a person is a member who pays their dues)",
        "ifThen": "If a person is a member who pays their dues, then that person can attend the meeting.",
        "contrapositiveWords": "If that person cannot attend the meeting, then that person is not a member who pays their dues.",
        "explanation": "Keep both membership and payment. Can attend does not say that the member attends.",
        "correctionNotes": [
          "Keep membership and “can attend.”"
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 8
        }
      },
      {
        "id": "source-intro-diagrams-09",
        "sourceId": "intro-p2-09",
        "originalStatement": "If the alarm sounds, the building should be evacuated immediately.",
        "statement": "If the alarm sounds, the building should be evacuated immediately.",
        "indicators": [
          {
            "text": "If",
            "group": 1
          }
        ],
        "sufficient": "the alarm sounds",
        "necessary": "the building should be evacuated immediately",
        "diagram": "the alarm sounds → the building should be evacuated immediately",
        "contrapositive": "NOT (the building should be evacuated immediately) → NOT (the alarm sounds)",
        "ifThen": "If the alarm sounds, then the building should be evacuated immediately.",
        "contrapositiveWords": "If it is not the case that the building should be evacuated immediately, then the alarm does not sound.",
        "explanation": "Keep should in the result. Failure to evacuate does not prove that evacuation was not called for or that the alarm was silent.",
        "correctionNotes": [
          "“Should be evacuated” is an obligation, not proof of evacuation."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 9
        }
      },
      {
        "id": "source-intro-diagrams-10",
        "sourceId": "intro-p2-10",
        "originalStatement": "Passengers must present a ticket to board the train.",
        "statement": "Passengers must present a ticket to be allowed to board the train.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a passenger is allowed to board the train",
        "necessary": "that passenger presents a ticket",
        "diagram": "a passenger is allowed to board the train → that passenger presents a ticket",
        "contrapositive": "NOT (that passenger presents a ticket) → NOT (a passenger is allowed to board the train)",
        "ifThen": "If a passenger is allowed to board the train, then that passenger presents a ticket.",
        "contrapositiveWords": "If that passenger does not present a ticket, then that passenger is not allowed to board the train.",
        "explanation": "This is a boarding requirement. Keep presents a ticket, rather than merely owns a ticket.",
        "correctionNotes": [
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 10
        }
      },
      {
        "id": "source-intro-diagrams-11",
        "sourceId": "intro-p2-11",
        "originalStatement": "A refund is issued only if the item is returned unopened.",
        "statement": "A refund is issued only if the item is returned unopened.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "a refund is issued",
        "necessary": "the item is returned unopened",
        "diagram": "a refund is issued → the item is returned unopened",
        "contrapositive": "NOT (the item is returned unopened) → NOT (a refund is issued)",
        "ifThen": "If a refund is issued, then the item is returned unopened.",
        "contrapositiveWords": "If the item is not returned unopened, then that refund is not issued.",
        "explanation": "Not returned unopened includes no return at all. It does not mean only returned opened.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 11
        }
      },
      {
        "id": "source-intro-diagrams-12",
        "sourceId": "intro-p2-12",
        "originalStatement": "The team goes to the finals if they win the semifinals.",
        "statement": "The team goes to the finals if they win the semifinals.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the team wins the semifinals",
        "necessary": "the team goes to the finals",
        "diagram": "the team wins the semifinals → the team goes to the finals",
        "contrapositive": "NOT (the team goes to the finals) → NOT (the team wins the semifinals)",
        "ifThen": "If the team wins the semifinals, then the team goes to the finals.",
        "contrapositiveWords": "If the team does not go to the finals, then the team does not win the semifinals.",
        "explanation": "The sufficient condition appears last in the rule but still goes on the left.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 12
        }
      },
      {
        "id": "source-intro-diagrams-13",
        "sourceId": "intro-p2-13",
        "originalStatement": "Every applicant who passes the test will receive an interview call.",
        "statement": "Every applicant who passes the test will receive an interview call.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a person is an applicant who passes the test",
        "necessary": "that person receives an interview call",
        "diagram": "a person is an applicant who passes the test → that person receives an interview call",
        "contrapositive": "NOT (that person receives an interview call) → NOT (a person is an applicant who passes the test)",
        "ifThen": "If a person is an applicant who passes the test, then that person receives an interview call.",
        "contrapositiveWords": "If that person does not receive an interview call, then that person is not an applicant who passes the test.",
        "explanation": "Keep applicant who passes the test together. Passing alone is not the whole trigger.",
        "correctionNotes": [
          "Keep the applicant restriction."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 13
        }
      },
      {
        "id": "source-intro-diagrams-14",
        "sourceId": "intro-p2-14",
        "originalStatement": "You must be over 18 to vote in the election.",
        "statement": "You must be over 18 to vote in the club election.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a person votes in the club election",
        "necessary": "that person is over 18",
        "diagram": "a person votes in the club election → that person is over 18",
        "contrapositive": "NOT (that person is over 18) → NOT (a person votes in the club election)",
        "ifThen": "If a person votes in the club election, then that person is over 18.",
        "contrapositiveWords": "If a person is not over 18, then that person does not vote in the club election.",
        "explanation": "Over 18 means older than 18. Voting requires being over 18, but being over 18 does not prove that a person votes.",
        "correctionNotes": [
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 14
        }
      },
      {
        "id": "source-intro-diagrams-15",
        "sourceId": "intro-p2-15",
        "originalStatement": "If you plant trees, you will support the environment.",
        "statement": "If you plant trees, you will support the environment.",
        "indicators": [
          {
            "text": "If",
            "group": 1
          }
        ],
        "sufficient": "you plant trees",
        "necessary": "you support the environment",
        "diagram": "you plant trees → you support the environment",
        "contrapositive": "NOT (you support the environment) → NOT (you plant trees)",
        "ifThen": "If you plant trees, then you support the environment.",
        "contrapositiveWords": "If you do not support the environment, then you do not plant trees.",
        "explanation": "Use the supplied rule. Planting trees is enough for its stated result; the result alone does not prove planting.",
        "correctionNotes": [],
        "source": {
          "file": "Intro training set/Homework/2025-06-23_intro training group ½ (3).pdf",
          "sha256": "93623f4304af75a3c2e009610dfa0fc9ec5316ed3c304c67d6d2166d48c19a4d",
          "part": "Intro training · Part 2",
          "item": 15
        }
      }
    ]
  },
  {
    "id": "source-roles",
    "title": "Identify each side of the rule",
    "shortTitle": "Diagramming and roles",
    "stage": "Diagram",
    "taskKind": "roles",
    "instructions": "Place the sufficient condition on the left and the necessary condition on the right. Their order in the rule may differ.",
    "items": [
      {
        "id": "source-roles-01",
        "sourceId": "indicator-p2-01",
        "originalStatement": "Only if employees complete training do they qualify for promotion.",
        "statement": "Only if employees complete training do they qualify for promotion.",
        "indicators": [
          {
            "text": "Only if",
            "group": 2
          }
        ],
        "sufficient": "employees qualify for promotion",
        "necessary": "those employees complete training",
        "diagram": "employees qualify for promotion → those employees complete training",
        "contrapositive": "NOT (those employees complete training) → NOT (employees qualify for promotion)",
        "ifThen": "If employees qualify for promotion, then those employees complete training.",
        "contrapositiveWords": "If those employees do not complete training, then employees do not qualify for promotion.",
        "explanation": "The training requirement comes first in the rule, but qualification goes on the left of the arrow.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 1
        }
      },
      {
        "id": "source-roles-02",
        "sourceId": "indicator-p2-02",
        "originalStatement": "Any student who misses a lesson receives notes.",
        "statement": "Any student who misses a lesson receives notes.",
        "indicators": [
          {
            "text": "Any",
            "group": 1
          }
        ],
        "sufficient": "a person is a student who misses a lesson",
        "necessary": "that student receives notes",
        "diagram": "a person is a student who misses a lesson → that student receives notes",
        "contrapositive": "NOT (that student receives notes) → NOT (a person is a student who misses a lesson)",
        "ifThen": "If a person is a student who misses a lesson, then that student receives notes.",
        "contrapositiveWords": "If that student does not receive notes, then that person is not a student who misses a lesson.",
        "explanation": "Keep the student and missed-lesson restriction in the trigger.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 2
        }
      },
      {
        "id": "source-roles-03",
        "sourceId": "indicator-p2-03",
        "originalStatement": "Houseguests can enter the backyard only when the gate is unlocked.",
        "statement": "Houseguests can enter the backyard only when the gate is unlocked.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "houseguests can enter the backyard",
        "necessary": "the gate is unlocked",
        "diagram": "houseguests can enter the backyard → the gate is unlocked",
        "contrapositive": "NOT (the gate is unlocked) → NOT (houseguests can enter the backyard)",
        "ifThen": "If houseguests can enter the backyard, then the gate is unlocked.",
        "contrapositiveWords": "If the gate is not unlocked, then houseguests cannot enter the backyard.",
        "explanation": "The rule concerns whether entry is possible. It does not claim anyone actually enters.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 3
        }
      },
      {
        "id": "source-roles-04",
        "sourceId": "indicator-p2-04",
        "originalStatement": "Drivers must wear seatbelts to avoid fines.",
        "statement": "Drivers must wear seatbelts to avoid fines.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a driver avoids fines under this rule",
        "necessary": "that driver wears a seatbelt",
        "diagram": "a driver avoids fines under this rule → that driver wears a seatbelt",
        "contrapositive": "NOT (that driver wears a seatbelt) → NOT (a driver avoids fines under this rule)",
        "ifThen": "If a driver avoids fines under this rule, then that driver wears a seatbelt.",
        "contrapositiveWords": "If that driver does not wear a seatbelt, then that driver does not avoid fines under this rule.",
        "explanation": "Avoiding fines requires a seatbelt. Wearing one alone does not guarantee avoiding every fine.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 4
        }
      },
      {
        "id": "source-roles-05",
        "sourceId": "indicator-p2-05",
        "originalStatement": "All applications submitted on time will be reviewed.",
        "statement": "All applications submitted on time will be reviewed.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "an application is submitted on time",
        "necessary": "that application is reviewed",
        "diagram": "an application is submitted on time → that application is reviewed",
        "contrapositive": "NOT (that application is reviewed) → NOT (an application is submitted on time)",
        "ifThen": "If an application is submitted on time, then that application is reviewed.",
        "contrapositiveWords": "If that application is not reviewed, then that application is not submitted on time.",
        "explanation": "On time belongs to the sufficient condition. The rule does not cover late applications.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 5
        }
      },
      {
        "id": "source-roles-06",
        "sourceId": "indicator-p2-06",
        "originalStatement": "Borrowing requires collateral to secure a loan.",
        "statement": "Granting a loan requires collateral to be provided.",
        "indicators": [
          {
            "text": "requires",
            "group": 2
          }
        ],
        "sufficient": "a loan is granted",
        "necessary": "collateral is provided",
        "diagram": "a loan is granted → collateral is provided",
        "contrapositive": "NOT (collateral is provided) → NOT (a loan is granted)",
        "ifThen": "If a loan is granted, then collateral is provided.",
        "contrapositiveWords": "If collateral is not provided, then that loan is not granted.",
        "explanation": "The loan requires collateral. Providing collateral alone does not guarantee a loan.",
        "correctionNotes": [
          "The key incorrectly turns a collateral requirement into a guaranteed loan.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 6
        }
      },
      {
        "id": "source-roles-07",
        "sourceId": "indicator-p2-07",
        "originalStatement": "Workers evacuate if the alarm sounds.",
        "statement": "Workers evacuate if the alarm sounds.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the alarm sounds",
        "necessary": "workers evacuate",
        "diagram": "the alarm sounds → workers evacuate",
        "contrapositive": "NOT (workers evacuate) → NOT (the alarm sounds)",
        "ifThen": "If the alarm sounds, then workers evacuate.",
        "contrapositiveWords": "If workers do not evacuate, then the alarm does not sound.",
        "explanation": "Read the if-clause first when drawing the arrow, even though it appears last.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 7
        }
      },
      {
        "id": "source-roles-08",
        "sourceId": "indicator-p2-08",
        "originalStatement": "Visitors can enter when they show ID.",
        "statement": "Visitors can enter when they show ID.",
        "indicators": [
          {
            "text": "when",
            "group": 1
          }
        ],
        "sufficient": "visitors show ID",
        "necessary": "those visitors can enter",
        "diagram": "visitors show ID → those visitors can enter",
        "contrapositive": "NOT (those visitors can enter) → NOT (visitors show ID)",
        "ifThen": "If visitors show ID, then those visitors can enter.",
        "contrapositiveWords": "If those visitors cannot enter, then visitors do not show ID.",
        "explanation": "Keep can enter. Permission is not proof that entry occurs.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 8
        }
      },
      {
        "id": "source-roles-09",
        "sourceId": "indicator-p2-09",
        "originalStatement": "Every author who publishes gains recognition.",
        "statement": "Every author who publishes gains recognition.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a person is an author who publishes",
        "necessary": "that author gains recognition",
        "diagram": "a person is an author who publishes → that author gains recognition",
        "contrapositive": "NOT (that author gains recognition) → NOT (a person is an author who publishes)",
        "ifThen": "If a person is an author who publishes, then that author gains recognition.",
        "contrapositiveWords": "If that author does not gain recognition, then that person is not an author who publishes.",
        "explanation": "The publishing restriction is part of the sufficient condition.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 9
        }
      },
      {
        "id": "source-roles-10",
        "sourceId": "indicator-p2-10",
        "originalStatement": "Always document errors before troubleshooting.",
        "statement": "Errors must always be documented before troubleshooting begins.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          },
          {
            "text": "always",
            "group": 2
          }
        ],
        "sufficient": "troubleshooting begins",
        "necessary": "errors have been documented before troubleshooting",
        "diagram": "troubleshooting begins → errors have been documented before troubleshooting",
        "contrapositive": "NOT (errors have been documented before troubleshooting) → NOT (troubleshooting begins)",
        "ifThen": "If troubleshooting begins, then errors have been documented before troubleshooting.",
        "contrapositiveWords": "If errors have not been documented before troubleshooting, then troubleshooting does not begin.",
        "explanation": "Must and always both point to the requirement. Before is part of it: documentation after troubleshooting would not meet it.",
        "correctionNotes": [
          "Keep “before” and distinguish an instruction from actual compliance.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 2",
          "item": 10
        }
      }
    ]
  },
  {
    "id": "source-rephrase",
    "title": "Rewrite the rule as if / then",
    "shortTitle": "Conditional rephrasing",
    "stage": "Translate",
    "taskKind": "rephrase",
    "instructions": "Rewrite the rule as “If …, then …” before you look at our version. Then find each indicator and its group, and build the original diagram. Keep permissions, duties, deadlines, and restrictions.",
    "items": [
      {
        "id": "source-rephrase-01",
        "sourceId": "rephrase-01",
        "originalStatement": "All runners must hydrate before a marathon.",
        "statement": "All runners in a marathon must hydrate before that marathon.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          },
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a person is a runner in a marathon",
        "necessary": "that runner is required to hydrate before the marathon",
        "diagram": "a person is a runner in a marathon → that runner is required to hydrate before the marathon",
        "contrapositive": "NOT (that runner is required to hydrate before the marathon) → NOT (a person is a runner in a marathon)",
        "ifThen": "If a person is a runner in a marathon, then that runner is required to hydrate before the marathon.",
        "contrapositiveWords": "If that runner is not required to hydrate before the marathon, then that person is not a runner in a marathon.",
        "explanation": "The outcome is a hydration duty, not proof that a runner complied. Keep before the marathon.",
        "correctionNotes": [
          "Mixed indicators and obligation: do not force one group label.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 1
        }
      },
      {
        "id": "source-rephrase-02",
        "sourceId": "rephrase-02",
        "originalStatement": "Whenever sunlight hits the solar panels, they generate electricity.",
        "statement": "Whenever sunlight hits the solar panels, they generate electricity.",
        "indicators": [
          {
            "text": "Whenever",
            "group": 1
          }
        ],
        "sufficient": "sunlight hits the solar panels",
        "necessary": "the panels generate electricity",
        "diagram": "sunlight hits the solar panels → the panels generate electricity",
        "contrapositive": "NOT (the panels generate electricity) → NOT (sunlight hits the solar panels)",
        "ifThen": "If sunlight hits the solar panels, then the panels generate electricity.",
        "contrapositiveWords": "If the panels do not generate electricity, then sunlight does not hit the solar panels.",
        "explanation": "Start with the whenever clause. The rule does not say electricity is generated only this way.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 2
        }
      },
      {
        "id": "source-rephrase-03",
        "sourceId": "rephrase-03",
        "originalStatement": "Only those who conserve water will receive the rebate.",
        "statement": "Only those who conserve water will receive the rebate.",
        "indicators": [
          {
            "text": "Only those",
            "group": 2
          }
        ],
        "sufficient": "a person receives the rebate",
        "necessary": "that person conserves water",
        "diagram": "a person receives the rebate → that person conserves water",
        "contrapositive": "NOT (that person conserves water) → NOT (a person receives the rebate)",
        "ifThen": "If a person receives the rebate, then that person conserves water.",
        "contrapositiveWords": "If that person does not conserve water, then that person does not receive the rebate.",
        "explanation": "Receiving the rebate requires conservation. Conservation alone need not prove a rebate.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 3
        }
      },
      {
        "id": "source-rephrase-04",
        "sourceId": "rephrase-04",
        "originalStatement": "The only key to unlocking that door is the blue key.",
        "statement": "The only key to unlocking that door is the blue key.",
        "indicators": [
          {
            "text": "The only",
            "group": 1
          }
        ],
        "sufficient": "a key unlocks that door",
        "necessary": "that key is the blue key",
        "diagram": "a key unlocks that door → that key is the blue key",
        "contrapositive": "NOT (that key is the blue key) → NOT (a key unlocks that door)",
        "ifThen": "If a key unlocks that door, then that key is the blue key.",
        "contrapositiveWords": "If a key is not the blue key, then that key does not unlock that door.",
        "explanation": "The only what? The only key to unlocking that door. Any key that unlocks it has to be the blue key. The rule is about keys, so it says nothing about other ways of opening the door.",
        "correctionNotes": [
          "Restored the source wording on 2026-10-11 so the item practises the indicator the only."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 4
        }
      },
      {
        "id": "source-rephrase-05",
        "sourceId": "rephrase-05",
        "originalStatement": "Success in chess requires strategic thinking.",
        "statement": "Success in chess requires strategic thinking.",
        "indicators": [
          {
            "text": "requires",
            "group": 2
          }
        ],
        "sufficient": "a person succeeds in chess",
        "necessary": "that person uses strategic thinking",
        "diagram": "a person succeeds in chess → that person uses strategic thinking",
        "contrapositive": "NOT (that person uses strategic thinking) → NOT (a person succeeds in chess)",
        "ifThen": "If a person succeeds in chess, then that person uses strategic thinking.",
        "contrapositiveWords": "If that person does not use strategic thinking, then that person does not succeed in chess.",
        "explanation": "Success requires strategic thinking. Strategic thinking alone is not guaranteed success.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 5
        }
      },
      {
        "id": "source-rephrase-06",
        "sourceId": "rephrase-06",
        "originalStatement": "Any artist who uses oil paints must clean their brushes thoroughly.",
        "statement": "Any artist who uses oil paints must clean their brushes thoroughly.",
        "indicators": [
          {
            "text": "Any",
            "group": 1
          },
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a person is an artist who uses oil paints",
        "necessary": "that artist is required to clean their brushes thoroughly",
        "diagram": "a person is an artist who uses oil paints → that artist is required to clean their brushes thoroughly",
        "contrapositive": "NOT (that artist is required to clean their brushes thoroughly) → NOT (a person is an artist who uses oil paints)",
        "ifThen": "If a person is an artist who uses oil paints, then that artist is required to clean their brushes thoroughly.",
        "contrapositiveWords": "If that artist is not required to clean their brushes thoroughly, then that person is not an artist who uses oil paints.",
        "explanation": "The outcome is the cleaning requirement. Noncompliance alone does not prove the artist avoided oil paints.",
        "correctionNotes": [
          "Mixed indicators and obligation: preserve the duty."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 6
        }
      },
      {
        "id": "source-rephrase-07",
        "sourceId": "rephrase-07",
        "originalStatement": "All successful projects require effective teamwork.",
        "statement": "All successful projects require effective teamwork to have taken place.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          },
          {
            "text": "require",
            "group": 2
          }
        ],
        "sufficient": "a project is successful",
        "necessary": "that project involves effective teamwork",
        "diagram": "a project is successful → that project involves effective teamwork",
        "contrapositive": "NOT (that project involves effective teamwork) → NOT (a project is successful)",
        "ifThen": "If a project is successful, then that project involves effective teamwork.",
        "contrapositiveWords": "If that project does not involve effective teamwork, then that project is not successful.",
        "explanation": "The rule makes teamwork necessary for success. Teamwork alone does not guarantee a successful project.",
        "correctionNotes": [
          "Allow a separate group label for each indicator.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 7
        }
      },
      {
        "id": "source-rephrase-08",
        "sourceId": "rephrase-08",
        "originalStatement": "Only those with a degree in architecture can apply for this position.",
        "statement": "Only those with a degree in architecture can apply for this position.",
        "indicators": [
          {
            "text": "Only those",
            "group": 2
          }
        ],
        "sufficient": "a person can apply for this position",
        "necessary": "that person has a degree in architecture",
        "diagram": "a person can apply for this position → that person has a degree in architecture",
        "contrapositive": "NOT (that person has a degree in architecture) → NOT (a person can apply for this position)",
        "ifThen": "If a person can apply for this position, then that person has a degree in architecture.",
        "contrapositiveWords": "If that person does not have a degree in architecture, then that person cannot apply for this position.",
        "explanation": "Can apply is not actually applies. Keep eligibility in both translations.",
        "correctionNotes": [
          "Preserve “can apply.”"
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 8
        }
      },
      {
        "id": "source-rephrase-09",
        "sourceId": "rephrase-09",
        "originalStatement": "Whenever the sun sets, the streetlights turn on.",
        "statement": "Whenever the sun sets, the streetlights turn on.",
        "indicators": [
          {
            "text": "Whenever",
            "group": 1
          }
        ],
        "sufficient": "the sun sets",
        "necessary": "the streetlights turn on",
        "diagram": "the sun sets → the streetlights turn on",
        "contrapositive": "NOT (the streetlights turn on) → NOT (the sun sets)",
        "ifThen": "If the sun sets, then the streetlights turn on.",
        "contrapositiveWords": "If the streetlights do not turn on, then the sun does not set.",
        "explanation": "Sunset is the trigger in the supplied rule. Lights being on need not prove sunset.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 9
        }
      },
      {
        "id": "source-rephrase-10",
        "sourceId": "rephrase-10",
        "originalStatement": "The only path to wisdom is through experience.",
        "statement": "The only path to wisdom is through experience.",
        "indicators": [
          {
            "text": "The only",
            "group": 1
          }
        ],
        "sufficient": "wisdom is reached",
        "necessary": "experience is involved",
        "diagram": "wisdom is reached → experience is involved",
        "contrapositive": "NOT (experience is involved) → NOT (wisdom is reached)",
        "ifThen": "If wisdom is reached, then experience is involved.",
        "contrapositiveWords": "If experience is not involved, then wisdom is not reached.",
        "explanation": "Treat the path metaphor as a stated requirement. Wisdom requires experience; experience alone need not yield wisdom.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 10
        }
      },
      {
        "id": "source-rephrase-11",
        "sourceId": "rephrase-11",
        "originalStatement": "Every agreement must be in writing to be legally binding.",
        "statement": "Every agreement must be in writing to be legally binding.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "an agreement is legally binding",
        "necessary": "that agreement is in writing",
        "diagram": "an agreement is legally binding → that agreement is in writing",
        "contrapositive": "NOT (that agreement is in writing) → NOT (an agreement is legally binding)",
        "ifThen": "If an agreement is legally binding, then that agreement is in writing.",
        "contrapositiveWords": "If that agreement is not in writing, then that agreement is not legally binding.",
        "explanation": "Must introduces the requirement: being in writing. The full sufficient condition is that an agreement is legally binding, so every does not mark the sufficient condition here.",
        "correctionNotes": [
          "Keep the legally-binding restriction; classify each expression separately."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 11
        }
      },
      {
        "id": "source-rephrase-12",
        "sourceId": "rephrase-12",
        "originalStatement": "You achieve your goals only if you remain committed.",
        "statement": "You achieve your goals only if you remain committed.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "you achieve your goals",
        "necessary": "you remain committed",
        "diagram": "you achieve your goals → you remain committed",
        "contrapositive": "NOT (you remain committed) → NOT (you achieve your goals)",
        "ifThen": "If you achieve your goals, then you remain committed.",
        "contrapositiveWords": "If you do not remain committed, then you do not achieve your goals.",
        "explanation": "Achievement requires commitment. The rule does not guarantee achievement from commitment alone.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 12
        }
      },
      {
        "id": "source-rephrase-13",
        "sourceId": "rephrase-13",
        "originalStatement": "Anyone studying physics will encounter complex mathematical concepts.",
        "statement": "Anyone studying physics will encounter complex mathematical concepts.",
        "indicators": [
          {
            "text": "Anyone",
            "group": 1
          }
        ],
        "sufficient": "a person studies physics",
        "necessary": "that person encounters complex mathematical concepts",
        "diagram": "a person studies physics → that person encounters complex mathematical concepts",
        "contrapositive": "NOT (that person encounters complex mathematical concepts) → NOT (a person studies physics)",
        "ifThen": "If a person studies physics, then that person encounters complex mathematical concepts.",
        "contrapositiveWords": "If that person does not encounter complex mathematical concepts, then that person does not study physics.",
        "explanation": "Anyone makes the rule cover every person who studies physics, not everyone without restriction.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 13
        }
      },
      {
        "id": "source-rephrase-14",
        "sourceId": "rephrase-14",
        "originalStatement": "When artists are inspired, they create their most celebrated pieces.",
        "statement": "When artists are inspired, they create their most celebrated pieces.",
        "indicators": [
          {
            "text": "When",
            "group": 1
          }
        ],
        "sufficient": "artists are inspired",
        "necessary": "those artists create their most celebrated pieces",
        "diagram": "artists are inspired → those artists create their most celebrated pieces",
        "contrapositive": "NOT (those artists create their most celebrated pieces) → NOT (artists are inspired)",
        "ifThen": "If artists are inspired, then those artists create their most celebrated pieces.",
        "contrapositiveWords": "If those artists do not create their most celebrated pieces, then those artists were not inspired.",
        "explanation": "Assume the rule as the exercise rule. Do not judge the diagram by whether this claim is realistic.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 14
        }
      },
      {
        "id": "source-rephrase-15",
        "sourceId": "rephrase-15",
        "originalStatement": "A plant thrives only when sunlight that reaches its leaves is adequate.",
        "statement": "A plant thrives only when sunlight that reaches its leaves is adequate.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "a plant thrives",
        "necessary": "sunlight reaching that plant's leaves is adequate",
        "diagram": "a plant thrives → sunlight reaching that plant's leaves is adequate",
        "contrapositive": "NOT (sunlight reaching that plant's leaves is adequate) → NOT (a plant thrives)",
        "ifThen": "If a plant thrives, then sunlight reaching that plant's leaves is adequate.",
        "contrapositiveWords": "If sunlight reaching that plant's leaves is not adequate, then that plant does not thrive.",
        "explanation": "Keep sunlight reaching its leaves as the full required condition.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 15
        }
      },
      {
        "id": "source-rephrase-16",
        "sourceId": "rephrase-16",
        "originalStatement": "Only those submissions whose applicant identity has been confirmed by the registrar are reviewed.",
        "statement": "Only those submissions whose applicant identity has been confirmed by the registrar are reviewed.",
        "indicators": [
          {
            "text": "Only those",
            "group": 2
          }
        ],
        "sufficient": "a submission is reviewed",
        "necessary": "the registrar has confirmed that submission's applicant identity",
        "diagram": "a submission is reviewed → the registrar has confirmed that submission's applicant identity",
        "contrapositive": "NOT (the registrar has confirmed that submission's applicant identity) → NOT (a submission is reviewed)",
        "ifThen": "If a submission is reviewed, then the registrar has confirmed that submission's applicant identity.",
        "contrapositiveWords": "If the registrar has not confirmed that submission's applicant identity, then that submission is not reviewed.",
        "explanation": "The identity must belong to this submission's applicant and be confirmed by the registrar.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 16
        }
      },
      {
        "id": "source-rephrase-17",
        "sourceId": "rephrase-17",
        "originalStatement": "A license is renewed only where a payment record that matches the license identifier exists.",
        "statement": "A license is renewed only where a payment record that matches the license identifier exists.",
        "indicators": [
          {
            "text": "only where",
            "group": 2
          }
        ],
        "sufficient": "a license is renewed",
        "necessary": "a payment record matching that license's identifier exists",
        "diagram": "a license is renewed → a payment record matching that license's identifier exists",
        "contrapositive": "NOT (a payment record matching that license's identifier exists) → NOT (a license is renewed)",
        "ifThen": "If a license is renewed, then a payment record matching that license's identifier exists.",
        "contrapositiveWords": "If no payment record matching that license's identifier exists, then that license is not renewed.",
        "explanation": "A payment record for a different license does not satisfy this requirement.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 17
        }
      },
      {
        "id": "source-rephrase-18",
        "sourceId": "rephrase-18",
        "originalStatement": "Certification occurs only when an evaluator whose authorization is currently active signs the form.",
        "statement": "Certification occurs only when an evaluator whose authorization is currently active signs the form.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "certification occurs",
        "necessary": "an evaluator whose authorization is currently active signs the form",
        "diagram": "certification occurs → an evaluator whose authorization is currently active signs the form",
        "contrapositive": "NOT (an evaluator whose authorization is currently active signs the form) → NOT (certification occurs)",
        "ifThen": "If certification occurs, then an evaluator whose authorization is currently active signs the form.",
        "contrapositiveWords": "If no evaluator whose authorization is currently active signs the form, then certification does not occur.",
        "explanation": "Negation means no currently authorized evaluator signs. One evaluator declining to sign does not rule out another qualifying signer.",
        "correctionNotes": [
          "Keep “currently active”; negate the whole qualified signing condition."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 18
        }
      },
      {
        "id": "source-rephrase-19",
        "sourceId": "rephrase-19",
        "originalStatement": "Requests are processed only if the request file that the portal assigns to the requester is present.",
        "statement": "Requests are processed only if the request file that the portal assigns to the requester is present.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "a request is processed",
        "necessary": "the request file assigned by the portal to that requester is present",
        "diagram": "a request is processed → the request file assigned by the portal to that requester is present",
        "contrapositive": "NOT (the request file assigned by the portal to that requester is present) → NOT (a request is processed)",
        "ifThen": "If a request is processed, then the request file assigned by the portal to that requester is present.",
        "contrapositiveWords": "If the request file assigned by the portal to that requester is not present, then that request is not processed.",
        "explanation": "Keep the assignment to this requester. Just any file is not enough.",
        "correctionNotes": [
          "Keep the file assigned to this requester."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 19
        }
      },
      {
        "id": "source-rephrase-20",
        "sourceId": "rephrase-20",
        "originalStatement": "Every device that bears a failed seal requires recalibration.",
        "statement": "Every device that bears a failed seal must be recalibrated under the maintenance policy.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          },
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "a device bears a failed seal",
        "necessary": "that device is required to be recalibrated under the maintenance policy",
        "diagram": "a device bears a failed seal → that device is required to be recalibrated under the maintenance policy",
        "contrapositive": "NOT (that device is required to be recalibrated under the maintenance policy) → NOT (a device bears a failed seal)",
        "ifThen": "If a device bears a failed seal, then that device is required to be recalibrated under the maintenance policy.",
        "contrapositiveWords": "If a device is not required to be recalibrated under the maintenance policy, then that device does not bear a failed seal.",
        "explanation": "The policy creates an obligation. A device still waiting for recalibration can bear a failed seal. Keep the requirement in the result.",
        "correctionNotes": [
          "Allow both indicators; preserve requirement status.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 20
        }
      },
      {
        "id": "source-rephrase-21",
        "sourceId": "rephrase-21",
        "originalStatement": "If a person’s registration is verified by the registrar, admission is granted.",
        "statement": "If a person’s registration is verified by the registrar, admission is granted.",
        "indicators": [
          {
            "text": "If",
            "group": 1
          }
        ],
        "sufficient": "a person's registration is verified by the registrar",
        "necessary": "that person is granted admission",
        "diagram": "a person's registration is verified by the registrar → that person is granted admission",
        "contrapositive": "NOT (that person is granted admission) → NOT (a person's registration is verified by the registrar)",
        "ifThen": "If a person's registration is verified by the registrar, then that person is granted admission.",
        "contrapositiveWords": "If that person is not granted admission, then that person's registration is not verified by the registrar.",
        "explanation": "Keep the registrar's verification, not registration alone, as the trigger.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 21
        }
      },
      {
        "id": "source-rephrase-22",
        "sourceId": "rephrase-22",
        "originalStatement": "The only entries accepted are those the clerk records in the registry.",
        "statement": "The only entries accepted are those the clerk records in the registry.",
        "indicators": [
          {
            "text": "The only",
            "group": 1
          }
        ],
        "sufficient": "an entry is accepted",
        "necessary": "the clerk records that entry in the registry",
        "diagram": "an entry is accepted → the clerk records that entry in the registry",
        "contrapositive": "NOT (the clerk records that entry in the registry) → NOT (an entry is accepted)",
        "ifThen": "If an entry is accepted, then the clerk records that entry in the registry.",
        "contrapositiveWords": "If the clerk does not record that entry in the registry, then that entry is not accepted.",
        "explanation": "Accepted entries form the sufficient category. Registry recording is required for acceptance.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 22
        }
      },
      {
        "id": "source-rephrase-23",
        "sourceId": "rephrase-23",
        "originalStatement": "Where verification that the training requirement is met appears in the file, access is granted.",
        "statement": "Where verification that the training requirement is met appears in the file, access is granted.",
        "indicators": [
          {
            "text": "Where",
            "group": 1
          }
        ],
        "sufficient": "verification that the training requirement is met appears in the file",
        "necessary": "access is granted",
        "diagram": "verification that the training requirement is met appears in the file → access is granted",
        "contrapositive": "NOT (access is granted) → NOT (verification that the training requirement is met appears in the file)",
        "ifThen": "If verification that the training requirement is met appears in the file, then access is granted.",
        "contrapositiveWords": "If access is not granted, then verification that the training requirement is met does not appear in the file.",
        "explanation": "The trigger is verification appearing in the file, not merely training being completed.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 23
        }
      },
      {
        "id": "source-rephrase-24",
        "sourceId": "rephrase-24",
        "originalStatement": "Whenever a complaint that meets the policy threshold is filed with the office, an investigation begins.",
        "statement": "Whenever a complaint that meets the policy threshold is filed with the office, an investigation begins.",
        "indicators": [
          {
            "text": "Whenever",
            "group": 1
          }
        ],
        "sufficient": "a complaint meeting the policy threshold is filed with the office",
        "necessary": "an investigation begins",
        "diagram": "a complaint meeting the policy threshold is filed with the office → an investigation begins",
        "contrapositive": "NOT (an investigation begins) → NOT (a complaint meeting the policy threshold is filed with the office)",
        "ifThen": "If a complaint meeting the policy threshold is filed with the office, then an investigation begins.",
        "contrapositiveWords": "If an investigation does not begin, then no complaint meeting the policy threshold has been filed with the office.",
        "explanation": "Both the policy threshold and filing with the office belong in the trigger.",
        "correctionNotes": [],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 24
        }
      },
      {
        "id": "source-rephrase-25",
        "sourceId": "rephrase-25",
        "originalStatement": "All permits that the agency issues always include an audit trail that matches the transaction record.",
        "statement": "All permits that the agency issues always include an audit trail that matches the transaction record.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          },
          {
            "text": "always",
            "group": 2
          }
        ],
        "sufficient": "a permit is issued by the agency",
        "necessary": "that permit includes an audit trail matching the transaction record",
        "diagram": "a permit is issued by the agency → that permit includes an audit trail matching the transaction record",
        "contrapositive": "NOT (that permit includes an audit trail matching the transaction record) → NOT (a permit is issued by the agency)",
        "ifThen": "If a permit is issued by the agency, then that permit includes an audit trail matching the transaction record.",
        "contrapositiveWords": "If that permit does not include an audit trail matching the transaction record, then that permit is not issued by the agency.",
        "explanation": "Keep agency-issued and the matching record. All marks the covered permits; always describes their required feature.",
        "correctionNotes": [
          "Keep the matching transaction record and classify expressions separately."
        ],
        "source": {
          "file": "If-Then rephrase set (Sep 5)/Homework/2025-09-05_IF_THEN worksheet.pdf",
          "sha256": "6e889126da7457708b435ef73d3ccaeec4824ebddfafea6e72881e3f77090ff8",
          "part": "If-Then rephrase · Questions 1–25",
          "item": 25
        }
      }
    ]
  },
  {
    "id": "source-full-translation",
    "title": "Translate, contrapose, and read back",
    "shortTitle": "Four ways to express the rule",
    "stage": "After contraposition",
    "taskKind": "contrapositive",
    "instructions": "Find each indicator and its group, then shorten each supplied complete condition. Build the original diagram, then the contrapositive; each is checked as you go. Last, read both back in ordinary if/then language.",
    "items": [
      {
        "id": "source-full-translation-01",
        "sourceId": "indicator-p3-01",
        "originalStatement": "All interns who complete the program are offered full-time positions.",
        "statement": "All interns who complete the program are offered full-time positions.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "a person is an intern who completes the program",
        "necessary": "that intern is offered a full-time position",
        "diagram": "a person is an intern who completes the program → that intern is offered a full-time position",
        "contrapositive": "NOT (that intern is offered a full-time position) → NOT (a person is an intern who completes the program)",
        "ifThen": "If a person is an intern who completes the program, then that intern is offered a full-time position.",
        "contrapositiveWords": "If that intern is not offered a full-time position, then that person is not an intern who completes the program.",
        "explanation": "Keep intern and program completion together. An offer is not the same as taking the job.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 1
        }
      },
      {
        "id": "source-full-translation-02",
        "sourceId": "indicator-p3-02",
        "originalStatement": "Your grade will be finalized if you submit your report by Friday.",
        "statement": "Your grade will be finalized if you submit your report by Friday.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "you submit your report by Friday",
        "necessary": "your grade is finalized",
        "diagram": "you submit your report by Friday → your grade is finalized",
        "contrapositive": "NOT (your grade is finalized) → NOT (you submit your report by Friday)",
        "ifThen": "If you submit your report by Friday, then your grade is finalized.",
        "contrapositiveWords": "If your grade is not finalized, then you do not submit your report by Friday.",
        "explanation": "Negate submission by Friday as a whole. A late submission does not meet the trigger.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 2
        }
      },
      {
        "id": "source-full-translation-03",
        "sourceId": "indicator-p3-03",
        "originalStatement": "Students exit the building when the final bell rings.",
        "statement": "Students exit the building when the final bell rings.",
        "indicators": [
          {
            "text": "when",
            "group": 1
          }
        ],
        "sufficient": "the final bell rings",
        "necessary": "students exit the building",
        "diagram": "the final bell rings → students exit the building",
        "contrapositive": "NOT (students exit the building) → NOT (the final bell rings)",
        "ifThen": "If the final bell rings, then students exit the building.",
        "contrapositiveWords": "If students do not exit the building, then the final bell does not ring.",
        "explanation": "The bell is sufficient under this rule. Exiting does not prove that the bell rang.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 3
        }
      },
      {
        "id": "source-full-translation-04",
        "sourceId": "indicator-p3-04",
        "originalStatement": "Every participant who finishes the marathon receives a medal.",
        "statement": "Every participant who finishes the marathon receives a medal.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a person is a participant who finishes the marathon",
        "necessary": "that participant receives a medal",
        "diagram": "a person is a participant who finishes the marathon → that participant receives a medal",
        "contrapositive": "NOT (that participant receives a medal) → NOT (a person is a participant who finishes the marathon)",
        "ifThen": "If a person is a participant who finishes the marathon, then that participant receives a medal.",
        "contrapositiveWords": "If that participant does not receive a medal, then that person is not a participant who finishes the marathon.",
        "explanation": "Finishing, rather than simply participating, is the full trigger.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 4
        }
      },
      {
        "id": "source-full-translation-05",
        "sourceId": "indicator-p3-05",
        "originalStatement": "Any device left unattended will power down automatically.",
        "statement": "Any device left unattended will power down automatically.",
        "indicators": [
          {
            "text": "Any",
            "group": 1
          }
        ],
        "sufficient": "a device is left unattended",
        "necessary": "that device powers down automatically",
        "diagram": "a device is left unattended → that device powers down automatically",
        "contrapositive": "NOT (that device powers down automatically) → NOT (a device is left unattended)",
        "ifThen": "If a device is left unattended, then that device powers down automatically.",
        "contrapositiveWords": "If that device does not power down automatically, then that device is not left unattended.",
        "explanation": "Automatically belongs in the result. A manual shutdown is not the same condition.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 5
        }
      },
      {
        "id": "source-full-translation-06",
        "sourceId": "indicator-p3-06",
        "originalStatement": "Minutes are recorded whenever the committee meets.",
        "statement": "Minutes are recorded whenever the committee meets.",
        "indicators": [
          {
            "text": "whenever",
            "group": 1
          }
        ],
        "sufficient": "the committee meets",
        "necessary": "minutes are recorded",
        "diagram": "the committee meets → minutes are recorded",
        "contrapositive": "NOT (minutes are recorded) → NOT (the committee meets)",
        "ifThen": "If the committee meets, then minutes are recorded.",
        "contrapositiveWords": "If minutes are not recorded, then the committee does not meet.",
        "explanation": "Meeting is sufficient even though it appears at the end of the rule.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 6
        }
      },
      {
        "id": "source-full-translation-07",
        "sourceId": "indicator-p3-07",
        "originalStatement": "To qualify for bonuses, employees must exceed sales targets.",
        "statement": "To qualify for bonuses, employees must exceed sales targets.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "employees qualify for bonuses",
        "necessary": "those employees exceed sales targets",
        "diagram": "employees qualify for bonuses → those employees exceed sales targets",
        "contrapositive": "NOT (those employees exceed sales targets) → NOT (employees qualify for bonuses)",
        "ifThen": "If employees qualify for bonuses, then those employees exceed sales targets.",
        "contrapositiveWords": "If those employees do not exceed sales targets, then employees do not qualify for bonuses.",
        "explanation": "Qualification requires exceeding the targets. Exceeding them alone need not guarantee a bonus.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 7
        }
      },
      {
        "id": "source-full-translation-08",
        "sourceId": "indicator-p3-08",
        "originalStatement": "Expenditures can occur only if managers approve budgets first.",
        "statement": "Expenditures can occur only if managers approve budgets first.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "expenditures can occur",
        "necessary": "managers have approved the budgets first",
        "diagram": "expenditures can occur → managers have approved the budgets first",
        "contrapositive": "NOT (managers have approved the budgets first) → NOT (expenditures can occur)",
        "ifThen": "If expenditures can occur, then managers have approved the budgets first.",
        "contrapositiveWords": "If managers have not approved the budgets first, then expenditures cannot occur.",
        "explanation": "Keep can occur and first. The rule is about authorization, not proof of spending.",
        "correctionNotes": [
          "Keep “can occur” and “first.”"
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 8
        }
      },
      {
        "id": "source-full-translation-09",
        "sourceId": "indicator-p3-09",
        "originalStatement": "Halting operations temporarily requires system maintenance.",
        "statement": "Halting operations temporarily requires system maintenance to be performed.",
        "indicators": [
          {
            "text": "requires",
            "group": 2
          }
        ],
        "sufficient": "operations are halted temporarily",
        "necessary": "system maintenance is performed",
        "diagram": "operations are halted temporarily → system maintenance is performed",
        "contrapositive": "NOT (system maintenance is performed) → NOT (operations are halted temporarily)",
        "ifThen": "If operations are halted temporarily, then system maintenance is performed.",
        "contrapositiveWords": "If system maintenance is not performed, then operations are not halted temporarily.",
        "explanation": "The reviewed rule makes maintenance a prerequisite for the halt. Maintenance alone does not prove that operations halt.",
        "correctionNotes": [
          "The key changes a requirement into completed maintenance.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 9
        }
      },
      {
        "id": "source-full-translation-10",
        "sourceId": "indicator-p3-10",
        "originalStatement": "Access is granted only when user credentials are verified.",
        "statement": "Access is granted only when user credentials are verified.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "access is granted",
        "necessary": "user credentials are verified",
        "diagram": "access is granted → user credentials are verified",
        "contrapositive": "NOT (user credentials are verified) → NOT (access is granted)",
        "ifThen": "If access is granted, then user credentials are verified.",
        "contrapositiveWords": "If user credentials are not verified, then access is not granted.",
        "explanation": "Access requires verified credentials. Verification alone does not guarantee access.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 10
        }
      },
      {
        "id": "source-full-translation-11",
        "sourceId": "indicator-p3-11",
        "originalStatement": "Servers reboot only where network security protocols permit.",
        "statement": "Servers reboot only where network security protocols permit.",
        "indicators": [
          {
            "text": "only where",
            "group": 2
          }
        ],
        "sufficient": "servers reboot",
        "necessary": "network security protocols permit the reboot",
        "diagram": "servers reboot → network security protocols permit the reboot",
        "contrapositive": "NOT (network security protocols permit the reboot) → NOT (servers reboot)",
        "ifThen": "If servers reboot, then network security protocols permit the reboot.",
        "contrapositiveWords": "If network security protocols do not permit the reboot, then servers do not reboot.",
        "explanation": "Permission for this reboot is the requirement, not the mere existence of security protocols.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 11
        }
      },
      {
        "id": "source-full-translation-12",
        "sourceId": "indicator-p3-12",
        "originalStatement": "Always conduct security checks before entry.",
        "statement": "Security checks are always conducted before entry.",
        "indicators": [
          {
            "text": "always",
            "group": 2
          }
        ],
        "sufficient": "entry occurs",
        "necessary": "security checks have been conducted before entry",
        "diagram": "entry occurs → security checks have been conducted before entry",
        "contrapositive": "NOT (security checks have been conducted before entry) → NOT (entry occurs)",
        "ifThen": "If entry occurs, then security checks have been conducted before entry.",
        "contrapositiveWords": "If security checks have not been conducted before entry, then entry does not occur.",
        "explanation": "The reviewed rule is factual. Keep the checks and their timing together.",
        "correctionNotes": [
          "Keep “before”; this instruction needs a compliance-rule frame.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 12
        }
      },
      {
        "id": "source-full-translation-13",
        "sourceId": "indicator-p3-13",
        "originalStatement": "Alarms won’t deactivate on their own if the emergency protocol fails to initiate within one minute.",
        "statement": "Alarms won’t deactivate on their own if the emergency protocol fails to initiate within one minute.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "the emergency protocol fails to initiate within one minute",
        "necessary": "alarms do not deactivate on their own",
        "diagram": "the emergency protocol fails to initiate within one minute → alarms do not deactivate on their own",
        "contrapositive": "NOT (alarms do not deactivate on their own) → NOT (the emergency protocol fails to initiate within one minute)",
        "ifThen": "If the emergency protocol fails to initiate within one minute, then alarms do not deactivate on their own.",
        "contrapositiveWords": "If alarms deactivate on their own, then the emergency protocol initiates within one minute.",
        "explanation": "Negate each complete condition. The contrapositive starts with alarms deactivating on their own and ends with protocol initiation within one minute.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 13
        }
      },
      {
        "id": "source-full-translation-14",
        "sourceId": "indicator-p3-14",
        "originalStatement": "The cluster performs backups only if it detects low storage for two cycles.",
        "statement": "The cluster performs backups only if it detects low storage for two cycles.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "the cluster performs backups",
        "necessary": "it detects low storage for two cycles",
        "diagram": "the cluster performs backups → it detects low storage for two cycles",
        "contrapositive": "NOT (it detects low storage for two cycles) → NOT (the cluster performs backups)",
        "ifThen": "If the cluster performs backups, then it detects low storage for two cycles.",
        "contrapositiveWords": "If it does not detect low storage for two cycles, then the cluster does not perform backups.",
        "explanation": "Two cycles is part of the requirement. One low-storage reading is not enough to match it.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 14
        }
      },
      {
        "id": "source-full-translation-15",
        "sourceId": "indicator-p3-15",
        "originalStatement": "Reports are published whenever three reviewers call for revision.",
        "statement": "Reports are published whenever three reviewers call for revision.",
        "indicators": [
          {
            "text": "whenever",
            "group": 1
          }
        ],
        "sufficient": "three reviewers call for revision",
        "necessary": "reports are published",
        "diagram": "three reviewers call for revision → reports are published",
        "contrapositive": "NOT (reports are published) → NOT (three reviewers call for revision)",
        "ifThen": "If three reviewers call for revision, then reports are published.",
        "contrapositiveWords": "If reports are not published, then it is not the case that three reviewers call for revision.",
        "explanation": "Negating three reviewers call for revision does not mean three reviewers refuse. It denies the whole condition.",
        "correctionNotes": [
          "Negate the whole three-reviewer condition."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 15
        }
      },
      {
        "id": "source-full-translation-16",
        "sourceId": "indicator-p3-16",
        "originalStatement": "Passengers are allowed to board only when documents are verified by both authorities.",
        "statement": "Passengers are allowed to board only when documents are verified by both authorities.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "passengers are allowed to board",
        "necessary": "their documents are verified by both authorities",
        "diagram": "passengers are allowed to board → their documents are verified by both authorities",
        "contrapositive": "NOT (their documents are verified by both authorities) → NOT (passengers are allowed to board)",
        "ifThen": "If passengers are allowed to board, then their documents are verified by both authorities.",
        "contrapositiveWords": "If their documents are not verified by both authorities, then passengers are not allowed to board.",
        "explanation": "Not verified by both means at least one verification is missing. It does not mean neither verified.",
        "correctionNotes": [
          "Not both does not mean neither."
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 16
        }
      },
      {
        "id": "source-full-translation-17",
        "sourceId": "indicator-p3-17",
        "originalStatement": "Any exposure to extreme temperatures compromises sample integrity.",
        "statement": "Any exposure to extreme temperatures compromises sample integrity.",
        "indicators": [
          {
            "text": "Any",
            "group": 1
          }
        ],
        "sufficient": "a sample is exposed to extreme temperatures",
        "necessary": "that sample's integrity is compromised",
        "diagram": "a sample is exposed to extreme temperatures → that sample's integrity is compromised",
        "contrapositive": "NOT (that sample's integrity is compromised) → NOT (a sample is exposed to extreme temperatures)",
        "ifThen": "If a sample is exposed to extreme temperatures, then that sample's integrity is compromised.",
        "contrapositiveWords": "If that sample's integrity is not compromised, then that sample is not exposed to extreme temperatures.",
        "explanation": "The rule covers any such exposure. Uncompromised integrity rules out that exposure.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 17
        }
      },
      {
        "id": "source-full-translation-18",
        "sourceId": "indicator-p3-18",
        "originalStatement": "Reimbursement requests can be processed only if employees submit detailed online reports.",
        "statement": "Reimbursement requests can be processed only if employees submit detailed online reports.",
        "indicators": [
          {
            "text": "only if",
            "group": 2
          }
        ],
        "sufficient": "a reimbursement request can be processed",
        "necessary": "the employee submits a detailed online report",
        "diagram": "a reimbursement request can be processed → the employee submits a detailed online report",
        "contrapositive": "NOT (the employee submits a detailed online report) → NOT (a reimbursement request can be processed)",
        "ifThen": "If a reimbursement request can be processed, then the employee submits a detailed online report.",
        "contrapositiveWords": "If the employee does not submit a detailed online report, then that reimbursement request cannot be processed.",
        "explanation": "Keep can be processed, detailed, and online. An incomplete report does not meet the requirement.",
        "correctionNotes": [
          "Keep “can be processed.”"
        ],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 18
        }
      },
      {
        "id": "source-full-translation-19",
        "sourceId": "indicator-p3-19",
        "originalStatement": "When safety standards are unmet, inspections occur immediately.",
        "statement": "When safety standards are unmet, inspections occur immediately.",
        "indicators": [
          {
            "text": "When",
            "group": 1
          }
        ],
        "sufficient": "safety standards are unmet",
        "necessary": "inspections occur immediately",
        "diagram": "safety standards are unmet → inspections occur immediately",
        "contrapositive": "NOT (inspections occur immediately) → NOT (safety standards are unmet)",
        "ifThen": "If safety standards are unmet, then inspections occur immediately.",
        "contrapositiveWords": "If inspections do not occur immediately, then safety standards are met.",
        "explanation": "Not immediately inspected is broader than never inspected. Timing belongs in the condition.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 19
        }
      },
      {
        "id": "source-full-translation-20",
        "sourceId": "indicator-p3-20",
        "originalStatement": "Critical software patches are always applied before servers restart.",
        "statement": "Critical software patches are always applied before servers restart.",
        "indicators": [
          {
            "text": "always",
            "group": 2
          }
        ],
        "sufficient": "servers restart",
        "necessary": "critical software patches have been applied before the restart",
        "diagram": "servers restart → critical software patches have been applied before the restart",
        "contrapositive": "NOT (critical software patches have been applied before the restart) → NOT (servers restart)",
        "ifThen": "If servers restart, then critical software patches have been applied before the restart.",
        "contrapositiveWords": "If critical software patches have not been applied before the restart, then servers do not restart.",
        "explanation": "The patches must precede this restart. Later patching is not the required condition.",
        "correctionNotes": [],
        "source": {
          "file": "Indicator ID set (Part 1)/Homework/2025-09-03_G1 &G2 worksheet (1) (1).docx",
          "sha256": "43dbf02fd4f7ec1002dac4aa69b383eafc110dd2259044a53b1383c2a0935f6d",
          "part": "Indicator ID · Part 3",
          "item": 20
        }
      }
    ]
  },
  {
    "id": "source-independent",
    "title": "Practice independent translation",
    "shortTitle": "The complete translation set",
    "stage": "After contraposition",
    "taskKind": "contrapositive",
    "instructions": "Translate each rule on your own: find the indicators, shorten each supplied complete condition, build both diagrams, and read them back in words. Each diagram is checked as you build it, and you compare your wording with ours at the end. Keep every qualifier and negate whole conditions.",
    "items": [
      {
        "id": "source-independent-01",
        "sourceId": "translation-01",
        "originalStatement": "Your burrito will thaw if you leave it on the counter.",
        "statement": "Your burrito will thaw if you leave it on the counter.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "you leave your burrito on the counter",
        "necessary": "the burrito thaws",
        "diagram": "you leave your burrito on the counter → the burrito thaws",
        "contrapositive": "NOT (the burrito thaws) → NOT (you leave your burrito on the counter)",
        "ifThen": "If you leave your burrito on the counter, then the burrito thaws.",
        "contrapositiveWords": "If the burrito does not thaw, then you do not leave your burrito on the counter.",
        "explanation": "The if-clause comes last. It is still the sufficient condition.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 1
        }
      },
      {
        "id": "source-independent-02",
        "sourceId": "translation-02",
        "originalStatement": "Each and every member of the Q continuum is omnipotent.",
        "statement": "Each and every member of the Q continuum is omnipotent.",
        "indicators": [
          {
            "text": "every",
            "group": 1
          }
        ],
        "sufficient": "an individual is a member of the Q continuum",
        "necessary": "that individual is omnipotent",
        "diagram": "an individual is a member of the Q continuum → that individual is omnipotent",
        "contrapositive": "NOT (that individual is omnipotent) → NOT (an individual is a member of the Q continuum)",
        "ifThen": "If an individual is a member of the Q continuum, then that individual is omnipotent.",
        "contrapositiveWords": "If that individual is not omnipotent, then that individual is not a member of the Q continuum.",
        "explanation": "Each and every works like every. Membership is sufficient; omnipotence alone does not prove membership.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 2
        }
      },
      {
        "id": "source-independent-03",
        "sourceId": "translation-03",
        "originalStatement": "You will run like Tash... Narrado if there is a bear behind you.",
        "statement": "You will run quickly if there is a bear behind you.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "there is a bear behind you",
        "necessary": "you run quickly",
        "diagram": "there is a bear behind you → you run quickly",
        "contrapositive": "NOT (you run quickly) → NOT (there is a bear behind you)",
        "ifThen": "If there is a bear behind you, then you run quickly.",
        "contrapositiveWords": "If you do not run quickly, then there is not a bear behind you.",
        "explanation": "The unclear name in the source has been replaced with a clear result. The conditional direction is unchanged.",
        "correctionNotes": [
          "Named comparison is unclear in the source.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 3
        }
      },
      {
        "id": "source-independent-04",
        "sourceId": "translation-04",
        "originalStatement": "Your disposable income will increase whenever you reduce your expenses.",
        "statement": "Your disposable income will increase whenever you reduce your expenses.",
        "indicators": [
          {
            "text": "whenever",
            "group": 1
          }
        ],
        "sufficient": "you reduce your expenses",
        "necessary": "your disposable income increases",
        "diagram": "you reduce your expenses → your disposable income increases",
        "contrapositive": "NOT (your disposable income increases) → NOT (you reduce your expenses)",
        "ifThen": "If you reduce your expenses, then your disposable income increases.",
        "contrapositiveWords": "If your disposable income does not increase, then you do not reduce your expenses.",
        "explanation": "Use the stated rule as the premise. The exercise is about its direction, not financial advice.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 4
        }
      },
      {
        "id": "source-independent-05",
        "sourceId": "translation-05",
        "originalStatement": "If you study, you will beat the LSAT.",
        "statement": "If you study, you will beat the LSAT.",
        "indicators": [
          {
            "text": "If",
            "group": 1
          }
        ],
        "sufficient": "you study",
        "necessary": "you beat the LSAT",
        "diagram": "you study → you beat the LSAT",
        "contrapositive": "NOT (you beat the LSAT) → NOT (you study)",
        "ifThen": "If you study, then you beat the LSAT.",
        "contrapositiveWords": "If you do not beat the LSAT, then you do not study.",
        "explanation": "This is an assumed exercise rule, not a promise about test results. Study is sufficient within this premise.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 5
        }
      },
      {
        "id": "source-independent-06",
        "sourceId": "translation-06",
        "originalStatement": "Where there's beer, there's fun.",
        "statement": "Where there's beer, there's fun.",
        "indicators": [
          {
            "text": "Where",
            "group": 1
          }
        ],
        "sufficient": "there is beer at a place",
        "necessary": "there is fun at that place",
        "diagram": "there is beer at a place → there is fun at that place",
        "contrapositive": "NOT (there is fun at that place) → NOT (there is beer at a place)",
        "ifThen": "If there is beer at a place, then there is fun at that place.",
        "contrapositiveWords": "If there is no fun at that place, then there is no beer at that place.",
        "explanation": "Keep the location consistent. The supplied rule does not make fun proof that beer is present.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 6
        }
      },
      {
        "id": "source-independent-07",
        "sourceId": "translation-07",
        "originalStatement": "The sun will rise, if you pay your taxes.",
        "statement": "The sun will rise, if you pay your taxes.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "you pay your taxes",
        "necessary": "the sun rises",
        "diagram": "you pay your taxes → the sun rises",
        "contrapositive": "NOT (the sun rises) → NOT (you pay your taxes)",
        "ifThen": "If you pay your taxes, then the sun rises.",
        "contrapositiveWords": "If the sun does not rise, then you do not pay your taxes.",
        "explanation": "An arrow does not assert causation. Translate the given rule even when its subject matter is implausible.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 7
        }
      },
      {
        "id": "source-independent-08",
        "sourceId": "translation-08",
        "originalStatement": "Whenever it rains, it pours.",
        "statement": "Whenever it rains, it pours.",
        "indicators": [
          {
            "text": "Whenever",
            "group": 1
          }
        ],
        "sufficient": "it rains",
        "necessary": "it pours",
        "diagram": "it rains → it pours",
        "contrapositive": "NOT (it pours) → NOT (it rains)",
        "ifThen": "If it rains, then it pours.",
        "contrapositiveWords": "If it does not pour, then it does not rain.",
        "explanation": "Read the words literally for this supplied rule. Pouring is the required result.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 8
        }
      },
      {
        "id": "source-independent-09",
        "sourceId": "translation-09",
        "originalStatement": "All the King's men swore an oath of allegiance.",
        "statement": "All the King's men swore an oath of allegiance.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "a person is one of the King's men",
        "necessary": "that person swore an oath of allegiance",
        "diagram": "a person is one of the King's men → that person swore an oath of allegiance",
        "contrapositive": "NOT (that person swore an oath of allegiance) → NOT (a person is one of the King's men)",
        "ifThen": "If a person is one of the King's men, then that person swore an oath of allegiance.",
        "contrapositiveWords": "If that person did not swear an oath of allegiance, then that person is not one of the King's men.",
        "explanation": "Keep the King's men as the category. Men alone would change the rule.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 9
        }
      },
      {
        "id": "source-independent-10",
        "sourceId": "translation-10",
        "originalStatement": "The only monkeys are the ones that live in trees.",
        "statement": "The only monkeys are the ones that live in trees.",
        "indicators": [
          {
            "text": "The only",
            "group": 1
          }
        ],
        "sufficient": "an animal is a monkey",
        "necessary": "that animal lives in trees",
        "diagram": "an animal is a monkey → that animal lives in trees",
        "contrapositive": "NOT (that animal lives in trees) → NOT (an animal is a monkey)",
        "ifThen": "If an animal is a monkey, then that animal lives in trees.",
        "contrapositiveWords": "If that animal does not live in trees, then that animal is not a monkey.",
        "explanation": "The only monkeys identifies the sufficient category. Monkeys require tree dwelling in this rule.",
        "correctionNotes": [
          "The key explanation conflicts with its correctly directed arrow."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 10
        }
      },
      {
        "id": "source-independent-11",
        "sourceId": "translation-11",
        "originalStatement": "You will become a magician if you drink coffee.",
        "statement": "You will become a magician if you drink coffee.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "you drink coffee",
        "necessary": "you become a magician",
        "diagram": "you drink coffee → you become a magician",
        "contrapositive": "NOT (you become a magician) → NOT (you drink coffee)",
        "ifThen": "If you drink coffee, then you become a magician.",
        "contrapositiveWords": "If you do not become a magician, then you do not drink coffee.",
        "explanation": "Treat this as a fictional rule. A valid diagram need not describe a realistic causal connection.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 11
        }
      },
      {
        "id": "source-independent-12",
        "sourceId": "translation-12",
        "originalStatement": "Every lawyer can read.",
        "statement": "Every lawyer can read.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a person is a lawyer",
        "necessary": "that person can read",
        "diagram": "a person is a lawyer → that person can read",
        "contrapositive": "NOT (that person can read) → NOT (a person is a lawyer)",
        "ifThen": "If a person is a lawyer, then that person can read.",
        "contrapositiveWords": "If that person cannot read, then that person is not a lawyer.",
        "explanation": "Can read is an ability, not evidence that reading is occurring now.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 12
        }
      },
      {
        "id": "source-independent-13",
        "sourceId": "translation-13",
        "originalStatement": "Any computer can do addition.",
        "statement": "Any computer can do addition.",
        "indicators": [
          {
            "text": "Any",
            "group": 1
          }
        ],
        "sufficient": "an object is a computer",
        "necessary": "that object can do addition",
        "diagram": "an object is a computer → that object can do addition",
        "contrapositive": "NOT (that object can do addition) → NOT (an object is a computer)",
        "ifThen": "If an object is a computer, then that object can do addition.",
        "contrapositiveWords": "If that object cannot do addition, then that object is not a computer.",
        "explanation": "Keep can. An ability to add does not mean an addition operation is happening.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 13
        }
      },
      {
        "id": "source-independent-14",
        "sourceId": "translation-14",
        "originalStatement": "All beavers love to eat maple trees.",
        "statement": "All beavers love to eat maple trees.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "an animal is a beaver",
        "necessary": "that animal loves to eat maple trees",
        "diagram": "an animal is a beaver → that animal loves to eat maple trees",
        "contrapositive": "NOT (that animal loves to eat maple trees) → NOT (an animal is a beaver)",
        "ifThen": "If an animal is a beaver, then that animal loves to eat maple trees.",
        "contrapositiveWords": "If that animal does not love to eat maple trees, then that animal is not a beaver.",
        "explanation": "Loves to eat is not the same as eats. Keep the complete stated result.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 14
        }
      },
      {
        "id": "source-independent-15",
        "sourceId": "translation-15",
        "originalStatement": "We must eat to live.",
        "statement": "We must eat to live.",
        "indicators": [
          {
            "text": "must",
            "group": 2
          }
        ],
        "sufficient": "we live",
        "necessary": "we eat",
        "diagram": "we live → we eat",
        "contrapositive": "NOT (we eat) → NOT (we live)",
        "ifThen": "If we live, then we eat.",
        "contrapositiveWords": "If we do not eat, then we do not live.",
        "explanation": "Living requires eating. Eating alone is not a guarantee of living.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 15
        }
      },
      {
        "id": "source-independent-16",
        "sourceId": "translation-16",
        "originalStatement": "Only a GPS will reveal where you are.",
        "statement": "Only a GPS will reveal where you are.",
        "indicators": [
          {
            "text": "Only",
            "group": 2
          }
        ],
        "sufficient": "a device reveals where you are",
        "necessary": "that device is a GPS",
        "diagram": "a device reveals where you are → that device is a GPS",
        "contrapositive": "NOT (that device is a GPS) → NOT (a device reveals where you are)",
        "ifThen": "If a device reveals where you are, then that device is a GPS.",
        "contrapositiveWords": "If that device is not a GPS, then that device does not reveal where you are.",
        "explanation": "Only identifies GPS as necessary. Where inside reveals where you are is not a separate conditional indicator.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 16
        }
      },
      {
        "id": "source-independent-17",
        "sourceId": "translation-17",
        "originalStatement": "A good party requires alcohol.",
        "statement": "A good party requires alcohol.",
        "indicators": [
          {
            "text": "requires",
            "group": 2
          }
        ],
        "sufficient": "a party is good",
        "necessary": "alcohol is present at that party",
        "diagram": "a party is good → alcohol is present at that party",
        "contrapositive": "NOT (alcohol is present at that party) → NOT (a party is good)",
        "ifThen": "If a party is good, then alcohol is present at that party.",
        "contrapositiveWords": "If alcohol is not present at that party, then that party is not good.",
        "explanation": "Treat this as the exercise premise, not advice about parties. A requirement is not sufficient on its own.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 17
        }
      },
      {
        "id": "source-independent-18",
        "sourceId": "translation-18",
        "originalStatement": "Expertise requires practice.",
        "statement": "Expertise requires practice.",
        "indicators": [
          {
            "text": "requires",
            "group": 2
          }
        ],
        "sufficient": "a person has expertise",
        "necessary": "that person has practiced",
        "diagram": "a person has expertise → that person has practiced",
        "contrapositive": "NOT (that person has practiced) → NOT (a person has expertise)",
        "ifThen": "If a person has expertise, then that person has practiced.",
        "contrapositiveWords": "If that person has not practiced, then that person does not have expertise.",
        "explanation": "Expertise requires practice. Practice does not by itself guarantee expertise.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 18
        }
      },
      {
        "id": "source-independent-19",
        "sourceId": "translation-19",
        "originalStatement": "Only fish swim.",
        "statement": "Only fish swim.",
        "indicators": [
          {
            "text": "Only",
            "group": 2
          }
        ],
        "sufficient": "an animal swims",
        "necessary": "that animal is a fish",
        "diagram": "an animal swims → that animal is a fish",
        "contrapositive": "NOT (that animal is a fish) → NOT (an animal swims)",
        "ifThen": "If an animal swims, then that animal is a fish.",
        "contrapositiveWords": "If that animal is not a fish, then that animal does not swim.",
        "explanation": "Only points to the necessary category, fish. Apply the supplied rule even though other animals swim in real life.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 19
        }
      },
      {
        "id": "source-independent-20",
        "sourceId": "translation-20",
        "originalStatement": "It's always sunny in Philadelphia.",
        "statement": "Ripe mangoes are always soft to the touch.",
        "indicators": [
          {
            "text": "always",
            "group": 2
          }
        ],
        "sufficient": "a mango is ripe",
        "necessary": "that mango is soft to the touch",
        "diagram": "a mango is ripe → that mango is soft to the touch",
        "contrapositive": "NOT (that mango is soft to the touch) → NOT (a mango is ripe)",
        "ifThen": "If a mango is ripe, then that mango is soft to the touch.",
        "contrapositiveWords": "If a mango is not soft to the touch, then that mango is not ripe.",
        "explanation": "Always points to what every ripe mango has: softness. A soft mango is not proven ripe.",
        "correctionNotes": [
          "The source sentence has no condition to translate, so this item uses a fresh always sentence.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 20
        }
      },
      {
        "id": "source-independent-21",
        "sourceId": "translation-21",
        "originalStatement": "Food is in the fridge only when Rufus is not around.",
        "statement": "Food is in the fridge only when Rufus is not around.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "food is in the fridge",
        "necessary": "Rufus is not around",
        "diagram": "food is in the fridge → Rufus is not around",
        "contrapositive": "NOT (Rufus is not around) → NOT (food is in the fridge)",
        "ifThen": "If food is in the fridge, then Rufus is not around.",
        "contrapositiveWords": "If Rufus is around, then food is not in the fridge.",
        "explanation": "The contrapositive starts with Rufus being around and concludes that food is not in the fridge.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 21
        }
      },
      {
        "id": "source-independent-22",
        "sourceId": "translation-22",
        "originalStatement": "Only the good die young.",
        "statement": "Only the good die young.",
        "indicators": [
          {
            "text": "Only",
            "group": 2
          }
        ],
        "sufficient": "a person dies young",
        "necessary": "that person is good",
        "diagram": "a person dies young → that person is good",
        "contrapositive": "NOT (that person is good) → NOT (a person dies young)",
        "ifThen": "If a person dies young, then that person is good.",
        "contrapositiveWords": "If that person is not good, then that person does not die young.",
        "explanation": "Dying young is sufficient for goodness within the supplied rule, not the reverse.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 22
        }
      },
      {
        "id": "source-independent-23",
        "sourceId": "translation-23",
        "originalStatement": "I would not be able to see Arun if he were in the next room.",
        "statement": "I would not be able to see Arun if he were in the next room.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "Arun is in the next room",
        "necessary": "I cannot see Arun",
        "diagram": "Arun is in the next room → I cannot see Arun",
        "contrapositive": "NOT (I cannot see Arun) → NOT (Arun is in the next room)",
        "ifThen": "If Arun is in the next room, then I cannot see Arun.",
        "contrapositiveWords": "If I can see Arun, then Arun is not in the next room.",
        "explanation": "Negating cannot see gives can see, not actually see. Keep ability consistent.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 23
        }
      },
      {
        "id": "source-independent-24",
        "sourceId": "translation-24",
        "originalStatement": "Amar would not want to learn to ski if he were over 40.",
        "statement": "Amar would not want to learn to ski if he were over 40.",
        "indicators": [
          {
            "text": "if",
            "group": 1
          }
        ],
        "sufficient": "Amar is over 40",
        "necessary": "Amar does not want to learn to ski",
        "diagram": "Amar is over 40 → Amar does not want to learn to ski",
        "contrapositive": "NOT (Amar does not want to learn to ski) → NOT (Amar is over 40)",
        "ifThen": "If Amar is over 40, then Amar does not want to learn to ski.",
        "contrapositiveWords": "If Amar wants to learn to ski, then Amar is not over 40.",
        "explanation": "Negate the desire condition, not skiing itself. Over 40 is also different from 40 or older.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 24
        }
      },
      {
        "id": "source-independent-25",
        "sourceId": "translation-25",
        "originalStatement": "When things cost more, people buy and use less of them.",
        "statement": "When things cost more, people buy and use less of them.",
        "indicators": [
          {
            "text": "When",
            "group": 1
          }
        ],
        "sufficient": "things cost more",
        "necessary": "people both buy less and use less of those things",
        "diagram": "things cost more → people both buy less and use less of those things",
        "contrapositive": "NOT (people both buy less and use less of those things) → NOT (things cost more)",
        "ifThen": "If things cost more, then people both buy less and use less of those things.",
        "contrapositiveWords": "If people do not both buy less and use less of those things, then things do not cost more.",
        "explanation": "Negating both means at least one result fails. It does not require both buying and use to remain unchanged.",
        "correctionNotes": [
          "Negate the whole conjunction: not both does not mean neither."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 25
        }
      },
      {
        "id": "source-independent-26",
        "sourceId": "translation-26",
        "originalStatement": "Where the judges are independent there will be a good legal system.",
        "statement": "Where the judges are independent there will be a good legal system.",
        "indicators": [
          {
            "text": "Where",
            "group": 1
          }
        ],
        "sufficient": "a place has independent judges",
        "necessary": "that place has a good legal system",
        "diagram": "a place has independent judges → that place has a good legal system",
        "contrapositive": "NOT (that place has a good legal system) → NOT (a place has independent judges)",
        "ifThen": "If a place has independent judges, then that place has a good legal system.",
        "contrapositiveWords": "If a place does not have a good legal system, then that place does not have independent judges.",
        "explanation": "Keep the same place on both sides. No causal claim is needed to translate the rule.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 26
        }
      },
      {
        "id": "source-independent-27",
        "sourceId": "translation-27",
        "originalStatement": "All trees are perennial plants with an elongated stem.",
        "statement": "All trees are perennial plants with an elongated stem.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "an organism is a tree",
        "necessary": "that organism is a perennial plant with an elongated stem",
        "diagram": "an organism is a tree → that organism is a perennial plant with an elongated stem",
        "contrapositive": "NOT (that organism is a perennial plant with an elongated stem) → NOT (an organism is a tree)",
        "ifThen": "If an organism is a tree, then that organism is a perennial plant with an elongated stem.",
        "contrapositiveWords": "If that organism is not a perennial plant with an elongated stem, then that organism is not a tree.",
        "explanation": "Negate the full combined description. Failing either part is enough; both need not fail.",
        "correctionNotes": [
          "Keep the whole compound condition."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 27
        }
      },
      {
        "id": "source-independent-28",
        "sourceId": "translation-28",
        "originalStatement": "Cyrenaic hedonism believes pleasure is the only good.",
        "statement": "Under the stated theory, only pleasure is good.",
        "indicators": [
          {
            "text": "only",
            "group": 2
          }
        ],
        "sufficient": "something is good under the stated theory",
        "necessary": "it is pleasure",
        "diagram": "something is good under the stated theory → it is pleasure",
        "contrapositive": "NOT (it is pleasure) → NOT (something is good under the stated theory)",
        "ifThen": "If something is good under the stated theory, then it is pleasure.",
        "contrapositiveWords": "If it is not pleasure, then it is not good under the stated theory.",
        "explanation": "The exclusivity claim makes pleasure necessary for goodness. Good goes left; pleasure goes right.",
        "correctionNotes": [
          "The key misses the exclusivity direction. Adjudicate the natural-language claim.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 28
        }
      },
      {
        "id": "source-independent-29",
        "sourceId": "translation-29",
        "originalStatement": "Every mating ritual can be conceptualized as a game to illuminate the underlying strategies.",
        "statement": "Every mating ritual can be conceptualized as a game to illuminate the underlying strategies.",
        "indicators": [
          {
            "text": "Every",
            "group": 1
          }
        ],
        "sufficient": "a behavior is a mating ritual",
        "necessary": "that behavior can be conceptualized as a game to illuminate its underlying strategies",
        "diagram": "a behavior is a mating ritual → that behavior can be conceptualized as a game to illuminate its underlying strategies",
        "contrapositive": "NOT (that behavior can be conceptualized as a game to illuminate its underlying strategies) → NOT (a behavior is a mating ritual)",
        "ifThen": "If a behavior is a mating ritual, then that behavior can be conceptualized as a game to illuminate its underlying strategies.",
        "contrapositiveWords": "If that behavior cannot be conceptualized as a game to illuminate its underlying strategies, then that behavior is not a mating ritual.",
        "explanation": "Keep can be conceptualized and the purpose clause. Possibility is different from actual conceptualization.",
        "correctionNotes": [
          "Preserve “can be conceptualized.”"
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 29
        }
      },
      {
        "id": "source-independent-30",
        "sourceId": "translation-30",
        "originalStatement": "All Martian gullies are poleward of 30° latitude.",
        "statement": "All Martian gullies are poleward of 30° latitude.",
        "indicators": [
          {
            "text": "All",
            "group": 1
          }
        ],
        "sufficient": "a feature is a Martian gully",
        "necessary": "that feature is poleward of 30 degrees latitude",
        "diagram": "a feature is a Martian gully → that feature is poleward of 30 degrees latitude",
        "contrapositive": "NOT (that feature is poleward of 30 degrees latitude) → NOT (a feature is a Martian gully)",
        "ifThen": "If a feature is a Martian gully, then that feature is poleward of 30 degrees latitude.",
        "contrapositiveWords": "If that feature is not poleward of 30 degrees latitude, then that feature is not a Martian gully.",
        "explanation": "Keep Martian and the full latitude boundary. The rule is not about all gullies everywhere.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 30
        }
      },
      {
        "id": "source-independent-31",
        "sourceId": "translation-31",
        "originalStatement": "When a mix of fresh and dried grass clippings is mixed into garden soil, plant soil decreases.",
        "statement": "When a mix of fresh and dried grass clippings is worked into garden soil, that soil holds water longer.",
        "indicators": [
          {
            "text": "When",
            "group": 1
          }
        ],
        "sufficient": "a mix of fresh and dried grass clippings is worked into garden soil",
        "necessary": "that soil holds water longer",
        "diagram": "a mix of fresh and dried grass clippings is worked into garden soil → that soil holds water longer",
        "contrapositive": "NOT (that soil holds water longer) → NOT (a mix of fresh and dried grass clippings is worked into garden soil)",
        "ifThen": "If a mix of fresh and dried grass clippings is worked into garden soil, then that soil holds water longer.",
        "contrapositiveWords": "If garden soil does not hold water longer, then a mix of fresh and dried grass clippings was not worked into that soil.",
        "explanation": "Keep both fresh and dried clippings in the condition. Soil that holds water longer does not prove that clippings were added.",
        "correctionNotes": [
          "The source result (“plant soil decreases”) is unclear, so the learner sentence states a clear result about the same garden setting.",
          "Reviewed derivative: the learner-facing sentence clarifies the source. The exact original remains in originalStatement."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 31
        }
      },
      {
        "id": "source-independent-32",
        "sourceId": "translation-32",
        "originalStatement": "When the sky is clear, the atmospheric pressure is high.",
        "statement": "When the sky is clear, the atmospheric pressure is high.",
        "indicators": [
          {
            "text": "When",
            "group": 1
          }
        ],
        "sufficient": "the sky is clear",
        "necessary": "atmospheric pressure is high",
        "diagram": "the sky is clear → atmospheric pressure is high",
        "contrapositive": "NOT (atmospheric pressure is high) → NOT (the sky is clear)",
        "ifThen": "If the sky is clear, then atmospheric pressure is high.",
        "contrapositiveWords": "If atmospheric pressure is not high, then the sky is not clear.",
        "explanation": "Clear sky is sufficient in the exercise rule. High pressure alone does not prove a clear sky.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 32
        }
      },
      {
        "id": "source-independent-33",
        "sourceId": "translation-33",
        "originalStatement": "The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.",
        "statement": "The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.",
        "indicators": [
          {
            "text": "anyone",
            "group": 1
          }
        ],
        "sufficient": "a person is infected by virus X",
        "necessary": "that person's body produces antibodies to fight virus X after a week",
        "diagram": "a person is infected by virus X → that person's body produces antibodies to fight virus X after a week",
        "contrapositive": "NOT (that person's body produces antibodies to fight virus X after a week) → NOT (a person is infected by virus X)",
        "ifThen": "If a person is infected by virus X, then that person's body produces antibodies to fight virus X after a week.",
        "contrapositiveWords": "If that person's body does not produce antibodies to fight virus X after a week, then that person is not infected by virus X.",
        "explanation": "Anyone supplies the universal coverage. Will is not the indicator. Keep the one-week timing.",
        "correctionNotes": [
          "The key misidentifies “will” and drops the timing."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 33
        }
      },
      {
        "id": "source-independent-34",
        "sourceId": "translation-34",
        "originalStatement": "Economic conditions improved only when the policy of free trade had been implemented.",
        "statement": "Economic conditions improved only when the policy of free trade had been implemented.",
        "indicators": [
          {
            "text": "only when",
            "group": 2
          }
        ],
        "sufficient": "economic conditions improved",
        "necessary": "the policy of free trade had already been implemented",
        "diagram": "economic conditions improved → the policy of free trade had already been implemented",
        "contrapositive": "NOT (the policy of free trade had already been implemented) → NOT (economic conditions improved)",
        "ifThen": "If economic conditions improved, then the policy of free trade had already been implemented.",
        "contrapositiveWords": "If the policy of free trade had not already been implemented, then economic conditions did not improve.",
        "explanation": "Implementation precedes improvement. The conditional alone does not prove causation.",
        "correctionNotes": [],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 34
        }
      },
      {
        "id": "source-independent-35",
        "sourceId": "translation-35",
        "originalStatement": "Where a moral duty exists, it supersedes any legal duty and any other kind of duty.",
        "statement": "Where a moral duty exists, it supersedes any legal duty and any other kind of duty.",
        "indicators": [
          {
            "text": "Where",
            "group": 1
          }
        ],
        "sufficient": "a moral duty exists",
        "necessary": "that moral duty supersedes every legal duty and every other kind of duty",
        "diagram": "a moral duty exists → that moral duty supersedes every legal duty and every other kind of duty",
        "contrapositive": "NOT (that moral duty supersedes every legal duty and every other kind of duty) → NOT (a moral duty exists)",
        "ifThen": "If a moral duty exists, then that moral duty supersedes every legal duty and every other kind of duty.",
        "contrapositiveWords": "If that moral duty fails to supersede at least one legal duty or other kind of duty, then that moral duty does not exist.",
        "explanation": "Negate the whole superseding claim. Failure to supersede at least one covered duty is enough.",
        "correctionNotes": [
          "Negate the whole qualified duty claim."
        ],
        "source": {
          "file": "Translation set (burrito)/Homework/2025-07-03_Homework For Group 1 & Group 2 (1).pdf",
          "sha256": "16be3555a66c9313fffa6afcd071ec0ca8816d7c8fbf7808a0acf42e6dd2ac05",
          "part": "Translation set (burrito) · Statements 1–35",
          "item": 35
        }
      }
    ]
  }
];

// Later visits reuse source items without counting them as new worksheet questions.
const contrapositiveRevisits: Record<string, { sourceSetId: string; title: string; shortTitle: string }> = {
  'source-intro-diagrams-contrapositive': {
    sourceSetId: 'source-intro-diagrams',
    title: 'Revisit the intro: build the contrapositive',
    shortTitle: 'Intro training: contrapositives',
  },
  'source-rephrase-contrapositive': {
    sourceSetId: 'source-rephrase',
    title: 'Revisit the rules: write both directions',
    shortTitle: 'Rephrasing: contrapositives',
  },
};

export const getSourceWorksheetDrill = (id: string): SourceWorksheetDrillSet | undefined => {
  const canonical = sourceWorksheetDrills.find((set) => set.id === id);
  if (canonical) return canonical;
  const revisit = contrapositiveRevisits[id];
  if (!revisit) return undefined;
  const source = sourceWorksheetDrills.find((set) => set.id === revisit.sourceSetId);
  if (!source) return undefined;
  return {
    ...source,
    id,
    title: revisit.title,
    shortTitle: revisit.shortTitle,
    stage: 'After contraposition',
    taskKind: 'contrapositive',
    instructions: 'Return to these familiar sentences. Find the indicators and shorten each supplied complete condition. Build the original diagram and compare it with ours, then build the contrapositive and check it. Last, write both in ordinary if/then language. Reverse the conditions and negate each complete idea, including its restrictions.',
  };
};

/** A run of adjacent words the learner selected, with the group they chose ('1', '2' or ''). */
export interface IndicatorSelection { text: string; group: string }
export interface IndicatorCheck { correct: boolean; hint: string }

export const normalizeIndicator = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// Accepted alternatives. Items keep one keyed indicator; these rules decide which other selections mean the same thing.
const DETERMINER_TAILS = ['those', 'the ones', 'these'];
const QUANTIFIERS = ['any', 'every', 'all', 'each', 'no', 'anyone', 'anything', 'everyone', 'everything', 'none'];
const WORD_ALTERNATIVES: Record<string, string[]> = { every: ['each and every'] };
const WHO_PHRASE = /^([a-z]+ )?who$/;

function acceptsSelection(expected: string, text: string) {
  if (text === expected || WORD_ALTERNATIVES[expected]?.includes(text)) return true;
  for (const tail of DETERMINER_TAILS) {
    // "Only those" was taught as "only": accept the head word, and the phrase continued by "who".
    if (expected.endsWith(` ${tail}`) && (text === expected.slice(0, -tail.length - 1) || text === `${expected} who`)) return true;
  }
  // A condition introduced by who: accept "who" or "[group] who" (e.g. "members who").
  if ((expected === 'who' || expected.endsWith(' who')) && WHO_PHRASE.test(text)) return true;
  // "Every applicant who" selected as one run still marks the quantifier.
  const words = text.split(' ');
  return QUANTIFIERS.includes(expected) && words.length <= 4 && words[0] === expected && words[words.length - 1] === 'who';
}

const containsRun = (outer: string, inner: string) => ` ${outer} `.includes(` ${inner} `);

/** Grades the indicator step and returns a hint that never names the keyed answer. */
export function checkIndicatorSelection(item: Pick<SourceWorksheetItem, 'statement' | 'indicators'>, selections: IndicatorSelection[]): IndicatorCheck {
  const expected = item.indicators.map(i => ({ text: normalizeIndicator(i.text), group: String(i.group) }));
  const remaining = [...expected];
  const statementWords = normalizeIndicator(item.statement).split(' ');
  const whoIntroducesCondition = statementWords.includes('who') && expected.some(e => e.group === '1' && QUANTIFIERS.includes(e.text));
  const extra: string[] = [];
  const wrongGroup: string[] = [];
  for (const selection of selections) {
    const text = normalizeIndicator(selection.text);
    const index = remaining.findIndex(e => acceptsSelection(e.text, text));
    if (index >= 0) {
      if (remaining[index].group !== selection.group) wrongGroup.push(selection.text);
      remaining.splice(index, 1);
      continue;
    }
    // Two adjacent indicators ("must always") form one run of selected words.
    const pairs: [number, number][] = [];
    for (let i = 0; i < remaining.length; i++) for (let j = 0; j < remaining.length; j++) if (i !== j && `${remaining[i].text} ${remaining[j].text}` === text) pairs.push([i, j]);
    const pair = pairs[0];
    if (pair) {
      if (remaining[pair[0]].group !== selection.group || remaining[pair[1]].group !== selection.group) wrongGroup.push(selection.text);
      for (const i of [...pair].sort((a, b) => b - a)) remaining.splice(i, 1);
      continue;
    }
    if (whoIntroducesCondition && WHO_PHRASE.test(text)) {
      if (selection.group !== '1') wrongGroup.push(selection.text);
      continue;
    }
    extra.push(selection.text);
  }
  if (extra.length) {
    const text = extra[0];
    const normal = normalizeIndicator(text);
    if (expected.some(e => e.text !== normal && containsRun(e.text, normal))) return { correct: false, hint: `“${text}” is only part of an indicator. Select every word of the phrase.` };
    if (expected.some(e => containsRun(normal, e.text))) return { correct: false, hint: `“${text}” includes words that are not part of the indicator. Select only the signal words.` };
    return { correct: false, hint: `“${text}” is not an indicator in this rule.` };
  }
  if (wrongGroup.length) return { correct: false, hint: `Check the group for “${wrongGroup[0]}”. Does it introduce what is enough, or what is required?` };
  if (remaining.length) return { correct: false, hint: remaining.length === 1 ? 'One indicator is still unselected. Read the whole rule again.' : `${remaining.length} indicators are still unselected. Read the whole rule again.` };
  return { correct: true, hint: '' };
}
