import * as React from 'react';
import { createRcExposureRequest, isRcExposureRequest, recordRcPassageExposure, type RcExposureRequest } from '../api/rcExposure';

/** Recording shown content never pauses a clock or changes an answer. */
export function useRcPlayerExposure(actorId: string | undefined, sessionId: string | null, enabled: boolean) {
  const identity = `${actorId ?? ''}:${sessionId ?? ''}`;
  const active = React.useRef(identity); active.current = identity;
  const requests = React.useRef(new Map<number, { request: RcExposureRequest; acknowledged: boolean }>());
  const inflight = React.useRef(new Set<string>());
  const [error, setError] = React.useState(false);
  const key = `lsatu:rc-player-exposures:v1:${identity}`;
  const initialized = React.useRef<string | null>(null);
  const initializationKey = `${identity}:${enabled}`;
  // Child passage effects run before parent effects. Prepare the request ledger
  // during this render so a newly mounted passage cannot have its request erased.
  if (initialized.current !== initializationKey) {
    initialized.current = initializationKey;
    requests.current = new Map(); inflight.current = new Set();
    if (enabled) try {
      const rows = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (Array.isArray(rows)) for (const row of rows) if (isRcExposureRequest(row?.request) && row.request.actorId === actorId && row.request.source === 'player') {
        requests.current.set(row.request.passageId, { request: row.request, acknowledged: row.acknowledged === true });
      }
    } catch { /* In-memory requests remain available for this mounted player. */ }
  }
  React.useEffect(() => { setError(false); }, [identity, enabled]);
  const persist = React.useCallback(() => { try { localStorage.setItem(key, JSON.stringify([...requests.current.values()])); } catch { /* Account acknowledgement remains authoritative. */ } }, [key]);
  const send = React.useCallback(async (entry: { request: RcExposureRequest; acknowledged: boolean }) => {
    if (!enabled || entry.acknowledged || inflight.current.has(entry.request.id)) return;
    const requestIdentity = identity; inflight.current.add(entry.request.id);
    try {
      await recordRcPassageExposure(entry.request);
      if (active.current !== requestIdentity) return;
      entry.acknowledged = true; persist();
      setError([...requests.current.values()].some(value => !value.acknowledged));
    } catch { if (active.current === requestIdentity) setError(true); }
    finally { if (active.current === requestIdentity) inflight.current.delete(entry.request.id); }
  }, [enabled, identity, persist]);
  const onShown = React.useCallback((passageId: number) => {
    if (!enabled || !actorId || !sessionId) return;
    let entry = requests.current.get(passageId);
    if (!entry) { entry = { request: createRcExposureRequest(actorId, passageId, 'player'), acknowledged: false }; requests.current.set(passageId, entry); persist(); }
    void send(entry);
  }, [enabled, actorId, sessionId, persist, send]);
  const retry = () => { for (const entry of requests.current.values()) if (!entry.acknowledged) void send(entry); };
  return { error, onShown, retry };
}
