import HubMessages from '@/components/hub/HubMessages';
import { useDossier } from './StudentDossier';

/** Messages = this student's platform thread with Joshua. */
export default function DossierMessages() {
  const { studentId, studentName } = useDossier();
  return (
    <div className="h-full p-5">
      <HubMessages studentId={studentId} studentName={studentName} />
    </div>
  );
}
