import { CONDITIONAL_ACTIVITIES, CONDITIONAL_GUIDED_SLUGS, normalizeConditionalActivityConfig, type ConditionalActivityConfig } from '@/bootcamps/conditionals/activityRegistry';
import { useEffect, useState } from 'react';
import { CONDITIONAL_AREAS, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import type { ConditionalUnit } from '@/bootcamps/conditionals/content/types';
import { conditionalFullCourseAssignmentsReleased, FULL_CONDITIONAL_EDITION, V3_PRIMARY_UNITS, V3_ELIGIBLE_AREAS } from '@/lib/conditionalCourseEdition';

export function ConditionalAssignmentFields({ value, onChange, disabled = false }: {
  value: ConditionalAssignmentTarget;
  onChange: (value: ConditionalAssignmentTarget) => void;
  disabled?: boolean;
}) {
  const [units, setUnits] = useState<ConditionalUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import('@/bootcamps/conditionals/content').then(module => {
      if (alive) setUnits(module.conditionalUnits);
    }).catch(() => { if (alive) setError('The skill list could not load. Reopen this form to retry.'); });
    return () => { alive = false; };
  }, []);
  const selectClass = 'mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground';
  const activityConfig = value.scope === 'activity' ? normalizeConditionalActivityConfig({ activity: value.activityId, ...value.activitySettings }) : null;
  const updateActivity = (config: ConditionalActivityConfig) => { const normalized = normalizeConditionalActivityConfig(config); if (!normalized) return; const { activity, ...settings } = normalized; onChange({ scope: 'activity', mode: 'practice', difficulty: 'beginner', courseEdition: FULL_CONDITIONAL_EDITION, curriculumVersion: 3, activityId: activity, activitySettings: settings }); };
  const expanded = value.courseEdition === FULL_CONDITIONAL_EDITION;
  const eligibleUnits = expanded ? units.filter(unit => V3_PRIMARY_UNITS.includes(unit.id as never)) : units;
  return <fieldset disabled={disabled} className="space-y-3 rounded-md border border-border p-3">
    <legend className="px-1 text-sm font-semibold">Choose conditional work</legend>
    <label className="block text-xs">Course edition
      <select aria-label="Conditional course edition" className={selectClass} value={expanded ? FULL_CONDITIONAL_EDITION : 'legacy'} onChange={event => {
        const full = event.target.value === FULL_CONDITIONAL_EDITION;
        onChange(full ? { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: FULL_CONDITIONAL_EDITION } : { scope: 'course', mode: 'learn', difficulty: 'beginner' });
      }}><option value="legacy">Existing course</option>{(expanded || conditionalFullCourseAssignmentsReleased()) && <option value={FULL_CONDITIONAL_EDITION}>Full course: Chapters 1–7</option>}</select>
    </label>
    <label className="block text-xs">Assignment scope
      <select aria-label="Conditional assignment scope" className={selectClass} value={value.scope} onChange={event => {
        const scope = event.target.value as ConditionalAssignmentTarget['scope'];
        if (scope === 'activity') { if (!conditionalFullCourseAssignmentsReleased()) return; updateActivity(normalizeConditionalActivityConfig({ activity: 'rephrase' })!); return; }
        onChange({ ...value, activityId: undefined, activitySettings: undefined, scope, mode: scope === 'general' ? 'practice' : 'learn',
          curriculumVersion: expanded ? 3 : scope === 'stage' ? 2 : undefined,
          unitId: value.unitId ?? eligibleUnits[0]?.id, area: value.area ?? 'translation' });
      }}>
        <option value="course">Full curriculum from the beginning</option><option value="activity" disabled={!conditionalFullCourseAssignmentsReleased()}>One activity with settings</option>{!expanded && <option value="stage">Start at a curriculum stage</option>}<option value="area">One area</option>
        <option value="skill">One specific skill</option>{!expanded && <option value="general">General practice</option>}
      </select>
    </label>
    {activityConfig && <div className="space-y-3">
      <label className="block text-xs">Activity<select aria-label="Conditional activity" className={selectClass} value={activityConfig.activity} onChange={event => updateActivity(normalizeConditionalActivityConfig({ activity: event.target.value })!)}>{CONDITIONAL_ACTIVITIES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      {activityConfig.groups && <label className="block text-xs">Topic<select aria-label="Conditional activity topic" className={selectClass} value={activityConfig.groups.length === 4 ? 'all' : activityConfig.groups.join(',')} onChange={event => updateActivity({ ...activityConfig, groups: event.target.value === 'all' ? ['g1','g2','g3','g4'] : event.target.value.split(',') as never, ...(activityConfig.activity === 'rephrase' ? { timing: event.target.value === 'all' ? activityConfig.timing : 'untimed' } : {}) })}><option value="all">All four groups</option>{activityConfig.activity !== 'sort' && ['g1','g2','g3','g4'].map(group => <option key={group} value={group}>Group {group.slice(1)}</option>)}{activityConfig.activity === 'sort' && <option value="g1,g2">Groups 1 and 2</option>}</select></label>}
      {activityConfig.level && <label className="block text-xs">Question format<select aria-label="Conditional question format" className={selectClass} value={activityConfig.level} onChange={event => updateActivity({ ...activityConfig, level: event.target.value as never })}><option value="all">Words and symbols</option><option value="words">Words</option><option value="variables">Symbols</option></select></label>}
      {activityConfig.stage && <label className="block text-xs">Task<select aria-label="Conditional activity task" className={selectClass} value={activityConfig.stage} onChange={event => updateActivity({ ...activityConfig, stage: event.target.value as never })}><option value="translate">Translate</option><option value="contrapositive">Contrapositive</option></select></label>}
      {activityConfig.review && <label className="block text-xs">Cards<select aria-label="Conditional card selection" className={selectClass} value={activityConfig.review} onChange={event => updateActivity({ ...activityConfig, review: event.target.value as never })}><option value="all">All cards</option><option value="needs">Needs work</option></select></label>}
      {activityConfig.timing && <label className="block text-xs">Timing<select aria-label="Conditional activity timing" className={selectClass} value={activityConfig.timing} onChange={event => updateActivity({ ...activityConfig, timing: event.target.value as never })}>{activityConfig.groups?.length === 4 && <option value="progressive">Original timing progression</option>}<option value="untimed">Untimed</option><option value="timed">Timed practice</option></select></label>}
      {activityConfig.activity === 'guided' && <label className="block text-xs">Guided set<select aria-label="Conditional guided set" className={selectClass} value={activityConfig.set ?? ''} onChange={event => updateActivity({ ...activityConfig, set: event.target.value || undefined })}><option value="">All 13 conditional sets</option>{CONDITIONAL_GUIDED_SLUGS.map(slug => <option key={slug} value={slug}>{slug.replace(/^w\d+-\d+-conditional-logic-/, '').replace(/-/g, ' ')}</option>)}</select></label>}
      {activityConfig.activity === 'legacy-practice' && <>
        <label className="block text-xs">Skill<select aria-label="Conditional bank skill" className={selectClass} value={activityConfig.unit ?? ''} onChange={event => updateActivity({ ...activityConfig, unit: event.target.value || undefined })}><option value="">All conditional skills</option>{units.filter(unit => unit.phase === 'conditional').map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></label>
        <label className="block text-xs">Practice mode<select aria-label="Conditional bank mode" className={selectClass} value={activityConfig.mode} onChange={event => updateActivity({ ...activityConfig, mode: event.target.value as never })}><option value="practice">Practice</option><option value="simulator">Simulator</option><option value="hard-sentences">Hard sentences</option></select></label>
        <label className="block text-xs">Level<select aria-label="Conditional bank level" className={selectClass} value={activityConfig.difficulty} disabled={activityConfig.mode === 'hard-sentences'} onChange={event => updateActivity({ ...activityConfig, difficulty: event.target.value as never })}><option value="beginner">Level 1</option><option value="medium">Level 2</option><option value="advanced">Level 3</option></select></label>
      </>}
    </div>}
    {(value.scope === 'skill' || value.scope === 'stage') && <label className="block text-xs">{value.scope === 'stage' ? 'Starting skill' : 'Skill'}
      <select aria-label="Conditional skill" className={selectClass} value={value.unitId ?? ''}
        onChange={event => onChange({ ...value, unitId: event.target.value,
          curriculumVersion: expanded ? 3 : value.scope === 'stage' ? 2 : undefined })}>
        <option value="" disabled>{units.length ? 'Choose a skill' : 'Loading skills…'}</option>
        {eligibleUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
      </select>
    </label>}
    {value.scope === 'area' && <label className="block text-xs">Area
      <select aria-label="Conditional area" className={selectClass} value={value.area ?? 'translation'}
        onChange={event => onChange({ ...value, area: event.target.value as ConditionalAssignmentTarget['area'] })}>
        {CONDITIONAL_AREAS.filter(area => !expanded || V3_ELIGIBLE_AREAS.includes(area.id)).map(area => <option key={area.id} value={area.id}>{area.title}</option>)}
      </select>
    </label>}
    {!expanded && (value.scope === 'skill' || value.scope === 'area') && <label className="block text-xs">Learning or practice
      <select aria-label="Conditional learning mode" className={selectClass} value={value.mode}
        onChange={event => onChange({ ...value, mode: event.target.value as ConditionalAssignmentTarget['mode'] })}>
        <option value="learn">Full teaching and practice sequence</option><option value="practice">Practice directly</option>
      </select>
    </label>}
    {value.scope !== 'course' && value.scope !== 'stage' && value.scope !== 'activity' && <label className="block text-xs">Assigned activity level
      <select aria-label="Conditional activity level" className={selectClass} value={value.difficulty}
        onChange={event => onChange({ ...value, difficulty: event.target.value as ConditionalAssignmentTarget['difficulty'] })}>
        <option value="beginner">Level 1</option><option value="medium">Level 2</option><option value="advanced">Level 3</option>
      </select>
    </label>}
    <p className="text-xs text-muted-foreground">Assign the starting stage or exact work the student needs. The curriculum sets levels activity by activity; students follow your assignment. Students can also open the practice centre from a full bootcamp assignment.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </fieldset>;
}
