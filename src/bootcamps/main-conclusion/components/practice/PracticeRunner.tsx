import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface SimulatorItem {
  id: string;
  stimulus: string;
  main_conclusion: string;
  why: string;
  structure_map: string;
  follow_up_answer: string;
}

interface PracticeRunnerProps {
  items: SimulatorItem[];
  title: string;
  onExit: () => void;
}

export function PracticeRunner({ items, title, onExit }: PracticeRunnerProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const item = items[index];

  const handleNext = () => {
    setRevealed(false);
    setIndex((i) => Math.min(i + 1, items.length - 1));
  };

  const handlePrev = () => {
    setRevealed(false);
    setIndex((i) => Math.max(i - 1, 0));
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-mc-serif text-h2 text-ink">{title}</h1>
        <Button variant="subtle" size="sm" onClick={onExit}>Exit</Button>
      </header>

      <div className="mb-4 text-ink-faint font-mc-mono text-mono">
        Question {index + 1} of {items.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <Card variant="surface" className="p-6">
            <p className="font-mc-serif text-h3 text-ink leading-relaxed">{item.stimulus}</p>
          </Card>

          {!revealed ? (
            <Button className="w-full" onClick={() => setRevealed(true)}>
              Reveal Analysis
            </Button>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="space-y-4"
            >
              <div className="p-4 bg-[rgb(var(--accent)/0.08)] rounded-3 border border-[rgb(var(--accent)/0.2)]">
                <p className="font-semibold text-ink mb-1">Main Conclusion</p>
                <p className="text-ink-soft font-mc-serif">{item.main_conclusion}</p>
              </div>
              <div className="p-4 bg-[rgb(var(--surface-elev))] rounded-3 border">
                <p className="font-semibold text-ink mb-1">Structural Analysis</p>
                <p className="text-ink-soft mb-2">{item.why}</p>
                <p className="text-mc-accent font-mono text-sm">{item.structure_map}</p>
              </div>
            </motion.div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="subtle" onClick={handlePrev} disabled={index === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Prev
            </Button>
            <Button variant="subtle" onClick={handleNext} disabled={index === items.length - 1}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
