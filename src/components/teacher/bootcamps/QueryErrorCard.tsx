import { RefreshCw } from "lucide-react";

// A failed query is not zero data. Anywhere a metric would otherwise fall back
// to 0 / "nothing recorded", this card says the truth instead: we could not
// read it, and here is how to try again.
export function QueryErrorCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
      <p className="text-sm text-zinc-300">Couldn't load this data.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
