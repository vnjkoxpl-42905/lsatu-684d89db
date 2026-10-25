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
  const expanded = value.courseEdition === FULL_CONDITIONAL_EDITION;
  const eligibleUnits = expanded ? units.filter(unit => V3_PRIMARY_UNITS.includes(unit.id as never)) : units;
  return <fieldset disabled={disabled} className="space-y-3 rounded-md border border-border p-3">
    <legend className="px-1 text-sm font-semibold">Choose conditional work</legend>
    <label className="block text-xs">Course edition
      <select aria-label="Conditional course edition" className={selectClass} value={expanded ? FULL_CONDITIONAL_EDITION : 'legacy'} onChange={event => {
        const full = event.target.value === FULL_CONDITIONAL_EDITION;
        onChange(full ? { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: FULL_CONDITIONAL_EDITION } : { scope: 'course', mode: 'learn', difficulty: 'beginner' });
      }}><option value="legacy">Existing course</option>{conditionalFullCourseAssignmentsReleased() && <option value={FULL_CONDITIONAL_EDITION}>Full course: Chapters 1–7</option>}</select>
    </label>
    <label className="block text-xs">Assignment scope
      <select aria-label="Conditional assignment scope" className={selectClass} value={value.scope} onChange={event => {
        const scope = event.target.value as ConditionalAssignmentTarget['scope'];
        onChange({ ...value, scope, mode: scope === 'general' ? 'practice' : 'learn',
          curriculumVersion: expanded ? 3 : scope === 'stage' ? 2 : undefined,
          unitId: value.unitId ?? eligibleUnits[0]?.id, area: value.area ?? 'translation' });
      }}>
        <option value="course">Full curriculum from the beginning</option>{!expanded && <option value="stage">Start at a curriculum stage</option>}<option value="area">One area</option>
        <option value="skill">One specific skill</option>{!expanded && <option value="general">General practice</option>}
      </select>
    </label>
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
    {value.scope !== 'course' && value.scope !== 'stage' && <label className="block text-xs">Assigned activity level
      <select aria-label="Conditional activity level" className={selectClass} value={value.difficulty}
        onChange={event => onChange({ ...value, difficulty: event.target.value as ConditionalAssignmentTarget['difficulty'] })}>
        <option value="beginner">Level 1</option><option value="medium">Level 2</option><option value="advanced">Level 3</option>
      </select>
    </label>}
    <p className="text-xs text-muted-foreground">Assign the starting stage or exact work the student needs. The curriculum sets levels activity by activity; students follow your assignment. Existing Activities remain available.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </fieldset>;
}
