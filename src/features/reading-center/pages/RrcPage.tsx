import { useNavigate } from 'react-router-dom';
import { SectionLibraryPanel } from '@/features/activity-centre/components/SectionLibraryPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { rrcExitPath } from '../lib/rrcNavigation';
import '@/features/activity-centre/activity-centre.css';

/** The original LR collection keeps its artwork, demonstrations and saved attempts. */
export default function RrcPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { is_admin } = useUserPermissions();
  const access = useReadingCenterAccess(!is_admin);
  // Legacy RRC-only assignments have no Reading Progress destination.
  const showProgress = !is_admin && !access.isPending && !access.allowed;
  return <div className="activity-centre min-h-screen" data-reading-activity="rrc">
    <SectionLibraryPanel title="LR Training" compact showProgress={showProgress} onExit={() => {
      if (user) void rrcExitPath(user.id, true).then(path => navigate(path));
    }} />
  </div>;
}
