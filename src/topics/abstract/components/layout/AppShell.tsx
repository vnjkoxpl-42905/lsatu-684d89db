import { useEffect, useRef, useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import AskJoshuaFab from "./AskJoshuaFab";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useApp } from "../../store/AppContext";

// AppShell: brutalist two-column with a mobile drawer toggle below md.
// The sidebar is permanent on tablet and up, off-canvas with a scrim on
// phone. Reduced-motion collapses the view transition to a snap.
export default function AppShell({ children }: { children: ReactNode }) {
  const { currentView, currentModuleId } = useApp();
  const mainRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer whenever the active view changes so the new
  // surface is not occluded by a dangling sidebar.
  useEffect(() => {
    setMobileNavOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [currentView, currentModuleId]);

  // Lock body scroll while the drawer is open on phone.
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileNavOpen]);

  const transitionDuration = prefersReducedMotion ? 0 : 0.22;

  return (
    <div className="flex h-screen w-full bg-brutal-bg text-brutal-ink font-sans overflow-hidden relative">
      <a href="#abstract-main" className="skip-link">
        Skip to main content
      </a>

      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden fixed inset-0 bg-brutal-ink/60 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: transitionDuration }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Bootcamp navigation"
              className="md:hidden fixed left-0 top-0 bottom-0 z-40 w-72 max-w-[80vw]"
              initial={{ x: prefersReducedMotion ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: prefersReducedMotion ? 0 : "-100%" }}
              transition={{ duration: transitionDuration, ease: [0.22, 1, 0.36, 1] }}
            >
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main
        ref={mainRef}
        id="abstract-main"
        className="flex-1 overflow-auto relative z-10 custom-scrollbar brutal-dotted"
      >
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 bg-brutal-bg border-b-4 border-brutal-ink">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="abstract-mobile-nav"
            className="w-11 h-11 flex items-center justify-center bg-brutal-paper border-4 border-brutal-ink brutal-shadow-sm"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-xs font-black uppercase tracking-[0.2em]">
            Abstract Bootcamp
          </span>
          <span className="w-11" aria-hidden="true" />
        </div>

        {/* View transition: keep it cheap. A keyed div lets React swap subtrees
         * cleanly. Animating the wrapper with framer-motion would risk a
         * stuck-opacity render path on slow networks and adds nothing to the
         * brutalist aesthetic. */}
        <div
          key={currentView}
          className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 py-6 sm:py-8 pb-32"
        >
          {children}
        </div>
      </main>
      <AskJoshuaFab />
    </div>
  );
}
