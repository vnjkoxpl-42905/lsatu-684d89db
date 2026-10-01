import { useEffect, useState } from 'react';
import { CONDITIONAL_AREAS, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import type { ConditionalUnit } from '@/bootcamps/conditionals/content/types';

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
  return <fieldset disabled={disabled} className="space-y-3 rounded-md border border-border p-3">
    <legend className="px-1 text-sm font-semibold">Choose conditional work</legend>
    <label className="block text-xs">Assignment scope
      <select aria-label="Conditional assignment scope" className={selectClass} value={value.scope} onChange={event => {
        const scope = event.target.value as ConditionalAssignmentTarget['scope'];
        onChange({ ...value, scope, mode: scope === 'general' ? 'practice' : 'learn',
          unitId: value.unitId ?? units[0]?.id, area: value.area ?? 'translation' });
      }}>
        <option value="course">Full bootcamp</option><option value="area">One area</option>
        <option value="skill">One specific skill</option><option value="general">General practice</option>
      </select>
    </label>
    {value.scope === 'skill' && <label className="block text-xs">Skill
      <select aria-label="Conditional skill" className={selectClass} value={value.unitId ?? ''}
        onChange={event => onChange({ ...value, unitId: event.target.value })}>
        <option value="" disabled>{units.length ? 'Choose a skill' : 'Loading skills…'}</option>
        {units.map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
      </select>
    </label>}
    {value.scope === 'area' && <label className="block text-xs">Area
      <select aria-label="Conditional area" className={selectClass} value={value.area ?? 'translation'}
        onChange={event => onChange({ ...value, area: event.target.value as ConditionalAssignmentTarget['area'] })}>
        {CONDITIONAL_AREAS.map(area => <option key={area.id} value={area.id}>{area.title}</option>)}
      </select>
    </label>}
    {(value.scope === 'skill' || value.scope === 'area') && <label className="block text-xs">Learning or practice
      <select aria-label="Conditional learning mode" className={selectClass} value={value.mode}
        onChange={event => onChange({ ...value, mode: event.target.value as ConditionalAssignmentTarget['mode'] })}>
        <option value="learn">Full teaching and practice sequence</option><option value="practice">Practice directly</option>
      </select>
    </label>}
    {value.scope !== 'course' && <label className="block text-xs">Practice difficulty
      <select aria-label="Conditional difficulty" className={selectClass} value={value.difficulty}
        onChange={event => onChange({ ...value, difficulty: event.target.value as ConditionalAssignmentTarget['difficulty'] })}>
        <option value="beginner">Beginner</option><option value="medium">Medium</option><option value="advanced">Advanced</option>
      </select>
    </label>}
    <p className="text-xs text-muted-foreground">The full path builds foundations first. Targeted work can be assigned at any level. Existing Activities remain available.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </fieldset>;
}
