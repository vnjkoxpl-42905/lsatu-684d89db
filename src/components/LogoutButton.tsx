import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-rose-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Log out"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Logout</span>
    </button>
  );
}
