import { useParams, Link } from "react-router-dom";
import { ChapterReader } from "./ChapterReader";
import card01 from "../content/reference-cards/01-skeleton-7-slots.md?raw";
import card02 from "../content/reference-cards/02-fabs-and-indicator-buckets.md?raw";
import card03 from "../content/reference-cards/03-conclusion-opinion-pivot-support.md?raw";
import card04 from "../content/reference-cards/04-three-master-keys.md?raw";
import card05 from "../content/reference-cards/05-directional-words.md?raw";
import card06 from "../content/reference-cards/06-verb-taxonomy.md?raw";
import card07 from "../content/reference-cards/07-decoded-glossary.md?raw";
import card08 from "../content/reference-cards/08-trap-master-catalog.md?raw";
import card09 from "../content/reference-cards/09-matching-keywords-framework.md?raw";
import card10 from "../content/reference-cards/10-key-terms-lsat-definitions.md?raw";

const CARDS: Record<string, { title: string; body: string }> = {
  "01": { title: "The Decode Workflow", body: card01 },
  "02": { title: "Translation Buckets", body: card02 },
  "03": { title: "Five-Bucket Decode Pass", body: card03 },
  "04": { title: "The Three Master Keys", body: card04 },
  "05": { title: "Directional Word Cheat Sheet", body: card05 },
  "06": { title: "Verb Taxonomy", body: card06 },
  "07": { title: "Decoded Glossary", body: card07 },
  "08": { title: "Trap Master Decoy Catalog", body: card08 },
  "09": { title: "Matching Keywords Framework", body: card09 },
  "10": { title: "Key Terms (LSAT Definitions)", body: card10 },
};

export const ABSTRACT_REFERENCE_CARD_IDS = Object.keys(CARDS);
export const ABSTRACT_REFERENCE_CARD_TITLES: Record<string, string> =
  Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, c.title]));

export function ReferenceCardView() {
  const params = useParams<{ cardId?: string }>();
  const id = params.cardId ?? "01";
  const card = CARDS[id];
  if (!card) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
        <p className="codex-eyebrow">Reference</p>
        <h1 className="codex-display mt-2 text-3xl">Card not found.</h1>
        <p className="codex-marginalia mt-3" style={{ fontStyle: "normal" }}>
          <Link to="/topics/abstract" className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            Back to the chapter
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
      <header className="codex-reveal-stack">
        <p className="codex-eyebrow">
          Reference · {id} / {ABSTRACT_REFERENCE_CARD_IDS.length}
        </p>
        <h1 className="codex-display mt-2 text-3xl md:text-4xl leading-tight">
          {card.title}
        </h1>
      </header>
      <hr className="codex-rule" />
      <div className="codex-reveal-stack">
        <ChapterReader markdown={card.body} />
      </div>
      <hr className="codex-rule" />
      <footer className="flex items-center justify-between">
        <Link
          to="/topics/abstract"
          className="codex-eyebrow underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          ← Back to chapter
        </Link>
        <ReferenceCardSiblings currentId={id} />
      </footer>
    </div>
  );
}

function ReferenceCardSiblings({ currentId }: { currentId: string }) {
  const ids = ABSTRACT_REFERENCE_CARD_IDS;
  const idx = ids.indexOf(currentId);
  const prev = idx > 0 ? ids[idx - 1] : null;
  const next = idx < ids.length - 1 ? ids[idx + 1] : null;
  return (
    <span className="flex items-center gap-3 text-sm">
      {prev ? (
        <Link
          to={`/topics/abstract/reference/${prev}`}
          className="codex-eyebrow underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          ← {prev}
        </Link>
      ) : null}
      {next ? (
        <Link
          to={`/topics/abstract/reference/${next}`}
          className="codex-eyebrow underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          {next} →
        </Link>
      ) : null}
    </span>
  );
}

export function ReferenceCardList() {
  return (
    <ul className="space-y-1 text-sm">
      {Object.entries(CARDS).map(([id, c]) => (
        <li key={id}>
          <Link
            to={`/topics/abstract/reference/${id}`}
            className="block rounded-md px-2 py-1 hover:bg-secondary"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {id}.
            </span>{" "}
            {c.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
