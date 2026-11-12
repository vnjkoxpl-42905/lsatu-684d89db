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
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Download, Trash2, Palette, Activity, Database } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';


function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className={cn('font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent inline-flex items-center gap-2')}>
      {icon}
      {label}
    </h2>
  );
}

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
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <PageHeader eyebrow="Settings" title="Preferences" />

      <div className="space-y-4">
        <Card variant="surface">
          <SectionHeading icon={<Palette className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />} label="Theme" />
          <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">
            Dark only in v1. Light mode lives in the v1.5 backlog.
          </p>
          <div className="mt-3">
            <Badge tone="accent" dot>dark</Badge>
          </div>
        </Card>

        <Card variant="surface">
          <SectionHeading icon={<Activity className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />} label="Motion" />
          <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">
            Animations follow OS prefers-reduced-motion by default. Override here.
          </p>
          <div className="mt-3">
            <Toggle
              id="reduce-motion"
              checked={reduceMotion}
              onChange={setReduceMotion}
              label="Reduce motion (override)"
            />
          </div>
        </Card>

        <Card variant="surface">
          <SectionHeading icon={<Database className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />} label="Data" />
          <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">
            Export all your local data as JSON, or reset everything to start fresh.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="subtle"
              onClick={exportAll}
              leftIcon={<Download className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              Export all (JSON)
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmReset(true)}
              leftIcon={<Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              Reset everything
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
          Wipes all lessons completed, drill progress, simulator attempts, saved diagnostic evidence, journal entries,
          SRS queue, and recordings. Cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="subtle" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={resetAll}
            leftIcon={<Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />}
          >
            Yes, wipe everything
          </Button>
        </div>
      </Modal>
    </article>
  );
}
