import { NavLink } from 'react-router-dom';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { INTEGRATED_PATH } from '@/bootcamps/main-conclusion/content/introToLrPath';

export function IntegratedPathRail() {
  const currentPath = window.location.pathname;

  return (
    <nav className="hidden desktop:flex flex-col gap-6 w-56 pr-8 border-r border-[rgb(var(--border)/0.08)] py-12 shrink-0 h-full overflow-y-auto">
      <div className="font-mc-mono text-[10px] uppercase tracking-widest text-ink-faint/60 mb-2">
        Intro to LR Path
      </div>
      <div className="relative flex flex-col gap-4">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[rgb(var(--border)/0.12)]" />
        
        {INTEGRATED_PATH.map((action) => {
          const isActive = currentPath.includes(action.route);
          
          return (
            <NavLink
              key={action.id}
              to={action.route}
              className={cn(
                "group relative flex items-start gap-3 text-ink-soft hover:text-ink transition-colors",
                isActive && "text-ink font-medium"
              )}
            >
              <div className={cn(
                "mt-1 w-3.5 h-3.5 rounded-full border-2 bg-white transition-colors z-10",
                isActive 
                  ? "border-[rgb(var(--accent))]" 
                  : "border-[rgb(var(--border)/0.4)] group-hover:border-[rgb(var(--border)/0.8)]"
              )} />
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-mc-mono opacity-60">
                  {action.type}
                </span>
                <span className="text-sm font-mc-serif italic">{action.title}</span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
