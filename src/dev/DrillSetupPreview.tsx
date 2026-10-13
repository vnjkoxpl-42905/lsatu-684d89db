import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { QuestionBankProvider, useQuestionBank } from '@/contexts/QuestionBankContext';
import { QuestionPicker } from '@/components/drill/QuestionPicker';
import { Button } from '@/components/ui/button';
import '@/components/classroom/classroom.css';

const groups = [
  ['CLASSROOM', 'Home', 'Drill', 'Testing Centre', 'Assigned work'],
  ['STUDY', 'Notes and recaps', 'Bootcamps', 'Activities'],
  ['REVIEW', 'Review', 'Analytics', 'Admissions', 'History'],
  ['SUPPORT', 'Messages', 'Schedule'],
  ['TEACHING', 'Teacher Workspace', 'Students', 'Whiteboard'],
];

function PreviewHome({ onOpenSetup }: { onOpenSetup: () => void }) {
  const [smartNotice, setSmartNotice] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e9e3dd] bg-[#fbf8f5] p-3 text-[#35312e]">
        <div className="grid min-w-[420px] flex-1 grid-cols-3 gap-2">
          {['PrepTest', 'Section', 'Question number'].map((label) => (
            <div key={label} className="space-y-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#867a71]">{label}</span>
              <div className="flex h-10 items-center justify-between rounded-md border border-[#e9e3dd] bg-white px-3 text-xs">{label}<span>⌄</span></div>
            </div>
          ))}
        </div>
        <div className="flex h-10 w-44 items-center gap-2 rounded-full bg-[#17171b] px-4 text-xs text-[#f4f1ea]"><Search className="h-3.5 w-3.5" /> Find a question</div>
        <div className="flex h-10 items-center rounded-full border border-[#e9e3dd] px-1 text-xs"><span className="rounded-full bg-[#35312e] px-3 py-2 text-white">LR</span><span className="px-3 py-2">RC</span></div>
      </div>

      <section className="drill-observatory-hero rounded-2xl text-[#f4f1ea]">
        <div className="drill-observatory-hero-grid">
          <div className="drill-observatory-smart flex flex-col justify-center">
            <h1>Smart Drill</h1>
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-[#f4f1ea]/70">Let Smart Drill choose what would be most useful to practice next.</p>
            <Button type="button" onClick={() => setSmartNotice(true)} className="drill-observatory-cta drill-observatory-smart-drill-pulse mt-5 w-fit">Smart Drill</Button>
            {smartNotice && <p role="status" className="mt-3 text-xs text-[#f4f1ea]/70">Smart Drill is outside this setup mock.</p>}
          </div>
          <div className="drill-observatory-console w-full">
            <h2 className="text-3xl font-semibold leading-tight">Build the drill you need.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#f4f1ea]/70">Pick PrepTests, question types, and difficulty. See the exact set before you start.</p>
            <Button type="button" onClick={onOpenSetup} className="drill-observatory-console-start mt-5 w-full">Set up an LR drill <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl bg-[#08080b] p-5 text-[#f4f1ea]">
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4f1ea]/55">Your practice</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs"><span className="block text-[9px] uppercase tracking-widest text-[#f4f1ea]/50">Resume your drill</span><span className="mt-1 block font-semibold">Custom Drill — PT 136 Q8</span></div>
          <div className="mt-4 border-b border-white/10 pb-4"><span className="text-[9px] uppercase tracking-widest text-[#f4f1ea]/50">Top priority</span><p className="mt-1 font-serif text-lg">Principle-Conform</p><p className="text-xs text-[#f4f1ea]/60">17% first-attempt · 6 attempts</p></div>
          <div className="border-b border-white/10 py-4"><span className="text-[9px] uppercase tracking-widest text-[#f4f1ea]/50">Accuracy trend</span><p className="mt-1 font-serif text-lg">34%</p><p className="text-xs text-[#f4f1ea]/60">First-attempt accuracy across all your questions</p></div>
          <div className="pt-4"><span className="text-[9px] uppercase tracking-widest text-[#f4f1ea]/50">Wrong answer signal</span><p className="mt-1 font-serif text-lg">100% recent misses</p><p className="text-xs text-[#f4f1ea]/60">Concentrated in Principle-Conform</p></div>
        </section>
        <section className="self-start rounded-2xl bg-[#08080b] p-5 text-[#f4f1ea]">
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4f1ea]/55">Assigned work</h2>
          {['Conditional Indicators Refresher', 'Read, Recall, Colour · PT21 Section 3', 'Read, Recall, Colour · PT112 Section 4'].map((title) => (
            <div key={title} className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold">{title}</div>
          ))}
        </section>
      </div>
    </div>
  );
}

function PreviewContent() {
  const { manifest, isLoading, error } = useQuestionBank();
  const [searchParams, setSearchParams] = useSearchParams();
  const showSetup = searchParams.get('view') !== 'home';
  const openSetup = () => setSearchParams({}, { replace: false });
  const closeSetup = () => setSearchParams({ view: 'home' }, { replace: false });
  return (
    <div className="drill-setup-preview flex min-h-screen bg-[#fbf8f5] font-['Outfit']">
      <aside className="hidden w-[268px] shrink-0 border-r border-[#e8d9ca] bg-[#fcfaf8] p-2 md:block">
        <div className="flex min-h-[calc(100vh-16px)] flex-col rounded-lg border border-[#ead9c9] px-5 py-5 text-[#37322e]">
          <div className="mb-7 flex items-center gap-2 text-xs tracking-[0.15em]"><span className="rounded bg-[#35312e] px-1.5 py-1 font-semibold text-white">LS</span> LSAT U</div>
          {groups.map(([heading, ...items]) => (
            <div key={heading} className="mb-5 space-y-1">
              <p className="mb-2 text-[10px] tracking-[0.14em] text-[#a56e3e]">{heading}</p>
              {items.map((item) => <div key={item} className={item === 'Drill' ? 'rounded-md bg-[#45413e] px-2 py-2 text-sm font-semibold text-white' : 'px-2 py-1.5 text-sm'}>{item}</div>)}
            </div>
          ))}
          <div className="mt-auto border-t border-[#ead9c9] pt-4 text-xs">Joshua Fisseha<br /><span className="text-[#867a71]">Teacher</span></div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
        <div className="drill-observatory-root mx-auto max-w-[1140px]">
          {showSetup ? <div className="drill-observatory-launcher overflow-hidden">
            <div className="drill-observatory-launcher-panel">
              {isLoading && <p className="p-8">Loading questions…</p>}
              {error && <p className="p-8" role="alert">{error}</p>}
              {manifest && <QuestionPicker manifest={manifest} onStartDrill={() => {}} onCancel={closeSetup} />}
            </div>
          </div> : <PreviewHome onOpenSetup={openSetup} />}
        </div>
      </main>
    </div>
  );
}

export default function DrillSetupPreview() {
  return <QuestionBankProvider><PreviewContent /></QuestionBankProvider>;
}
