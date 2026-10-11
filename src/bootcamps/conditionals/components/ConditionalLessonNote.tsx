import { Link } from 'react-router-dom';
import { DynamicIslandTOC } from '@/components/ui/dynamic-island-toc';
import type { ConditionalUnit } from '../content/types';
import { LessonInteraction } from './LessonInteractions';
import '../notes.css';
import { ConditionalOpeningLesson, hasOpeningLesson } from './ConditionalOpeningLesson';

export interface ConditionalLessonNoteProps {
  unit: ConditionalUnit;
  onComplete: () => void;
  continueHref: string;
  continueLabel?: string;
  previousHref?: string;
  reviewed: boolean;
}

function sectionTitle(unit: ConditionalUnit, index: number): string {
  if (unit.id === 'orientation') return ['What a conditional says', 'A rule needs a case fact', 'Keep the strength of the claim'][index] || 'Read the complete guarantee';
  if (unit.id === 'rules-facts') return ['Separate the fact and rule', 'What each fact can establish', 'A chain produces a new rule', 'Show the match and explain why', 'Four facts, one unchanged rule', 'A requirement is not a completed action'][index] || 'Check the whole claim';
  if (unit.area === 'translation') return ['Read the indicator in context', 'Preserve the complete ideas', 'Check the meaning before shortening', 'Use a meaning check', 'Practice the translation', 'Recognize related expressions', 'Keep the direction precise'][index] || 'Compare the wording';
  if (unit.area === 'linking') return ['Find the exact connection', 'Keep rules separate from facts', 'Preserve subjects and scope', 'Expose a hidden connection', 'Make the path visible', 'Check intermediate conclusions', 'Match the complete requirement'][index] || 'Test the proposed connection';
  return index === 0 ? 'Understand the relationship' : index === 1 ? 'Compare the possible cases' : index === 2 ? 'Keep the whole claim' : `Check the reasoning ${index - 1}`;
}

export function ConditionalLessonNote({ unit, onComplete, continueHref, continueLabel, previousHref, reviewed }: ConditionalLessonNoteProps) {
  if (hasOpeningLesson(unit.id)) return <ConditionalOpeningLesson key={unit.id} unit={unit} onComplete={onComplete} continueHref={continueHref} continueLabel={continueLabel} previousHref={previousHref} reviewed={reviewed} />;
  return <div className="conditional-note">
    <DynamicIslandTOC key={unit.id} selector=".conditional-note [data-toc]" />
    <header className="cn-hero"><div><p className="cn-label">Conditional logic</p><h1>{unit.title}</h1><p>{unit.goal}</p></div><a className="cn-start" href="#conditional-note-start">Read the lesson<span aria-hidden="true">↓</span></a></header>
    <article id="conditional-note-start" className="cn-paper">
      {unit.id === 'orientation' && <section data-toc data-toc-title="A promise about qualifying cases" className="cn-section"><p className="cn-label">Start with the meaning</p><h2>A promise about qualifying cases</h2><p>A conditional connects two complete ideas. It says: if the starting condition is met, the required result must follow. It does not say that the starting condition has already happened.</p><div className="cn-diagram"><span>If this condition holds</span><span aria-hidden="true">→</span><span>This result must follow</span></div><p>The left side is the trigger. The right side is what the rule guarantees. Understand that promise before memorizing indicator words.</p></section>}
      {unit.teaching.map((paragraph, index) => <section key={index} className="cn-section" data-toc data-toc-title={sectionTitle(unit, index)}><p className="cn-label">{String(index + 1).padStart(2, '0')}</p><h2>{sectionTitle(unit, index)}</h2><p>{paragraph}</p></section>)}
      <section className="cn-section" data-toc data-toc-title="Work through an example"><h2>Work through an example</h2><div className="cn-example">{unit.workedExample.statements.map((statement, index) => <p key={index}>{statement}</p>)}</div><ol className="cn-reasoning">{unit.workedExample.reasoning.map((reason, index) => <li key={index}>{reason}</li>)}</ol><div className="cn-result"><p className="cn-label">What follows</p><p><strong>{unit.workedExample.conclusion}</strong></p></div></section>
      <section className="cn-section" data-toc data-toc-title="Try the relationship"><h2>Try the relationship</h2><LessonInteraction unit={unit} /></section>
      <section className="cn-section" data-toc data-toc-title="A method to check your work"><h2>A method to check your work</h2><ol className="cn-method">{unit.method.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
      <section id="repair" className="cn-section" data-toc data-toc-title="Catch the tempting mistake"><h2>Catch the tempting mistake</h2><div className="cn-contrast"><div><p className="cn-label">The tempting move</p><p>{unit.commonMistake.mistake}</p></div><div><p className="cn-label">Check it this way</p><p>{unit.commonMistake.repair}</p></div></div></section>
      <footer className="cn-footer"><p>{reviewed ? 'You marked this lesson as read. You can revisit it whenever you need.' : 'Marking this lesson as read records review, not mastery.'}</p><div className="cn-controls">{previousHref && <Link to={previousHref}>Previous lesson</Link>}<button type="button" onClick={onComplete}>{reviewed ? 'Lesson read' : 'Mark lesson as read'}</button><Link className="cn-primary" to={continueHref}>Continue to practice →</Link></div></footer>
    </article>
  </div>;
}
