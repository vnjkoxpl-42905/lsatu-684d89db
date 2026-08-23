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
 * under src/features/activity-centre/ or src/pages/Auth.tsx imports questionLoader
 * or useQuestionBank.
 *
 * This is a DENYLIST on purpose. The bank is ~5.5MB raw (1.4MB gzipped) and costs
 * ~111ms of blocked main thread plus 9-14 explanation fetches, and the provider sits
 * on the catch-all route (App.tsx), so every page paid for it — including /auth,
 * before the student had even signed in.
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
const BANK_FREE_PREFIXES = ['/activities', '/activity-lab', '/auth'] as const;

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
