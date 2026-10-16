import { useNavigate } from 'react-router-dom';
import { SectionLibraryPanel } from '@/features/activity-centre/components/SectionLibraryPanel';
import { useAuth } from '@/contexts/AuthContext';
import { rrcExitPath } from '../lib/rrcNavigation';
import '@/features/activity-centre/activity-centre.css';

/** The original LR collection keeps its artwork, demonstrations and saved attempts. */
export default function RrcPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return <div className="activity-centre min-h-screen" data-reading-activity="rrc">
    <SectionLibraryPanel onExit={() => {
      if (user) void rrcExitPath(user.id, true).then(path => navigate(path));
    }} />
  </div>;
}
