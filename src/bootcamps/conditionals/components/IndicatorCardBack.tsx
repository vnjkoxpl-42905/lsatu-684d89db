import { displayWord, groupKind, groupSide, type IndicatorWordCard } from '../content/indicatorWordCards';

/** The back of every word card, top to bottom: the word, its group, what kind of indicator it is, and where the idea goes in the diagram. */
export function IndicatorCardBack({ card, verdict }: { card: IndicatorWordCard; verdict?: string }) {
  return <>
    {verdict && <span className="iw-verdict">{verdict}</span>}
    <span className="iw-back-word">{displayWord(card.word)}</span>
    <span className="iw-back-group">Group {card.group}</span>
    <span className="iw-back-kind">{displayWord(groupKind(card.group))} condition indicator</span>
    <span className="iw-back-side">Put the idea on the <strong>{groupSide(card.group)}</strong> side.</span>
  </>;
}
