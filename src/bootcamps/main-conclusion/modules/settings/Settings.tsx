/**
 * Settings — keyboard shortcuts cheat sheet · persistence reset · export-all JSON.
 */

import { useState } from 'react';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Modal } from '@/bootcamps/main-conclusion/components/primitives/Modal';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Toggle } from '@/bootcamps/main-conclusion/components/primitives/Toggle';

export function Settings() {
  const user = useUser();
  const [confirmReset, setConfirmReset] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  async function exportAll() {
    if (!user) return;
    const persist = getPersistence(user.id);
    const tables = Object.values(TABLES);
    const dump: Record<string, unknown[]> = {};
    for (const t of tables) {
      dump[t] = await persist.list(t);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mc-bootcamp-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function resetAll() {
    if (!user) return;
    const persist = getPersistence(user.id);
    for (const t of Object.values(TABLES)) {
      const all = await persist.list<{ id: string }>(t);
      for (const item of all) await persist.remove(t, item.id);
    }
    setConfirmReset(false);
    window.location.reload();
  }

  return (
    <article className="px-6 py-10 max-w-3xl mx-auto space-y-5">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Settings</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Preferences</h1>
      </header>

      <Card variant="surface">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Theme</h2>
        <p className="font-mc-serif text-body text-ink mt-2">
          Dark only in v1. Light mode lives in the v1.5 backlog.
        </p>
        <div className="mt-3">
          <Badge tone="accent">dark</Badge>
        </div>
      </Card>

      <Card variant="surface">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Motion</h2>
        <p className="font-mc-serif text-body text-ink mt-2">
          Animations follow OS prefers-reduced-motion by default. Override here.
        </p>
        <div className="mt-3">
          <Toggle id="reduce-motion" checked={reduceMotion} onChange={setReduceMotion} label="Reduce motion (override)" />
        </div>
      </Card>

      <Card variant="surface">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Keyboard shortcuts</h2>
        <ul className="mt-3 space-y-1 font-mc-mono text-mono text-ink">
          <li>⌘K / Ctrl+K — Command palette (any surface ID)</li>
          <li>Esc — Close drawer / palette / modal</li>
          <li>↑↓ — Navigate palette results</li>
          <li>Enter — Open selected result</li>
        </ul>
      </Card>

      <Card variant="surface">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Data</h2>
        <p className="font-mc-serif text-body text-ink mt-2">
          Export all your local data as JSON, or reset everything to start fresh.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="subtle" onClick={exportAll}>
            Export all (JSON)
          </Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset everything
          </Button>
        </div>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className="font-mc-serif text-body-prose text-ink">
          Wipes all lessons completed, drill progress, simulator attempts, calibration, journal entries,
          SRS queue, and recordings. Cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="subtle" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={resetAll}>
            Yes, wipe everything
          </Button>
        </div>
      </Modal>
    </article>
  );
}
