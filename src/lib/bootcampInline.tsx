import { type ComponentType } from 'react';
import { safeLazy } from '@/lib/safeLazy';

// Bootcamp pages are full-screen SPA routes; they render blank inside an iframe
// (a fresh context loses the session). Mounting the page component inline in the
// same React tree keeps auth/context, so it renders. Shared by the inline-open
// view and the scaled card preview. safeLazy guards against stale post-deploy
// chunks ("Cannot read properties of undefined (reading 'default')").

const PrincipleFlawBootcamp = safeLazy(() => import('@/pages/PrincipleFlawBootcamp'));
const IntroToLrBootcamp = safeLazy(() => import('@/pages/IntroToLrBootcamp'));
const ConditionalBootcamp = safeLazy(() => import('@/pages/ConditionalBootcamp'));
const CausationStation = safeLazy(() => import('@/pages/CausationStation'));
const FallacyFlawBootcamp = safeLazy(() => import('@/pages/FallacyFlawBootcamp'));
const AbstractBootcamp = safeLazy(() => import('@/topics/abstract'));
const RcEngagingPassageBootcamp = safeLazy(() => import('@/pages/RcEngagingPassageBootcamp'));
const ConditionalIndicatorsRefresher = safeLazy(() => import('@/features/conditional-refresher/ConditionalIndicatorsRefresher'));
const UnlessDrillPage = safeLazy(() => import('@/features/quick-drills/unless-drill/UnlessDrillPage'));

export interface BootcampInlineCfg {
  Comp: ComponentType;
  routePath: string;
  title: string;
  bootcampIdOverride?: string;
}

export const BOOTCAMP_INLINE: Record<string, BootcampInlineCfg> = {
  conditionals: { Comp: ConditionalBootcamp, routePath: '/bootcamp/conditionals', title: 'Conditional Logic Bootcamp' },
  'conditional-indicators-refresher': { Comp: ConditionalIndicatorsRefresher, routePath: '/conditional-indicators-refresher', title: 'Conditional Indicators Refresher', bootcampIdOverride: 'conditional-indicators-refresher' },
  'unless-drill': { Comp: UnlessDrillPage, routePath: '/quick-drills/unless-drill', title: 'Unless Drill', bootcampIdOverride: 'unless-drill' },
  'principle-flaw': { Comp: PrincipleFlawBootcamp, routePath: '/bootcamp/principle-flaw', title: 'Principle and Flaw' },
  'intro-to-lr': { Comp: IntroToLrBootcamp, routePath: '/bootcamp/intro-to-lr', title: 'Intro to LR' },
  'causation-station': { Comp: CausationStation, routePath: '/bootcamp/causation-station', title: 'Causation Station' },
  'fallacy-flaw': { Comp: FallacyFlawBootcamp, routePath: '/bootcamp/fallacy-flaw', title: 'Flaw and Famous Flaws' },
  abstraction: { Comp: AbstractBootcamp, routePath: '/topics/abstract', title: 'Abstract', bootcampIdOverride: 'abstraction' },
  'rc-engaging-with-the-passage': {
    Comp: RcEngagingPassageBootcamp,
    routePath: '/bootcamp/rc-engaging-with-the-passage',
    title: 'Engaging With The Passage',
  },
};
