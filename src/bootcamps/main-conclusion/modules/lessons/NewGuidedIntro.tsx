import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';

export function NewGuidedIntro() {
  const notes = [
    { id: 'argument-basics', title: 'Argument Basics' },
    { id: 'where-conclusions-hide', title: 'Where Conclusions Hide' },
    { id: 'layered-arguments', title: 'Layered Arguments' },
    { id: 'matching-the-answer', title: 'Matching the Answer' },
    { id: 'practice-path', title: 'Practice Path' },
  ];

  return (
    <div className="mx-auto max-w-[860px] px-6 py-12 desktop:px-12 desktop:py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Intro to LR</h1>
        <p className="text-lg text-muted-foreground">A guided, article-based journey into LSAT Logical Reasoning.</p>
      </header>

      <ul className="rounded-xl border border-border bg-card shadow-sm">
        {notes.map((n, idx) => (
          <li key={n.id} className={idx !== notes.length - 1 ? "border-b border-border" : ""}>
            <Link
              to={`/bootcamp/intro-to-lr/notes/${n.id}`}
              className="group flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors"
            >
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="flex-grow text-lg font-medium">{n.title}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="mt-12 text-sm text-muted-foreground">
        <p>Legacy lessons are still available via the navigation menu if needed.</p>
      </div>
    </div>
  );
}
