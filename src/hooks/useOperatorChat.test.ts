import { describe, expect, it } from 'vitest';
import { titleFromFirstUserMessage } from './useOperatorChat';

describe('titleFromFirstUserMessage', () => {
  it('removes common assistant-request filler and title-cases the result', () => {
    expect(titleFromFirstUserMessage('Can you help me refine my prompt process?')).toBe('Prompt Refinement Process');
  });

  it('uses a concise cleaned excerpt for ordinary first messages', () => {
    expect(
      titleFromFirstUserMessage(
        'Draft a warmer weekly assignment reply for Adriana that explains the LR timing plan and next steps.',
      ),
    ).toBe('Draft Warmer Weekly Assignment Reply for Adriana');
  });

  it('ignores attached context and drive metadata lines', () => {
    expect(
      titleFromFirstUserMessage(
        'Please summarize the uploaded LSAT notes.\n\n[Attached context: Recap or note]\n[Google Drive files: notes.pdf (https://drive.test)]',
      ),
    ).toBe('Summarize Uploaded LSAT Notes');
  });

  it('falls back for empty or metadata-only input', () => {
    expect(titleFromFirstUserMessage('   [Attached context: Practice set]   ')).toBe('New conversation');
  });
});
