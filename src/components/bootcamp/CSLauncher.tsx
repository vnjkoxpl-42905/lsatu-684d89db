import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import '@/components/bootcamp/styles/cs-punk.css';

interface CSLauncherProps {
  onEnter: () => void;
}

/**
 * Decorative-only splash screen matching the source prototype's Launcher
 * screen. Purely cosmetic — access control is handled entirely upstream by
 * BootcampGate/Supabase auth before this page ever mounts. No name entry:
 * the greeting uses the already-authenticated student's own name.
 */
const CSLauncher: React.FC<CSLauncherProps> = ({ onEnter }) => {
  const { user } = useAuth();

  const firstName = React.useMemo(() => {
    const raw =
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email?.split('@')[0] ||
      '';
    const name = raw.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, '');
    return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : '';
  }, [user]);

  return (
    <div className="cs-punk min-h-screen flex items-center justify-center p-4">
      <div className="animate-fade-in-up w-full max-w-md bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-10 text-center">
        <h1 className="text-5xl font-extrabold text-punk-magenta drop-shadow-neon-magenta mb-3">
          Causation Station
        </h1>
        <p className="text-punk-sub mb-8">
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'} Your training ground for LSAT causal reasoning.
        </p>
        <button
          onClick={onEnter}
          className="rounded-full bg-punk-cyan text-punk-base font-semibold px-10 py-3 text-lg hover:bg-white hover:shadow-neon-cyan active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-punk-cyan focus:ring-offset-2 focus:ring-offset-punk-base"
        >
          Enter
        </button>
      </div>
    </div>
  );
};

export default CSLauncher;
