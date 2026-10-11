import { createContext, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { indicatorFlashcards } from '../content/indicatorFlashcards';
import { StudyDeck } from './StudyDeck';
import type { OpeningCourseUrl } from './OpeningCourse';

export const CourseFlashcardUrl = createContext<OpeningCourseUrl | null>(null);
export const groupOneCardIds = ['g1-if-first', 'g1-when-first', 'g1-any', 'g1-all', 'g1-every', 'g1-in-order-to', 'g1-people-who', 'g1-each'];
const labels: Record<string, string> = {
  'g1-if-first': 'if', 'g1-if-last': 'if: condition comes last', 'g1-when-first': 'when', 'g1-when-last': 'when: condition comes last',
  'g1-where': 'where', 'g1-all': 'all', 'g1-every': 'every', 'g1-any': 'any', 'g1-the-only': 'the only', 'g1-target-later': 'every: condition comes last',
  'g1-whenever': 'whenever', 'g1-anytime': 'anytime', 'g1-every-time': 'every time', 'g1-in-order-to': 'in order to', 'g1-people-who': 'people who', 'g1-each': 'each',
  'g2-only': 'only', 'g2-only-if': 'only if', 'g2-if-contrast': 'if / only if', 'g2-only-when': 'only when', 'g2-only-where': 'only where',
  'g2-always': 'always', 'g2-requires': 'requires', 'g2-required-before': 'required for', 'g2-must-instruction': 'must', 'g2-only-the-only': 'only / the only', 'g2-necessary-before': 'necessary for',
  'foundation-enough': 'Sufficient condition', 'foundation-required': 'Necessary condition', 'foundation-reverse': 'Reversing the arrow', 'foundation-rule-not-fact': 'Rules and facts',
};
export function flashcardUrl(url: OpeningCourseUrl, group: string, card?: string, from?: string) {
  const target = url('tools');
  const [path, query = ''] = target.split('?');
  const params = new URLSearchParams(query);
  params.set('deck', group);
  if (card) params.set('card', card);
  if (from) params.set('from', from);
  return `${path}?${params}`;
}
export function IndicatorFlashcardLink({ group, card, children }: { group: string; card?: string; children?: React.ReactNode }) {
  const url = useContext(CourseFlashcardUrl);
  if (!url) return children ? <>{children}</> : null;
  return <Link className={card ? 'co-indicator-card-link' : 'oc-action co-flashcard-entry'} to={flashcardUrl(url, group, card, group === 'group-1' ? 'sufficient' : 'necessary')}>{children || 'Go to flashcards'}<ArrowRight size={16} aria-hidden="true"/></Link>;
}
const sets = [
  { id: 'foundation', title: 'Terms and concepts', description: 'Sufficient, necessary, arrow direction, and the difference between a rule and a fact.' },
  { id: 'group-1', title: 'Group 1: Conditional indicator words', description: 'Find the sufficient condition introduced by each word or phrase.' },
  { id: 'group-2', title: 'Group 2: Conditional indicator words', description: 'Find the necessary condition identified by each word or phrase.' },
];
export function FlashcardTools({ url, allowed }: { url: OpeningCourseUrl; allowed: string[] }) {
  const [params, setParams] = useSearchParams();
  const set = sets.find(item => item.id === params.get('deck') && allowed.includes(item.id));
  if (!set) return <div className="oc-course-note co-flashcard-tools">
    <header data-course-heading><p className="oc-label">Tools</p><h1>Flashcards</h1><p>Choose the set you want to practice.</p></header>
    <div className="co-flashcard-sets">{sets.filter(item => allowed.includes(item.id)).map(item => <section key={item.id}><h2>{item.title}</h2><p>{item.description}</p><Link className="oc-action" to={flashcardUrl(url, item.id)}>Go to flashcards<ArrowRight size={16} aria-hidden="true"/></Link></section>)}</div>
    {!allowed.length && <p>No flashcards are available in this work.</p>}
  </div>;
  const order = set.id === 'group-1' ? ['g1-if-first', 'g1-if-last', 'g1-when-first', 'g1-whenever', 'g1-when-last', 'g1-any', 'g1-anytime', 'g1-all', 'g1-every', 'g1-every-time', 'g1-target-later', 'g1-in-order-to', 'g1-people-who', 'g1-each', 'g1-where', 'g1-the-only'] : set.id === 'group-2' ? ['g2-only', 'g2-only-if', 'g2-only-when', 'g2-only-where', 'g2-always', 'g2-requires', 'g2-must-instruction', 'g2-if-contrast', 'g2-required-before', 'g2-only-the-only', 'g2-necessary-before'] : [];
  const cards = indicatorFlashcards.filter(card => card.group === set.id).sort((a, b) => order.length ? order.indexOf(a.id) - order.indexOf(b.id) : 0);
  const selected = cards.find(card => card.id === params.get('card'))?.id || cards[0].id;
  const from = params.get('from');
  return <div className="oc-course-note co-flashcard-tools">
    <nav className="co-flashcard-return" aria-label="Flashcard navigation"><Link to={url('tools')}><ArrowLeft size={16}/>All flashcard sets</Link>{(from === 'sufficient' || from === 'necessary') && <Link to={url(from)}>Back to {from === 'sufficient' ? 'sufficient' : 'necessary'} condition<ArrowRight size={16}/></Link>}</nav>
    <header data-course-heading><p className="oc-label">Flashcards</p><h1>{set.title}</h1><p>{set.description} Answer before you reveal the explanation.</p></header>
    <div className="co-opening"><StudyDeck key={set.id} group={set.id} selectedCard={selected} choices={cards.map(card => ({ id: card.id, label: labels[card.id] || card.id }))} onCardChange={id => setParams(previous => { const next = new URLSearchParams(previous); next.set('card', id); return next; }, { replace: true })}/></div>
  </div>;
}
