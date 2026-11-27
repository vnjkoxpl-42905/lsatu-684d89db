import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SectionDirectionsCard } from '@/components/drill/official/SectionDirectionsCard';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentAssignment } from '@/hooks/useStudentAssignments';
import { useLoadedStudentWorkAcknowledgment } from '@/hooks/useStudentWorkState';
import { getPracticeTestDeviceId } from '@/lib/practiceTestStore';
import { assignedRcSectionRoute, readSectionTimingMode, SECTION_DIRECTIONS, sectionMinutes } from '@/lib/sectionDirections';
import { prepareAssignedTimedSection } from '@/lib/timedSectionClient';
import './section-directions.css';

export default function AssignedRcSectionDirections() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  return <AssignmentDirections key={(user?.id ?? '') + ':' + (assignmentId ?? '')}
    assignmentId={assignmentId} ownerId={user?.id} />;
}

function AssignmentDirections({ assignmentId, ownerId }: { assignmentId?: string; ownerId?: string }) {
  const navigate = useNavigate();
  const { assignment, loading, error } = useStudentAssignment(assignmentId);
  const [opening, setOpening] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const launchId = useRef<string | null>(null);
  const mounted = useRef(false);
  const openingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const timing = readSectionTimingMode(assignment?.section_timing_mode);
  const pt = assignment?.section_preptest;
  const section = assignment?.section_number;
  const manifest = assignment?.section_manifest_sha256;
  const valid = !!ownerId && !!assignmentId && assignment?.id === assignmentId
    && assignment.student_id === ownerId && assignment.section_kind === 'rc'
    && timing !== null && typeof pt === 'number' && Number.isInteger(pt) && pt > 0
    && typeof section === 'number' && Number.isInteger(section) && section >= 1 && section <= 4
    && typeof manifest === 'string' && /^[a-f0-9]{64}$/.test(manifest)
    && assignment.question_qids.length > 0;

  useLoadedStudentWorkAcknowledgment({
    sourceTable: 'homework_assignments',
    sourceId: assignmentId,
    studentId: ownerId,
    ready: valid && !loading && !error,
  });

  if (loading) {
    return <main className="section-directions" aria-busy="true">
      <p className="section-directions-status" role="status">Loading your section...</p>
    </main>;
  }
  if (!valid || error) {
    return <main className="section-directions">
      <div className="section-directions-card">
        <h1 className="section-directions-title">Section unavailable</h1>
        <p className="section-directions-body">Open your Classroom and try again.</p>
      </div>
      <button type="button" className="section-directions-go" onClick={() => navigate('/classroom')}>
        BACK TO CLASSROOM
      </button>
    </main>;
  }

  const minutes = sectionMinutes(timing);
  const openSection = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setLaunchError(null);
    try {
      launchId.current ??= crypto.randomUUID();
      const sitting = await prepareAssignedTimedSection({
        ownerId,
        assignmentId,
        launchId: launchId.current,
        deviceId: getPracticeTestDeviceId(),
        pt,
        section,
        manifest,
        budgetMs: minutes === null ? null : minutes * 60000,
      });
      if (mounted.current) navigate(assignedRcSectionRoute(assignmentId, sitting.id));
    } catch (failure) {
      if (mounted.current) setLaunchError(
        failure instanceof Error ? failure.message : 'Your section could not open. Try again.',
      );
    } finally {
      openingRef.current = false;
      if (mounted.current) setOpening(false);
    }
  };

  return <main className="section-directions" aria-busy={opening}>
    <button type="button" className="section-directions-back" onClick={() => navigate('/classroom')}>
      Back to home
    </button>
    <SectionDirectionsCard
      sectionNumber={section}
      minutes={minutes}
      questionCount={assignment.question_qids.length}
      directions={SECTION_DIRECTIONS.rc}
    />
    {launchError && <p className="section-directions-status" role="alert">{launchError}</p>}
    <button type="button" className="section-directions-go" disabled={opening} onClick={() => void openSection()}>
      {opening ? 'OPENING SECTION...' : assignment.status === 'completed' ? 'OPEN SECTION RESULTS' : 'OPEN SECTION'}
    </button>
  </main>;
}
