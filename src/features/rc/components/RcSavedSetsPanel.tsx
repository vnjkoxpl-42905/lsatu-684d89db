import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRcSavedSet, listRcSavedSets, renameRcSet, saveRcSet, type RcSavedDefinition } from '../api/rcSavedSets';
import { decodeRcSavedSet, type RcSavedPayload } from '../lib/rcSavedSetCodec';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SavedSetRow } from '@/components/drill/SavedSetRow';

type SavedPanelProps = { recipe?: RcSavedPayload | null; fixed?: RcSavedPayload | null; variant?: 'management' | 'contextual'; saveSuccessMessage?: string };
export function RcSavedSetsPanel({ recipe, fixed, variant = 'management', saveSuccessMessage }: SavedPanelProps) {
  const { user } = useAuth();
  return <ActorRcSavedSetsPanel key={user?.id ?? 'signed-out'} owner={user?.id ?? null} recipe={recipe} fixed={fixed} variant={variant} saveSuccessMessage={saveSuccessMessage} />;
}
function ActorRcSavedSetsPanel({ owner, recipe, fixed, variant, saveSuccessMessage }: SavedPanelProps & { owner: string | null }) {
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
  const saveHelpId = React.useId();
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
    if (!owner || variant === 'contextual') { setLoading(false); return; }
    let current = true; setLoading(true); setError(null);
    void listRcSavedSets(owner).then(value => { if (current) setRows(value); }).catch(err => { if (current) setError(err instanceof Error ? err.message : 'Your saved RC sets could not be loaded.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [owner, revision, variant]);
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
    setName(''); setNotice(saveSuccessMessage ?? (variant === 'contextual' ? 'Saved to your account. Find it in Saved sets.' : 'Saved to your account. Opening a saved item returns to the builder for inspection.')); retry();
  });
  const open = (id: string) => perform(async () => {
    if (!owner) return;
    const saved = await getRcSavedSet(owner, id);
    if (!saved.payload) throw new Error(saved.problem ?? 'This saved RC set could not be verified.');
    if (alive.current) navigate(`/practice/drills?section=rc&view=create&saved=${encodeURIComponent(id)}`);
  });
  return <section className={`rc-saved-panel${variant === 'contextual' ? ' rc-contextual-save' : ''}`} aria-label="Saved RC sets and recipes">
    <h2 className="text-lg font-semibold">{variant === 'contextual' ? 'Save this drill' : 'Saved passages and settings'}</h2>
    <p className="text-sm">{variant === 'contextual' ? 'Exact passages keep this set. Reusable settings choose passages again next time.' : 'Exact passages replay the same passages and questions. Reusable settings choose passages again each time, using your filters and progress.'}</p>
    {!owner && <p>Sign in to save and reopen RC work.</p>}
    {owner && (recipe || fixed || variant === 'contextual') && <div className="rc-saved-form">
      {variant === 'contextual' ? <label className="rc-contextual-save-name block w-full"><span className="rc-field-label">Name</span><input aria-label="Saved RC name" aria-describedby={saveHelpId} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="For example, Science practice" className="w-full rounded border px-3 py-2" /></label> : <input aria-label="Saved RC name" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Name these passages or settings" className="rounded border px-3 py-2" />}
      <div className={variant === 'contextual' ? 'rc-contextual-save-actions flex w-full flex-wrap gap-2' : 'contents'}>
        <button type="button" className="rc-chip" disabled={busy || pendingVisible || !name.trim() || !fixed} aria-describedby={variant === 'contextual' ? saveHelpId : undefined} onClick={() => fixed && void save(fixed, name)}>Save these passages</button>
        <button type="button" className="rc-chip" disabled={busy || pendingVisible || !name.trim() || !recipe} aria-describedby={variant === 'contextual' ? saveHelpId : undefined} onClick={() => recipe && void save(recipe, name)}>Save these settings</button>
      </div>
    </div>}
    {variant === 'contextual' && owner && <p id={saveHelpId} className="rc-field-hint">{!fixed ? 'Review your selection to save these exact passages. ' : ''}{!recipe ? "Reusable settings are available with Tutor's choice. " : ''}Enter a name to save. Manage saved work in Saved sets.</p>}
    {pendingVisible && <div role="status"><p>A previous RC save still needs account confirmation. Retry that original name and selection before saving another item.</p>
      <button type="button" className="rc-chip" disabled={busy} onClick={() => {
        if (!pending.current) return;
        const command = JSON.parse(pending.current.key) as { name: string; payload: unknown };
        const decoded = decodeRcSavedSet(command.payload);
        if (decoded.status === 'ok') void save(decoded.value, command.name);
      }}>Retry original RC save</button></div>}
    {variant !== 'contextual' && loading && <p role="status">Loading saved RC sets…</p>}
    {(error || recoveryError) && <div role="alert"><p>{recoveryError ?? error}</p>{variant !== 'contextual' && <button type="button" className="rc-chip" disabled={busy} onClick={retry}>Retry loading RC sets</button>}</div>}
    {notice && <p role="status">{notice}</p>}
    {variant !== 'contextual' && !loading && !error && owner && rows.length === 0 && <p className="dh-empty-note">No saved passages or settings yet.</p>}
    {variant !== 'contextual' && !loading && !error && rows.length > 0 && <p className="dh-count" role="status">{rows.length} saved {rows.length === 1 ? 'item' : 'items'}</p>}
    {variant !== 'contextual' && <ul className="dh-list rc-saved-list">{rows.map(row => {
      const detail = row.payload ? row.payload.mode === 'fixed' ? `${row.payload.passageIds.length} passage${row.payload.passageIds.length === 1 ? '' : 's'} · ${row.payload.questionIds.length} question${row.payload.questionIds.length === 1 ? '' : 's'}` : `${row.payload.count} passage${row.payload.count === 1 ? '' : 's'} requested each time` : (row.problem ?? 'This saved set could not be verified.');
      return <SavedSetRow key={row.id} section="rc" title={row.name}
        kind={row.payload ? row.payload.mode === 'fixed' ? 'Exact passages' : 'Reusable settings' : 'Needs attention'}
        detail={detail} saved={row.createdAt}
        startLabel="Open" startAriaLabel={`Open ${row.name}`} startDisabled={busy || !row.payload} onStart={() => void open(row.id)}
        menu={[
          { label: 'Rename', ariaLabel: `Rename ${row.name}`, disabled: busy || pendingVisible || !row.payload, onSelect: () => { if (pendingVisible) return; setRenaming(row.id); setNewName(row.name); } },
          { label: 'Duplicate', ariaLabel: `Duplicate ${row.name}`, disabled: busy || pendingVisible || !row.payload, onSelect: () => { if (!pendingVisible && row.payload) void save(row.payload, `${row.name.slice(0, 93)} (copy)`); } },
        ]}
        editing={renaming === row.id ? <div className="dh-rename">
          <Input aria-label={`New name for ${row.name}`} maxLength={100} value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          <Button size="sm" disabled={busy || pendingVisible || !newName.trim()} onClick={() => void perform(async () => { if (!owner || pendingVisible) return; await renameRcSet(owner, row.id, newName, row.name); if (alive.current) { setRenaming(null); retry(); } })}>Save RC name</Button>
          <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>Cancel rename</Button>
        </div> : undefined} />;
    })}</ul>}
  </section>;
}
