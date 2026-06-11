import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, EyeOff } from 'lucide-react';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Input } from '@/bootcamps/main-conclusion/components/primitives/Input';
import { evaluateDesignedConclusion, type Classification } from '@/bootcamps/main-conclusion/lib/ai-templates/whimsical-evaluator';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { logIntroLrAttempt } from '@/bootcamps/main-conclusion/lib/attemptLogger';
import { ClickableStimulus } from './ClickableStimulus';
import { DrillProtocolCard } from './DrillProtocolCard';
import { FreeResponsePanel } from './FreeResponsePanel';
import { HintPanel } from './HintPanel';
import { RoleRevealMap } from './RoleRevealMap';
import { StructureClassifier } from './StructureClassifier';
import type {
  DrillProtocol,
  InteractiveDrillItem,
  PartRole,
  RunnerState,
} from './types';
import type {
  DesignConclusionQuestion,
  FamilyQuestion,
  FirstSentenceQuestion,
  IndicatorIdQuestion,
  PronounReplacementQuestion,
  RrPassage,
} from '@/bootcamps/main-conclusion/content/drills.source';

interface Props {
  item: InteractiveDrillItem;
  state?: RunnerState;
  protocol: DrillProtocol;
  onAnswer?: (correct: boolean, selectedAnswer?: string) => void;
  onComplete?: (correct?: boolean) => void;
  completeLabel?: string;
}

