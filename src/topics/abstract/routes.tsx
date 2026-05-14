import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AbstractTopicPage } from "./AbstractTopicPage";
import { ChapterLanding } from "./ChapterLanding";
import { ReferenceCardView } from "./components/ReferenceCardView";
import { FlashcardDeck } from "./components/FlashcardDeck";
import { MethodsLibrary } from "./MethodsLibrary";
import { DrillRouter } from "./drills/DrillRouter";

// Declarative route table for the Abstract topic. Currently App.tsx mounts the
// routes inline (so they can sit inside the QuestionBankProvider Routes wrapper)
// but this table is the canonical reference and is consumable by useRoutes if
// the routing layer is later migrated to data-router APIs.
//
// /playground redirects to D1 because the Playground was the clause-by-role
// drag-and-drop drill; argument-structure labeling moved back to Intro to LR
// in the v1.2 content boundary cleanup.
export const abstractRoutes: RouteObject[] = [
  {
    path: "/topics/abstract",
    element: <AbstractTopicPage />,
    children: [
      { index: true, element: <ChapterLanding /> },
      {
        path: "playground",
        element: <Navigate to="/topics/abstract/drills/d1" replace />,
      },
      { path: "methods", element: <MethodsLibrary /> },
      { path: "drills/:drillId", element: <DrillRouter /> },
      { path: "flashcards", element: <FlashcardDeck /> },
      { path: "reference/:cardId", element: <ReferenceCardView /> },
    ],
  },
];
