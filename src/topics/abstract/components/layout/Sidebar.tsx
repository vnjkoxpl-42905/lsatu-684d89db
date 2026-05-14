import React from 'react';
import { useApp } from '../../store/AppContext';
import { BookOpen, CheckCircle, FileText, Target, Brain, PenTool, LayoutDashboard, Flag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ViewState } from '../../types';

import { motion } from 'framer-motion';

export default function Sidebar() {
  const { currentView, setCurrentView, bootcampState } = useApp();

  const navItems: { id: ViewState; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'var(--color-brutal-yellow)' },
    { id: 'lesson', label: 'Guided Lessons', icon: BookOpen, color: 'var(--color-brutal-cyan)' },
    { id: 'extraction_workspace', label: 'Extraction Workspace', icon: PenTool, color: 'var(--color-brutal-green)' },
    { id: 'translator_workspace', label: 'Translator', icon: FileText, color: 'var(--color-brutal-pink)' },
    { id: 'drill', label: 'Targeted Drills', icon: Target, color: 'var(--color-brutal-red)' },
    { id: 'flashcards', label: 'Flashcards', icon: Brain, color: 'var(--color-brutal-cyan)' },
    { id: 'methods_library', label: 'Methods Library', icon: BookOpen, color: 'var(--color-brutal-yellow)' },
    { id: 'timed_set', label: 'Final Timed Set', icon: Flag, color: 'var(--color-brutal-green)' },
    { id: 'completion_report', label: 'Completion Report', icon: CheckCircle, color: 'var(--color-brutal-pink)' },
  ];

  return (
    <aside className="w-64 bg-brutal-bg border-r-4 border-brutal-ink flex flex-col h-full shrink-0 z-20">
      <div className="p-6 border-b-4 border-brutal-ink bg-brutal-yellow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brutal-ink border-2 border-brutal-ink flex items-center justify-center brutal-shadow-sm">
            <span className="text-sm font-black text-white">LU</span>
          </div>
          <span className="font-display font-black text-xl text-brutal-ink tracking-tight uppercase">LSAT U</span>
        </div>
        <p className="text-[10px] text-brutal-ink font-black mt-2 uppercase tracking-[0.2em]">Abstract Bootcamp</p>
      </div>

      <nav className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 border-2 border-brutal-ink text-sm font-black transition-all outline-none uppercase tracking-tight",
                isActive 
                  ? "brutal-shadow translate-x-[-2px] translate-y-[-2px]" 
                  : "bg-white hover:bg-brutal-bg hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_#000]"
              )}
              style={{ backgroundColor: isActive ? item.color : undefined }}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-6 border-t-4 border-brutal-ink bg-white">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest">Progress</span>
          <span className="text-xs font-black">{bootcampState.completedLessons.length}/8</span>
        </div>
        <div className="w-full h-4 bg-brutal-bg border-2 border-brutal-ink p-1">
          <div
            className="h-full bg-brutal-green border-r-2 border-brutal-ink transition-all duration-500"
            style={{ width: `${(bootcampState.completedLessons.length / 8) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
