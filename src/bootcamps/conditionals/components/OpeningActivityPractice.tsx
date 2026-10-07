import { DiagramDrills } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
import { openingActivityExplanations, openingActivityItems } from '../content/openingActivityItems';
import './opening-activity-practice.css';

export function OpeningActivityPractice() {
  return (
    <section className="cir-root opening-activity-practice" aria-label="Build diagrams from fresh statements">
      <p className="opening-activity-intro">Read the sentence and put each complete idea on the appropriate side. Then read your diagram as an if/then statement. Does it preserve the original meaning?</p>
      <DiagramDrills
        items={openingActivityItems}
        explanations={openingActivityExplanations}
        persistProgress={false}
        allowContrapositive={false}
        allowNegation={false}
        shuffleItems={false}
      />
    </section>
  );
}
