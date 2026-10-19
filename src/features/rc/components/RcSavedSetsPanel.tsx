import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRcSavedSet, listRcSavedSets, renameRcSet, saveRcSet, type RcSavedDefinition } from '../api/rcSavedSets';
import { decodeRcSavedSet, type RcSavedPayload } from '../lib/rcSavedSetCodec';

type Presentation = 'manage' | 'save';

function PanelAction({ presentation, variant = 'outline', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { presentation?: Presentation; variant?: 'default' | 'outline' | 'ghost' }) {
  if (presentation === 'save') return <button {...props} className={`rc-chip${className ? ` ${className}` : ''}`} />;
  return <Button {...props} variant={variant} size="sm" className={`min-h-[44px]${className ? ` ${className}` : ''}`} />;
}

function PanelNameInput({ presentation, className, ...props }: React.ComponentProps<typeof Input> & { presentation?: Presentation }) {
  if (presentation === 'save') return <input {...props} className={className} />;
  return <Input {...props} className="min-h-[44px] w-full min-w-0 sm:max-w-xs" />;
}

type RcSavedSetsPanelProps = { recipe?: RcSavedPayload | null; fixed?: RcSavedPayload | null; presentation?: 'manage' | 'save' };

export function RcSavedSetsPanel({ recipe, fixed, presentation = 'manage' }: RcSavedSetsPanelProps) {
  const { user } = useAuth();
  return <ActorRcSavedSetsPanel key={user?.id ?? 'signed-out'} owner={user?.id ?? null} recipe={recipe} fixed={fixed} presentation={presentation} />;
}
function ActorRcSavedSetsPanel({ owner, recipe, fixed, presentation }: RcSavedSetsPanelProps & { owner: string | null }) {
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
    if (presentation === 'save' || !owner) { setLoading(false); return; }
    let current = true; setLoading(true); setError(null);
    void listRcSavedSets(owner).then(value => { if (current) setRows(value); }).catch(err => { if (current) setError(err instanceof Error ? err.message : 'Your saved RC sets could not be loaded.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [owner, revision, presentation]);
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
    setName(''); setNotice('Saved.'); if (presentation === 'manage') retry();
  });
  const open = (id: string) => perform(async () => {
    if (!owner) return;
    const saved = await getRcSavedSet(owner, id);
    if (!saved.payload) throw new Error(saved.problem ?? 'This saved RC set could not be verified.');
    if (alive.current) navigate(`/rc?saved=${encodeURIComponent(id)}`);
  });
  const showCreation = presentation === 'save' ? fixed?.mode === 'fixed' : Boolean(recipe || fixed);
  if (presentation === 'save' && !showCreation && !pendingVisible && !error && !recoveryError && !notice) return null;
  return <section className={presentation === 'manage' ? 'my-4 space-y-3' : 'space-y-2'} aria-label={presentation === 'manage' ? 'Saved RC sets' : 'Save RC set'}>
    {presentation === 'manage' && <h2 className="text-base font-semibold">Saved RC sets</h2>}
    {!owner && (presentation === 'manage' || showCreation) && <p>Sign in to save and reopen RC work.</p>}
    {owner && showCreation && <div className="flex flex-wrap gap-2">
      <PanelNameInput presentation={presentation} aria-label="Saved RC name" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="rounded border px-3 py-2" />
      <PanelAction presentation={presentation} type="button" disabled={busy || pendingVisible || !name.trim() || !fixed} onClick={() => fixed && void save(fixed, name)}>Save passages</PanelAction>
      <PanelAction presentation={presentation} type="button" disabled={busy || pendingVisible || !name.trim() || !recipe} onClick={() => recipe && void save(recipe, name)}>Save settings</PanelAction>
    </div>}
    {pendingVisible && <div role="status"><p>A previous RC save still needs account confirmation. Retry that original name and selection before saving another item.</p>
      <PanelAction presentation={presentation} type="button" disabled={busy} onClick={() => {
        if (!pending.current) return;
        const command = JSON.parse(pending.current.key) as { name: string; payload: unknown };
        const decoded = decodeRcSavedSet(command.payload);
        if (decoded.status === 'ok') void save(decoded.value, command.name);
      }}>Retry original RC save</PanelAction></div>}
    {presentation === 'manage' && loading && <p role="status">Loading saved RC sets…</p>}
    {(error || recoveryError) && <div role="alert"><p>{recoveryError ?? error}</p>{presentation === 'manage' && <PanelAction presentation={presentation} type="button" disabled={busy} onClick={retry}>Retry loading RC sets</PanelAction>}</div>}
    {notice && <p role="status">{notice}</p>}
    {presentation === 'manage' && !loading && !error && owner && rows.length === 0 && <p>No saved RC sets yet.</p>}
    {presentation === 'manage' && <ul className="space-y-2">{rows.map(row => <li key={row.id} className="space-y-2 rounded border p-3">
      <strong>{row.name}</strong><p className="text-sm">{row.payload ? row.payload.mode === 'fixed' ? `Saved passages · ${row.payload.passageIds.length} passage${row.payload.passageIds.length === 1 ? '' : 's'} · ${row.payload.questionIds.length} question${row.payload.questionIds.length === 1 ? '' : 's'}` : `Saved settings · ${row.payload.count} passage${row.payload.count === 1 ? '' : 's'}` : row.problem}</p>
      <div className="flex flex-wrap gap-2">
        <PanelAction presentation={presentation} type="button" disabled={busy || !row.payload} aria-label={`Open ${row.name}`} onClick={() => void open(row.id)}>Open</PanelAction>
        <PanelAction presentation={presentation} type="button" disabled={busy || pendingVisible || !row.payload} variant="ghost" aria-label={`Rename ${row.name}`} onClick={() => { if (pendingVisible) return; setRenaming(row.id); setNewName(row.name); }}>Rename</PanelAction>
        <PanelAction presentation={presentation} type="button" disabled={busy || pendingVisible || !row.payload} variant="ghost" aria-label={`Duplicate ${row.name}`} onClick={() => !pendingVisible && row.payload && void save(row.payload, `${row.name.slice(0, 93)} (copy)`)}>Duplicate</PanelAction>
      </div>
      {renaming === row.id && <div className="flex flex-wrap gap-2"><PanelNameInput presentation={presentation} aria-label={`New name for ${row.name}`} maxLength={100} value={newName} onChange={e => setNewName(e.target.value)} /><PanelAction presentation={presentation} type="button" disabled={busy || pendingVisible || !newName.trim()} aria-label={`Save name for ${row.name}`} onClick={() => void perform(async () => { if (!owner || pendingVisible) return; await renameRcSet(owner, row.id, newName, row.name); if (alive.current) { setRenaming(null); retry(); } })}>Save name</PanelAction><PanelAction presentation={presentation} type="button" variant="ghost" aria-label={`Cancel renaming ${row.name}`} onClick={() => setRenaming(null)}>Cancel</PanelAction></div>}
    </li>)}</ul>}
  </section>;
}
