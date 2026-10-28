import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { LESSONS } from "../../data/lessons";
import { cn } from "../../lib/utils";
import { NOTE_COMPONENTS } from "./AbstractNotes";

// LessonReader renders one module note. Inside a module (the normal path) it
// is mounted through LessonBody with lockedLessonId and all chrome hidden; the
// hosting ModuleNote owns the "I read this" button and the quiz link. The
// standalone mode (nav arrows + complete button) is kept for the "lesson" view.
//
// The note content itself lives in AbstractNotes.tsx.

interface LessonReaderProps {
  lockedLessonId?: string;
  hideNav?: boolean;
  hideComplete?: boolean;
  hideTitle?: boolean;
  hideCard?: boolean;
  casedBody?: boolean;
  onComplete?: () => void;
}

export default function LessonReader({
  lockedLessonId,
  hideNav,
  hideComplete,
  hideTitle,
  hideCard,
  casedBody,
  onComplete,
}: LessonReaderProps = {}) {
  const { bootcampState, markLessonComplete, setCurrentView } = useApp();

  const firstUncompletedId =
    LESSONS.find((l) => !bootcampState.completedLessons.includes(l.id))?.id || LESSONS[0].id;
  const [internalLessonId, setCurrentLessonId] = useState(firstUncompletedId);
  const currentLessonId = lockedLessonId ?? internalLessonId;
  const currentIndex = Math.max(
    0,
    LESSONS.findIndex((l) => l.id === currentLessonId),
  );
  const lesson = LESSONS[currentIndex];
  const isCompleted = bootcampState.completedLessons.includes(lesson.id);
  const Note = NOTE_COMPONENTS[lesson.id];

  const handleComplete = () => {
    void markLessonComplete(lesson.id);
    if (onComplete) {
      onComplete();
      return;
    }
    if (currentIndex < LESSONS.length - 1) {
      setCurrentLessonId(LESSONS[currentIndex + 1].id);
    } else {
      setCurrentView("dashboard");
    }
  };

  return (
    <div className="max-w-[760px] mx-auto z-10 relative">
      {!hideNav && (
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Lesson {currentIndex + 1} of {LESSONS.length}
          </p>
          <div className="flex gap-3">
            {currentIndex > 0 && (
              <button
                type="button"
                aria-label="Previous lesson"
                onClick={() => setCurrentLessonId(LESSONS[currentIndex - 1].id)}
                className="p-3 bg-white border-4 border-brutal-ink hover:bg-brutal-yellow brutal-shadow"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentIndex < LESSONS.length - 1 && (
              <button
                type="button"
                aria-label="Next lesson"
                onClick={() => setCurrentLessonId(LESSONS[currentIndex + 1].id)}
                className="p-3 bg-white border-4 border-brutal-ink hover:bg-brutal-yellow brutal-shadow"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <article
        className={cn(
          "z-10 relative text-brutal-ink",
          casedBody && "lesson-cased",
          hideCard ? "mb-0 p-0" : "mb-10 bg-white p-6 md:p-12 border-4 border-brutal-ink brutal-shadow-lg",
        )}
      >
        {!hideTitle && (
          <h1 className="text-4xl font-black tracking-tight mb-8 leading-tight">{lesson.title}</h1>
        )}
        {Note ? <Note /> : null}
      </article>

      {!hideComplete && (
        <div className="bg-brutal-yellow border-4 border-brutal-ink p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 brutal-shadow-lg mb-10">
          <p className="font-black text-xl">Ready to move on?</p>
          <button
            type="button"
            onClick={handleComplete}
            className={cn(
              "flex items-center gap-2 px-8 py-4 text-sm font-black uppercase tracking-widest border-4 border-brutal-ink brutal-shadow",
              isCompleted ? "bg-brutal-green" : "bg-brutal-ink text-white",
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle className="w-5 h-5" /> Completed
              </>
            ) : currentIndex < LESSONS.length - 1 ? (
              "Complete and continue"
            ) : (
              "Finish bootcamp"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
