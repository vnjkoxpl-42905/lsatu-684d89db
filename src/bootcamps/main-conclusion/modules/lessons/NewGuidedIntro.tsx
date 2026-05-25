import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Dumbbell, Target, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { INTRO_LR_PATH } from '@/bootcamps/main-conclusion/content/introToLrPath';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

export function NewGuidedIntro() {
  const navigate = useNavigate();

  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] flex">
      {/* Main Content Area */}
      <main className="flex-1 px-8 md:px-16 py-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-24">
            <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">Introduction</p>
            <h1 className="text-[clamp(56px,8vw,120px)] font-serif italic font-medium leading-[0.80] tracking-[-0.05em] mb-8">Intro to LR.</h1>
            <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed">
              A guided, article-based journey into LSAT Logical Reasoning.
            </p>
          </header>

          {/* Path Steps */}
          <div className="space-y-16">
            {INTRO_LR_PATH.map((step, i) => (
              <section key={step.id} id={step.id} className="scroll-mt-24 p-8 bg-white border border-[rgba(26,26,26,0.05)] rounded-[4px] shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-4">Step {i + 1}</div>
                <h2 className="text-3xl font-serif italic mb-6">{step.title}</h2>
                <p className="text-lg leading-relaxed text-[rgba(26,26,26,0.7)] mb-8 max-w-2xl">
                  {step.description}
                </p>

                <div className="flex flex-wrap gap-4">
                  {step.noteRoute && (
                    <Link
                      to={step.noteRoute}
                      className="inline-flex items-center gap-2 bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[rgba(26,26,26,0.8)] transition-all"
                    >
                      <BookOpen className="h-4 w-4" />
                      Read Lesson
                    </Link>
                  )}
                  {step.drillId && (
                    <Link
                      to={`/bootcamp/intro-to-lr/drills/${step.drillId.replace('MC-DRL-', '')}`}
                      className="inline-flex items-center gap-2 border border-[rgba(26,26,26,0.1)] px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[rgba(26,26,26,0.05)] transition-all"
                    >
                      <Dumbbell className="h-4 w-4" />
                      Interactive Drill
                    </Link>
                  )}
                  {step.practiceSlug && (
                    <Button
                      variant="subtle"
                      onClick={() => navigate(`/bootcamp/intro-to-lr/practice-drills/${step.practiceSlug}`)}
                      className="inline-flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Focused Practice
                    </Button>
                  )}
                  {step.id === 'final-practice' && (
                    <Button
                      variant="primary"
                      onClick={() => navigate('/bootcamp/intro-to-lr/simulator')}
                      className="inline-flex items-center gap-2"
                    >
                      <Target className="h-4 w-4" />
                      Go to Simulator
                    </Button>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
