import { createContext, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { IndicatorWordDeck } from './IndicatorWordDeck';
import { TermDeck } from './TermDeck';
import type { OpeningCourseUrl } from './OpeningCourse';
import { flashcardUrl } from '../flashcardNavigation';
export { flashcardUrl } from '../flashcardNavigation';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import type { OpeningCourseStep } from '../openingCoursePath';
import { ConditionalFilters } from './ConditionalFilters';
import { CourseBrowseHeader, CourseBrowseNavigation } from './CourseBrowseNavigation';
import { COURSE_CHAPTER_TITLES, courseBrowseUrl, readCourseBrowseContext, withCourseBrowseContext } from '../courseBrowse';
import { relevantCourseCardLinks, type CourseCardLink } from '../courseCardLinks';
import { PRACTICE_CARDS } from '@/features/conditional-refresher/practiceContent';
import { indicatorWordCards } from '../content/indicatorWordCards';
import { termCards } from '../content/termCards';
import { useCourseProgress } from '../courseProgress';
import { courseChapterProgress } from '../courseNavigation';
import './flashcard-library.css';

export const CourseFlashcardUrl = createContext<OpeningCourseUrl | null>(null);
const sets = [
  { id: 'foundation', title: 'Sufficient and necessary', description: 'Quick cards on the two ideas behind every rule.' },
  { id: 'group-1', title: 'Group 1 words', description: 'Practice words that introduce a sufficient condition.' },
  { id: 'group-2', title: 'Group 2 words', description: 'Practice words that introduce a necessary condition.' },
  { id: 'indicators', title: 'Indicator words', description: 'Group 1 or Group 2? Pick for each word.' },
];
export function FlashcardTools({ url, allowed, storageScope, authorizedSteps = [] }: { url: OpeningCourseUrl; allowed: string[]; storageScope?: string; authorizedSteps?: OpeningCourseStep[] }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [deckFilter, setDeckFilter] = useState('all');
  // Legacy indicator cards have always shared an unscoped device fallback. Keep that
  // read/write contract; only the expanded edition introduced actor-scoped keys.
  // The raw actor still keys the mounted deck below. This does not import legacy
  // bytes into another actor's scoped storage or change account-backed state.
  const indicatorScope = storageScope?.endsWith(`:${FULL_CONDITIONAL_EDITION}`) ? storageScope : undefined;
  const available = [...allowed.filter(id => ['foundation', 'group-1', 'group-2'].includes(id)), ...(allowed.includes('group-1') && allowed.includes('group-2') ? ['indicators'] : [])];
  const requested = params.get('deck');
  const set = sets.find(item => item.id === requested && available.includes(item.id));
  const context = readCourseBrowseContext(params, authorizedSteps);
  const from = authorizedSteps.find(step => step.id === context.from);
  const scoped = context.chapter ? authorizedSteps.filter(step => (step.part ?? 1) === context.chapter) : authorizedSteps;
  const cardLinks: CourseCardLink[] = authorizedSteps.length ? relevantCourseCardLinks(scoped, authorizedSteps, url, context.from).filter(link => link.kind === 'sentence' || available.includes(link.deck!))
    : sets.filter(item => available.includes(item.id)).map(item => ({ id: item.id, label: item.title, kind: 'deck', deck: item.id, href: flashcardUrl(url, item.id) }));
  const category = (link: CourseCardLink) => link.kind === 'sentence' ? 'sentences' : link.deck === 'foundation' ? 'concepts' : 'indicator-sets';
  const categories = [{ id: 'concepts', title: 'Concepts', description: 'Recall sufficient and necessary conditions.' }, { id: 'indicator-sets', title: 'Indicator words', description: 'Recognize the words that introduce each condition.' }, { id: 'sentences', title: 'Sentence translations', description: 'Recall the diagram, explain it in English and review what needs work.' }];
  const validFilter = ['all', ...categories.filter(item => cardLinks.some(link => category(link) === item.id)).map(item => item.id), ...cardLinks.map(link => link.id)].includes(deckFilter) ? deckFilter : 'all';
  const shown = cardLinks.filter(link => validFilter === 'all' || category(link) === validFilter || link.id === validFilter);
  const chooserUrl = courseBrowseUrl(url, 'flashcards', context.chapter, context.from);
  const libraryTitle = context.chapter ? COURSE_CHAPTER_TITLES[context.chapter] : 'Flashcards';
  const deckChoices = <ConditionalFilters summary={set?.title}><nav className="cc-settings" aria-label="Choose a flashcard set">{cardLinks.map(link => <Link key={link.id} aria-current={link.deck === set?.id ? 'true' : undefined} to={withCourseBrowseContext(link.href, context)}>{link.label}</Link>)}</nav></ConditionalFilters>;
  if (!set) return <div className="oc-course-note co-flashcard-tools co-card-library oc-browse">
    <Link className="oc-back" to={url('home')}><ArrowLeft size={15} aria-hidden="true"/>Home</Link>
    <CourseBrowseHeader title={libraryTitle} description="Choose a collection. Your saved place and review ratings stay with your cards." eyebrow={context.chapter ? `Chapter ${context.chapter}` : undefined}/>
    {!!authorizedSteps.length && <CardLibraryProgress steps={scoped} chapter={context.chapter}/>}
    {from && <Link className="co-card-lesson-return" to={url(from.id)}>Back to {from.title}<ArrowRight size={16}/></Link>}
    <div className="oc-browse-toolbar"><CourseBrowseNavigation url={url} chapter={context.chapter} from={context.from} active="flashcards"/><ConditionalFilters summary={validFilter === 'all' ? 'All available sets' : categories.find(item => item.id === validFilter)?.title ?? cardLinks.find(link => link.id === validFilter)?.label}>
      {!!authorizedSteps.length && <label>Chapter<select value={context.chapter ?? 'all'} onChange={event => navigate(courseBrowseUrl(url, 'flashcards', event.target.value === 'all' ? undefined : Number(event.target.value), context.from))}><option value="all">All chapters</option>{[...new Set(authorizedSteps.map(step => step.part ?? 1))].sort((a, b) => a - b).map(chapter => <option value={chapter} key={chapter}>Chapter {chapter}: {COURSE_CHAPTER_TITLES[chapter]}</option>)}</select></label>}
      <label>Flashcard set<select value={validFilter} onChange={event => setDeckFilter(event.target.value)}><option value="all">All available sets</option>{categories.filter(item => cardLinks.some(link => category(link) === item.id)).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}{cardLinks.map(link => <option key={link.id} value={link.id}>{link.label}</option>)}</select></label>
    </ConditionalFilters></div>
    <div className="co-card-collections">{categories.map(group => { const links = shown.filter(link => category(link) === group.id); return links.length ? <section className="co-card-collection" key={group.id}><header><h2>{group.title}</h2><p>{group.description}</p></header><ul>{links.map(link => {
      const count = link.kind === 'sentence' ? PRACTICE_CARDS.filter(card => card.groups.every(group => link.groups?.includes(group))).length : link.deck === 'foundation' ? termCards.length : indicatorWordCards.filter(card => link.deck === 'indicators' || card.group === (link.deck === 'group-1' ? 1 : 2)).length;
      const description = sets.find(item => item.id === link.deck)?.description ?? 'Translate the rule, then compare your answer and choose what to revisit.';
      return <li key={link.id}><div><h3>{link.label}</h3><p>{description}</p></div><span className="co-card-count">{count} cards</span><Link className="co-card-open" aria-label={`Open ${link.label}`} to={withCourseBrowseContext(link.href, context)}>Open<ArrowRight size={16} aria-hidden="true"/></Link></li>;
    })}</ul></section> : null; })}</div>
    {!cardLinks.length && <p className="co-card-empty">{context.chapter ? 'No flashcards are available for this chapter.' : 'No flashcards are available in this work.'}</p>}
  </div>;
  if (set.id !== 'foundation') return <div className="oc-course-note co-flashcard-tools co-card-player">
    <nav className="co-flashcard-return" aria-label="Flashcard navigation"><Link to={chooserUrl}><ArrowLeft size={16}/>All flashcard sets</Link>{from && <Link to={url(from.id)}>Back to {from.title}<ArrowRight size={16}/></Link>}</nav>
    <CourseBrowseHeader title={set.title} eyebrow={context.chapter ? `Chapter ${context.chapter} flashcards` : 'Flashcards'}/>
    {deckChoices}
    <IndicatorWordDeck key={`${storageScope ?? "legacy"}:${set.id}:${params.get('card') ?? ''}`} storageScope={indicatorScope} initialCardId={params.get('card') ?? undefined} group={set.id === 'group-1' ? 1 : set.id === 'group-2' ? 2 : undefined}/>
  </div>;
  return <div className="oc-course-note co-flashcard-tools co-card-player">
    <nav className="co-flashcard-return" aria-label="Flashcard navigation"><Link to={chooserUrl}><ArrowLeft size={16}/>All flashcard sets</Link>{from && <Link to={url(from.id)}>Back to {from.title}<ArrowRight size={16}/></Link>}</nav>
    <CourseBrowseHeader title={set.title} eyebrow={context.chapter ? `Chapter ${context.chapter} flashcards` : 'Flashcards'}/>
    {deckChoices}
    <TermDeck key={`${storageScope}:${params.get('card') ?? ''}`} storageScope={storageScope} initialCardId={params.get('card') ?? undefined}/>
  </div>;
}

function CardLibraryProgress({ steps, chapter }: { steps: OpeningCourseStep[]; chapter?: number }) {
  const saved = useCourseProgress()?.steps ?? {};
  const summary = courseChapterProgress(steps, saved);
  const name = chapter ? `Chapter ${chapter} completion` : 'Course completion';
  return <div className="oc-browse-summary" role="group" aria-label={name}>
    <span>{chapter ? 'Chapter progress' : 'Course progress'} · {summary.requiredTotal ? <>{summary.requiredDone} of {summary.requiredTotal} required steps done <strong>{summary.percent}% complete</strong></> : 'Optional · No required steps'}</span>
    {summary.requiredTotal > 0 && <div className="oc-topic-progress" role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent} aria-valuetext={`${summary.percent}% complete, ${summary.requiredDone} of ${summary.requiredTotal} steps done`}><span style={{ width: `${summary.percent}%` }}/></div>}
  </div>;
}
