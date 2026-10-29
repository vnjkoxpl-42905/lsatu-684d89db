import * as React from 'react';
import { setAttemptFlag } from '../api/rcProgress';
import type { RcAnnotationSaveStatus } from './useRcHighlights';

interface Options {
  actorId?: string | null;
  sessionId?: string | null;
  enabled: boolean;
  recordedQuestionIds: number[];
}

interface Intent { flagged: boolean; version: number; intentId: string }
interface Owner {
  actor: string; session: string; cancelled: boolean;
  pending: Map<number, Intent>; saving: Map<number, number>; chains: Map<number, Promise<void>>;
}
const prefixFor = (actor: string, session: string) => `rc:flags:pending:${encodeURIComponent(actor)}:${encodeURIComponent(session)}:`;
const keyFor = (owner: Owner, questionId: number) => `${prefixFor(owner.actor, owner.session)}${questionId}`;
const EMPTY_FLAGS = new Map<number, boolean>();

/** Personal drill flags only. The player owns answer creation and source restrictions. */
export function useRcFlagPersistence({ actorId, sessionId, enabled, recordedQuestionIds }: Options) {
  const context = React.useRef<Owner | null>(null);
  const version = React.useRef(0);
  const recorded = React.useRef(recordedQuestionIds);
  recorded.current = recordedQuestionIds;
  const [pendingFlags, setPendingFlags] = React.useState(new Map<number, boolean>());
  const [statuses, setStatuses] = React.useState(new Map<number, RcAnnotationSaveStatus>());
  const [errors, setErrors] = React.useState(new Map<number, string>());
  const [recoveryError, setRecoveryError] = React.useState<string | null>(null);
  const matches = (owner: Owner | null) => !!owner && !owner.cancelled && enabled && owner.actor === actorId && owner.session === sessionId;

  React.useEffect(() => {
    const owner: Owner = { actor: actorId ?? '', session: sessionId ?? '', cancelled: false, pending: new Map(), saving: new Map(), chains: new Map() };
    context.current = owner;
    const flags = new Map<number, boolean>();
    const recovered = new Map<number, RcAnnotationSaveStatus>();
    setErrors(new Map());
    setRecoveryError(null);
    if (actorId && sessionId && enabled) {
      try {
        const prefix = prefixFor(actorId, sessionId);
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith(prefix)) continue;
          const questionId = Number(key.slice(prefix.length));
          const value = JSON.parse(localStorage.getItem(key) ?? 'null') as { flagged: boolean; intentId?: string } | null;
          if (!Number.isSafeInteger(questionId) || questionId < 1 || typeof value?.flagged !== 'boolean') throw new Error('Pending flags could not be read.');
          const intentId = value.intentId ?? crypto.randomUUID();
          if (!value.intentId) localStorage.setItem(key, JSON.stringify({ flagged: value.flagged, intentId }));
          owner.pending.set(questionId, { flagged: value.flagged, version: ++version.current, intentId });
          flags.set(questionId, value.flagged);
          recovered.set(questionId, 'recovered');
        }
      } catch (error: unknown) {
        setRecoveryError(error instanceof Error ? error.message : 'Pending flags could not be read.');
      }
    }
    setPendingFlags(flags);
    setStatuses(recovered);
    return () => { owner.cancelled = true; };
  }, [actorId, sessionId, enabled]);

  function acknowledge(owner: Owner, questionId: number, intent: Intent) {
    const raw = localStorage.getItem(keyFor(owner, questionId));
    if (raw && JSON.parse(raw).intentId === intent.intentId) localStorage.removeItem(keyFor(owner, questionId));
    if (matches(owner) && owner.pending.get(questionId)?.version === intent.version) {
      owner.pending.delete(questionId);
      setPendingFlags((map) => { const next = new Map(map); next.delete(questionId); return next; });
      setStatuses((map) => new Map(map).set(questionId, 'saved'));
      setErrors((map) => { const next = new Map(map); next.delete(questionId); return next; });
    }
  }

  function retry(questionId: number, justRecorded = false) {
    const owner = context.current;
    if (!matches(owner) || !owner) return;
    const intent = owner.pending.get(questionId);
    if (!intent || owner.saving.get(questionId) === intent.version) return;
    if (!justRecorded && !recorded.current.includes(questionId)) return;
    owner.saving.set(questionId, intent.version);
    setStatuses((map) => new Map(map).set(questionId, 'saving'));
    const previous = owner.chains.get(questionId) ?? Promise.resolve();
    const task = previous.catch(() => undefined).then(async () => {
      if (owner.cancelled) return;
      try {
        await setAttemptFlag(owner.session, questionId, intent.flagged, owner.actor);
        acknowledge(owner, questionId, intent);
      } catch (error: unknown) {
        if (matches(owner) && owner.pending.get(questionId)?.version === intent.version) {
          setStatuses((map) => new Map(map).set(questionId, 'error'));
          setErrors((map) => new Map(map).set(questionId, error instanceof Error ? error.message : 'The flag was not saved.'));
        }
      } finally {
        if (owner.saving.get(questionId) === intent.version) owner.saving.delete(questionId);
      }
    });
    owner.chains.set(questionId, task);
  }

  function setFlag(questionId: number, flagged: boolean) {
    const owner = context.current;
    if (!matches(owner) || !owner) return;
    const intent = { flagged, version: ++version.current, intentId: crypto.randomUUID() };
    owner.pending.set(questionId, intent);
    setPendingFlags((map) => new Map(map).set(questionId, flagged));
    try {
      localStorage.setItem(keyFor(owner, questionId), JSON.stringify({ flagged, intentId: intent.intentId }));
      setStatuses((map) => new Map(map).set(questionId, 'recovered'));
    } catch {
      setStatuses((map) => new Map(map).set(questionId, 'error'));
      setErrors((map) => new Map(map).set(questionId, 'The device could not keep a recovery copy. Retry saving before leaving.'));
    }
    retry(questionId);
  }

  function acknowledgeRecordedFlag(questionId: number, flagged: boolean) {
    const owner = context.current;
    if (!matches(owner) || !owner) return;
    const intent = owner.pending.get(questionId);
    if (intent?.flagged === flagged) {
      try { acknowledge(owner, questionId, intent); }
      catch { setStatuses((map) => new Map(map).set(questionId, 'error')); }
    } else if (intent) retry(questionId, true);
  }

  const valid = matches(context.current);
  return { pendingFlags: valid ? pendingFlags : EMPTY_FLAGS, setFlag, retry, acknowledgeRecordedFlag,
    recoveryError: valid ? recoveryError : null,
    statusForQuestion: (id: number): RcAnnotationSaveStatus => valid ? statuses.get(id) ?? 'idle' : 'idle',
    errorForQuestion: (id: number) => valid ? errors.get(id) ?? null : null,
  };
}
