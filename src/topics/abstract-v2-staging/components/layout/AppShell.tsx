import React from 'react';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../store/AppContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentView } = useApp();

  return (
    <div className="flex h-screen w-full bg-brutal-bg text-brutal-ink font-sans overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-auto relative z-10 custom-scrollbar brutal-dotted">
        <div className="mx-auto w-full h-full max-w-6xl p-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
