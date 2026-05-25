import { useState } from "react";
import { Button } from "@/bootcamps/main-conclusion/components/primitives/Button";
import { Card } from "@/bootcamps/main-conclusion/components/primitives/Card";
import { XRayQuestion, IndicatorIdQuestion, FirstSentenceQuestion, FamilyQuestion, ChainMappingQuestion } from "@/bootcamps/main-conclusion/content/drills.source";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

export function XRayEmbeddedSlice({ questions }: { questions: XRayQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(Array(questions.length).fill(false));
  const [correct, setCorrect] = useState<boolean[]>(Array(questions.length).fill(false));

  const q = questions[currentIdx];

  const handleAnswer = (isCorrect: boolean) => {
    const newAnswered = [...answered];
    newAnswered[currentIdx] = true;
    setAnswered(newAnswered);
    
    const newCorrect = [...correct];
    newCorrect[currentIdx] = isCorrect;
    setCorrect(newCorrect);
  };

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="font-mc-serif text-lg leading-relaxed text-ink">{q.stimulus}</p>
        <div className="mt-6 space-y-2">
          {q.candidates.map((c) => (
            <Button
              key={c.letter}
              variant={answered[currentIdx] ? (c.is_correct ? "primary" : "subtle") : "subtle"}
              disabled={answered[currentIdx]}
              onClick={() => handleAnswer(c.is_correct)}
              className="w-full justify-start text-left h-auto py-2"
            >
              <span className="opacity-50 mr-2">{c.letter}.</span> {c.text}
            </Button>
          ))}
        </div>
        
        {answered[currentIdx] && (
          <div className="mt-4 p-4 bg-white border border-[rgba(26,26,26,0.05)] text-sm">
            {correct[currentIdx] ? "✓ Correct. " : "✗ Not quite. "} {q.rationale}
          </div>
        )}
      </Card>

      {answered[currentIdx] && currentIdx < questions.length - 1 && (
        <Button onClick={() => setCurrentIdx(prev => prev + 1)}>Next Rep</Button>
      )}
    </div>
  );
}

