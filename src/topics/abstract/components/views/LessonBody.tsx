import LessonReader from "./LessonReader";

// LessonBody: shared lesson body renderer.
//
// Both LessonReader (the standalone view) and ModuleNote (inside ModuleView)
// render lesson content via this component. LessonReader internally renders
// the per-lesson switch; LessonBody locks it to a single lesson and hides
// the standalone nav + completion CTA so the host (ModuleNote) owns those.

export default function LessonBody({ lessonId }: { lessonId: string }) {
  return (
    <LessonReader
      lockedLessonId={lessonId}
      hideNav
      hideComplete
    />
  );
}
