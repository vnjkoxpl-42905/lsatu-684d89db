/**
 * Journal — full-page notepad. Reads/writes journal_entries.
 * Markdown-allowed in body; rendered as plain text in v1 (markdown render at v1.5).
 */

import { useEffect, useState } from 'react';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, type JournalEntry } from '@/bootcamps/main-conclusion/persistence/records';
import { newId, now } from '@/bootcamps/main-conclusion/lib/ids';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Textarea } from '@/bootcamps/main-conclusion/components/primitives/Input';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';

export function Journal() {
  const user = useUser();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const persist = getPersistence(user.id);
      const all = await persist.list<JournalEntry>(TABLES.journal_entries);
      if (!cancelled) {
        setEntries(all.sort((a, b) => (b.created_at < a.created_at ? -1 : 1)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function save() {
    if (!user || !draft.trim()) return;
    const persist = getPersistence(user.id);
    const id = newId();
    const t = now();
    const entry: JournalEntry = {
      id,
      user_id: user.id,
      body_md: draft.trim(),
      created_at: t,
      updated_at: t,
    };
    await persist.set(TABLES.journal_entries, id, entry);
    setEntries((cur) => [entry, ...(cur ?? [])]);
    setDraft('');
  }

  return (
    <article className="px-6 py-10 max-w-3xl mx-auto space-y-5">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Journal</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Notes</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-2">
          Open from any surface via the right drawer. Persists locally.
        </p>
      </header>

      <Card variant="surface">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What did you notice? What confused you? What did you change your mind on?"
          className="min-h-[10rem]"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={save} disabled={!draft.trim()}>
            Save entry
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">History</h2>
        {entries === null ? (
          <LoadingSkeleton lines={3} className="mt-3" />
        ) : entries.length === 0 ? (
          <p className="font-mc-serif text-body-prose text-ink-soft mt-3">No entries yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {entries.map((e) => (
              <li key={e.id}>
                <Card variant="surface">
                  <p className="font-mc-mono text-mono text-ink-faint">{new Date(e.created_at).toLocaleString()}</p>
                  <p className="font-mc-serif text-body-prose text-ink mt-2 whitespace-pre-wrap">{e.body_md}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
