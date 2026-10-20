import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRcSavedSet, listRcSavedSets, renameRcSet, saveRcSet, type RcSavedDefinition } from '../api/rcSavedSets';
import { decodeRcSavedSet, type RcSavedPayload } from '../lib/rcSavedSetCodec';

export function RcSavedSetsPanel({ recipe, fixed }: { recipe?: RcSavedPayload | null; fixed?: RcSavedPayload | null }) {
  const { user } = useAuth();
  return <ActorRcSavedSetsPanel key={user?.id ?? 'signed-out'} owner={user?.id ?? null} recipe={recipe} fixed={fixed} />;
}
function ActorRcSavedSetsPanel({ owner, recipe, fixed }: { owner: string | null; recipe?: RcSavedPayload | null; fixed?: RcSavedPayload | null }) {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<RcSavedDefinition[]>([]);
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [recoveryError, setRecoveryError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [revision, retry] = React.useReducer(n => n + 1, 0);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState('');
  const lock = React.useRef(false);
  const alive = React.useRef(true);
  const pending = React.useRef<{ key: string; id: string } | null>(null);
  const [pendingVisible, setPendingVisible] = React.useState(false);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!owner) return;
    try {
      const raw = localStorage.getItem(`lsatu:rc-saved-definition:v1:${owner}`);
      if (!raw) return;
      const stored = JSON.parse(raw) as { key?: unknown; id?: unknown };
      if (typeof stored.key !== 'string' || typeof stored.id !== 'string') throw new Error('invalid');
      const command = JSON.parse(stored.key) as { name?: unknown; payload?: unknown };
      if (typeof command.name !== 'string' || decodeRcSavedSet(command.payload).status !== 'ok') throw new Error('invalid');
      pending.current = { key: stored.key, id: stored.id }; setPendingVisible(true);
    } catch { setRecoveryError('The pending RC save could not be restored. Keep this page open and contact Joshua.'); }
  }, [owner]);
  React.useEffect(() => {
    if (!owner) { setLoading(false); return; }
    let current = true; setLoading(true); setError(null);
    void listRcSavedSets(owner).then(value => { if (current) setRows(value); }).catch(err => { if (current) setError(err instanceof Error ? err.message : 'Your saved RC sets could not be loaded.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [owner, revision]);
  const perform = async (work: () => Promise<void>) => {
    if (lock.current || !owner || recoveryError) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    try { await work(); } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'That change did not save. Try again.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const save = (payload: RcSavedPayload, title: string) => perform(async () => {
    if (!owner) return;
    const key = JSON.stringify({ name: title.trim(), payload });
    const storageKey = `lsatu:rc-saved-definition:v1:${owner}`;
    if (!pending.current) {
      const previous = localStorage.getItem(storageKey);
      if (previous) {
        const stored = JSON.parse(previous) as { key?: unknown; id?: unknown };
        if (typeof stored.key !== 'string' || typeof stored.id !== 'string') throw new Error('The pending save could not be verified. Keep this page open and contact Joshua.');
        pending.current = { key: stored.key, id: stored.id };
      }
    }
    if (pending.current && pending.current.key !== key) throw new Error('A previous save still needs confirmation. Restore its name and selection, then retry before saving another set.');
    if (!pending.current) { pending.current = { key, id: crypto.randomUUID() }; localStorage.setItem(storageKey, JSON.stringify(pending.current)); }
    setPendingVisible(true);
    await saveRcSet(owner, title, payload, pending.current.id);
    localStorage.removeItem(storageKey); pending.current = null;
    if (alive.current) setPendingVisible(false);
    if (!alive.current) return;
    setName(''); setNotice('Saved to your account. Opening a saved item returns to the builder for inspection.'); retry();
  });
  const open = (id: string) => perform(async () => {
    if (!owner) return;
    const saved = await getRcSavedSet(owner, id);
    if (!saved.payload) throw new Error(saved.problem ?? 'This saved RC set could not be verified.');
    if (alive.current) navigate(`/rc?saved=${encodeURIComponent(id)}`);
  });
  return <section className="my-6 space-y-3 rounded-xl border p-4" aria-label="Saved RC sets and recipes">
    <h2 className="text-lg font-semibold">Saved RC sets and recipes</h2>
    <p className="text-sm">A fixed set keeps its passages and questions. A recipe uses your filters to choose again from your current progress. Neither starts a drill until you inspect it.</p>
    {!owner && <p>Sign in to save and reopen RC work.</p>}
    {owner && (recipe || fixed) && <div className="flex flex-wrap gap-2">
      <input aria-label="Saved RC name" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Name this RC set or recipe" className="rounded border px-3 py-2" />
      <button type="button" className="rc-chip" disabled={busy || pendingVisible || !name.trim() || !fixed} onClick={() => fixed && void save(fixed, name)}>Save fixed RC set</button>
      <button type="button" className="rc-chip" disabled={busy || pendingVisible || !name.trim() || !recipe} onClick={() => recipe && void save(recipe, name)}>Save RC recipe</button>
    </div>}
    {pendingVisible && <div role="status"><p>A previous RC save still needs account confirmation. Retry that original name and selection before saving another item.</p>
      <button type="button" className="rc-chip" disabled={busy} onClick={() => {
        if (!pending.current) return;
        const command = JSON.parse(pending.current.key) as { name: string; payload: unknown };
        const decoded = decodeRcSavedSet(command.payload);
        if (decoded.status === 'ok') void save(decoded.value, command.name);
      }}>Retry original RC save</button></div>}
    {loading && <p role="status">Loading saved RC sets…</p>}
    {(error || recoveryError) && <div role="alert"><p>{recoveryError ?? error}</p><button type="button" className="rc-chip" disabled={busy} onClick={retry}>Retry loading RC sets</button></div>}
    {notice && <p role="status">{notice}</p>}
    {!loading && !error && owner && rows.length === 0 && <p>No saved RC sets or recipes yet.</p>}
    <ul className="space-y-3">{rows.map(row => <li key={row.id} className="rounded border p-3">
      <strong>{row.name}</strong><p className="text-sm">{row.payload ? row.payload.mode === 'fixed' ? `Fixed RC set · ${row.payload.passageIds.length} passage${row.payload.passageIds.length === 1 ? '' : 's'} · ${row.payload.questionIds.length} question${row.payload.questionIds.length === 1 ? '' : 's'}` : `RC recipe · ${row.payload.count} passage${row.payload.count === 1 ? '' : 's'} requested` : row.problem}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rc-chip" disabled={busy || !row.payload} onClick={() => void open(row.id)}>Open {row.name}</button>
        <button type="button" className="rc-chip" disabled={busy || pendingVisible || !row.payload} onClick={() => { if (pendingVisible) return; setRenaming(row.id); setNewName(row.name); }}>Rename {row.name}</button>
        <button type="button" className="rc-chip" disabled={busy || pendingVisible || !row.payload} onClick={() => !pendingVisible && row.payload && void save(row.payload, `${row.name.slice(0, 93)} (copy)`)}>Duplicate {row.name}</button>
      </div>
      {renaming === row.id && <div className="flex flex-wrap gap-2"><input aria-label={`New name for ${row.name}`} maxLength={100} value={newName} onChange={e => setNewName(e.target.value)} /><button type="button" className="rc-chip" disabled={busy || pendingVisible || !newName.trim()} onClick={() => void perform(async () => { if (!owner || pendingVisible) return; await renameRcSet(owner, row.id, newName, row.name); if (alive.current) { setRenaming(null); retry(); } })}>Save RC name</button><button type="button" className="rc-chip" onClick={() => setRenaming(null)}>Cancel rename</button></div>}
    </li>)}</ul>
  </section>;
}
