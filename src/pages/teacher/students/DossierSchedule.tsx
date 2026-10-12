import StudentSchedulePanel from '@/components/teacher/schedule/StudentSchedulePanel';
import { useDossier } from './StudentDossier';

/**
 * Schedule = the same per-student month grid the Schedule room renders. Both
 * mount `StudentSchedulePanel`; the room supplies its own student picker,
 * the dossier already knows the student and hides the panel's heading.
 */
export default function DossierSchedule() {
  const { studentId, studentName, studentEmail } = useDossier();
  return (
    <div className="p-5">
      <StudentSchedulePanel
        studentId={studentId}
        studentName={studentName}
        studentEmail={studentEmail}
        showHeading={false}
      />
    </div>
  );
}
