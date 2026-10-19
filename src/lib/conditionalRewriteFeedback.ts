import type { ConditionalRewriteGrade, ConditionalRewriteRequest } from './conditionalRewriteGrader';

// Authored prompts for this item set, not guesses about a learner's mistake.
// Keep complete restrictions in view without displaying the corrected rewrite.
export const sufficientRewriteHints: Record<string, string> = {
  'Mia takes the bus if it is raining.': 'Start with the rain. What does that tell you about Mia? Does seeing her on the bus settle what the weather is?',
  'When the kettle boils, it clicks off.': 'Start with the kettle boiling. What does the rule guarantee next? A click by itself could have another explanation.',
  'Whenever Sam bakes bread, the kitchen smells of yeast.': 'What does Sam baking bread guarantee about the kitchen? Could the smell be there even when Sam has not baked?',
  'Where the sidewalk is icy, the city spreads salt.': 'Keep the location in the condition: an icy stretch of sidewalk. What does the city do there? Salt elsewhere does not settle whether that stretch was icy.',
  'All dogs at the park must be on a leash.': 'Which dogs does the rule cover? Keep “at the park,” then ask what those dogs are required to have.',
  'Every guest at the wedding gets a slice of cake.': 'Keep the whole group: guests at this wedding. What is guaranteed for each guest? Someone holding cake need not belong to that group.',
  'Each player on the team gets a numbered jersey.': 'Which players are covered? Keep “on the team” and “numbered” when you decide what each player gets.',
  'Any car parked in the fire lane gets towed.': 'Keep the parking location. Is this about every parked car, or just cars in the fire lane? Then check what happens to those cars.',
  'The only shoes allowed on the gym floor are sneakers.': 'Start with shoes allowed on this gym floor. What must be true of those shoes? Do not assume every pair of sneakers is allowed.',
  'People who order the lunch special get a free drink.': 'What does ordering the lunch special guarantee? Keep the whole order and the fact that the drink is free.',
  'A package ships the same day if it is ordered before 2 p.m.': 'Keep “before 2 p.m.” What does an order meeting that deadline guarantee? The rule does not cover every order placed that day.',
  'The only cookies left in the jar are oatmeal.': 'Start with a cookie still in the jar. What must be true of that cookie? An oatmeal cookie could also be somewhere else.',
  'Every key on the red ring opens a classroom.': 'Consider a key on another ring that opens a classroom. Does the original rule forbid that key? What does the reversed claim say about it?',
};

export function contextualRewriteFeedback(request: Pick<ConditionalRewriteRequest, 'original' | 'studentResponse' | 'task'>, grade: ConditionalRewriteGrade): ConditionalRewriteGrade {
  if (grade.correct || request.task === 'contrapositive') return grade;
  const hint = sufficientRewriteHints[request.original];
  if (!hint) return grade;
  const quote = request.studentResponse.trim().slice(0, 160).replace(/\s+/g, ' ');
  return { correct: false, feedback: `You wrote: “${quote}” ${hint}` };
}
