import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function NewGuidedIntro() {
  const notes = [
    { id: 'where-conclusions-hide', title: 'Where Conclusions Hide' },
    { id: 'layered-arguments', title: 'Layered Arguments' },
    { id: 'matching-the-answer', title: 'Matching the Answer' },
    { id: 'practice-path', title: 'Practice Path' },
  ];

  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] font-sans px-6 md:px-12 py-24">
      <div className="max-w-[1180px] mx-auto">
        <header className="mb-24">
          <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">Introduction</p>
          <h1 className="text-[clamp(72px,10vw,136px)] font-serif italic font-medium leading-[0.80] tracking-[-0.08em] mb-8">Intro to LR.</h1>
          <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">A guided, article-based journey into LSAT Logical Reasoning.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <Link
              to="/bootcamp/intro-to-lr/lessons/notes/argument-basics"
              className="block w-full bg-[#1a1a1a] text-[#F5F2ED] p-12 hover:bg-[rgba(26,26,26,0.9)] transition-all"
            >
              <div className="text-[10px] uppercase tracking-[0.30em] text-[rgba(245,242,237,0.46)] mb-2">LESSON 1</div>
              <div className="text-5xl font-serif italic mb-2">Argument Basics</div>
              <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(245,242,237,0.6)] mb-12">Start here</div>
              <ArrowRight className="h-8 w-8" />
            </Link>
          </div>

          <ul className="space-y-4">
            {notes.map((n, index) => (
              <li key={n.id}>
                <Link
                  to={`/bootcamp/intro-to-lr/lessons/notes/${n.id}`}
                  className="block p-8 bg-white border border-[rgba(26,26,26,0.1)] hover:border-[rgba(26,26,26,0.3)] transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(26,26,26,0.4)] mb-1">Lesson {index + 2}</div>
                      <span className="text-lg font-bold">{n.title}</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
