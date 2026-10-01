import { useCallback, useEffect, useRef, useState } from 'react';
import { LocalStoragePersistence } from '@/bootcamps/main-conclusion/persistence/LocalStoragePersistence';
import { supabase } from '@/integrations/supabase/client';
import { emptyProgress, parseConditionalProgress, type ConditionalProgress } from './progress';

const TABLE = 'conditional_course_state';
const RECORD = 'conditionals-v1';
const localStores = new Map<string, LocalStoragePersistence>();
function localStore(userId: string) {
  let store = localStores.get(userId);
  if (!store) {
    // The shared IndexedDB adapter has fixed MC stores and unscoped record IDs.
    // The generic local adapter scopes every conditional key to this account.
    store = new LocalStoragePersistence(userId);
    localStores.set(userId, store);
  }
  return store;
}
export function useConditionalProgress(userId: string) {
  const [progress, setProgress] = useState<ConditionalProgress | null>(null);
  const [savedProgress, setSavedProgress] = useState<ConditionalProgress | null>(null);
  const [status, setStatus] = useState<'loading' | 'unsaved' | 'saving' | 'saved' | 'error'>('loading');
  const [error, setError] = useState('');
  const [loadedActor, setLoadedActor] = useState<string | null>(null);
  const current = useRef<ConditionalProgress | null>(null);
  const revision = useRef(0);
  const persistedRevision = useRef(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const localQueue = useRef(Promise.resolve());
  const flushRef = useRef<() => Promise<void>>();
  const cloudRevision = useRef<string | null>(null);

  const flush = useCallback(async () => {
    if (inFlight.current || !current.current || revision.current === persistedRevision.current) return;
    const actor = generation.current;
    inFlight.current = true;
    setStatus('saving');
    try {
      while (actor === generation.current && revision.current !== persistedRevision.current) {
        const version = revision.current;
        const snapshot = current.current;
        const writer = cloudRevision.current
          ? supabase.from('bootcamp_kv').update({ data: snapshot as never }).eq('user_id', userId).eq('table_name', TABLE).eq('record_id', RECORD).eq('updated_at', cloudRevision.current)
          : supabase.from('bootcamp_kv').insert({ user_id: userId, table_name: TABLE, record_id: RECORD, data: snapshot as never });
        const { data: acknowledgement, error: saveError } = await writer.select('record_id,updated_at').abortSignal(controller.current.signal).maybeSingle();
        if (saveError) {
          if (saveError.code === '23505') throw new Error('Another window saved this course first. Your draft is preserved on this device; ask Joshua to reconcile the two versions.');
          throw saveError;
        }
        if (acknowledgement?.record_id !== RECORD || !acknowledgement.updated_at) throw new Error('Your saved work changed in another window. This draft is preserved on this device. Reload to reconcile before continuing; it will not overwrite the other window.');
        if (actor !== generation.current) return;
        const acknowledgedBase = cloudRevision.current;
        cloudRevision.current = acknowledgement.updated_at;
        // New edits queued while this snapshot was in flight still have its old
        // base. Advance only that base after the acknowledgement, preserving the
        // newest draft contents and the order of any subsequent local writes.
        const nextBase = acknowledgement.updated_at;
        localQueue.current = localQueue.current.catch(() => undefined).then(async () => {
          if (actor !== generation.current) return;
          const base = await localStore(userId).get<{ revision: string | null }>('conditional_draft_base', RECORD);
          if (base?.revision === acknowledgedBase) {
            await localStore(userId).set('conditional_draft_base', RECORD, { revision: nextBase });
          }
        });
        await localQueue.current;
        if (actor !== generation.current) return;
        await localStore(userId).set(TABLE, RECORD, snapshot);
        if (actor !== generation.current) return;
        persistedRevision.current = version;
        setSavedProgress(snapshot);
      }
      if (actor === generation.current) { setStatus('saved'); setError(''); }
    } catch (failure) {
      if (actor === generation.current) { setStatus('error'); setError(failure instanceof Error ? failure.message : 'Your changes have not been saved. Retry while this page stays open.'); }
    } finally {
      if (actor === generation.current) inFlight.current = false;
    }
  }, [userId]);
  flushRef.current = flush;

  useEffect(() => {
    const actor = ++generation.current;
    const actorController = new AbortController();
    controller.current = actorController;
    current.current = null;
    revision.current = 0;
    persistedRevision.current = 0;
    inFlight.current = false;
    setProgress(null);
    setSavedProgress(null);
    setLoadedActor(null);
    setStatus('loading');
    void (async () => {
      try {
        const persistence = localStore(userId);
        await persistence.ready();
        // A failed initial cloud read must not manufacture defaults over account progress.
        const { data, error: readError } = await supabase.from('bootcamp_kv').select('data,updated_at').eq('user_id', userId).eq('table_name', TABLE).eq('record_id', RECORD).abortSignal(actorController.signal).maybeSingle();
        if (readError) throw readError;
        const saved = data?.data != null ? parseConditionalProgress(data.data) : undefined;
        const rawLocal = await persistence.get<unknown>('conditional_draft_state', RECORD);
        const local = rawLocal != null ? parseConditionalProgress(rawLocal) : null;
        const dirty = local && (!saved || Date.parse(local.updated_at) > Date.parse(saved.updated_at));
        const draftBase = await persistence.get<{ revision: string | null }>('conditional_draft_base', RECORD);
        if (dirty && draftBase && draftBase.revision !== (data?.updated_at ?? null)) throw new Error('This device has unfinished work based on an older account version. Both versions are preserved. Ask Joshua to reconcile them before continuing.');
        const value = dirty ? local : saved ?? emptyProgress();
        if (actor !== generation.current) return;
        current.current = value;
        cloudRevision.current = data?.updated_at ?? null;
        setProgress(value);
        setSavedProgress(saved ?? emptyProgress());
        setLoadedActor(userId);
        if (dirty) revision.current = 1;
        setStatus(dirty ? 'unsaved' : 'saved');
      } catch (failure) {
        if (actor === generation.current) { setLoadedActor(userId); setStatus('error'); setError(failure instanceof Error ? failure.message : 'Could not load your saved work. Reload to try again.'); }
      }
    })();
    return () => { generation.current = actor + 1; actorController.abort(); };
  }, [userId]);

  useEffect(() => {
    if (status !== 'unsaved') return;
    const timer = setTimeout(() => void flushRef.current?.(), 350);
    return () => clearTimeout(timer);
  }, [progress, status]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (revision.current === persistedRevision.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  const update = useCallback((transform: (previous: ConditionalProgress) => ConditionalProgress) => {
    if (!current.current || loadedActor !== userId) return;
    const value = { ...transform(current.current), updated_at: new Date().toISOString() };
    current.current = value;
    revision.current++;
    setProgress(value);
    setStatus(inFlight.current ? 'saving' : 'unsaved');
    const actor = generation.current;
    const baseRevision = cloudRevision.current;
    localQueue.current = localQueue.current.catch(() => undefined).then(async () => {
      await localStore(userId).set('conditional_draft_state', RECORD, value);
      await localStore(userId).set('conditional_draft_base', RECORD, { revision: baseRevision });
    }).catch(() => {
      if (actor === generation.current) { setStatus('error'); setError('Could not preserve this draft on your device. Keep this page open and retry saving.'); }
    });
  }, [userId, loadedActor]);
  return { progress: loadedActor === userId ? progress : null, savedProgress: loadedActor === userId ? savedProgress : null, update, status: loadedActor === userId ? status : 'loading' as const, error: loadedActor === userId ? error : '', retry: flush };
}
