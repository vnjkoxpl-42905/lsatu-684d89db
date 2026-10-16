import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminQuestionNotes } from './AdminQuestionNotes';

const upsert = vi.fn(
  (_table: string, _payload: Record<string, unknown>, _opts?: unknown) =>
    Promise.resolve({ error: null }),
);
const selectRows = new Map<string, string>();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (payload: { qid: string; body: string }, opts: unknown) => {
        upsert(table, payload, opts);
        return Promise.resolve({ error: null });
      },
      select: () => {
        let qid = '';
        const chain = {
          eq: (col: string, val: string) => {
            if (col === 'qid') qid = val;
            return chain;
          },
          maybeSingle: () =>
            Promise.resolve({
              data: selectRows.has(qid) ? { body: selectRows.get(qid), updated_at: null } : null,
              error: null,
            }),
        };
        return chain;
      },
    }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
}));

function renderPanel(props: Partial<React.ComponentProps<typeof AdminQuestionNotes>> = {}) {
  return render(
    <AdminQuestionNotes
      qid="Q-1"
      isAdmin
      open
      onOpenChange={() => {}}
      {...props}
    />,
  );
}

describe('AdminQuestionNotes', () => {
  beforeEach(() => {
    upsert.mockClear();
    selectRows.clear();
    vi.useRealTimers();
  });

  it('renders nothing for a non-admin and issues no query', async () => {
    const { container } = renderPanel({ isAdmin: false });
    expect(container).toBeEmptyDOMElement();
    // A student must not be able to infer the feature exists from network traffic.
    await new Promise((r) => setTimeout(r, 50));
    expect(upsert).not.toHaveBeenCalled();
  });

  it('loads the existing note for the question', async () => {
    selectRows.set('Q-1', 'watch the scope shift in (C)');
    renderPanel();
    await waitFor(() =>
      expect(screen.getByLabelText('Teaching notes for this question')).toHaveValue(
        'watch the scope shift in (C)',
      ),
    );
  });

  it('autosaves what is typed, against the question it was typed on', async () => {
    renderPanel();
    const box = await screen.findByLabelText('Teaching notes for this question');
    fireEvent.change(box, { target: { value: 'trap is (B)' } });

    await waitFor(() => expect(upsert).toHaveBeenCalled(), { timeout: 3000 });
    const [table, payload] = upsert.mock.calls.at(-1)!;
    expect(table).toBe('admin_question_notes');
    expect(payload).toMatchObject({ author_id: 'admin-1', qid: 'Q-1', body: 'trap is (B)' });
  });

  it('never writes one question\'s note onto the next question', async () => {
    const { rerender } = renderPanel();
    const box = await screen.findByLabelText('Teaching notes for this question');
    fireEvent.change(box, { target: { value: 'about Q-1' } });

    // Move to the next question before the debounce has fired. The pending text
    // must land on Q-1, never on Q-2.
    await act(async () => {
      rerender(
        <AdminQuestionNotes qid="Q-2" isAdmin open onOpenChange={() => {}} />,
      );
    });

    await waitFor(() => expect(upsert).toHaveBeenCalled(), { timeout: 3000 });
    for (const [, payload] of upsert.mock.calls) {
      if ((payload as { body: string }).body === 'about Q-1') {
        expect((payload as { qid: string }).qid).toBe('Q-1');
      }
      expect((payload as { qid: string; body: string })).not.toMatchObject({
        qid: 'Q-2',
        body: 'about Q-1',
      });
    }
  });

  it('starts the next question with an empty box, not the previous note', async () => {
    selectRows.set('Q-1', 'note for one');
    const { rerender } = renderPanel();
    await waitFor(() =>
      expect(screen.getByLabelText('Teaching notes for this question')).toHaveValue('note for one'),
    );

    rerender(<AdminQuestionNotes qid="Q-2" isAdmin open onOpenChange={() => {}} />);
    await waitFor(() =>
      expect(screen.getByLabelText('Teaching notes for this question')).toHaveValue(''),
    );
  });
});
