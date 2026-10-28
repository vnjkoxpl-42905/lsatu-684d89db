import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONDITIONAL_ACTIVITIES, CONDITIONAL_GUIDED_SLUGS, normalizeConditionalActivityConfig, type ConditionalActivityConfig, type ConditionalActivityId } from '../activityRegistry';
import { conditionalUnits } from '../content';
import { GROUP_LABEL, type GroupId } from '@/features/conditional-refresher/content';
import { readPracticeSetup, writePracticeSetup, type PracticeSetupState } from './practiceSetupState';
import './conditional-practice-workbench.css';

const groups: { id: string; title: string; description: string; activities: ConditionalActivityId[] }[] = [
  { id: 'translate', title: 'Translate sentences', description: 'Read the language. Build the rule.', activities: ['rephrase', 'diagram', 'sort', 'unless'] },
  { id: 'connect', title: 'Connect conditional rules', description: 'Supply connections and test conclusions.', activities: ['linking', 'missing-links', 'must-be-true'] },
  { id: 'flashcards', title: 'Review flashcards', description: 'Recall a translation and explain it.', activities: ['translate-cards'] },
  { id: 'guided', title: 'Practise LSAT questions', description: 'Apply the reasoning to guided question sets.', activities: ['guided'] },
  { id: 'mixed', title: 'Mixed conditional practice', description: 'Choose a skill, level and practice mode.', activities: ['legacy-practice'] },
];
const instructions: Record<ConditionalActivityId, string[]> = {
  rephrase: ['Diagram the statement on paper, then write its contrapositive.', 'Choose the pair with both the correct diagram and the correct contrapositive.', 'Check your answer and read the explanation before moving on.'],
  diagram: ['Read the sentence. Place its ideas on the two sides of the arrow and add any negative needed.', 'Check your diagram. Use the feedback to revise it before continuing.'],
  sort: ['Read the indicator word or phrase.', 'Choose the group that tells you how to translate it. Check the feedback, then try the next word.'],
  unless: ['Translate sentences using unless, until and without through the existing four-form progression.', 'Follow the prompts inside the drill. Timing and milestones are managed there.'],
  linking: ['Diagram the premises and the conclusion on paper.', 'Choose the conditional that connects the premises to the conclusion.', 'Check your answer and follow the completed chain to the conclusion.'],
  'missing-links': ['Read the premises and the conclusion. Mark where the chain stops.', 'Choose the conditional that makes the conclusion follow.', 'Check your answer and trace each step from the premise to the conclusion.'],
  'must-be-true': ['Diagram the given statements on paper.', 'Choose the answer that must be true whenever those statements are true.', 'Read the explanation and check why the answer follows from the premises.'],
  'translate-cards': ['Translate the sentence before revealing the answer. Say the rule in ordinary English.', 'Compare the conditional and contrapositive. Mark the card for another look or move on.'],
  guided: ['Choose a conditional question set or open the collection to browse.', 'Read its instructions and work through the native guided-question prompts. Opening a set does not start a new attempt.'],
  'legacy-practice': ['Choose the conditional skill and level you want to practise.', 'Work through the existing bank in your selected mode. Check the feedback before the next question.'],
};
type Props = { defaults: ConditionalActivityConfig[]; permits: (config: ConditionalActivityConfig) => boolean; href: (config: ConditionalActivityConfig) => string; storageKey: string };
type Option = { label: string; config: ConditionalActivityConfig };
export function ConditionalPracticeWorkbench({ defaults, permits, href, storageKey }: Props) {
  const id = useId();
  const [state, setState] = useState<PracticeSetupState>(() => readPracticeSetup(storageKey));
  const allowed = (value: unknown) => { const normalized = normalizeConditionalActivityConfig(value); return normalized && permits(normalized) ? normalized : null; };
  const available = defaults.map(allowed).filter((value): value is ConditionalActivityConfig => !!value);
  const safeDrafts: PracticeSetupState['drafts'] = {};
  for (const fallback of available) {
    const draft = allowed(state.drafts[fallback.activity]);
    safeDrafts[fallback.activity] = draft?.activity === fallback.activity ? draft : fallback;
  }
  const selected = available.some(item => item.activity === state.selected) ? state.selected! : available[0]?.activity;
  const config = selected ? safeDrafts[selected] : undefined;
  const availableGroups = groups.filter(group => group.activities.some(activity => available.some(item => item.activity === activity)));
  const category = availableGroups.find(group => group.activities.includes(selected!));
  const categoryActivities = category?.activities.filter(activity => available.some(item => item.activity === activity)) ?? [];
  const effectiveState = { selected, drafts: safeDrafts };
  const serialized = JSON.stringify(effectiveState);
  useEffect(() => { writePracticeSetup(storageKey, JSON.parse(serialized) as PracticeSetupState); }, [storageKey, serialized]);
  const choose = (activity: ConditionalActivityId) => setState({ selected: activity, drafts: safeDrafts });
  if (!config || !category) return <p className="cpw-empty" role="status">Your assignment has no activities available in this centre.</p>;
  const entry = CONDITIONAL_ACTIVITIES.find(item => item.id === config.activity)!;
  const fallback = available.find(item => item.activity === config.activity)!;
  const patch = (change: Partial<ConditionalActivityConfig>) => {
    const candidate = { ...config, ...change };
    if (candidate.activity === 'rephrase' && candidate.groups?.length !== 4 && candidate.timing === 'progressive') candidate.timing = 'untimed';
    if (candidate.activity === 'legacy-practice' && config.mode === 'hard-sentences' && change.mode && change.mode !== 'hard-sentences') candidate.difficulty = fallback.difficulty ?? 'beginner';
    return allowed(candidate);
  };
  const options = (values: { label: string; change: Partial<ConditionalActivityConfig> }[]): Option[] => {
    const result: Option[] = [];
    for (const value of values) {
      const candidate = patch(value.change);
      if (candidate && !result.some(option => JSON.stringify(option.config) === JSON.stringify(candidate))) result.push({ label: value.label, config: candidate });
    }
    return result;
  };
  const setting = (label: string, values: Option[]) => {
    if (!values.length) return null;
    const current = values.findIndex(option => JSON.stringify(option.config) === JSON.stringify(config));
    if (current < 0) return null;
    return <div className="cpw-field" key={label}>{values.length === 1 ? <><span className="cpw-field-label">{label}</span><p className="cpw-static">{values[0].label}</p></> : <label>{label}<select value={String(current)} onChange={event => { const next = values[Number(event.target.value)]?.config; if (next && allowed(next)) setState({ selected, drafts: { ...safeDrafts, [selected]: next } }); }}>{values.map((option, index) => <option key={JSON.stringify(option.config)} value={index}>{option.label}</option>)}</select></label>}</div>;
  };
  const groupOptions = config.groups ? options([
    { label: 'All four indicator groups', change: { groups: ['g1', 'g2', 'g3', 'g4'] } },
    ...(['g1', 'g2', 'g3', 'g4'] as GroupId[]).map(group => ({ label: GROUP_LABEL[group], change: { groups: [group] } })),
    { label: 'Groups 1 and 2', change: { groups: ['g1', 'g2'] } },
    { label: config.groups.map(group => GROUP_LABEL[group]).join('; '), change: { groups: config.groups } },
  ]) : [];
  const startLabel = selected === 'guided' ? config.set ? 'Open selected set' : 'Open question sets' : selected === 'unless' ? 'Open Unless Drill' : 'Start activity';
  return <div className="cpw" data-selected-activity={selected}>
    <div className="cpw-frame">
      <nav className="cpw-nav" aria-label="Practice activities">
        <div className="cpw-nav-title">Choose your practice<span>{available.length} {available.length === 1 ? 'activity' : 'activities'} available</span></div>
        {availableGroups.map(group => <section className="cpw-nav-group" key={group.id}>
          <h2>{group.title}</h2>
          {group.activities.filter(activity => available.some(item => item.activity === activity)).map(activity => { const item = CONDITIONAL_ACTIVITIES.find(value => value.id === activity)!; return <button type="button" key={activity} aria-label={item.title} aria-pressed={activity === selected} onClick={() => choose(activity)}><span>{item.title}</span>{activity === selected && <span className="cpw-selected-marker" aria-hidden="true"/>}</button>; })}
        </section>)}
      </nav>
      <div className="cpw-mobile-nav">
        {availableGroups.length > 1 && <label>Practice type<select value={category.id} onChange={event => { const group = availableGroups.find(value => value.id === event.target.value); const first = group?.activities.find(activity => available.some(item => item.activity === activity)); if (first) choose(first); }}>{availableGroups.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>}
        {categoryActivities.length > 1 ? <label>Activity<select value={selected} onChange={event => choose(event.target.value as ConditionalActivityId)}>{categoryActivities.map(activity => <option key={activity} value={activity}>{CONDITIONAL_ACTIVITIES.find(item => item.id === activity)!.title}</option>)}</select></label> : <p className="cpw-mobile-current">{entry.title}</p>}
      </div>
      <div className="cpw-main">
        <header className="cpw-activity-heading"><p className="cpw-eyebrow">{category.title}</p><h2>{entry.title}</h2><p>{selected === 'linking' ? 'Supply the connection between a rule and its conclusion.' : entry.purpose}</p></header>
        <div className="cpw-content">
          <section className="cpw-instructions" aria-labelledby={`${id}-instructions`}><p className="cpw-section-index" aria-hidden="true">01 / Read</p><h3 id={`${id}-instructions`}>Instructions</h3><ol>{instructions[selected].map(instruction => <li key={instruction}>{instruction}</li>)}</ol><div className="cpw-continuity"><span className="cpw-continuity-dot" aria-hidden="true"/><p>Your attempts stay with this activity. You can continue existing work or practise again.</p></div></section>
          <section className="cpw-setup" aria-labelledby={`${id}-setup`}><p className="cpw-section-index" aria-hidden="true">02 / Configure</p><h3 id={`${id}-setup`}>Set up your practice</h3><div className="cpw-fields">
            {config.groups && setting('Topic', groupOptions)}
            {config.stage && setting('Task', options([{ label: 'Translate the sentence', change: { stage: 'translate' } }, { label: 'Build the contrapositive', change: { stage: 'contrapositive' } }]))}
            {config.review && setting('Cards', options([{ label: 'All cards', change: { review: 'all' } }, { label: 'Needs practice', change: { review: 'needs' } }]))}
            {config.level && setting('Question format', options([{ label: 'All questions', change: { level: 'all' } }, { label: 'Symbols', change: { level: 'variables' } }, { label: 'Words', change: { level: 'words' } }]))}
            {config.timing && setting('Timing', options([...(config.groups?.length === 4 ? [{ label: 'Original progression', change: { timing: 'progressive' as const } }] : []), { label: 'Untimed', change: { timing: 'untimed' } }, { label: 'Timed practice', change: { timing: 'timed' } }]))}
            {selected === 'legacy-practice' && <>{setting('Skill', options([{ label: 'All available conditional skills', change: { unit: undefined } }, ...conditionalUnits.filter(unit => unit.phase === 'conditional').map(unit => ({ label: unit.title, change: { unit: unit.id } }))]))}{config.mode === 'hard-sentences' ? <div className="cpw-field"><span className="cpw-field-label">Level</span><p className="cpw-static">Advanced</p></div> : setting('Level', options((['beginner', 'medium', 'advanced'] as const).map(difficulty => ({ label: difficulty[0].toUpperCase() + difficulty.slice(1), change: { difficulty } }))))}{setting('Mode', options([{ label: 'Skill practice', change: { mode: 'practice' } }, { label: 'Mixed application', change: { mode: 'simulator' } }, { label: 'Hard sentences', change: { mode: 'hard-sentences' } }]))}</>}
            {selected === 'guided' && setting('Question set', options([{ label: 'Browse all available sets', change: { set: undefined } }, ...CONDITIONAL_GUIDED_SLUGS.map(set => ({ label: set.replace(/^w\d+-\d+-conditional-logic-/, '').replace(/-/g, ' ').replace(/^./, letter => letter.toUpperCase()), change: { set } }))]))}
            {selected === 'unless' && <p className="cpw-setup-note">No settings are needed here. The drill guides you through its four forms and manages timing as you progress.</p>}
          </div><div className="cpw-launch">{allowed(config) && <Link className="cpw-start" to={href(config)}>{startLabel}<span aria-hidden="true">↗</span></Link>}<p>{selected === 'guided' ? 'The question-set page opens next.' : selected === 'unless' ? 'Continue in the Unless Drill.' : 'Your selected settings will carry into the activity.'}</p></div></section>
        </div>
      </div>
    </div>
  </div>;
}
