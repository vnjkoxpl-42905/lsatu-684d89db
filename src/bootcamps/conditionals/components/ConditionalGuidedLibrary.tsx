import { Link } from 'react-router-dom';
import { GuidedConditionalActivity } from './GuidedConditionalActivity';
import { CONDITIONAL_GUIDED_SETS } from './guidedConditionalCatalog';
import type { ConditionalActivityConfig } from '../activityRegistry';
export default function ConditionalGuidedLibrary({ config, href, permits, localOnly, view }: { config: ConditionalActivityConfig; href:(config?:ConditionalActivityConfig)=>string; permits:(config:ConditionalActivityConfig)=>boolean; localOnly?:boolean; view:'launch'|'run' }) {
  const selected = CONDITIONAL_GUIDED_SETS.find(set => set.slug === config.set);
  if (selected) { const launchUrl = href(config); return <GuidedConditionalActivity slug={selected.slug} backUrl={href({ activity: 'guided' })} launchUrl={launchUrl} runUrl={`${launchUrl}&view=run`} view={view} localOnly={localOnly}/>; }
  return <div className="cc-guided-library"><p>Start with a level that fits your work. These sets draw from filtered question pools, so some questions can recur across sets.</p>{(['Easier', 'Medium', 'Harder'] as const).map(band => <section key={band}><h2>{band}</h2><ol className="cc-activity-list">{CONDITIONAL_GUIDED_SETS.filter(set => set.band.toLowerCase() === band.toLowerCase() && permits({ activity: 'guided', set: set.slug })).map(set => <li key={set.slug}><h3><Link to={href({ activity: 'guided', set: set.slug })}>{set.title}</Link></h3><Link className="cc-open" to={href({ activity: 'guided', set: set.slug })}>Open set</Link></li>)}</ol></section>)}</div>;
}
