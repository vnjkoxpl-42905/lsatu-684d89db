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
  "01": { title: "The Skeleton (7 slots)", body: card01 },
  "02": { title: "FABS and the Indicator Buckets", body: card02 },
  "03": { title: "Conclusion-Opinion-Pivot-Support", body: card03 },
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
      <div className="p-6 text-sm text-muted-foreground">
        Reference card not found.{" "}
        <Link className="underline" to="/topics/abstract">
          Back to Abstract
        </Link>
        .
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <ChapterReader markdown={card.body} />
    </div>
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
