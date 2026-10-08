import { Link } from 'react-router-dom';
import { BookOpen, Dumbbell } from 'lucide-react';
import { INTRO_LR_PATH, getActionButtonLabel } from '@/bootcamps/main-conclusion/content/introToLrPath';

export function NewGuidedIntro() {
  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] flex">
      {/* Main Content Area */}
      <main className="flex-1 px-8 md:px-16 py-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-24">
            <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">Introduction</p>
            <h1 className="text-[clamp(56px,8vw,120px)] font-serif italic font-medium leading-[0.80] tracking-[-0.05em] mb-8">Argument Structure.</h1>
          </header>

          {/* Path Steps */}
          <div className="space-y-16">
            {INTRO_LR_PATH.map((action) => (
              <section key={action.id} id={action.id} className="scroll-mt-24 p-8 bg-white border border-[rgba(26,26,26,0.05)] rounded-[4px] shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-4">{action.type}</div>
                <h2 className="text-3xl font-serif italic mb-6">{action.title}</h2>
                <p className="text-lg leading-relaxed text-[rgba(26,26,26,0.7)] mb-8 max-w-2xl">
                  {action.description}
                </p>

                {action.metadata?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 mb-8 max-w-2xl">
                    {action.metadata.map((item) => (
                      <div key={`${action.id}-${item.label}`} className="space-y-1">
                        <div className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)]">
                          {item.label}
                        </div>
                        <div className="text-base text-[rgba(26,26,26,0.78)] leading-relaxed">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {action.constraint ? (
                  <div className="mb-8 max-w-2xl border border-[rgba(26,26,26,0.08)] bg-[rgba(26,26,26,0.02)] rounded-[4px] px-5 py-4">
                    <div className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-2">
                      Constraint
                    </div>
                    <p className="text-base leading-relaxed text-[rgba(26,26,26,0.78)]">
                      {action.constraint}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-4">
                  <Link
                    to={action.route}
                    state={action.linkState}
                    className="inline-flex items-center gap-2 bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[rgba(26,26,26,0.8)] transition-all"
                  >
                    {action.type === 'note' ? <BookOpen className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                    {action.buttonLabel ?? getActionButtonLabel(action.type)}
                  </Link>
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
