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
import { AnimatedDock } from "@/components/ui/animated-dock";
import { ClipboardList, Inbox, CalendarDays, Settings, LifeBuoy } from "lucide-react";
import WelcomeLoading from "@/components/WelcomeLoading";
import OrbitalHub, { FoyerPhase, FoyerNode } from "@/components/foyer/OrbitalHub";
import FoyerTour from "@/components/foyer/FoyerTour";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Shield, HelpCircle } from "lucide-react";

export default function AcademyFoyer() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, authReady } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const permissions = useUserPermissions();

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
    if (!authReady) return;
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
  }, [user, authReady, navigate]);

  // ── Phase state machine ──────────────────────────────────────────────────────
  const [phase, setPhase] = React.useState<FoyerPhase>(
    showWelcomeFromState ? "ghost" : "idle"
  );
  const [showWelcome, setShowWelcome] = React.useState(showWelcomeFromState);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [showTour, setShowTour] = React.useState(false);
  const [tourChecked, setTourChecked] = React.useState(false);
  const hubContainerRef = React.useRef<HTMLDivElement>(null);
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

  // ── Check tour status when idle ─────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== "idle" || tourChecked || !user) return;
    setTourChecked(true);
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('has_seen_tour')
        .eq('class_id', user.id)
        .maybeSingle();
      if (data && !data.has_seen_tour) {
        setShowTour(true);
      }
    })();
  }, [phase, tourChecked, user]);

  // ── Tour completion handler ─────────────────────────────────────────────────
  const handleTourComplete = React.useCallback(async () => {
    setShowTour(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({ has_seen_tour: true })
        .eq('class_id', user.id);
    }
  }, [user]);

  // ── Re-watch tour ───────────────────────────────────────────────────────────
  const handleReplayTour = React.useCallback(() => {
    setShowTour(true);
  }, []);
  const handleSelectNode = React.useCallback((node: FoyerNode) => {
    setSelectedNodeId(node.id);
    setPhase("dissolving");

    navTimerRef.current = setTimeout(() => {
      navigate(node.target);
    }, 950);
  }, [navigate]);

  // ── Don't render until auth is resolved ─────────────────────────────────────
  if (!authReady || !user) return null;

  // Theme-adaptive colors
  const brandColor   = isLight ? "rgba(0,0,0,0.38)"     : "rgba(255,255,255,0.22)";
  
  const dissolveGrad = isLight
    ? "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, rgba(255,255,255,0.7) 80%, #fff 100%)"
    : "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, rgba(0,0,0,0.7) 80%, #000 100%)";

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">

      {/* ── Top-right controls ── */}
      <div className="absolute top-5 right-6 z-30 flex items-center gap-1">
        {permissions.is_admin && (
          <button
            onClick={() => navigate("/admin")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Admin Dashboard"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleReplayTour}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          title="Replay Tour"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
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
        <div ref={hubContainerRef} style={{ width: "min(560px, 85vw, 85vh)", height: "min(560px, 85vw, 85vh)" }}>
          <OrbitalHub
            phase={phase}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            permissions={permissions}
            lockedNodeIds={[
              ...(!permissions.has_practice_access && !permissions.is_admin ? ["practice"] : []),
              ...(!permissions.has_bootcamp_access && !permissions.is_admin ? ["bootcamps"] : []),
              ...(!permissions.has_classroom_access && !permissions.is_admin ? ["classroom"] : []),
              ...(!permissions.has_analytics_access && !permissions.is_admin ? ["analytics"] : []),
              ...(!permissions.has_schedule_access && !permissions.is_admin ? ["schedule"] : []),
            ]}
          />
        </div>
      </div>

      {/* ── Utility dock — appears once idle ── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            className="absolute bottom-10 inset-x-0 flex justify-center z-20"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <AnimatedDock
              items={[
                { link: "/homework", Icon: <ClipboardList size={20} />, label: "Homework", badge: true },
                { link: "/inbox", Icon: <Inbox size={20} />, label: "Inbox", badge: 3 },
                { link: "/schedule", Icon: <CalendarDays size={20} />, label: "Scheduling" },
                { link: "/settings", Icon: <Settings size={20} />, label: "Settings" },
                { link: "/help", Icon: <LifeBuoy size={20} />, label: "Help / Tour" },
              ]}
            />
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

      {/* ── Interactive Tour overlay ── */}
      {showTour && phase === "idle" && (
        <FoyerTour
          hubContainerRef={hubContainerRef}
          onComplete={handleTourComplete}
        />
      )}
    </div>
  );
}
