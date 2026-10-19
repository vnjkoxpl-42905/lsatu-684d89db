import { useId, useState } from "react";
import { METHOD_PATTERNS, QUESTION_STEMS } from "../../data/mockData";
import { BookOpen, Search, Info, Terminal, HelpCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

type TabType = "patterns" | "stems";

export const MethodsLibrary: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const searchInputId = useId();
  const [activeTab, setActiveTab] = useState<TabType>("patterns");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(METHOD_PATTERNS[0]?.id ?? null);

  const filteredPatterns = METHOD_PATTERNS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.plainEnglish.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredStems = QUESTION_STEMS.filter(
    (s) =>
      s.stem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedPattern = METHOD_PATTERNS.find((p) => p.id === selectedId);
  const selectedStem = QUESTION_STEMS.find((s) => s.id === selectedId);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchTerm("");
    if (tab === "patterns") setSelectedId(METHOD_PATTERNS[0]?.id ?? null);
    else if (tab === "stems") setSelectedId(QUESTION_STEMS[0]?.id ?? null);
  };

  const transitionDuration = prefersReducedMotion ? 0 : 0.22;

  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-0 h-full overflow-hidden bg-brutal-paper">
      {/* Sidebar: list of patterns/stems. Collapses to a top section on phone. */}
      <aside
        className="w-full md:w-96 md:border-r-4 border-b-4 md:border-b-0 border-brutal-ink flex flex-col bg-brutal-paper max-h-[60vh] md:max-h-full"
        aria-label="Library contents"
      >
        <div className="p-5 sm:p-6 md:p-7 border-b-4 border-brutal-ink bg-brutal-cyan">
          <div className="flex items-center gap-3 mb-5">
            <BookOpen className="w-5 h-5 text-brutal-ink" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-brutal-ink">
              Methods Library
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Library section"
            className="grid grid-cols-2 bg-brutal-paper border-4 border-brutal-ink p-1 mb-5 brutal-shadow-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "patterns"}
              aria-controls="library-content"
              onClick={() => handleTabChange("patterns")}
              className={cn(
                "min-h-[44px] py-2.5 px-2 text-[11px] font-black uppercase tracking-[0.15em] transition-colors",
                activeTab === "patterns"
                  ? "bg-brutal-ink text-brutal-paper"
                  : "text-brutal-ink-soft hover:bg-brutal-ink/5",
              )}
            >
              Patterns
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "stems"}
              aria-controls="library-content"
              onClick={() => handleTabChange("stems")}
              className={cn(
                "min-h-[44px] py-2.5 px-2 text-[11px] font-black uppercase tracking-[0.15em] transition-colors",
                activeTab === "stems"
                  ? "bg-brutal-ink text-brutal-paper"
                  : "text-brutal-ink-soft hover:bg-brutal-ink/5",
              )}
            >
              Stems
            </button>
          </div>

          {(
            <>
              <label htmlFor={searchInputId} className="sr-only">
                Search {activeTab === "patterns" ? "patterns" : "stems"}
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-ink-soft"
                  aria-hidden="true"
                />
                <input
                  id={searchInputId}
                  type="search"
                  placeholder={activeTab === "patterns" ? "Search patterns…" : "Search stems…"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-brutal-paper border-4 border-brutal-ink py-3 pl-10 pr-4 text-sm font-bold text-brutal-ink placeholder:text-brutal-ink-faint brutal-shadow-sm"
                />
              </div>
            </>
          )}
        </div>

        <ul
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar list-none m-0"
          aria-label={activeTab === "patterns" ? "Patterns" : "Stems"}
        >
          {activeTab === "patterns" ? (
            filteredPatterns.length === 0 ? (
              <li className="text-sm font-bold text-brutal-ink-soft">No patterns match.</li>
            ) : (
              filteredPatterns.map((pattern) => (
                <li key={pattern.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(pattern.id)}
                    aria-current={selectedId === pattern.id ? "true" : undefined}
                    className={cn(
                      "w-full min-h-[44px] text-left p-4 sm:p-5 border-4 transition-transform duration-150",
                      selectedId === pattern.id
                        ? "bg-brutal-yellow border-brutal-ink brutal-shadow-sm translate-x-[2px] translate-y-[2px]"
                        : "bg-brutal-paper border-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]",
                    )}
                  >
                    <div className="font-black text-sm sm:text-base uppercase tracking-tight leading-tight mb-1">
                      {pattern.name}
                    </div>
                    <div className="text-xs font-bold text-brutal-ink-soft truncate">
                      {pattern.plainEnglish}
                    </div>
                  </button>
                </li>
              ))
            )
          ) : filteredStems.length === 0 ? (
            <li className="text-sm font-bold text-brutal-ink-soft">No stems match.</li>
          ) : (
            filteredStems.map((stem) => (
              <li key={stem.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(stem.id)}
                  aria-current={selectedId === stem.id ? "true" : undefined}
                  className={cn(
                    "w-full min-h-[44px] text-left p-4 sm:p-5 border-4 transition-transform duration-150",
                    selectedId === stem.id
                      ? "bg-brutal-pink border-brutal-ink brutal-shadow-sm translate-x-[2px] translate-y-[2px]"
                      : "bg-brutal-paper border-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]",
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase bg-brutal-ink text-brutal-paper px-2 py-0.5 w-fit tracking-[0.15em]">
                      {stem.category}
                    </span>
                    <div className="font-black text-sm uppercase tracking-tight leading-tight">
                      {stem.stem}
                    </div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      {/* Content panel */}
      <article
        id="library-content"
        role="tabpanel"
        className="flex-1 overflow-y-auto p-6 sm:p-10 md:p-14 bg-brutal-paper custom-scrollbar"
      >
        <AnimatePresence mode="wait">
          {activeTab === "patterns" && selectedPattern ? (
            <motion.div
              key={selectedPattern.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: transitionDuration, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl space-y-12 sm:space-y-16"
            >
              <header className="space-y-3">
                <span className="inline-block px-2 py-0.5 bg-brutal-ink text-brutal-paper text-[10px] font-black uppercase tracking-[0.2em]">
                  Method pattern
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase">
                  {selectedPattern.name}
                </h1>
              </header>

              <section className="space-y-3" aria-labelledby="pattern-plain-heading">
                <div className="flex items-center gap-3">
                  <div className="bg-brutal-green p-1.5 border-2 border-brutal-ink brutal-shadow-sm" aria-hidden="true">
                    <Info className="w-4 h-4 text-brutal-ink" />
                  </div>
                  <h2
                    id="pattern-plain-heading"
                    className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft"
                  >
                    Plain-English translation
                  </h2>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-brutal-ink leading-snug bg-brutal-green/15 p-6 sm:p-8 border-4 border-brutal-ink brutal-shadow">
                  {selectedPattern.plainEnglish}
                </p>
              </section>

              <section className="space-y-3" aria-labelledby="pattern-language-heading">
                <div className="flex items-center gap-3">
                  <div className="bg-brutal-ink p-1.5 border-2 border-brutal-ink brutal-shadow-sm" aria-hidden="true">
                    <Terminal className="w-4 h-4 text-brutal-paper" />
                  </div>
                  <h2
                    id="pattern-language-heading"
                    className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft"
                  >
                    Answer-choice language
                  </h2>
                </div>
                <blockquote className="bg-brutal-paper border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow-lg">
                  <p className="text-lg sm:text-xl font-bold text-brutal-ink italic leading-snug">
                    “{selectedPattern.answerChoiceLanguage}”
                  </p>
                </blockquote>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section aria-labelledby="pattern-must-heading" className="space-y-3">
                  <h3
                    id="pattern-must-heading"
                    className="text-[11px] font-black text-brutal-ink uppercase tracking-[0.2em] bg-brutal-paper border-2 border-brutal-ink px-2 py-1 brutal-shadow-sm inline-block"
                  >
                    Must happen in the stimulus
                  </h3>
                  <p className="text-base font-bold text-brutal-ink leading-snug p-5 sm:p-6 border-4 border-brutal-ink bg-brutal-paper brutal-shadow-sm">
                    {selectedPattern.mustHappen}
                  </p>
                </section>

                <section aria-labelledby="pattern-example-heading" className="space-y-3">
                  <h3
                    id="pattern-example-heading"
                    className="text-[11px] font-black text-brutal-ink uppercase tracking-[0.2em] bg-brutal-paper border-2 border-brutal-ink px-2 py-1 brutal-shadow-sm inline-block"
                  >
                    Concrete example
                  </h3>
                  <div className="p-5 sm:p-6 border-4 border-brutal-ink brutal-shadow bg-brutal-paper space-y-4">
                    <p className="text-sm font-bold italic text-brutal-ink leading-snug">
                      “{selectedPattern.example.stimulus}”
                    </p>
                    <div className="pt-4 border-t-2 border-brutal-ink flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 text-brutal-ink mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-sm font-bold text-brutal-ink-soft leading-snug">
                        {selectedPattern.example.explanation}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          ) : activeTab === "stems" && selectedStem ? (
            <motion.div
              key={selectedStem.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: transitionDuration, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl space-y-12"
            >
              <header className="space-y-3">
                <span className="inline-block px-2 py-0.5 bg-brutal-ink text-brutal-paper text-[10px] font-black uppercase tracking-[0.2em]">
                  {selectedStem.category} stem
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-brutal-ink leading-tight uppercase">
                  {selectedStem.stem}
                </h1>
              </header>

              <section className="space-y-3" aria-labelledby="stem-interp-heading">
                <div className="flex items-center gap-3">
                  <div className="bg-brutal-yellow p-1.5 border-2 border-brutal-ink brutal-shadow-sm" aria-hidden="true">
                    <HelpCircle className="w-4 h-4 text-brutal-ink" />
                  </div>
                  <h2
                    id="stem-interp-heading"
                    className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft"
                  >
                    LSAT interpretation
                  </h2>
                </div>
                <div className="p-6 sm:p-8 border-4 border-brutal-ink bg-brutal-paper brutal-shadow-lg">
                  <p className="text-base sm:text-lg font-bold text-brutal-ink leading-snug whitespace-pre-line">
                    {selectedStem.explanation}
                  </p>
                </div>
              </section>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-brutal-ink-soft">
              <Search className="w-10 h-10" aria-hidden="true" />
              <h3 className="text-lg font-black uppercase tracking-tight">No matches</h3>
            </div>
          )}
        </AnimatePresence>
      </article>
    </div>
  );
};
