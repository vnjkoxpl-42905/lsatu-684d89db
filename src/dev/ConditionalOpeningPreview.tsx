import { useSearchParams } from 'react-router-dom';
import { OpeningCourseNavigation, OpeningCourseScreen, type OpeningCourseUrl } from '@/bootcamps/conditionals/components/OpeningCourse';
import '@/bootcamps/main-conclusion/styles/scoped.css';

/** Isolated development harness: no assignment or account persistence is mounted. */
export default function ConditionalOpeningPreview() {
  const [params] = useSearchParams();
  const view = params.get('page') ?? 'lessons';
  const url: OpeningCourseUrl = (destination, run = false) => `/dev/conditional-opening-preview?page=${encodeURIComponent(destination)}${run ? '&run=1' : ''}`;
  return <div className="mc-bootcamp oc-workspace"><OpeningCourseNavigation view={view} url={url}/><main><OpeningCourseScreen view={view} run={params.get('run') === '1'} url={url}/></main></div>;
}