export function IndicatorEmbeddedSlice({ questions }: { questions: IndicatorIdQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(Array(questions.length).fill(false));
  const [correct, setCorrect] = useState<boolean[]>(Array(questions.length).fill(false));

  const q = questions[currentIdx];

  const handleAnswer = (cat: string) => {
    if (answered[currentIdx]) return;
    const isCorrect = cat === q.correct_category;
    
    const newAnswered = [...answered];
    newAnswered[currentIdx] = true;
    setAnswered(newAnswered);
    
    const newCorrect = [...correct];
    newCorrect[currentIdx] = isCorrect;
    setCorrect(newCorrect);
  };

  const parts = q.text.split(new RegExp(`(${q.highlighted_word})`, 'g'));

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="font-mc-serif text-h3 text-ink leading-relaxed">
          {parts.map((p, i) =>
            p === q.highlighted_word ? (
              <mark key={i} className="bg-[#F3D27A]/35 text-[#1a1a1a] border-b border-[#D6A82E] rounded-sm px-1 not-italic">
                {p}
              </mark>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-6">
          {q.category_options.map((cat) => (
            <Button
              key={cat}
              variant={answered[currentIdx] ? (cat === q.correct_category ? "primary" : "subtle") : "subtle"}
              disabled={answered[currentIdx]}
              onClick={() => handleAnswer(cat)}
            >
              {cat === 'opposing' ? 'Opposing View' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
        
        {answered[currentIdx] && (
          <div className="mt-4 p-4 bg-white border border-[rgba(26,26,26,0.05)] text-sm">
            {correct[currentIdx] ? "✓ Correct. " : "✗ Not quite. "} {q.rationale}
          </div>
        )}
      </Card>

      {answered[currentIdx] && currentIdx < questions.length - 1 && (
        <Button onClick={() => setCurrentIdx(prev => prev + 1)}>Next Rep</Button>
      )}
    </div>
  );
}

export function FirstSentenceEmbeddedSlice({ questions }: { questions: FirstSentenceQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(Array(questions.length).fill(false));
  const [correct, setCorrect] = useState<boolean[]>(Array(questions.length).fill(false));

  const q = questions[currentIdx];

  const handleAnswer = (isConclusion: boolean) => {
    if (answered[currentIdx]) return;
    const isCorrect = isConclusion === q.is_first_sentence_conclusion;
    
    const newAnswered = [...answered];
    newAnswered[currentIdx] = true;
    setAnswered(newAnswered);
    
    const newCorrect = [...correct];
    newCorrect[currentIdx] = isCorrect;
    setCorrect(newCorrect);
  };

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="text-sm italic text-ink-soft mb-4">Is the first sentence the conclusion?</p>
        <p className="font-mc-serif text-lg leading-relaxed text-ink">{q.stimulus}</p>
        
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button
            variant={answered[currentIdx] ? (q.is_first_sentence_conclusion ? "primary" : "subtle") : "subtle"}
            disabled={answered[currentIdx]}
            onClick={() => handleAnswer(true)}
          >
            Yes
          </Button>
          <Button
            variant={answered[currentIdx] ? (!q.is_first_sentence_conclusion ? "primary" : "subtle") : "subtle"}
            disabled={answered[currentIdx]}
            onClick={() => handleAnswer(false)}
          >
            No
          </Button>
        </div>
        
        {answered[currentIdx] && (
          <div className="mt-4 p-4 bg-white border border-[rgba(26,26,26,0.05)] text-sm">
            {correct[currentIdx] ? "✓ Correct. " : "✗ Not quite. "} {q.rationale}
          </div>
        )}
      </Card>

      {answered[currentIdx] && currentIdx < questions.length - 1 && (
        <Button onClick={() => setCurrentIdx(prev => prev + 1)}>Next Rep</Button>
      )}
    </div>
  );
}

export function RebuttalEmbeddedSlice({ questions }: { questions: FamilyQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(Array(questions.length).fill(false));
  const [correct, setCorrect] = useState<boolean[]>(Array(questions.length).fill(false));

  const q = questions[currentIdx];

  const handleAnswer = (family: 'First-sentence' | 'Rebuttal') => {
    if (answered[currentIdx]) return;
    const isCorrect = family === q.family;
    
    const newAnswered = [...answered];
    newAnswered[currentIdx] = true;
    setAnswered(newAnswered);
    
    const newCorrect = [...correct];
    newCorrect[currentIdx] = isCorrect;
    setCorrect(newCorrect);
  };

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="text-sm italic text-ink-soft mb-4">Which family does this stimulus belong to?</p>
        <p className="font-mc-serif text-lg leading-relaxed text-ink">{q.stimulus}</p>
        
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button
            variant={answered[currentIdx] ? (q.family === 'First-sentence' ? "primary" : "subtle") : "subtle"}
            disabled={answered[currentIdx]}
            onClick={() => handleAnswer('First-sentence')}
          >
            First-Sentence
          </Button>
          <Button
            variant={answered[currentIdx] ? (q.family === 'Rebuttal' ? "primary" : "subtle") : "subtle"}
            disabled={answered[currentIdx]}
            onClick={() => handleAnswer('Rebuttal')}
          >
            Rebuttal
          </Button>
        </div>
        
        {answered[currentIdx] && (
          <div className="mt-4 p-4 bg-white border border-[rgba(26,26,26,0.05)] text-sm">
            {correct[currentIdx] ? "✓ Correct. " : "✗ Not quite. "} {q.rationale}
          </div>
        )}
      </Card>

      {answered[currentIdx] && currentIdx < questions.length - 1 && (
        <Button onClick={() => setCurrentIdx(prev => prev + 1)}>Next Rep</Button>
      )}
    </div>
  );
}

export function ChainMappingEmbeddedSlice({ questions }: { questions: ChainMappingQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const q = questions[currentIdx];

  const handleNext = () => {
    setSubmitted(false);
    setCurrentIdx(prev => prev + 1);
  };

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="font-mc-serif text-lg leading-relaxed text-ink mb-6">{q.stimulus}</p>
        
        <div className="space-y-4">
          <p className="text-sm italic text-ink-soft">Identify the components:</p>
          <div className="p-4 bg-white border border-[rgba(26,26,26,0.05)] rounded text-sm font-medium">
            <span className="text-xs uppercase text-ink-faint">Main Conclusion:</span> {q.layers.main_conclusion}
          </div>
          {q.layers.intermediate_conclusion && (
            <div className="p-4 bg-white border border-[rgba(26,26,26,0.05)] rounded text-sm font-medium">
              <span className="text-xs uppercase text-ink-faint">Intermediate Conclusion:</span> {q.layers.intermediate_conclusion}
            </div>
          )}
          {q.layers.premises.map((p, i) => (
             <div key={i} className="p-4 bg-white border border-[rgba(26,26,26,0.05)] rounded text-sm font-medium">
               <span className="text-xs uppercase text-ink-faint">Premise:</span> {p}
             </div>
          ))}
        </div>

        {!submitted && (
          <Button className="mt-6 w-full" onClick={() => setSubmitted(true)}>
            View Mapping
          </Button>
        )}
        
        {submitted && (
          <div className="mt-6 p-4 bg-green-50 border border-green-100 text-green-900 text-sm">
            <p className="font-semibold">Chain Mapped.</p>
            <p>The chain flows: Premise(s) → Intermediate Conclusion → Main Conclusion.</p>
          </div>
        )}
      </Card>

      {submitted && currentIdx < questions.length - 1 && (
        <Button onClick={handleNext}>Next Rep</Button>
      )}
    </div>
  );
}