export function InteractiveDrillRunner({
  item,
  state,
  protocol,
  onAnswer,
  onComplete,
  completeLabel = 'Next',
}: Props) {
  const runnerState = state ?? {
    answered: false,
    correct: null,
    selectedAnswer: null,
    questionIndex: 0,
    totalQuestions: 1,
  };

  const [protocolOpen, setProtocolOpen] = useState(() => runnerState.questionIndex === 0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [secondaryPartId, setSecondaryPartId] = useState<string | null>(null);
  const [premiseAcknowledged, setPremiseAcknowledged] = useState<Record<'p1' | 'p2', boolean>>({ p1: false, p2: false });
  const [selectedRoleByPart, setSelectedRoleByPart] = useState<Record<string, PartRole | null>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<'First-sentence' | 'Rebuttal' | null>(null);
  const [firstSentenceAnswer, setFirstSentenceAnswer] = useState<boolean | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [validInput, setValidInput] = useState('');
  const [invalidInput, setInvalidInput] = useState('');
  const [validClass, setValidClass] = useState<Classification | null>(null);
  const [invalidClass, setInvalidClass] = useState<Classification | null>(null);
  const [pronounPick, setPronounPick] = useState(false);
  const [antecedent, setAntecedent] = useState('');
  const [rewrite, setRewrite] = useState('');
  const [covered, setCovered] = useState(false);
  const [selfChecks, setSelfChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedPartId(null);
    setSecondaryPartId(null);
    setPremiseAcknowledged({ p1: false, p2: false });
    setSelectedRoleByPart({});
    setSelectedCategory(null);
    setSelectedFamily(null);
    setFirstSentenceAnswer(null);
    setHint(null);
    setRevealed(false);
    setValidInput('');
    setInvalidInput('');
    setValidClass(null);
    setInvalidClass(null);
    setPronounPick(false);
    setAntecedent('');
    setRewrite('');
    setCovered(false);
    setSelfChecks({});
  }, [item.id]);

  const complete = (correct = true, selectedAnswer?: string) => {
    try {
      logIntroLrAttempt({
        drillId: (state && (state as RunnerState & { drillId?: string }).drillId) ?? item.id,
        questionId: item.id,
        mode: item.mode,
        correct,
        selectedAnswer,
      });
    } catch {
      /* logger swallows its own errors; this is belt-and-suspenders */
    }
    onAnswer?.(correct, selectedAnswer);
  };

  return (
    <div className="space-y-5">
      {renderMode()}
    </div>
  );

  function renderMode() {
    switch (item.mode) {
      case 'signal_classification':
        return renderSignal();
      case 'conclusion_click':
        return renderConclusionClick();
      case 'first_sentence_check':
        return renderFirstSentenceCheck();
      case 'rebuttal_dissection':
        return renderRebuttalDissection();
      case 'chain_mapping':
      case 'nested_claims':
        return renderRoleTagging(item.mode === 'nested_claims');
      case 'conclusion_construction':
        return renderConclusionConstruction();
      case 'pronoun_replacement':
        return renderPronounReplacement();
      case 'read_cover_restate':
        return renderReadCoverRestate();
      default:
        return null;
    }
  }

  function renderSignal() {
    const q = item.payload as IndicatorIdQuestion;
    const parts = q.text.split(new RegExp(`(${escapeRegExp(q.highlighted_word)})`, 'g'));
    const answered = runnerState.answered || revealed;
    return (
      <div className="space-y-4">
        <Card variant="surface">
          <p className="font-mc-serif text-h3 leading-[1.3] text-ink">
            {parts.map((part, index) =>
              part === q.highlighted_word ? (
                <mark key={index} className="rounded-[4px] border-b border-[rgb(var(--accent)/0.60)] bg-[rgb(var(--accent)/0.24)] px-1 text-ink not-italic">
                  {part}
                </mark>
              ) : (
                <span key={index}>{part}</span>
              ),
            )}
          </p>
        </Card>
        <div className="grid gap-2 sm:grid-cols-3">
          {q.category_options.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'primary' : 'subtle'}
              disabled={answered}
              onClick={() => {
                setSelectedCategory(category);
                if (category === q.correct_category) {
                  setRevealed(true);
                  complete(true, category);
                } else {
                  setHint(`Try again: this phrase is not functioning as ${formatCategory(category)}. Ask what claim it introduces.`);
                }
              }}
              className={cn(answered && category !== q.correct_category && 'opacity-40')}
            >
              {formatCategory(category)}
            </Button>
          ))}
        </div>
        {hint && !answered ? <HintPanel title="Coached hint">{hint}</HintPanel> : null}
        {answered ? (
          <HintPanel tone="success" title="Reveal">
            <p>{q.rationale}</p>
          </HintPanel>
        ) : null}
      </div>
    );
  }

  function renderConclusionClick() {
    const parts = item.parts ?? [];
    const answered = runnerState.answered || revealed;
    return (
      <div className="space-y-4">
        <ClickableStimulus
          parts={parts}
          selectedIds={selectedPartId ? [selectedPartId] : []}
          revealed={answered}
          disabled={answered}
          onSelect={(part) => {
            setSelectedPartId(part.id);
            if (part.id === item.correctConclusionPartId) {
              setRevealed(true);
              complete(true, part.id);
            } else {
              setHint(part.hint ?? item.hint ?? 'That sentence is not the author’s final claim. Look for what it supports.');
            }
          }}
        />
        {hint && !answered ? <HintPanel title="Coached hint">{hint}</HintPanel> : null}
        {answered && item.revealMap ? <RoleRevealMap entries={item.revealMap} summary={rationaleText(item.payload)} /> : null}
      </div>
    );
  }

  function renderFirstSentenceCheck() {
    const q = item.payload as FirstSentenceQuestion;
    const parts = item.parts ?? [];
    const conclusionFound = selectedPartId === item.correctConclusionPartId;
    const answered = runnerState.answered || revealed;
    return (
      <div className="space-y-4">
        <ClickableStimulus
          parts={parts}
          selectedIds={selectedPartId ? [selectedPartId] : []}
          revealed={answered}
          disabled={answered || conclusionFound}
          onSelect={(part) => {
            setSelectedPartId(part.id);
            if (part.id === item.correctConclusionPartId) {
              setHint(null);
            } else {
              setHint(part.hint ?? 'That is not the author’s actual conclusion. Keep reading for the claim the support points toward.');
            }
          }}
        />
        {!conclusionFound && hint ? <HintPanel title="Coached hint">{hint}</HintPanel> : null}
        {conclusionFound && !answered ? (
          <Card variant="surface" className="space-y-3">
            <p className="font-mc-serif text-body-prose text-ink">Now decide: was that conclusion the first sentence?</p>
            <div className="flex gap-2">
              <Button variant={firstSentenceAnswer === true ? 'primary' : 'subtle'} onClick={() => setFirstSentenceAnswer(true)}>
                Yes
              </Button>
              <Button variant={firstSentenceAnswer === false ? 'primary' : 'subtle'} onClick={() => setFirstSentenceAnswer(false)}>
                No
              </Button>
              <Button
                className="ml-auto"
                disabled={firstSentenceAnswer === null}
                onClick={() => {
                  const correct = firstSentenceAnswer === q.is_first_sentence_conclusion;
                  setRevealed(true);
                  complete(correct, String(firstSentenceAnswer));
                }}
              >
                Submit
              </Button>
            </div>
          </Card>
        ) : null}
        {answered && item.revealMap ? <RoleRevealMap entries={item.revealMap} summary={q.rationale} /> : null}
      </div>
    );
  }

  function renderRebuttalDissection() {
    const q = item.payload as FamilyQuestion;
    const parts = item.parts ?? [];
    const step = selectedPartId === item.correctConclusionPartId ? (selectedFamily ? 3 : 2) : 1;
    const answered = runnerState.answered || revealed;
    const followUpIds = selectedFamily === 'Rebuttal' ? item.correctOpposingPartIds ?? [] : item.correctSupportPartIds ?? [];
    const ready = selectedPartId && selectedFamily && secondaryPartId;
    return (
      <div className="space-y-4">
        <Card variant="ghost" className="p-4">
          <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">Step {step}</p>
          <p className="mt-1 font-mc-serif text-body-prose text-ink-soft">
            {step === 1 ? 'Click the author’s main conclusion.' : step === 2 ? 'Classify the structure.' : selectedFamily === 'Rebuttal' ? 'Click the rejected or opposing view.' : 'Click a support claim.'}
          </p>
        </Card>
        <ClickableStimulus
          parts={parts}
          selectedIds={[selectedPartId, secondaryPartId].filter(Boolean) as string[]}
          revealed={answered}
          disabled={answered}
          onSelect={(part) => {
            if (step === 1) {
              setSelectedPartId(part.id);
              if (part.id !== item.correctConclusionPartId) setHint('That is not the author’s final position. Find the sentence the rest of the argument is aimed at proving or defending.');
              else setHint(null);
              return;
            }
            if (step === 3 && part.id !== selectedPartId) {
              setSecondaryPartId(part.id);
              setHint(null);
            }
          }}
        />
        {step === 2 && !answered ? <StructureClassifier value={selectedFamily} onChange={setSelectedFamily} /> : null}
        {hint && !answered ? <HintPanel title="Coached hint">{hint}</HintPanel> : null}
        {!answered ? (
          <div className="flex justify-end">
            <Button
              disabled={!ready}
              onClick={() => {
                const correct = selectedPartId === item.correctConclusionPartId && selectedFamily === q.family && !!secondaryPartId && followUpIds.includes(secondaryPartId);
                setRevealed(true);
                complete(correct, `${selectedPartId}:${selectedFamily}:${secondaryPartId}`);
              }}
            >
              Submit dissection
            </Button>
          </div>
        ) : null}
        {answered && item.revealMap ? <RoleRevealMap entries={item.revealMap} summary={q.rationale} /> : null}
      </div>
    );
  }

  function renderRoleTagging(advanced: boolean) {
    const parts = item.parts ?? [];
    const allTagged = parts.every((part) => selectedRoleByPart[part.id]);
    const answered = runnerState.answered || revealed;
    const score = parts.filter((part) => selectedRoleByPart[part.id] === part.role).length;
    const roles: PartRole[] = advanced ? ['premise', 'intermediate', 'main'] : ['premise', 'intermediate', 'main'];
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {parts.map((part) => (
            <Card key={part.id} variant="surface" className={cn(answered && selectedRoleByPart[part.id] === part.role && 'border-[rgb(var(--success)/0.35)] bg-[rgb(var(--success)/0.055)]')}>
              <p className="font-mc-serif text-body-prose text-ink">{part.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={selectedRoleByPart[part.id] === role ? 'primary' : 'subtle'}
                    disabled={answered}
                    onClick={() => setSelectedRoleByPart((prev) => ({ ...prev, [part.id]: role }))}
                  >
                    {role === 'main' ? 'Main' : role === 'intermediate' ? 'Intermediate' : 'Premise'}
                  </Button>
                ))}
              </div>
              {answered && selectedRoleByPart[part.id] !== part.role ? (
                <p className="mt-2 font-mc-mono text-mono text-ink-faint">correct role: <Chip tone={part.role === 'main' ? 'conclusion' : part.role === 'intermediate' ? 'pivot' : 'premise'}>{part.role}</Chip></p>
              ) : null}
            </Card>
          ))}
        </div>
        {!answered ? (
          <div className="flex justify-end">
            <Button
              disabled={!allTagged}
              onClick={() => {
                const correct = score === parts.length;
                setRevealed(true);
                complete(correct, JSON.stringify(selectedRoleByPart));
              }}
            >
              Reveal hierarchy
            </Button>
          </div>
        ) : null}
        {answered ? (
          <>
            <HintPanel tone={score === parts.length ? 'success' : 'error'} title="Hierarchy score">
              {score}/{parts.length} roles matched. The map below shows the real structure.
            </HintPanel>
            {item.revealMap ? <RoleRevealMap entries={item.revealMap} summary={rationaleText(item.payload)} /> : null}
            {onComplete && !onAnswer ? (
              <div className="flex justify-end">
                <Button onClick={() => onComplete(score === parts.length)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {completeLabel}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  function renderConclusionConstruction() {
    const q = item.payload as DesignConclusionQuestion;
    const evaluated = validClass && invalidClass;
    const reveal = item.constructionReveal;
    const premiseReady = premiseAcknowledged.p1 && premiseAcknowledged.p2;
    const validTone = classificationTone(validClass);
    const invalidTone = classificationTone(invalidClass);
    return (
      <div className="space-y-4">
        <Card variant="surface" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">Premise workspace</p>
              <p className="mt-1 font-mc-serif text-body text-ink-soft">Mark what each premise contributes before you write.</p>
            </div>
            <Badge tone={premiseReady ? 'success' : 'accent'}>
              {premiseReady ? 'premises locked' : 'extract first'}
            </Badge>
          </div>

          <div className="grid gap-3 desktop:grid-cols-2">
            <PremiseContributionCard
              label="P1"
              premise={q.premise_pair.p1}
              contribution={reveal?.p1Contribution ?? 'Identify the rule, condition, or general claim this premise gives you.'}
              checked={premiseAcknowledged.p1}
              disabled={!!evaluated}
              onToggle={() => setPremiseAcknowledged((prev) => ({ ...prev, p1: !prev.p1 }))}
            />
            <PremiseContributionCard
              label="P2"
              premise={q.premise_pair.p2}
              contribution={reveal?.p2Contribution ?? 'Identify how this premise connects the subject to the rule or first premise.'}
              checked={premiseAcknowledged.p2}
              disabled={!!evaluated}
              onToggle={() => setPremiseAcknowledged((prev) => ({ ...prev, p2: !prev.p2 }))}
            />
          </div>
        </Card>

        <div className={cn('grid gap-3 transition-opacity desktop:grid-cols-2', !premiseReady && 'opacity-55')}>
          <FreeResponsePanel label="Forced valid conclusion" value={validInput} onChange={setValidInput} placeholder="What must follow from P1 + P2?" disabled={!premiseReady || !!evaluated} />
          <FreeResponsePanel label="Tempting invalid conclusion" value={invalidInput} onChange={setInvalidInput} placeholder="Write the trap move a rushed reader might make." disabled={!premiseReady || !!evaluated} />
        </div>

        {!premiseReady && !evaluated ? (
          <HintPanel title="Build from the premises">
            Click both premise-contribution checks first. This keeps the task mechanical: P1 gives the rule, P2 places the subject, then the conclusion is forced.
          </HintPanel>
        ) : null}

        {!evaluated ? (
          <div className="flex justify-end">
            <Button
              disabled={!premiseReady || !validInput.trim() || !invalidInput.trim()}
              onClick={() => {
                const valid = evaluateDesignedConclusion({ premise_pair: q.premise_pair, student_text: validInput, valid_model: q.valid_model, invalid_model: q.invalid_model }).classification;
                const invalid = evaluateDesignedConclusion({ premise_pair: q.premise_pair, student_text: invalidInput, valid_model: q.valid_model, invalid_model: q.invalid_model }).classification;
                setValidClass(valid);
                setInvalidClass(invalid);
                complete(true, 'constructed');
              }}
            >
              Classify and reveal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card variant="elev" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">model reveal</Badge>
                <Badge tone={validTone}>valid attempt: {formatClassification(validClass)}</Badge>
                <Badge tone={invalidTone}>trap attempt: {formatClassification(invalidClass)}</Badge>
              </div>
              <div className="grid gap-3">
                <RevealRow label="P1 contribution" text={reveal?.p1Contribution ?? q.premise_pair.p1} />
                <RevealRow label="P2 contribution" text={reveal?.p2Contribution ?? q.premise_pair.p2} />
                <RevealRow label="Forced conclusion" text={reveal?.forcedConclusion ?? q.valid_model} emphasis />
                <RevealRow label="Tempting wrong move" text={reveal?.temptingWrongMove ?? q.invalid_model} />
                <RevealRow label="Why the wrong move fails" text={reveal?.wrongMoveFailure ?? q.diagnostic_messages.invalid_but_interesting} />
              </div>
            </Card>
            <div className="grid gap-3 desktop:grid-cols-2">
              <HintPanel tone="success" title="Why the valid answer follows">
                {q.diagnostic_messages.valid_match}
              </HintPanel>
              <HintPanel tone="error" title="Why the tempting answer fails">
                {q.diagnostic_messages.invalid_but_interesting}
              </HintPanel>
            </div>
            {onComplete && !onAnswer ? (
              <div className="flex justify-end">
                <Button onClick={() => onComplete(true)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {completeLabel}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  function renderPronounReplacement() {
    const q = item.payload as PronounReplacementQuestion;
    const model = q.acceptable_replacements[0] ?? q.pronoun;
    const cleanRewrite = q.candidate_conclusion.replace(q.pronoun, model);
    const ready = pronounPick && antecedent.trim() && rewrite.trim();
    const answered = runnerState.answered || revealed;
    return (
      <div className="space-y-4">
        <Card variant="surface">
          <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">Candidate conclusion</p>
          <p className="mt-3 font-mc-serif text-h3 leading-relaxed text-ink">
            {q.candidate_conclusion.replace(q.pronoun, '')}
            <button
              type="button"
              disabled={answered}
              onClick={() => setPronounPick(true)}
              className={cn('rounded-[4px] border px-1 text-mc-accent', pronounPick ? 'border-[rgb(var(--accent)/0.45)] bg-[rgb(var(--accent)/0.14)]' : 'border-transparent bg-[rgb(var(--accent)/0.06)]')}
            >
              {q.pronoun}
            </button>
          </p>
        </Card>
        <Input value={antecedent} onChange={(event) => setAntecedent(event.target.value)} placeholder="Identify the antecedent..." disabled={answered} />
        <Input value={rewrite} onChange={(event) => setRewrite(event.target.value)} placeholder="Rewrite the conclusion with the antecedent..." disabled={answered} />
        {!answered ? (
          <div className="flex justify-end">
            <Button
              disabled={!ready}
              onClick={() => {
                const lower = `${antecedent} ${rewrite}`.toLowerCase();
                const correct = !rewrite.toLowerCase().includes(q.pronoun.toLowerCase()) && q.acceptable_replacements.some((replacement) => lower.includes(replacement.toLowerCase().split(/\s+/).slice(0, 2).join(' ')));
                setRevealed(true);
                complete(correct, rewrite);
              }}
            >
              Reveal replacement
            </Button>
          </div>
        ) : (
          <>
            <HintPanel tone="success" title="Clean replacement">
              <p>{cleanRewrite}</p>
              <p className="mt-2">{q.rationale}</p>
            </HintPanel>
            {onComplete && !onAnswer ? (
              <div className="flex justify-end">
                <Button onClick={() => onComplete(true)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {completeLabel}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  function renderReadCoverRestate() {
    const q = item.payload as RrPassage;
    const checks = [
      'preserved the author’s exact claim',
      'avoided importing extra meaning',
      'kept conclusion distinct from support',
    ];
    const hits = q.key_phrases.filter((phrase) => rewrite.toLowerCase().includes(phrase.toLowerCase()));
    const answered = runnerState.answered || revealed;
    return (
      <div className="space-y-4">
        <Card variant="surface">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">{q.title}</p>
            <Button size="sm" variant="subtle" onClick={() => setCovered((prev) => !prev)} leftIcon={<EyeOff className="h-3.5 w-3.5" />}>
              {covered ? 'Uncover' : 'Cover'}
            </Button>
          </div>
          {covered ? (
            <div className="mt-4 rounded-[6px] border border-dashed border-[rgb(var(--border)/0.20)] p-8 text-center font-mc-serif text-body text-ink-faint">
              Passage covered. Restate from memory.
            </div>
          ) : (
            <p className="mt-4 font-mc-serif text-body-prose leading-relaxed text-ink">{q.passage}</p>
          )}
        </Card>
        <FreeResponsePanel label="Restate the author’s conclusion" value={rewrite} onChange={setRewrite} placeholder="Cover the passage, then write the author’s conclusion..." disabled={answered} />
        {rewrite.trim() ? (
          <Card variant="ghost" className="p-4">
            <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">Key phrase comparison</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.key_phrases.map((phrase) => (
                <Chip key={phrase} tone={rewrite.toLowerCase().includes(phrase.toLowerCase()) ? 'accent' : 'neutral'}>
                  {phrase}
                </Chip>
              ))}
            </div>
            <p className="mt-2 font-mc-serif text-body text-ink-soft">{hits.length}/{q.key_phrases.length} key phrases preserved.</p>
          </Card>
        ) : null}
        <Card variant="surface" className="space-y-3">
          <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">Self-check</p>
          {checks.map((check) => (
            <label key={check} className="flex items-center gap-3 font-mc-serif text-body text-ink-soft">
              <input
                type="checkbox"
                checked={!!selfChecks[check]}
                disabled={answered}
                onChange={(event) => setSelfChecks((prev) => ({ ...prev, [check]: event.target.checked }))}
                className="h-4 w-4 accent-[rgb(var(--accent))]"
              />
              Did I {check}?
            </label>
          ))}
        </Card>
        {!answered ? (
          <div className="flex justify-end">
            <Button
              disabled={!rewrite.trim() || checks.some((check) => !selfChecks[check])}
              onClick={() => {
                setRevealed(true);
                complete(true, rewrite);
              }}
            >
              Complete passage
            </Button>
          </div>
        ) : (
          <>
            <HintPanel tone="success" title="Comparison complete">
              Keep the conclusion in the author’s exact lane. Key phrases are guides, not a word-for-word requirement.
            </HintPanel>
            {onComplete && !onAnswer ? (
              <div className="flex justify-end">
                <Button onClick={() => onComplete(true)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {completeLabel}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }
}

function formatCategory(category: string): string {
  return category === 'opposing' ? 'Opposing View' : category.charAt(0).toUpperCase() + category.slice(1);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rationaleText(payload: unknown): string | undefined {
  return typeof payload === 'object' && payload !== null && 'rationale' in payload
    ? String((payload as { rationale?: string }).rationale)
    : undefined;
}

function PremiseContributionCard({
  label,
  premise,
  contribution,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  premise: string;
  contribution: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'rounded-[6px] border p-4 text-left transition-[background,border-color,box-shadow,transform] duration-150 ease-eased',
        checked
          ? 'border-[rgb(var(--success)/0.34)] bg-[rgb(var(--success)/0.07)] shadow-[var(--shadow-1)]'
          : 'border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.52)] hover:-translate-y-[1px] hover:border-[rgb(var(--accent)/0.26)]',
        disabled && 'pointer-events-none opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Chip tone="premise">{label}</Chip>
        <span
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            checked
              ? 'border-[rgb(var(--success)/0.45)] bg-[rgb(var(--success)/0.16)] text-[rgb(var(--success))]'
              : 'border-[rgb(var(--border)/0.18)] text-transparent',
          )}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-3 font-mc-serif text-body-prose leading-relaxed text-ink">{premise}</p>
      <p className="mt-3 border-t border-[rgb(var(--border)/0.10)] pt-3 font-mc-serif text-small leading-relaxed text-ink-soft">
        {contribution}
      </p>
    </button>
  );
}

function RevealRow({ label, text, emphasis = false }: { label: string; text: string; emphasis?: boolean }) {
  return (
    <div className={cn('rounded-[6px] border border-[rgb(var(--border)/0.10)] p-3', emphasis ? 'bg-[rgb(var(--accent)/0.08)]' : 'bg-[rgb(var(--surface)/0.62)]')}>
      <p className="font-mc-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className={cn('mt-1 font-mc-serif leading-relaxed text-ink', emphasis ? 'text-body-prose font-semibold' : 'text-body')}>
        {text}
      </p>
    </div>
  );
}

function classificationTone(classification: Classification | null): 'neutral' | 'success' | 'warn' | 'error' | 'accent' {
  if (classification === 'Valid') return 'success';
  if (classification === 'Invalid but interesting') return 'warn';
  if (classification === 'Misses the premises entirely') return 'error';
  return 'neutral';
}

function formatClassification(classification: Classification | null): string {
  return classification ?? 'Not classified';
}
