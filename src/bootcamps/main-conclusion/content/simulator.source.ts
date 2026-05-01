/**
 * Simulator canonical 20 — TS source authored from Notes/MCFIRST SENTENCE : REBUTTAL.pdf (S, 91%).
 * Per Step 1.5 smoke test (2026-04-30), MCFIRST is the authoritative source for the canonical 20;
 * spec.html L2493-2507 had drift in 5 titles (Q10, Q19, Q20, plus Q11–Q18 untitled in spec).
 *
 * Stimulus + main conclusion + structure metadata captured from Read-tool extraction
 * (artifact: scripts/__smoke__/mcfirst.extracted.json). For v1 vertical slice + M1 review,
 * stimulus text remains in the smoke artifact; this file carries titles + family + anchors.
 * Full stimulus text wires in at Module 4 build start (alongside the 80-distractor authoring).
 */

import type { SimulatorQuestionT } from './schemas';

const ANCHOR = (n: number) => ({
  primary: `Curriculum/Main Conclusion/Notes/MCFIRST SENTENCE : REBUTTAL.pdf — Q${n}`,
  secondary: `Curriculum/Main Conclusion/Notes/main_conclusion_questions_dup1.pdf — Q${n}`,
  tertiary: `Curriculum/Main Conclusion/Homework/main_conclusion_answer_key_dup1.pdf — Q${n}`,
  spec_ref: `spec.html#L${2493 + n}`,
});

export const SIMULATOR_QUESTIONS: SimulatorQuestionT[] = [
  { id: 'MC-SIM-Q1', number: 1, title: "Vision test for driver's licenses", structure_family: 'First-sentence', source_anchor: ANCHOR(1), ocr_status: 'captured' },
  { id: 'MC-SIM-Q2', number: 2, title: 'Freedom of speech / Policy Adviser', structure_family: 'First-sentence', source_anchor: ANCHOR(2), ocr_status: 'captured' },
  { id: 'MC-SIM-Q3', number: 3, title: 'Trade Europe-East Asia / yeti analogy', structure_family: 'First-sentence', source_anchor: ANCHOR(3), ocr_status: 'captured' },
  { id: 'MC-SIM-Q4', number: 4, title: 'No computer / human minds / mechanical rules', structure_family: 'First-sentence', source_anchor: ANCHOR(4), ocr_status: 'captured' },
  { id: 'MC-SIM-Q5', number: 5, title: 'Toy-labeling law / Consumer advocate', structure_family: 'First-sentence', source_anchor: ANCHOR(5), ocr_status: 'captured' },
  { id: 'MC-SIM-Q6', number: 6, title: 'Diet refined sugar / adult-onset diabetes', structure_family: 'First-sentence', source_anchor: ANCHOR(6), ocr_status: 'captured' },
  { id: 'MC-SIM-Q7', number: 7, title: 'Legal theorist / incarceration / serious threat', structure_family: 'First-sentence', source_anchor: ANCHOR(7), ocr_status: 'captured' },
  { id: 'MC-SIM-Q8', number: 8, title: 'Nylon industry spokesperson / cotton vs nylon natural', structure_family: 'Rebuttal', source_anchor: ANCHOR(8), ocr_status: 'captured' },
  { id: 'MC-SIM-Q9', number: 9, title: 'Mayor McKinney / wealthy residents / property taxes', structure_family: 'Rebuttal', source_anchor: ANCHOR(9), ocr_status: 'captured' },
  { id: 'MC-SIM-Q10', number: 10, title: 'Some legislators / public funds for scientific research / molds & antibiotics', structure_family: 'Rebuttal', source_anchor: ANCHOR(10), ocr_status: 'captured' },
  { id: 'MC-SIM-Q11', number: 11, title: 'Letter to the editor / Judge Mosston', structure_family: 'Rebuttal', source_anchor: ANCHOR(11), ocr_status: 'captured' },
  { id: 'MC-SIM-Q12', number: 12, title: 'Witnessing violence in movies / rhetorical-question rebuttal', structure_family: 'Rebuttal', source_anchor: ANCHOR(12), ocr_status: 'captured' },
  { id: 'MC-SIM-Q13', number: 13, title: 'Computers replacing teachers / understanding vs facts-and-rules', structure_family: 'Rebuttal', source_anchor: ANCHOR(13), ocr_status: 'captured' },
  { id: 'MC-SIM-Q14', number: 14, title: 'Golden Lake Development / so-called environmentalists / bird migration', structure_family: 'Rebuttal', source_anchor: ANCHOR(14), ocr_status: 'captured' },
  { id: 'MC-SIM-Q15', number: 15, title: 'Long-term cigarette smoking / tobacco companies / candy-cavities analogy', structure_family: 'Rebuttal', source_anchor: ANCHOR(15), ocr_status: 'captured' },
  { id: 'MC-SIM-Q16', number: 16, title: 'Pharmacists / doctors selling medicine / monopoly objection', structure_family: 'Rebuttal', source_anchor: ANCHOR(16), ocr_status: 'captured' },
  { id: 'MC-SIM-Q17', number: 17, title: 'Broadcaster / private lives of local celebrities / public interest', structure_family: 'Rebuttal', source_anchor: ANCHOR(17), ocr_status: 'captured' },
  { id: 'MC-SIM-Q18', number: 18, title: 'Thomas / Municipal Building fire / must-have-seen-it', structure_family: 'Rebuttal', source_anchor: ANCHOR(18), ocr_status: 'captured' },
  { id: 'MC-SIM-Q19', number: 19, title: 'Figurative painting revival / late 1970s', structure_family: 'First-sentence', source_anchor: ANCHOR(19), ocr_status: 'captured' },
  { id: 'MC-SIM-Q20', number: 20, title: 'Multinational grain companies / food-distribution / since-clause leading', structure_family: 'First-sentence', source_anchor: ANCHOR(20), ocr_status: 'captured' },
];
