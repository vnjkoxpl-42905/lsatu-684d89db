"use client";

/**
 * AcademyFoyer
 *
 * Layer 1 of the post-login arrival sequence.
 *
 * Flow:
 *   1. Auth.tsx completes login → navigate('/foyer', { state: { showWelcome, welcomeName } })
 *   2. Foyer mounts → WelcomeLoading overlay renders at z-9999 over the ghost hub
 *   3. WelcomeLoading completes → phase transitions ghost → materializing → idle
 *   4. Student selects a node → phase transitions idle → dissolving → navigate(target)
 *
 * Return visits (no location.state.showWelcome): hub renders at full opacity immediately.
 */

import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeLoading from "@/components/WelcomeLoading";
import OrbitalHub, { FoyerPhase, FoyerNode } from "@/components/foyer/OrbitalHub";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

export default function AcademyFoyer() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, authReady } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // ── Location state injected by Auth.tsx on fresh login ──────────────────────
  const state = location.state as { showWelcome?: boolean; welcomeName?: string } | null;
  const showWelcomeFromState = state?.showWelcome ?? false;
  const welcomeName = state?.welcomeName
    ?? user?.user_metadata?.username
    ?? user?.user_metadata?.display_name
    ?? user?.email?.split("@")[0]
    ?? "there";

  // ── Session guard: ensure Welcome doesn't replay on back-navigation ─────────
  React.useEffect(() => {
    if (showWelcomeFromState) {
      navigate("/foyer", { replace: true, state: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth guard — also check onboarding ──────────────────────────────────────
  React.useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    // Ensure user has completed onboarding
    const checkOnboarding = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', user.id)
        .maybeSingle();
      if (!profile?.display_name) navigate("/onboarding", { replace: true });
    };
    checkOnboarding();
  }, [user, authLoading, navigate]);

  // ── Phase state machine ──────────────────────────────────────────────────────
  const [phase, setPhase] = React.useState<FoyerPhase>(
    showWelcomeFromState ? "ghost" : "idle"
  );
  const [showWelcome, setShowWelcome] = React.useState(showWelcomeFromState);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const matTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cleanup timers on unmount ────────────────────────────────────────────────
  React.useEffect(() => {
    return () => {
      if (matTimerRef.current) clearTimeout(matTimerRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // ── Welcome → Materialization handoff ───────────────────────────────────────
  const handleWelcomeComplete = React.useCallback(() => {
    setShowWelcome(false);
    setPhase("materializing");

    matTimerRef.current = setTimeout(() => {
      setPhase("idle");
    }, 2400);
  }, []);

  // ── Node selection → Dissolve → Navigate ────────────────────────────────────
  const handleSelectNode = React.useCallback((node: FoyerNode) => {
    setSelectedNodeId(node.id);
    setPhase("dissolving");

    navTimerRef.current = setTimeout(() => {
      navigate(node.target);
    }, 950);
  }, [navigate]);

  // ── Don't render until auth is resolved ─────────────────────────────────────
  if (authLoading || !user) return null;

  // Theme-adaptive colors
  const brandColor   = isLight ? "rgba(0,0,0,0.38)"     : "rgba(255,255,255,0.22)";
  const promptColor  = isLight ? "rgba(0,0,0,0.32)"     : "rgba(255,255,255,0.18)";
  const dissolveGrad = isLight
    ? "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, rgba(255,255,255,0.7) 80%, #fff 100%)"
    : "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, rgba(0,0,0,0.7) 80%, #000 100%)";

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">

      {/* ── Top-right controls ── */}
      <div className="absolute top-5 right-6 z-30 flex items-center gap-1">
        <LogoutButton />
        <ThemeToggle />
      </div>

      {/* ── LSAT U wordmark — ultra-faint brand anchor ── */}
      <div className="absolute top-8 inset-x-0 flex justify-center z-30 pointer-events-none">
        <span
          className="uppercase font-semibold select-none"
          style={{ fontSize: 9, letterSpacing: "0.42em", color: brandColor }}
        >
          LSAT U
        </span>
      </div>

      {/* ── Orbital Hub ── */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div style={{ width: "min(440px, 80vw, 80vh)", height: "min(440px, 80vw, 80vh)" }}>
          <OrbitalHub
            phase={phase}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>
      </div>

      {/* ── Bottom prompt — appears once idle ── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            className="absolute bottom-9 inset-x-0 flex justify-center z-30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <span
              className="uppercase font-semibold select-none"
              style={{ fontSize: 8, letterSpacing: "0.38em", color: promptColor }}
            >
              Select a module
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dissolve vignette — deepens during node selection ── */}
      <AnimatePresence>
        {phase === "dissolving" && (
          <motion.div
            className="absolute inset-0 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: dissolveGrad }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── Welcome overlay — sits at z-9999 over the ghost hub ── */}
      {showWelcome && (
        <WelcomeLoading
          userName={welcomeName}
          onComplete={handleWelcomeComplete}
        />
      )}
    </div>
  );
}
