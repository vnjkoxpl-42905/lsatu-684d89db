import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DRILL_SECTION_PARAM, type DrillSection } from '@/lib/drillSection';
import { loadDrillHub, preloadDrillHub } from '@/lib/routePreload';

export function drillHubSectionHref(section: DrillSection): string {
  return `/classroom/drill?${DRILL_SECTION_PARAM}=${section}`;
}

/**
 * Move between a full-screen question runner and the classroom drill hub
 * without exposing the app-wide Suspense fallback.
 *
 * The hub chunk starts warming as soon as the runner mounts. A click still
 * waits for the shared loader because keyboard activation can beat an idle
 * prefetch. Until it resolves, React leaves the current question painted.
 */
export function useDrillHubSectionNavigation() {
  const navigate = useNavigate();

  React.useEffect(() => {
    preloadDrillHub();
  }, []);

  return React.useCallback(
    (section: DrillSection) => {
      const navigateWhenReady = () => {
        React.startTransition(() => {
          navigate(drillHubSectionHref(section));
        });
      };

      // A failed prefetch must not leave the toggle inert. safeLazy owns route
      // recovery if the real navigation encounters the same chunk failure.
      void loadDrillHub().then(navigateWhenReady, navigateWhenReady);
    },
    [navigate],
  );
}

