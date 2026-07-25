import { lazy, type ComponentType } from 'react';

// Bootcamp pages are full-screen SPA routes; they render blank inside an iframe
// (a fresh context loses the session). Mounting the page component inline in the
// same React tree keeps auth/context, so it renders. Shared by the inline-open
// view and the scaled card preview.

// Stale-chunk safe lazy: if the dynamic import fails or resolves to a module
// without a default export (post-deploy hash mismatch), force a one-time hard
// reload instead of throwing "Cannot read properties of undefined (reading
// 'default')" and blanking the screen.
const RELOAD_KEY = '__bootcamp_chunk_reload__';
function safeLazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod || !mod.default) throw new Error('missing default export');
      return mod;
    } catch (err) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
        }
      } catch {}
      throw err;
    }
  });
}

const PrincipleFlawBootcamp = safeLazy(() => import('@/pages/PrincipleFlawBootcamp'));
const IntroToLrBootcamp = safeLazy(() => import('@/pages/IntroToLrBootcamp'));
const CausationStation = safeLazy(() => import('@/pages/CausationStation'));
const FallacyFlawBootcamp = safeLazy(() => import('@/pages/FallacyFlawBootcamp'));
const AbstractBootcamp = safeLazy(() => import('@/topics/abstract'));
const RcEngagingPassageBootcamp = safeLazy(() => import('@/pages/RcEngagingPassageBootcamp'));

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
  'rc-engaging-with-the-passage': {
    Comp: RcEngagingPassageBootcamp,
    routePath: '/bootcamp/rc-engaging-with-the-passage',
    title: 'Engaging With The Passage',
  },
};
