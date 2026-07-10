import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar, 
  Tooltip,
} from 'recharts';
import { FLAW_CATALOG } from '../data/flaws';
import { FluidExpandingGrid } from './ui/fluid-expanding-grid';
import { VIDEO_ASSETS } from '../data/videoAssets';
import { VideoCard } from './VideoCard';
import { FlawDrillLauncher } from './FlawDrillLauncher';

interface HomeProps {
  onStartLesson: () => void;
  onGoToDrills: (drillId?: string) => void;
}

const FLAW_HIGHLIGHTS = [
  {
    id: "nec-suff",
    title: "Necessary vs. Sufficient",
    subtitle: "Confusing conditional requirements",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
    color: "#1a1a1a",
  },
  {
    id: "causal",
    title: "Causal Fallacy",
    subtitle: "Correlation is not causation",
    image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80",
    color: "#2a2a2a",
  },
  {
    id: "circular",
    title: "Circular Reasoning",
    subtitle: "The conclusion is the premise",
    image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&q=80",
    color: "#3a3a3a",
  }
];

export function Home({ onStartLesson, onGoToDrills }: HomeProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [averageAccuracy, setAverageAccuracy] = useState(0);

  useEffect(() => {
    try {
      const savedStats = JSON.parse(localStorage.getItem('lsat_flaw_performance') || '{}');
      // Build from FLAW_CATALOG (14 unique flaws), not DRILLS (16 entries with
      // duplicate names), so stats are not double-counted and no duplicate
      // module cards render.
      const data = FLAW_CATALOG.map(drill => {
        const val = savedStats[drill.name] || { correct: 0, attempts: 0, totalTime: 0 };
        return {
          id: drill.id,
          name: drill.name,
          accuracy: val.attempts > 0 ? Math.round((val.correct / val.attempts) * 100) : 0,
          attempts: val.attempts,
          avgTime: val.attempts > 0 ? Math.round(val.totalTime / val.attempts) : 0,
        };
      }).sort((a, b) => (b.attempts > 0 ? 1 : 0) - (a.attempts > 0 ? 1 : 0) || b.accuracy - a.accuracy);

      setStats(data);
      
      const total = data.reduce((acc, curr) => acc + curr.attempts, 0);
      setTotalAttempts(total);
      
      const attempted = data.filter(d => d.attempts > 0);
      if (attempted.length > 0) {
        const avg = attempted.reduce((acc, curr) => acc + curr.accuracy, 0) / attempted.length;
        setAverageAccuracy(Math.round(avg));
      }
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  }, []);

  const chartData = stats.filter(s => s.attempts > 0).map(s => ({
    subject: s.name.length > 12 ? s.name.substring(0, 10) + '...' : s.name,
    A: s.accuracy,
    fullMark: 100,
  }));

  const displayChartData = chartData;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f5f2ed]">
      <motion.div 
        className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Elegant Hero */}
        <header className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={itemVariants} className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-serif tracking-tighter italic leading-tight text-[#1a1a1a]">
                LSAT Fallacy<br />
                Bootcamp.
              </h1>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={onStartLesson}
                className="px-10 py-5 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-all rounded-sm shadow-2xl flex items-center gap-3 group"
              >
                Start Bootcamp Intro 
                <motion.span 
                  className="text-xs opacity-50 block transition-transform group-hover:translate-x-1"
                >
                  →
                </motion.span>
              </button>
              <FlawDrillLauncher
                flawId="causal-flaw"
                flawName="Causal Flaw"
                variant="ghost"
                className="px-10 py-5"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative p-1 bg-white border border-[#1a1a1a]/5 rounded-sm shadow-2xl"
          >
            <div className="bg-[#1a1a1a] text-[#f5f2ed] p-10 space-y-10 rounded-sm">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-white/40">Student Statistics</h2>
                  <p className="font-serif italic text-2xl">Mastery Visualization</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold tracking-tighter">{averageAccuracy}%</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/30">Avg. Accuracy</div>
                </div>
              </div>

              <div className="h-[300px] w-full">
                {displayChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displayChartData}>
                      <PolarGrid stroke="#fff" strokeOpacity={0.1} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#fff', fillOpacity: 0.4 }} />
                      <Radar
                        name="Accuracy"
                        dataKey="A"
                        stroke="#fff"
                        fill="#fff"
                        fillOpacity={0.15}
                      />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', textTransform: 'uppercase' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center border border-white/10 text-center">
                    <p className="max-w-xs text-xs font-bold uppercase tracking-[0.22em] text-white/30">
                      Accuracy chart appears after your first saved flaw drill.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Total Attempted</div>
                  <div className="text-2xl font-serif italic">{totalAttempts} Drills</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Method Mastery</div>
                  <div className="text-2xl font-serif italic">{Math.round((stats.filter(s => s.attempts > 0).length / FLAW_CATALOG.length) * 100)}% Coverage</div>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Visual Highlights Section */}
        <motion.section variants={itemVariants} className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif italic tracking-tighter">Common Fallacy Patterns</h2>
            <p className="text-xs text-[#1a1a1a]/40 uppercase tracking-widest font-bold">Interact with the core structures</p>
          </div>
          <div className="h-[500px]">
             <FluidExpandingGrid items={FLAW_HIGHLIGHTS} />
          </div>
        </motion.section>

        {/* Drill Catalog Grid */}
        <motion.section variants={itemVariants} className="space-y-12">
          <div className="flex justify-between items-end border-b border-[#1a1a1a]/10 pb-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif italic tracking-tighter">Practice Modules</h2>
              <p className="text-sm text-[#1a1a1a]/50">Select a specific fallacy to target, or use the Adaptive Mixed Practice button above.</p>
            </div>
             <div className="flex gap-2">
               <div className="px-3 py-1 bg-[#1a1a1a]/5 rounded-full text-[9px] font-bold uppercase tracking-widest text-[#1a1a1a]/40">
                 {FLAW_CATALOG.length} Modules Available
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((drill, idx) => (
              <div
                key={drill.id}
                onClick={() => onGoToDrills(drill.id)}
                className="group p-8 bg-white border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40 transition-all cursor-pointer rounded-sm space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-[#1a1a1a]/30 uppercase font-bold tracking-widest">
                      Module {String(idx + 1).padStart(2, '0')}
                    </span>
                    {drill.attempts > 0 && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    )}
                  </div>
                  <h3 className="text-xl font-serif italic leading-tight group-hover:translate-x-1 transition-transform">{drill.name}</h3>
                </div>

                <div className="space-y-4">
                  {drill.attempts > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] uppercase tracking-widest font-bold">
                        <span className="text-[#1a1a1a]/40 text-[8px]">Accuracy</span>
                        <span>{drill.accuracy}%</span>
                      </div>
                      <div className="h-1 w-full bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#1a1a1a]" 
                          style={{ width: `${drill.accuracy}%` }} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] uppercase tracking-widest font-bold text-[#1a1a1a]/20">
                      Not yet attempted
                    </div>
                  )}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] transform group-hover:translate-x-2 inline-block transition-transform">
                      {drill.attempts > 0 ? 'Review & Improve' : 'Start Mission'} →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Video Library Introduction */}
        <motion.section variants={itemVariants} className="space-y-12">
          <div className="flex justify-between items-end border-b border-[#1a1a1a]/10 pb-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif italic tracking-tighter">Video Library</h2>
              <p className="text-sm text-[#1a1a1a]/50">Foundational concepts and overview videos to watch before you begin your drills.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {VIDEO_ASSETS.filter(v => v.type === 'global').map(video => (
              <div key={video.id} className="h-full">
                <VideoCard 
                  title={video.title}
                  description={video.description}
                  url={video.url}
                  label="Watch"
                />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Real LSAT Bank Drill grid */}
        <motion.section variants={itemVariants} className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[#1a1a1a]/50">LSAT Bank · Woven In</h3>
            <h2 className="text-4xl md:text-5xl font-serif italic tracking-tighter">Drill the flaws on real LSAT questions.</h2>
            <p className="text-sm text-[#1a1a1a]/60 max-w-2xl">Every flaw in the catalog is wired to matching Flaw-type questions from the LSAT U bank. Open any one in the same Smart Drill interface used across the platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FLAW_CATALOG.map((flaw) => (
              <div key={flaw.id} className="flex items-center justify-between gap-3 border border-[#1a1a1a]/10 bg-white px-4 py-3 rounded-sm hover:border-[#1a1a1a]/40 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-serif italic truncate">{flaw.name}</div>
                </div>
                <FlawDrillLauncher flawId={flaw.id} flawName={flaw.name} variant="compact" />
              </div>
            ))}
          </div>
        </motion.section>



        {/* Footer Methodology */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[#1a1a1a]/10 pt-16 pb-20">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a]/40">The Approach</h3>
            <p className="text-2xl font-serif italic leading-snug">
              "Don't just read the argument. Hunt for the logical foul."
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest">Active Recall</h4>
              <p className="text-xs text-[#1a1a1a]/50 leading-relaxed">Questions move from identification of support to structural gap analysis.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest">Growth Tracking</h4>
              <p className="text-xs text-[#1a1a1a]/50 leading-relaxed">Your dashboard adjusts dynamically to highlight your most persistent blind spots.</p>
            </div>
          </div>
        </motion.section>

      </motion.div>
    </div>
  );
}
