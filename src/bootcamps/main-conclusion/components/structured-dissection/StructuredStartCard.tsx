import { ArrowRight, Info } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';

interface Props {
  onStart: () => void;
  totalQuestions: number;
  title?: string;
  description?: string;
  eyebrow?: string;
  buttonLabel?: string;
}

export function StructuredStartCard({
  onStart,
  totalQuestions,
  title = 'Simulator Bank',
  description,
  eyebrow = 'The Drill Flow',
  buttonLabel = 'Start Drill',
}: Props) {
  return (
    <Card variant="elev" className="mx-auto max-w-2xl border border-[color:var(--border-accent-soft)] p-8">
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-mc-serif text-h1 font-semibold text-ink">{title}</h1>
          <p className="font-mc-serif text-body-prose text-ink-soft">
            {description ?? `Structured dissection for ${totalQuestions} canonical arguments.`}
          </p>
        </header>

        <div className="rounded-4 bg-[rgb(var(--accent)/0.04)] p-6 space-y-4 border border-[rgb(var(--accent)/0.08)]">
          <div className="flex gap-3">
            <div className="mt-1 h-5 w-5 shrink-0 text-mc-accent">
              <Info className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="space-y-3">
              <h2 className="font-mc-serif text-h3 font-semibold text-ink">{eyebrow}</h2>
              <ul className="space-y-2 font-mc-serif text-body text-ink-soft">
                <li className="flex gap-2">
                  <span className="font-mc-mono text-mono text-mc-accent font-bold">1.</span>
                  <span>Click the author's main conclusion in the stimulus.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mc-mono text-mono text-mc-accent font-bold">2.</span>
                  <span>Classify the structure as First-Sentence or Rebuttal.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mc-mono text-mono text-mc-accent font-bold">3.</span>
                  <span>Select the supporting claim (if First-Sentence) or the opposing view (if Rebuttal).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={onStart}
            rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
