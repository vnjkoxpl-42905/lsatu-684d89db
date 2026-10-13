import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import StudentNotes from '@/components/hub/StudentNotes';
import SessionBundleList from '@/components/teacher/students/SessionBundleList';
import RecapComposer from '@/components/teacher/RecapComposer';
import PostedRecapsList from '@/components/teacher/PostedRecapsList';
import { useAuth } from '@/contexts/AuthContext';
import { useDossier } from './StudentDossier';

/**
 * Notes = the student's notes/uploads plus sessions, transcripts, and the
 * post-session bundle pipeline absorbed from TeacherStudentDetail.
 */
export default function DossierNotes() {
  const { studentId, studentName } = useDossier();
  const { user } = useAuth();
  const [showRecap, setShowRecap] = useState(false);

  return (
    <div className="space-y-5 p-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowRecap(true)}
          className="inline-flex items-center gap-1.5 border border-black/15 px-3 py-2 text-xs font-semibold text-black/55 transition hover:bg-white/25 hover:text-black"
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          Post a session recap
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">
          Sessions and transcripts
        </h2>
        <SessionBundleList studentId={studentId} />
      </section>

      {/* Posting was a one-way door: this page could put a recap in a student's
          Classroom and had no way to show one back. The only screen that listed
          them, TeacherRecaps, had no route and was deleted 2026-09-09. */}
      <section className="space-y-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">
          Posted to their Classroom
        </h2>
        <PostedRecapsList studentId={studentId} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">
          Notes and uploads
        </h2>
        <StudentNotes studentId={studentId} studentName={studentName} />
      </section>

      {showRecap && user && (
        <RecapComposer
          studentId={studentId}
          adminUserId={user.id}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}
