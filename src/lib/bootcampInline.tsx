import { lazy, type ComponentType } from 'react';

// Bootcamp pages are full-screen SPA routes; they render blank inside an iframe
// (a fresh context loses the session). Mounting the page component inline in the
// same React tree keeps auth/context, so it renders. Shared by the inline-open
// view and the scaled card preview.
const PrincipleFlawBootcamp = lazy(() => import('@/pages/PrincipleFlawBootcamp'));
const IntroToLrBootcamp = lazy(() => import('@/pages/IntroToLrBootcamp'));
const CausationStation = lazy(() => import('@/pages/CausationStation'));
const FallacyFlawBootcamp = lazy(() => import('@/pages/FallacyFlawBootcamp'));
const AbstractBootcamp = lazy(() => import('@/topics/abstract'));

export interface BootcampInlineCfg {
  Comp: ComponentType;
  routePath: string;
  title: string;
  bootcampIdOverride?: string;
}

export const BOOTCAMP_INLINE: Record<string, BootcampInlineCfg> = {
  'principle-flaw': { Comp: PrincipleFlawBootcamp, routePath: '/bootcamp/principle-flaw', title: 'Principle and Flaw' },
  'intro-to-lr': { Comp: IntroToLrBootcamp, routePath: '/bootcamp/intro-to-lr', title: 'Intro to LR' },
  'causation-station': { Comp: CausationStation, routePath: '/bootcamp/causation-station', title: 'Causation Station' },
  'fallacy-flaw': { Comp: FallacyFlawBootcamp, routePath: '/bootcamp/fallacy-flaw', title: 'Flaw and Famous Flaws' },
  abstraction: { Comp: AbstractBootcamp, routePath: '/topics/abstract', title: 'Abstract', bootcampIdOverride: 'abstraction' },
};
