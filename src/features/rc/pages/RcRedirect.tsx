import { Navigate, useLocation } from 'react-router-dom';
import { DRILL_SECTION_PARAM } from '@/lib/drillSection';

/**
 * /rc is now the drill hub's RC section.
 *
 * The route stays because links to it are in the wild — assignment links
 * (`/rc?passages=…`), the old quick-build link (`/rc?count=…&start=1`), and the
 * returns hard-coded in RcPlayer and RcResults. Every one of them keeps
 * working: the query is carried across verbatim.
 *
 * A link that carries any builder query also asks for the builder stage. Landing
 * a `start=1` link on the hub's default RC stage would drop it on the floor —
 * the builder that reads those params would not be mounted to read them.
 */
export default function RcRedirect() {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  params.delete(DRILL_SECTION_PARAM);

  const carries = params.toString().length > 0;
  const next = new URLSearchParams(params);
  next.set(DRILL_SECTION_PARAM, 'rc');
  if (carries) next.set('stage', 'type-drill');

  return <Navigate to={`/classroom/drill?${next.toString()}${hash}`} replace />;
}
