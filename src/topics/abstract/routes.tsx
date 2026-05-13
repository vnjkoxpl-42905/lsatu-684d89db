import type { RouteObject } from "react-router-dom";
import { AbstractTopicPage } from "./AbstractTopicPage";
import { ChapterLanding } from "./ChapterLanding";
import { SlotFiller } from "./components/SlotFiller";
import { ReferenceCardView } from "./components/ReferenceCardView";
import { FlashcardDeck } from "./components/FlashcardDeck";
import { DrillRouter } from "./drills/DrillRouter";

// Declarative route table for the Abstract topic. Currently App.tsx mounts the
// routes inline (so they can sit inside the QuestionBankProvider Routes wrapper)
// but this table is the canonical reference and is consumable by useRoutes if
// the routing layer is later migrated to data-router APIs.
export const abstractRoutes: RouteObject[] = [
  {
    path: "/topics/abstract",
    element: <AbstractTopicPage />,
    children: [
      { index: true, element: <ChapterLanding /> },
      { path: "playground", element: <SlotFiller /> },
      { path: "drills/:drillId", element: <DrillRouter /> },
      { path: "flashcards", element: <FlashcardDeck /> },
      { path: "reference/:cardId", element: <ReferenceCardView /> },
    ],
  },
];
