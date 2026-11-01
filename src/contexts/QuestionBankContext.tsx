import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { questionBank, QuestionManifest } from '@/lib/questionLoader';

interface QuestionBankContextType {
  manifest: QuestionManifest | null;
  isLoading: boolean;
  error: string | null;
}

const QuestionBankContext = createContext<QuestionBankContextType | undefined>(undefined);

/**
 * Routes that provably never read the question bank, verified by grep: nothing
 * under src/features/activity-centre/, src/pages/Auth.tsx, or src/features/rc/
 * imports questionLoader or useQuestionBank. Every /rc route — player, results,
 * search, redirect — renders out of src/features/rc/ and reads the RC bank in
 * public/data/rc/ instead, so a student opening one passage was downloading the
 * whole Logical Reasoning bank and firing an explanation request per PrepTest
 * before the passage could paint.
 *
 * This is a DENYLIST on purpose. The bank is ~5.5MB raw (1.4MB gzipped) and costs
 * ~111ms of blocked main thread plus one explanation fetch per PrepTest, and the
 * provider sits on the catch-all route (App.tsx), so every page paid for it —
 * including /auth, before the student had even signed in.
 *
 * The sidecar cost grows with the bank and the original note here said "9-14
 * explanation fetches". Measured on a clean load of /classroom/recaps on
 * 2026-09-08: 59 requests, 1.79MB transferred, 7.18MB decoded, 44% of the page's
 * total bytes, with 33 of the 59 returning 404 because those PrepTests have no
 * sidecar. Re-measure before quoting a number here.
 *
 * An allowlist would be the tidier shape and is the eventual fix (a provider per
 * consumer route group). It is not safe to write yet: 24 modules read the
 * `questionBank` singleton directly without subscribing to this context, so
 * "does this route call useQuestionBank()" is not a reliable test for "does this
 * route need the bank" — /analytics is the clearest example. Getting an allowlist
 * wrong renders a page with silently empty questions; getting this denylist wrong
 * is impossible for any route not named in it, because every other route keeps
 * exactly the behaviour it had before.
 *
 * Add to this list only after grepping the route's whole subtree for questionLoader.
 */
/**
 * '/classroom/recaps' is the full prefix on purpose, never '/classroom'. The
 * classroom shell is shared with /flagged and /journal, which do read the bank.
 * Verified 2026-09-08 by grepping everything this route mounts — the layout
 * shell, ClassroomRecapsView, StageIndexList, classroomData, useClassroomItems,
 * useAssignedTodoFeed and flaggedService: none import questionLoader. Leaving
 * the route re-evaluates on navigation, so walking from here to /flagged still
 * loads the bank before that page paints.
 */
const BANK_FREE_PREFIXES = [
  '/activities',
  '/activity-lab',
  '/auth',
  '/rc',
  '/classroom/recaps',
  '/question',
] as const;

function routeNeedsQuestionBank(pathname: string): boolean {
  return !BANK_FREE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function QuestionBankProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const [manifest, setManifest] = useState<QuestionManifest | null>(() =>
    questionBank.isReady() ? questionBank.getManifest() : null,
  );
  // Must start true on a route that will load, or the first render hands consumers
  // isLoading=false with an empty bank and they flash "not found" before the fetch
  // lands. Consumers gate their direct questionBank.getQuestion() calls on this.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !questionBank.isReady() && routeNeedsQuestionBank(pathname),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (questionBank.isReady()) {
      setManifest(questionBank.getManifest());
      setIsLoading(false);
      return;
    }

    // Re-evaluated on every navigation, so entering a consumer route from a
    // bank-free one still loads. questionBank.load() dedupes concurrent callers
    // and returns immediately once ready, so repeat calls are free.
    if (!routeNeedsQuestionBank(pathname)) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    questionBank
      .load()
      .then(() => {
        if (cancelled) return;
        setManifest(questionBank.getManifest());
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load question bank:', err);
        setError('Failed to load questions');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <QuestionBankContext.Provider value={{ manifest, isLoading, error }}>
      {children}
    </QuestionBankContext.Provider>
  );
}

export function useQuestionBank() {
  const context = useContext(QuestionBankContext);
  if (context === undefined) {
    throw new Error(
      'useQuestionBank must be used within QuestionBankProvider. The provider wraps ' +
        'the catch-all route in App.tsx; a route rendered outside it (or a component ' +
        'rendered above it) needs its own <QuestionBankProvider>.',
    );
  }
  return context;
}
