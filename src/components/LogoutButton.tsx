import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuroraButton } from '@/components/ui/aurora-button';

export function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <AuroraButton
      type="button"
      className="w-full rounded-full px-5 py-3 text-sm font-medium"
      glowClassName="rounded-full"
      aria-label="Sign out"
      onClick={handleLogout}
    >
      Sign out
    </AuroraButton>
  );
}
