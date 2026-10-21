import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import '../../src/features/rc/rc.css';
import '../../src/features/rc/player.css';
import { RcPassagePane } from '../../src/features/rc/components/RcPassagePane';
import { RcQuestionPane } from '../../src/features/rc/components/RcQuestionPane';
import { rcTypeStyles } from '../../src/features/rc/components/RcExamPane';
import { useRcPresentationTraining } from '../../src/features/rc/hooks/useRcPresentationTraining';
import type { RcDrillConfig, RcLetter, RcPassage } from '../../src/features/rc/lib/rcTypes';

const noop = () => {};
const passages: RcPassage[] = [1, 2].map(id => ({
  passageId: id, preptest: 140, section: 3, setNumber: id, title: `Synthetic passage ${id}`,
  topic: 'Science', format: 'Standard', frameworks: [], difficulty: 1,
  text: id === 1 ? 'A small garden can support many insects. **Different plants** provide food at different times. A single species cannot fill every role.\n\nResearchers compared two gardens. The more varied garden supported a wider range of insects.' : 'A library offers books and a place to study. Its quiet rooms serve a different purpose from its meeting spaces.\n\nBoth uses matter. A useful design gives each enough room.',
  summaries: { standard: null, brief: null, anotherWay: null },
  questions: [1, 2].map(q => ({ questionId: id * 10 + q, position: q, questionType: 'Main point', questionTypeFamily: 'Main point', difficulty: 1,
    prompt: q === 1 ? 'Which choice best describes the passage’s central claim?' : 'Which detail supports that claim?', correctAnswer: 'A', hasWrittenExplanation: false, explanationBlocks: [], totalResponses: null, features: [],
    choices: (['A', 'B', 'C', 'D', 'E'] as RcLetter[]).map(letter => ({ letter, text: `Synthetic answer choice ${letter}.`, tag: null, percent: null, responseCount: null, correct: letter === 'A', explanation: null })),
  })),
}));
function App() {
  const [passageIndex, setPassageIndex] = React.useState(0); const [questionIndex, setQuestionIndex] = React.useState(0);
  const [kind, setKind] = React.useState('practice'); const [selected, setSelected] = React.useState<RcLetter | null>(null);
  const passage = passages[passageIndex]; const question = passage.questions[questionIndex];
  const config: RcDrillConfig = { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, training: { anticipation: true, lineByLine: true }, ...(kind === 'protected' ? { practiceTestRunId: 'synthetic-protected-parent' } : {}) };
  const presentation = useRcPresentationTraining({ config, reviewOnly: kind === 'review', enabled: true, scope: `fixture:${kind}`, passageId: passage.passageId, questionId: question.questionId, canPredict: !selected });
  const type = rcTypeStyles(1, 0);
  return <main style={{ background: '#f7f4ee', color: '#252b26', minHeight: '100vh', padding: '20px' }}>
    <header style={{ maxWidth: 1200, margin: '0 auto 20px' }}><h1 style={{ fontSize: 24 }}>RC training presentation</h1><p>Actual presentation hook and passage/question components, with synthetic content. No real session, exposure, answer, learning note or profile is saved.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3"><label>Context <select aria-label="Presentation context" value={kind} onChange={event => { setKind(event.target.value); setSelected(null); }}><option value="practice">Ordinary practice</option><option value="protected">Protected exam flags ignored</option><option value="review">Review flags ignored</option></select></label>
        <button className="min-h-11 rounded border px-3" onClick={() => { setQuestionIndex(value => value === 0 ? 1 : 0); setSelected(null); }}>Next question</button><button className="min-h-11 rounded border px-3" onClick={() => { setPassageIndex(value => value === 0 ? 1 : 0); setQuestionIndex(0); setSelected(null); }}>Next passage</button>
        <span>Feedback stays hidden. Selection: {selected ?? 'none'}.</span></div>
    </header>
    <section className="rc-player rc-scheme-white" style={{ maxWidth: 1200, margin: 'auto', border: '1px solid #747773', borderRadius: 12, background: 'white', color: '#252b26', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', overflow: 'hidden', '--rc-fg': '#252b26', '--rc-bg': '#ffffff' } as React.CSSProperties}>
      <RcPassagePane passage={passage} highlights={[]} color="yellow" onColorChange={noop} onAddHighlight={noop} onRemoveHighlight={noop} onRemoveRange={noop} highlightMode="none" annotationsDisabled findQuery="" findIndex={0} onFindCount={noop} scrollTop={0} onScroll={noop} textStyle={type.passage}
        sentenceLimit={presentation.lineByLine ? presentation.sentenceLimit : undefined} onSentenceCount={presentation.setSentenceCount}
        readingControls={presentation.lineByLine && <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Line-by-line reading"><span role="status">Sentence {Math.min(presentation.sentenceLimit, presentation.sentenceCount || 1)} of {presentation.sentenceCount || '…'}</span><button className="min-h-11 rounded border px-3" disabled={presentation.sentenceLimit >= presentation.sentenceCount} onClick={presentation.nextSentence}>Next sentence</button>{presentation.sentenceLimit < presentation.sentenceCount && <button className="min-h-11 px-2 underline" onClick={presentation.showPassage}>Show full passage</button>}</div>} />
      <RcQuestionPane actorId="synthetic-owner" item={{ question, passage, number: questionIndex + 1, passageIndex }} selected={selected} eliminations={[]} revealed={false} reattemptMode={false} reattemptPick={null} flagged={false} onToggleFlag={noop} onSelect={setSelected} onToggleElimination={noop} onSkipToAnswer={noop} type={type} highlights={[]} color="yellow" onColorChange={noop} highlightMode="none" onAddHighlight={noop} onRemoveHighlight={noop} onRemoveRange={noop} annotationsDisabled interactionDisabled={presentation.choicesHidden}
        choicesHidden={presentation.choicesHidden} choicesHiddenMessage="Anticipate the answer, then reveal the choices when you are ready."
        trainingControls={presentation.choicesHidden && <button className="my-3 min-h-11 rounded border px-4 text-sm" onClick={presentation.showChoices}>Show answer choices</button>} />
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><App /></MemoryRouter>);
