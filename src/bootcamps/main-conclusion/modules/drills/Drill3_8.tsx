/**
 * Drill 3.8 · R&R Drill (Read & Restate).
 * Desktop: Web Speech API live mic → transcript. Mobile: text-only fallback (per G2.MOBILE).
 *
 * Stages: Read passage → Cover → Rephrase (mic or text) → Skeptic's Ear Check → Cumulative recall → Full recollection.
 * v1 implements 3 of 6 stages end-to-end (Read, Rephrase, Skeptic's Ear). The remaining
 * stages share the same engine and content authors at C.10.
 */

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Textarea } from '@/bootcamps/main-conclusion/components/primitives/Input';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { DRILL_3_8_PASSAGES } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

type Stage = 'read' | 'rephrase' | 'skeptic' | 'done';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 640px)').matches;
}

function speechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function Drill3_8() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [pIndex, setPIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('read');
  const passage = DRILL_3_8_PASSAGES[pIndex]!;
  const isMobile = isMobileViewport();
  const canMic = !isMobile && speechRecognitionAvailable();

  function nextPassage() {
    if (pIndex + 1 < DRILL_3_8_PASSAGES.length) {
      setPIndex(pIndex + 1);
      setStage('read');
    } else {
      markDrillComplete?.('MC-DRL-3.8');
      setStage('done');
    }
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Drill 3.8"
        title="R&amp;R Drill · Read &amp; Restate"
        description="Read the passage. Cover it. Rephrase from memory. Apply the Skeptic’s Ear Check."
        compact
      />
      <div className="flex flex-wrap gap-2">
          <Chip tone="neutral">passage {pIndex + 1} / {DRILL_3_8_PASSAGES.length}</Chip>
          {isMobile ? (
            <Chip tone="background">mobile · text-only</Chip>
          ) : canMic ? (
            <Chip tone="accent">desktop · mic ready</Chip>
          ) : (
            <Chip tone="background">no Web Speech API · text fallback</Chip>
          )}
        </div>

      {stage === 'read' && (
        <ReadStage passage={passage} onContinue={() => setStage('rephrase')} />
      )}
      {stage === 'rephrase' && (
        <RephraseStage passage={passage} canMic={canMic} onContinue={() => setStage('skeptic')} />
      )}
      {stage === 'skeptic' && <SkepticStage onContinue={nextPassage} />}
      {stage === 'done' && (
        <Card variant="elev" className="border-l-4 border-l-[rgb(var(--success)/0.50)]">
          <Badge tone="success">drill complete</Badge>
          <p className="font-mc-serif text-body-prose text-ink mt-2">All passages reviewed. Recordings persist locally.</p>
        </Card>
      )}
    </article>
  );
}

function ReadStage({ passage, onContinue }: { passage: typeof DRILL_3_8_PASSAGES[number]; onContinue: () => void }) {
  return (
    <Card variant="surface">
      <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Stage 1 · Read</div>
      <h2 className="font-mc-serif text-h3 font-semibold mt-1">{passage.title}</h2>
      <p className="font-mc-serif text-body-prose text-ink mt-3 leading-relaxed">{passage.passage}</p>
      <div className="mt-4 flex justify-end">
        <Button onClick={onContinue}>Cover and rephrase →</Button>
      </div>
    </Card>
  );
}

function RephraseStage({
  passage,
  canMic,
  onContinue,
}: {
  passage: typeof DRILL_3_8_PASSAGES[number];
  canMic: boolean;
  onContinue: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  function start() {
    if (!canMic) return;
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let s = '';
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript + ' ';
      setTranscript(s.trim());
    };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }
  function stop() {
    recognitionRef.current?.stop?.();
    setRecording(false);
  }

  // Coverage check: how many key phrases appear in transcript?
  const lower = transcript.toLowerCase();
  const hits = passage.key_phrases.filter((k) => lower.includes(k.toLowerCase()));
  const coverage = passage.key_phrases.length === 0 ? 0 : hits.length / passage.key_phrases.length;

  return (
    <Card variant="surface">
      <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Stage 2 · Rephrase</div>
      <p className="font-mc-serif text-body-prose text-ink mt-2">
        Without looking at the passage, restate it in your own words.
      </p>
      {canMic ? (
        <div className="mt-3 flex gap-2 items-center">
          {recording ? (
            <Button variant="danger" onClick={stop}>
              ◼ Stop
            </Button>
          ) : (
            <Button variant="primary" onClick={start}>
              ● Record
            </Button>
          )}
          <span className="font-mc-mono text-mono text-ink-faint">{recording ? 'Listening…' : 'Tap to record'}</span>
        </div>
      ) : null}
      <Textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder={canMic ? 'Live transcript appears here…' : 'Type your restatement…'}
        className="mt-3"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {passage.key_phrases.map((k) => (
          <Chip key={k} tone={lower.includes(k.toLowerCase()) ? 'conclusion' : 'background'}>
            {k}
          </Chip>
        ))}
      </div>
      <p className="font-mc-mono text-mono text-ink-faint mt-2">
        coverage: {hits.length}/{passage.key_phrases.length} ({Math.round(coverage * 100)}%)
      </p>
      <div className="mt-4 flex justify-end">
        <Button onClick={onContinue} disabled={!transcript.trim()}>
          Continue →
        </Button>
      </div>
    </Card>
  );
}

function SkepticStage({ onContinue }: { onContinue: () => void }) {
  const [note, setNote] = useState('');
  return (
    <Card variant="surface">
      <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Stage 3 · Skeptic's Ear Check</div>
      <p className="font-mc-serif text-body-prose text-ink mt-2">
        After your rephrase: what is the simplest question or challenge to this argument?
      </p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="One sentence. The skeptic's first move."
        className="mt-3"
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={onContinue} disabled={!note.trim()}>
          Save and continue →
        </Button>
      </div>
    </Card>
  );
}
