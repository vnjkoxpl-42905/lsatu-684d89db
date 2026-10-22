import { describe, it, expect } from 'vitest';
import { parseAssignCommand } from './agentCommand';

describe('parseAssignCommand', () => {
  const cases: Array<[string, { resourceQuery: string; studentQuery: string } | null]> = [
    ['assign Negation Station to Maya', { resourceQuery: 'Negation Station', studentQuery: 'Maya' }],
    ['Assign  Conditional Logic HW  to  Josh ', { resourceQuery: 'Conditional Logic HW', studentQuery: 'Josh' }],
    ['ASSIGN flaw drill TO Sam Lee', { resourceQuery: 'flaw drill', studentQuery: 'Sam Lee' }],
    // Not a clean assign command -> AI lane.
    ['can you assign something to maya', null],
    ['tell Josh to redo flaw questions', null],
    ['assign to maya', null],
    ['assign Negation Station', null],
    ['', null],
  ];

  it.each(cases)('parses %j', (input, expected) => {
    expect(parseAssignCommand(input)).toEqual(expected);
  });
});
