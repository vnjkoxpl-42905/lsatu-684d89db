import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';

export function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <LiquidMetalButton
      label="Logout"
      ariaLabel="Log out"
      onClick={handleLogout}
    />
  );
}
