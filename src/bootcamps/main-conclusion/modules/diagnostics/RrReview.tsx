/**
 * MC-DIA-6.4 · R&R Review.
 * Lists rr_recordings_meta entries with transcript + flags + review prompt.
 * Audio playback wires when blob storage lands at Phase H (mobile fallback already shipped).
 */

import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

export function RrReview() {
  const d = useDiagnostics();
  if (d.loading) {
    return (
      <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
        <LoadingSkeleton lines={5} />
      </div>
    );
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-4">
      <PageHeader
        eyebrow="Diagnostics"
        title="R&amp;R Review"
        description="Your recorded restatements from Drill 3.8. Review transcripts. Flag patterns."
        compact
      />

      {d.rrRecordings.length === 0 ? (
        <EmptyState
          title="No recordings yet"
          body="Run Drill 3.8 to capture your first restatement. Desktop captures audio; mobile captures text."
          surfaceId="MC-DIA-6.4"
        />
      ) : (
        <ul className="space-y-3">
          {d.rrRecordings.map((r) => (
            <li key={r.id}>
              <Card variant="surface">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mc-mono text-mono text-ink-faint">
                      {r.drill_id} · {r.stage}
                    </div>
                    <p className="font-mc-mono text-mono text-ink-faint">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(r.flags ?? []).map((f) => (
                      <Chip key={f} tone="concession">
                        {f}
                      </Chip>
                    ))}
                  </div>
                </div>
                <p className="font-mc-serif text-body text-ink mt-3">{r.transcript || <em className="text-ink-faint">No transcript</em>}</p>
                <p className="font-mc-mono text-mono text-ink-faint mt-2">blob: {r.blob_key}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
