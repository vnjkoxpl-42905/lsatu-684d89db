import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BOOTCAMP_REFERENCE_LAB_ENTRIES } from '@/data/bootcampReferenceLab';

export default function BootcampReferenceLab() {
  return (
    <div className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Admin / Dev</p>
          <h1 className="text-4xl font-serif italic">Bootcamp Reference Lab</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Inspect every imported drill format and how it maps into the new Intro to LR replica-template system.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Target LSAT U Use</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Canonical Links</th>
                <th className="px-4 py-3">Preview</th>
              </tr>
            </thead>
            <tbody>
              {BOOTCAMP_REFERENCE_LAB_ENTRIES.map((entry) => (
                <tr key={`${entry.referenceId}-${entry.formatFamily}`} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium">{entry.sourceBootcamp}</td>
                  <td className="px-4 py-3">{entry.formatFamily}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div>{entry.lsatUTarget}</div>
                      <div className="text-xs text-muted-foreground">{entry.notes}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{entry.audience.replace('-', ' ')}</td>
                  <td className="px-4 py-3">{entry.itemCount}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {entry.duplicateOfCanonicalId.length > 0 ? entry.duplicateOfCanonicalId.join(', ') : 'No duplicate canonical links'}
                  </td>
                  <td className="px-4 py-3">
                    {entry.previewPath ? (
                      <a href={entry.previewPath} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="gap-2">
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No preview path</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
