import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { ElegantShape } from './ui/shape-landing-hero';

export default function WelcomeScreen({ onSaveName }: { onSaveName: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSaveName(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl opacity-50" />
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.15]"
          className="left-[-10%] top-[15%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.15]"
          className="right-[-5%] top-[70%]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full bg-zinc-900/60 border border-white/[0.08] p-10 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-3 block">Premium Student Plan</span>
            <h1 className="text-4xl font-serif italic text-white tracking-tight mb-2">LSAT Mastery</h1>
            <div className="h-px w-12 bg-white/10 mx-auto mt-4 mb-4" />
            <p className="text-zinc-400 font-light text-sm tracking-wide">Enter your name to begin your 14-day path to logic mastery.</p>
          </motion.div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <label htmlFor="name" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 ml-1">
              Student Identity
            </label>
            <input
              id="name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.05] rounded-2xl px-5 py-4 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
              placeholder="Your name"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button 
                type="submit" 
                className="w-full h-14 bg-white text-zinc-950 hover:bg-zinc-200 rounded-2xl font-semibold text-base transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                size="lg" 
                disabled={!name.trim()}
            >
              Initialize My Plan
            </Button>
          </motion.div>
        </form>

        <div className="mt-10 pt-8 border-t border-white/[0.05] text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Flaw & Principle Specialist Edition</p>
        </div>
      </motion.div>
    </div>
  );
}
