import { Link } from 'react-router-dom';
import FirstAnswerProgressPanel from '@/components/analytics/FirstAnswerProgressPanel';
import { useDossier } from './StudentDossier';

export default function DossierProgress() {
  const { studentId, studentName } = useDossier();

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black">{studentName || 'Student'}'s progress</h2>
          <p className="mt-1 text-xs text-black/55">Saved first answers for the selected student. Your own practice answers remain in your account.</p>
        </div>
        <Link to="../review" className="inline-flex min-h-11 items-center border border-black/15 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white/30">Review missed questions</Link>
      </div>
      <FirstAnswerProgressPanel studentId={studentId} />
    </div>
  );
}
