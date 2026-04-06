import React from 'react';
import { MOCK_JOURNAL_ENTRIES } from '@/data/causationStation/constants';

const CSJournal: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-2">Mistake Journal</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Every great mind keeps a record of their toughest challenges. This is your personalized log of questions you've struggled with. Review them, understand the traps, and never make the same mistake twice.
      </p>

      {MOCK_JOURNAL_ENTRIES.length === 0 ? (
        <div className="rounded-xl bg-card border border-border shadow-sm p-6 text-center">
          <p className="text-sm text-muted-foreground">Your journal is empty for now. Incorrect answers from your drills will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {MOCK_JOURNAL_ENTRIES.map((entry, index) => (
            <div key={`${entry.question.id}-${index}`} className="rounded-xl bg-card border border-border shadow-sm p-6 flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Question ({entry.question.id})
                </h3>
                <div className="rounded-lg bg-muted/50 border border-border p-4 mb-3">
                  <p className="text-sm text-foreground italic leading-relaxed">{entry.question.stem}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:w-1/2">
                <h3 className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-2">Your Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.notes}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CSJournal;
