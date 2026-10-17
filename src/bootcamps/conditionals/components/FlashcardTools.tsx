import { createContext, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { IndicatorWordDeck } from './IndicatorWordDeck';
import { TermDeck } from './TermDeck';
import type { OpeningCourseUrl } from './OpeningCourse';

export const CourseFlashcardUrl = createContext<OpeningCourseUrl | null>(null);
export function flashcardUrl(url: OpeningCourseUrl, group: string, card?: string, from?: string) {
  const target = url('tools');
  const [path, query = ''] = target.split('?');
  const params = new URLSearchParams(query);
  params.set('deck', group);
  if (card) params.set('card', card);
  if (from) params.set('from', from);
  return `${path}?${params}`;
}
const sets = [
  { id: 'foundation', title: 'Sufficient and necessary', description: 'Quick cards on the two ideas behind every rule.' },
  { id: 'indicators', title: 'Indicator words', description: 'Group 1 or Group 2? Pick for each word.' },
];
export function FlashcardTools({ url, allowed }: { url: OpeningCourseUrl; allowed: string[] }) {
  const [params] = useSearchParams();
  // The word deck always mixes both groups, so it is one set for everyone. Old Group 1 and Group 2 links land on it.
  const available = [...allowed.filter(id => id === 'foundation'), 'indicators'];
  const requested = ['group-1', 'group-2'].includes(params.get('deck') ?? '') ? 'indicators' : params.get('deck');
  const set = sets.find(item => item.id === requested && available.includes(item.id));
  if (!set) return <div className="oc-course-note co-flashcard-tools">
    <header data-course-heading><p className="oc-label">Tools</p><h1>Flashcards</h1></header>
    <div className="co-flashcard-sets">{sets.filter(item => available.includes(item.id)).map(item => <section key={item.id}><h2>{item.title}</h2><p>{item.description}</p><Link className="oc-action" to={flashcardUrl(url, item.id)}>Go to flashcards<ArrowRight size={16} aria-hidden="true"/></Link></section>)}</div>
    {!available.length && <p>No flashcards are available in this work.</p>}
  </div>;
  if (set.id === 'indicators') return <div className="oc-course-note co-flashcard-tools">
    <nav className="co-flashcard-return" aria-label="Flashcard navigation"><Link to={url('tools')}><ArrowLeft size={16}/>All flashcard sets</Link>{(params.get('from') === 'sufficient' || params.get('from') === 'necessary') && <Link to={url(params.get('from')!)}>Back to {params.get('from') === 'sufficient' ? 'sufficient' : 'necessary'} condition<ArrowRight size={16}/></Link>}</nav>
    <header data-course-heading><h1>{set.title}</h1></header>
    <IndicatorWordDeck/>
  </div>;
  return <div className="oc-course-note co-flashcard-tools">
    <nav className="co-flashcard-return" aria-label="Flashcard navigation"><Link to={url('tools')}><ArrowLeft size={16}/>All flashcard sets</Link></nav>
    <header data-course-heading><h1>{set.title}</h1></header>
    <TermDeck/>
  </div>;
}
