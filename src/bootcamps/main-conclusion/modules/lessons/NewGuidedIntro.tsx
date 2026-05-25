import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const lessons = [
  { id: 'argument-basics', title: 'Argument Basics' },
  { id: 'where-conclusions-hide', title: 'Where Conclusions Hide' },
  { id: 'layered-arguments', title: 'Layered Arguments' },
  { id: 'matching-the-answer', title: 'Matching the Answer' },
  { id: 'practice-path', title: 'Practice Path' },
];

export function NewGuidedIntro() {
  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] flex">
      {/* Lesson Navigation */}
      <nav className="w-64 border-r border-[rgba(26,26,26,0.1)] py-24 px-8 sticky top-0 h-screen overflow-y-auto hidden md:block">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(26,26,26,0.4)] mb-8">Lesson Path</h2>
        <ul className="space-y-6">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <a 
                href={`#${l.id}`} 
                className="flex items-center gap-3 text-[14px] font-medium text-[rgba(26,26,26,0.6)] hover:text-[#1a1a1a] transition-colors"
              >
                <span className="text-[10px] w-4 text-right opacity-40">{String(i + 1).padStart(2, '0')}</span>
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-8 md:px-12 py-24">
        <div className="max-w-3xl">
          <header className="mb-24">
            <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">Introduction</p>
            <h1 className="text-[clamp(56px,8vw,120px)] font-serif italic font-medium leading-[0.80] tracking-[-0.05em] mb-8">Intro to LR.</h1>
            <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed">A guided, article-based journey into LSAT Logical Reasoning.</p>
          </header>

          <section className="space-y-24">
            {lessons.map((l, i) => (
              <div key={l.id} id={l.id} className="scroll-mt-24 border-t border-[rgba(26,26,26,0.1)] pt-12">
                <div className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-4">Lesson {i + 1}</div>
                <h2 className="text-4xl font-serif italic mb-6">{l.title}</h2>
                <p className="text-lg leading-relaxed text-[rgba(26,26,26,0.7)] mb-8">
                  Core concepts and strategy for {l.title.toLowerCase()}.
                </p>
                <Link
                  to={`/bootcamp/intro-to-lr/lessons/notes/${l.id}`}
                  className="inline-flex items-center gap-2 bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-[rgba(26,26,26,0.8)] transition-all"
                >
                  <BookOpen className="h-4 w-4" />
                  Read Lesson
                </Link>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
