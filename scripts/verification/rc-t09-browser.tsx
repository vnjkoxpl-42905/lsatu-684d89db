import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RcReviewLayer } from '../../src/features/rc/components/RcReviewLayer';
import { RcChoiceDisclosure } from '../../src/features/rc/components/RcChoiceDisclosure';
import { RcPassageSummary } from '../../src/features/rc/components/RcPassageSummary';
import { RcExplanationMedia } from '../../src/features/rc/components/RcExplanationMedia';
import type { RcPassage } from '../../src/features/rc/lib/rcTypes';
import '../../src/features/rc/rc.css';
import '../../src/features/rc/player.css';

const bank = await fetch('/data/rc/RC-PT125.json').then(response => response.json()) as { passages: RcPassage[] };
const passage = bank.passages.find(item => item.questions.some(question => question.questionId === 6216))!;
const question = passage.questions.find(item => item.questionId === 6216)!;
function Fixture() {
  const [open, setOpen] = React.useState<string | null>(null);
  return <MemoryRouter initialEntries={['/rc/drill?sessionId=local-content-fixture&review=1']}>
    <main style={{ maxWidth: 1000, margin: 'auto', padding: 24 }}>
      <h1>RC content acceptance fixture</h1>
      <p>Local bank rendering only. No account writes. PT125 question 6216.</p>
      <RcReviewLayer question={question} firstPick="A" sourceLabel="PT125 · Q6216" />
      {question.choices.map(choice => <section key={choice.letter}>
        <h2>{choice.letter}. {choice.text}</h2>
        <RcChoiceDisclosure choice={choice} isPicked={choice.letter === 'A'} open={open === choice.letter} onToggle={() => setOpen(open === choice.letter ? null : choice.letter)} />
      </section>)}
      <RcPassageSummary summaries={passage.summaries} />
      <h2>Media metadata acceptance</h2>
      <p>Unavailable fixture, no media files or invented explanation content.</p>
      <RcExplanationMedia media={[{ kind: 'video', src: '/no-fixture-file.mp4', title: 'Unavailable fixture', transcript: '' }]} />
      <h2>Transcript retained without captions</h2>
      <RcExplanationMedia media={[{ kind: 'video', src: '/no-fixture-file.mp4', title: 'No captions fixture', transcript: 'Fixture transcript remains readable when caption metadata is missing.' }]} />
      <h2>Synthetic native media controls</h2>
      <RcExplanationMedia media={[{ kind: 'video', src: '/scripts/verification/fixtures/rc-media-test.webm', title: 'Synthetic accessibility fixture, not an LSAT explanation', transcript: 'Synthetic accessibility fixture. A two-second test video used only to verify native controls.', captions: { src: '/scripts/verification/fixtures/rc-media-test.vtt', language: 'en', label: 'English fixture captions' } }]} />
      <h2>Caption-load failure</h2>
      <RcExplanationMedia media={[{ kind: 'video', src: '/scripts/verification/fixtures/rc-media-test.webm', title: 'Synthetic caption failure', transcript: 'Readable alternative after a caption-load failure.', captions: { src: '/scripts/verification/fixtures/missing-caption.vtt', language: 'en', label: 'Missing fixture captions' } }]} />
    </main>
  </MemoryRouter>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
