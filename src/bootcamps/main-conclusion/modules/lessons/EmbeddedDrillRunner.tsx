import { useState } from "react";
import { Button } from "@/bootcamps/main-conclusion/components/primitives/Button";
import { Card } from "@/bootcamps/main-conclusion/components/primitives/Card";
import { 
  XRayQuestion, 
  IndicatorIdQuestion, 
  FirstSentenceQuestion, 
  FamilyQuestion, 
  ChainMappingQuestion, 
  NestedClaimsQuestion,
  RrPassage,
  PronounReplacementQuestion 
} from "@/bootcamps/main-conclusion/content/drills.source";
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
  const [userRoles, setUserRoles] = useState<Record<string, 'Premise' | 'Intermediate Conclusion' | 'Main Conclusion'>>({});
  
  const q = questions[currentIdx];
  const allSentences = [
    { text: q.layers.main_conclusion, role: 'Main Conclusion' as const },
    ...(q.layers.intermediate_conclusion ? [{ text: q.layers.intermediate_conclusion, role: 'Intermediate Conclusion' as const }] : []),
    ...q.layers.premises.map(p => ({ text: p, role: 'Premise' as const }))
  ];

  const handleRoleChange = (text: string, role: 'Premise' | 'Intermediate Conclusion' | 'Main Conclusion') => {
    setUserRoles(prev => ({ ...prev, [text]: role }));
  };

  const isComplete = Object.keys(userRoles).length === allSentences.length;

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="font-mc-serif text-lg leading-relaxed text-ink mb-6">{q.stimulus}</p>
        
        <div className="space-y-4">
          <p className="text-sm italic text-ink-soft mb-4">Tag each sentence’s role:</p>
          {allSentences.map((s, i) => (
            <div key={i} className="p-4 bg-white border border-[rgba(26,26,26,0.05)] rounded shadow-sm">
              <p className="text-sm font-medium mb-3">{s.text}</p>
              <div className="grid grid-cols-3 gap-2">
                {['Premise', 'Intermediate Conclusion', 'Main Conclusion'].map(role => (
                  <Button
                    key={role}
                    variant={userRoles[s.text] === role ? "primary" : "subtle"}
                    size="sm"
                    disabled={submitted}
                    onClick={() => handleRoleChange(s.text, role as any)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
              {submitted && (
                <div className={cn("mt-2 text-xs font-semibold", userRoles[s.text] === s.role ? "text-green-700" : "text-red-700")}>
                  {userRoles[s.text] === s.role ? 'Correct' : `Actually a ${s.role}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {!submitted && (
          <Button className="mt-6 w-full" disabled={!isComplete} onClick={() => setSubmitted(true)}>
            Submit Mapping
          </Button>
        )}
        
        {submitted && (
          <div className="mt-6 p-4 bg-ink/5 border border-ink/10 text-ink text-sm">
            <p className="font-semibold mb-1">Logic Chain:</p>
            <p>Premise(s) → Intermediate Conclusion → Main Conclusion.</p>
          </div>
        )}
      </Card>

      {submitted && currentIdx < questions.length - 1 && (
        <Button onClick={() => { setSubmitted(false); setUserRoles({}); setCurrentIdx(prev => prev + 1); }}>Next Rep</Button>
      )}
    </div>
  );
}

export function NestedClaimsEmbeddedSlice({ questions }: { questions: NestedClaimsQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const q = questions[currentIdx];

  const handleSelect = (letter: string) => {
    if (submitted) return;
    setSelectedLetter(letter);
  };

  const isCorrect = selectedLetter === q.candidates.find(c => c.is_main)?.letter;

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="font-mc-serif text-lg leading-relaxed text-ink mb-6">{q.stimulus}</p>
        
        <p className="text-sm italic text-ink-soft mb-4">Select the Main Conclusion:</p>
        <div className="space-y-2">
          {q.candidates.map((c) => (
            <Button
              key={c.letter}
              variant={selectedLetter === c.letter ? "primary" : "subtle"}
              disabled={submitted}
              onClick={() => handleSelect(c.letter)}
              className="w-full justify-start h-auto py-2"
            >
              <span className="opacity-50 mr-2">{c.letter}.</span> {c.text}
            </Button>
          ))}
        </div>

        {!submitted && (
          <Button className="mt-6 w-full" disabled={!selectedLetter} onClick={() => setSubmitted(true)}>
            Submit Answer
          </Button>
        )}

        {submitted && (
          <div className={cn("mt-6 p-4 border text-sm", isCorrect ? "bg-green-50 border-green-100 text-green-900" : "bg-red-50 border-red-100 text-red-900")}>
            <p className="font-semibold">{isCorrect ? "Correct!" : "Not quite."}</p>
            <p className="mt-1">{q.rationale}</p>
          </div>
        )}
      </Card>

      {submitted && currentIdx < questions.length - 1 && (
        <Button onClick={() => { setSubmitted(false); setSelectedLetter(null); setCurrentIdx(prev => prev + 1); }}>Next Rep</Button>
      )}
    </div>
  );
}

export function ReadRestateEmbeddedSlice({ passages }: { passages: RrPassage[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [restate, setRestate] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const p = passages[currentIdx];

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {passages.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="font-mc-serif text-lg leading-relaxed text-ink mb-6">{p.passage}</p>
        
        <label className="text-sm italic text-ink-soft mb-2 block">Restate the conclusion in plain English:</label>
        <textarea
          value={restate}
          onChange={(e) => setRestate(e.target.value)}
          disabled={submitted}
          className="w-full h-24 p-3 border border-[rgba(26,26,26,0.1)] rounded focus:outline-none focus:border-[rgb(var(--accent))]"
          placeholder="I think the author is saying..."
        />

        {!submitted && (
          <Button className="mt-4 w-full" disabled={!restate.trim()} onClick={() => setSubmitted(true)}>
            Submit Restatement
          </Button>
        )}
        
        {submitted && (
          <div className="mt-4 p-4 bg-white border border-[rgba(26,26,26,0.05)] text-sm space-y-2">
            <p className="font-semibold text-ink">Key concepts to capture:</p>
            <div className="flex flex-wrap gap-2">
              {p.key_phrases.map((phrase, i) => (
                <span key={i} className="px-2 py-1 bg-[#F3D27A]/20 text-[#1a1a1a] rounded text-xs">{phrase}</span>
              ))}
            </div>
            <p className="mt-2 text-ink-soft">
              Comparing your restatement to these key concepts protects you from answer choices that shift the scope, direction, or force of the author's claim.
            </p>
          </div>
        )}
      </Card>

      {submitted && currentIdx < passages.length - 1 && (
        <Button onClick={() => { setSubmitted(false); setRestate(""); setCurrentIdx(prev => prev + 1); }}>Next Passage</Button>
      )}
    </div>
  );
}

export function PronounEmbeddedSlice({ questions }: { questions: PronounReplacementQuestion[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [replacement, setReplacement] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const q = questions[currentIdx];

  const handleNext = () => {
    setSubmitted(false);
    setReplacement("");
    setCurrentIdx(prev => prev + 1);
  };

  return (
    <div className="bg-[#F9F7F4] p-6 border border-[rgba(26,26,26,0.05)] rounded-[4px]">
      <div className="mb-4 text-[10px] font-mc-mono uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
        Rep {currentIdx + 1} of {questions.length}
      </div>
      
      <Card variant="surface" className="p-6 mb-6">
        <p className="text-sm italic text-ink-soft mb-2">Original Conclusion:</p>
        <p className="font-mc-serif text-lg leading-relaxed text-ink mb-6 bg-white p-4 border border-[rgba(26,26,26,0.05)]">
          {q.candidate_conclusion.replace(q.pronoun, <mark className="bg-[#F3D27A]/35 text-[#1a1a1a] px-1">{q.pronoun}</mark> as any)}
        </p>
        
        <label className="text-sm italic text-ink-soft mb-2 block">Replace the highlighted term to make the meaning explicit:</label>
        <input
          type="text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          disabled={submitted}
          className="w-full p-3 border border-[rgba(26,26,26,0.1)] rounded focus:outline-none focus:border-[rgb(var(--accent))]"
          placeholder="I would replace it with..."
        />

        {!submitted && (
          <Button className="mt-4 w-full" disabled={!replacement.trim()} onClick={() => setSubmitted(true)}>
            Submit Replacement
          </Button>
        )}
        
        {submitted && (
          <div className="mt-4 p-4 bg-white border border-[rgba(26,26,26,0.05)] text-sm space-y-2">
            <p className="font-semibold text-ink">Acceptable replacements:</p>
            <ul className="list-disc pl-4">
              {q.acceptable_replacements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <p className="mt-2 text-ink-soft text-xs italic">{q.rationale}</p>
          </div>
        )}
      </Card>

      {submitted && currentIdx < questions.length - 1 && (
        <Button onClick={handleNext}>Next Rep</Button>
      )}
    </div>
  );
}
