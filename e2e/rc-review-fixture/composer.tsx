import { useState } from 'react';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import { MessageComposer } from '../../src/components/inbox/MessageComposer';

const context = 'I have a question about PrepTest 120 · Section 1 · Passage 1 · Question 1.\n\nSource session: fixture-session\nReturn to this question: /rc/drill?sessionId=fixture-session&review=1&q=1\n\nMy first answer: B\n\nMy question:';

/** No conversation or resolver exists, so the real composer's Send stays disabled. */
export function ComposerFixture() {
  const [contextDraft, setContextDraft] = useState<string | null>(null);
  return <TooltipProvider><main className="mx-auto max-w-3xl p-4">
    <h1>Draft composer fixture</h1>
    <p>Type an existing draft first, then add question context. Sending is disabled and no account conversation exists.</p>
    <button className="my-4 rounded border p-2" onClick={() => setContextDraft(context)}>Load question context</button>
    <MessageComposer conversationId={null} contextDraft={contextDraft} studentFacing />
  </main></TooltipProvider>;
}
