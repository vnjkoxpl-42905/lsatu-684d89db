import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { motion, AnimatePresence } from 'framer-motion';
import { roleQuestionsContent } from '@/data/roleQuestions/content';

type SectionId = string;

function Card({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{label}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function CompletionButton({ isCompleted, onClick }: { isCompleted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={isCompleted}
      className={`w-full py-3 rounded-xl text-sm font-bold transition-colors mt-4 ${
        isCompleted
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
          : 'bg-foreground text-background hover:bg-foreground/90'
      }`}
    >
      {isCompleted ? 'SECTION COMPLETED ✓' : 'Mark as Complete'}
    </button>
  );
}

/* Simple markdown-ish renderer for the lesson body text */
function LessonBody({ body }: { body: string }) {
  const lines = body.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }
    if (trimmed === '---') {
      elements.push(<hr key={i} className="border-border my-4" />);
      return;
    }
    // Table handling
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Check if it's a separator row
      if (/^\|[\s-|]+\|$/.test(trimmed)) return;
      const cells = trimmed.split('|').filter(Boolean).map(c => c.trim());
      const isHeader = i + 1 < lines.length && /^\|[\s-|]+\|$/.test(lines[i + 1]?.trim() || '');
      if (isHeader) {
        elements.push(
          <div key={i} className="grid grid-cols-2 gap-2 text-xs font-bold text-foreground bg-accent/50 rounded-t-lg px-3 py-2 border border-border">
            {cells.map((c, ci) => <span key={ci}>{c}</span>)}
          </div>
        );
      } else {
        elements.push(
          <div key={i} className="grid grid-cols-2 gap-2 text-xs text-muted-foreground px-3 py-2 border-x border-b border-border last:rounded-b-lg">
            {cells.map((c, ci) => <span key={ci}>{c}</span>)}
          </div>
        );
      }
      return;
    }

    // Parse inline markdown
    const parseInline = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;
      while (remaining) {
        // Bold + italic
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        const italicMatch = remaining.match(/\*([^*]+?)\*/);
        const match = boldMatch && italicMatch
          ? (boldMatch.index! <= italicMatch.index! ? boldMatch : italicMatch)
          : boldMatch || italicMatch;

        if (match && match.index !== undefined) {
          if (match.index > 0) parts.push(<span key={key++}>{remaining.slice(0, match.index)}</span>);
          if (match[0].startsWith('**')) {
            parts.push(<strong key={key++} className="text-foreground font-semibold">{match[1]}</strong>);
          } else {
            parts.push(<em key={key++}>{match[1]}</em>);
          }
          remaining = remaining.slice(match.index + match[0].length);
        } else {
          parts.push(<span key={key++}>{remaining}</span>);
          remaining = '';
        }
      }
      return parts;
    };

    // Headings — not used in our content but just in case
    if (trimmed.startsWith('✓ ')) {
      elements.push(<p key={i} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /><span>{parseInline(trimmed.slice(2))}</span></p>);
      return;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      elements.push(<p key={i} className="text-sm text-muted-foreground pl-4">{parseInline(trimmed)}</p>);
      return;
    }
    if (trimmed.startsWith('- ')) {
      elements.push(<p key={i} className="text-sm text-muted-foreground pl-4">• {parseInline(trimmed.slice(2))}</p>);
      return;
    }
    elements.push(<p key={i} className="text-sm text-muted-foreground leading-relaxed">{parseInline(trimmed)}</p>);
  });

  return <>{elements}</>;
}

export default function RoleQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sections = roleQuestionsContent.sections;
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const activeSection = sections.find(s => s.id === activeSectionId)!;
  const activeIndex = sections.findIndex(s => s.id === activeSectionId);

  const handleComplete = (id: string) => {
    setCompletedSections(prev => ({ ...prev, [id]: true }));
    const idx = sections.findIndex(s => s.id === id);
    if (idx < sections.length - 1) {
      setActiveSectionId(sections[idx + 1].id);
    }
  };

  const completedCount = Object.values(completedSections).filter(Boolean).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bootcamps')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Bootcamps
          </Button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">Role Q's</span>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-72 border-r border-border p-6 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="space-y-1 mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Role Questions</p>
            <p className="text-[10px] text-muted-foreground">Progress: {progress}%</p>
            <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <nav className="space-y-1">
            {sections.map(sec => {
              const isActive = activeSectionId === sec.id;
              const isCompleted = completedSections[sec.id];
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <span className="text-left">{sec.title}</span>
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" /> : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden sticky top-[65px] z-10 bg-background border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                  activeSectionId === sec.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                {sec.title}
                {completedSections[sec.id] && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-3xl space-y-4">
          <AnimatePresence mode="wait">
            <motion.div key={activeSectionId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <Card label={`Section ${activeIndex + 1} of ${sections.length}`} title={activeSection.title}>
                <LessonBody body={activeSection.body} />
              </Card>
              <CompletionButton isCompleted={!!completedSections[activeSectionId]} onClick={() => handleComplete(activeSectionId)} />

              {/* Nav buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveSectionId(sections[activeIndex - 1].id)}
                  className="gap-1 text-muted-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={activeIndex === sections.length - 1}
                  onClick={() => setActiveSectionId(sections[activeIndex + 1].id)}
                  className="gap-1 text-muted-foreground"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
