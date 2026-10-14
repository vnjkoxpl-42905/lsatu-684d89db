import { useNavigate } from 'react-router-dom';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { READING_CENTER_PATH } from '@/lib/readingCenterAccess';

export default function AssignedReadingCenterLink({ onNavigate, label = 'Reading Center' }: { onNavigate?: () => void; label?: string }) {
  const navigate = useNavigate();
  const access = useReadingCenterAccess();
  if (!access.allowed) return null;
  return <button type="button" className="classroom-nav" onClick={() => {
    onNavigate?.();
    navigate(READING_CENTER_PATH);
  }}>{label}</button>;
}
