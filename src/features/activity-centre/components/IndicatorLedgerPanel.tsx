import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ledgerHeadline, type IndicatorLedger } from "../ledger";

interface IndicatorLedgerPanelProps {
  ledger: IndicatorLedger;
  /** Re-run just the misses as an ungraded practice set. */
  onRedrill?: (orders: number[]) => void;
}

/**
 * What the run actually taught, rather than what it scored.
 *
 * The number at the top of the completion screen is a result. This is the
 * diagnosis: which words the marks went to, grouped so that a student reads five
 * families instead of sixty-two rows. Every figure on it is a count of judged
 * items, so there is nothing here the attempt log cannot be made to prove.
 *
 * The families that were clean get one quiet line between them, not a block
 * each. A clean family is worth knowing and is not worth reading about.
 */
export function IndicatorLedgerPanel({ ledger, onRedrill }: IndicatorLedgerPanelProps) {
  const headline = ledgerHeadline(ledger);
  const clean = ledger.cleanFamilies;
  const nothingMissed = ledger.missed === 0;

  return (
    <section
      className="mt-6 rounded-[28px] border border-border bg-card p-6 md:p-8"
      aria-labelledby="ledger-heading"
      data-testid="indicator-ledger"
    >
      <h2
        id="ledger-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
      >
        Where the marks went
      </h2>

      {nothingMissed ? (
        <p className="mt-3 text-lg text-foreground">
          Nothing missed. Every indicator you were asked about, you translated.
        </p>
      ) : (
        <>
          {headline && <p className="ac-display mt-3 text-2xl text-foreground">{headline}</p>}
          <p className={cn("text-sm text-muted-foreground", headline ? "mt-2" : "mt-3")}>
            {ledger.missed} of {ledger.asked} checked {ledger.asked === 1 ? "question" : "questions"}{" "}
            did not earn full credit, across{" "}
            {ledger.missedFamilies.length === 1
              ? "one family of indicators"
              : `${ledger.missedFamilies.length} families of indicators`}
            .
          </p>

          <ul className="mt-6 space-y-5">
            {ledger.missedFamilies.map((f) => (
              <li key={f.family} data-testid={`ledger-family-${f.family}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-base font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.missed} of {f.asked} missed
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{f.lesson}</p>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/80">
                  {f.indicators
                    .filter((i) => i.missed > 0)
                    .map((i) => (
                      <span key={i.indicator}>
                        <span className="font-medium">{i.indicator}</span>
                        {i.missed > 1 && (
                          <span className="text-muted-foreground"> &times;{i.missed}</span>
                        )}
                      </span>
                    ))}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {clean.length > 0 && (
        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="text-foreground/70">Clean: </span>
          {clean.map((f) => f.label).join(", ")}.
        </p>
      )}

      {/* The re-drill is offered only when there is something to re-drill and a
          runner willing to take a filtered list. It writes nothing: the misses
          are worth another look, and looking again is not a second grade. */}
      {onRedrill && ledger.missedOrders.length > 0 && (
        <div className="mt-6">
          <Button
            variant="outline"
            className="h-11 px-7"
            onClick={() => onRedrill(ledger.missedOrders)}
            data-testid="ledger-redrill"
          >
            {ledger.missedOrders.length === 1
              ? "Re-drill the one you missed"
              : `Re-drill the ${ledger.missedOrders.length} you missed`}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Practice only. Nothing you do here changes the score above.
          </p>
        </div>
      )}
    </section>
  );
}
