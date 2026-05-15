import LessonReader from "./LessonReader";

// LessonBody: shared lesson body renderer for ModuleNote.
//
// Strips the standalone reader chrome (nav, hero title, outer card border,
// completion CTA) and applies the cased-body CSS scope so prose reads in
// regular weight at 1.7 line-height instead of the standalone view's
// uppercase italic. The hosting ModuleNote owns the scrollable container,
// the read-this button, and the quiz CTA.

export default function LessonBody({ lessonId }: { lessonId: string }) {
  return (
    <LessonReader
      lockedLessonId={lessonId}
      hideNav
      hideComplete
      hideTitle
      hideCard
      casedBody
    />
  );
}
