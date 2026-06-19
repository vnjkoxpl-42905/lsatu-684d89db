import { useCallback, useState } from 'react';
import { useOperatorChat } from '@/hooks/useOperatorChat';
import { AssistantComposer } from './AssistantComposer';
import { buildTaskContext, type DeskTask } from './deskTasks';

/**
 * Composer-only assistant surface for the Teacher Desk Stage.
 * The side panels still own context/commit controls; this component is only the
 * v0-style command bar used to talk to the assistant.
 */
export function MiniChat({
  task,
  variant,
  localPreview,
}: {
  task: DeskTask;
  variant: 'draft' | 'advisory';
  draft: string;
  onDraftChange: (value: string) => void;
  onSend?: () => void | Promise<void>;
  sending?: boolean;
  localPreview: boolean;
}) {
  const { isLoading, sendMessage } = useOperatorChat();
  const [input, setInput] = useState('');
  const draftsInto = variant === 'draft';

  const send = useCallback(
    (text: string) => {
      if (!text.trim() || localPreview || isLoading) return;
      sendMessage(text, buildTaskContext(task));
    },
    [isLoading, localPreview, sendMessage, task],
  );

  const submit = (sources?: import('./AssistantComposer').ComposerSubmitSources) => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const parts = [text];
    if (sources?.labels.length) {
      parts.push(`[Attached context: ${sources.labels.join(', ')}]`);
    }
    if (sources?.drive.length) {
      const drive = sources.drive.map((f) => `${f.name} (${f.url})`).join(', ');
      parts.push(`[Google Drive files: ${drive}]`);
    }
    if (sources?.driveConnector) {
      parts.push(
        '[Google Drive connector: enabled — server-side Drive search is not wired yet, so use only Drive files explicitly attached in this message.]',
      );
    }

    send(parts.join('\n\n'));
  };

  return (
    <div className="mt-4">
      <AssistantComposer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        loading={isLoading}
        disabled={localPreview}
        onUtilityCommand={send}
        readOnlyMessage={localPreview ? 'Assistant is read-only in local preview. It connects on the live teacher desk.' : undefined}
        placeholder={
          draftsInto
            ? task.sourceKind === 'conversation'
              ? 'Draft a reply...'
              : 'Ask Joshua a question...'
            : 'which drill should I assign?'
        }
        seedAction={undefined}
      />
    </div>
  );
}
