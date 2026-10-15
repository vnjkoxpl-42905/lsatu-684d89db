const TRAPS = [
  { n: 1, name: 'Too Strong', why: 'Accuses the author of assuming something extreme, or claims the conclusion rests "merely" on one piece of evidence.', tell: 'Words like only, solely, merely, always, never, impossible, all, no.' },
  { n: 2, name: 'Bad Match', why: 'Descriptively inaccurate. The answer describes evidence or a conclusion that doesn’t exist in the text.', tell: 'Read the answer, then look for the thing it’s describing in the stimulus. If it’s not there, you’ve got a Bad Match.' },
  { n: 3, name: 'Reversed Logic', why: 'Right concepts, wrong direction. Confuses the Condition for the Result, or cause for effect.', tell: '"Necessary" where it should be "sufficient," or "cause" where it should be "effect."' },
  { n: 4, name: 'Wrong Flaw', why: 'Uses a Famous Flaw label that isn’t actually present in the argument.', tell: 'The label sounds familiar so your brain accepts it. Verify the flaw is actually committed before selecting.' },
  { n: 5, name: 'Contradicted', why: 'Claims the author "failed to consider" something they actually did discuss.', tell: 'Re-scan the stimulus for the supposedly-overlooked thing. If it’s already in the argument, the answer is lying.' },
];

export function TrapDecisionTree() {
  return (
    <section className="my-10">
      <header className="border-b border-rule pb-3">
        <div className="protocol text-ink-mute">Trap Anatomy</div>
        <h3 className="display-title text-2xl text-ink">Five Fast Eliminators</h3>
      </header>
      <ol className="mt-4 grid gap-3 md:grid-cols-5">
        {TRAPS.map((t) => (
          <li
            key={t.n}
            className="relative border border-rule bg-paper-bright/40 p-4"
          >
            <span className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-strike text-paper protocol text-[0.65rem]">
              {t.n}
            </span>
            <h4 className="display-title text-lg text-ink">{t.name}</h4>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">{t.why}</p>
            <div className="mt-3 border-t border-rule-soft pt-2">
              <div className="protocol text-[0.65rem] text-ink-mute">tell</div>
              <p className="mt-1 text-xs italic text-ink-soft">{t.tell}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
