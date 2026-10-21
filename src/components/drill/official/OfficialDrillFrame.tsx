import * as React from "react";
import { GraduationCap, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DrillNotepad from "@/components/drill/DrillNotepad";
import DrillNotesPanel, {
  type DrawerTab,
  type DrillDetailsMeta,
  type DrillSimilarContext,
} from "@/components/drill/official/DrillNotesPanel";
import type { DrillExplanationContext } from "@/components/drill/official/DrillExplanationTab";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** When true, dim+blur the runner and show a centered Resume modal. */
  isPaused?: boolean;
  /** Resume handler invoked from the overlay button. */
  onResume?: () => void;
  /** Noun used in the paused modal copy: "Section" (default) or "Question". */
  pauseNoun?: string;
  /** Show the Tutor mode toggle in the top-right strip. */
  tutorToggleVisible?: boolean;
  /** Current Tutor mode state. */
  tutorMode?: boolean;
  /** Toggle handler for Tutor mode. */
  onTutorModeChange?: (next: boolean) => void;
  /** Enable the docked Notes panel (Smart Drill). Replaces the floating notepad. */
  notesPanelEnabled?: boolean;
  /** Whether the docked Notes panel is open. */
  notesPanelOpen?: boolean;
  /** Close handler for the docked Notes panel. */
  onNotesPanelClose?: () => void;
  /** Active question metadata for the drawer's Details tab. */
  notesPanelMeta?: DrillDetailsMeta | null;
  /** Controlled active drawer tab. */
  notesPanelTab?: DrawerTab;
  /** Tab change handler for the drawer. */
  onNotesPanelTabChange?: (tab: DrawerTab) => void;
  /** Explanation tab content. The panel mounts twice, so this must be owned
   *  by the page — both mounts have to read the same active style. */
  notesPanelExplanation?: DrillExplanationContext | null;
  /** Find Similar context for the drawer's Details tab. */
  notesPanelSimilar?: DrillSimilarContext | null;
  /** Show the floating notepad when the docked panel is off. Default true. */
  notepadEnabled?: boolean;
  /**
   * Pin the shell to the viewport height instead of letting it grow, so the
   * panes scroll internally and the bottom bar (Previous / Next) is always on
   * screen. Default true: an LR card that grew let Next fall below the fold on
   * a 1536x695 laptop, so every question needed a page scroll just to move on.
   * Pass false only for a surface whose content cannot scroll inside the card.
   */
  fillViewport?: boolean;
}

/**
 * Official LawHub-style shell: white global header, dark body, centered
 * white "paper" card. When `isPaused` is true, the card is blurred/dimmed
 * and a centered modal blocks all interaction until Resume is clicked.
 */
export default function OfficialDrillFrame({
  header,
  children,
  isPaused,
  onResume,
  pauseNoun = "Section",
  tutorToggleVisible,
  tutorMode,
  onTutorModeChange,
  notesPanelEnabled,
  notesPanelOpen,
  onNotesPanelClose,
  notesPanelMeta,
  notesPanelTab,
  onNotesPanelTabChange,
  notesPanelExplanation,
  notesPanelSimilar,
  notepadEnabled = true,
  fillViewport = true,
}: Props) {
  const { user } = useAuth();
  const rawName = (user?.user_metadata?.display_name as string | undefined)?.trim();
  const welcomeName = rawName && rawName.length > 0 ? rawName.split(/\s+/)[0] : "Joshua";

  return (
    <div
      className={cn(
        "bg-[#1A1635] flex flex-col",
        fillViewport ? "h-screen overflow-hidden" : "min-h-screen",
      )}
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {/* One row: the page's own header (breadcrumb and its pills) on the left,
          Tutor and the welcome on the right. They used to be two rows, and the
          welcome row alone cost 35px of a 695px laptop screen. */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-1 flex items-center gap-x-4 gap-y-1">
        {header && <div className="min-w-0 flex-1">{header}</div>}
        <div className="ml-auto flex shrink-0 items-center justify-end gap-2 text-[13px] text-slate-700">
          {tutorToggleVisible && onTutorModeChange && (
            <>
              {/* Desktop: switch + label */}
              <div className="hidden sm:flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-600" />
                <label htmlFor="official-tutor-toggle" className="cursor-pointer select-none font-medium">
                  Tutor
                </label>
                <Switch
                  id="official-tutor-toggle"
                  checked={!!tutorMode}
                  onCheckedChange={onTutorModeChange}
                  className="scale-90 data-[state=checked]:bg-[#7f1d1d]"
                />
              </div>
              {/* Mobile: icon-only round toggle */}
              <button
                type="button"
                onClick={() => onTutorModeChange(!tutorMode)}
                aria-label={tutorMode ? "Turn Tutor Mode off" : "Turn Tutor Mode on"}
                aria-pressed={!!tutorMode}
                className={cn(
                  "sm:hidden h-7 w-7 rounded-full flex items-center justify-center border transition-colors",
                  tutorMode
                    ? "bg-[#7f1d1d] text-white border-[#7f1d1d]"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100",
                )}
              >
                <GraduationCap className="w-4 h-4" />
              </button>
              <span aria-hidden className="w-px h-5 bg-slate-300" />
            </>
          )}
          <span className="font-medium whitespace-nowrap">Welcome, {welcomeName}</span>
        </div>
      </header>
      <main className="flex-1 min-h-0 px-2 sm:px-3 py-1.5 flex relative overflow-hidden">
        <div className="flex-1 flex min-w-0">
          <div
            className={cn(
              "mx-auto w-full max-w-[1400px] bg-white text-black rounded-md border border-slate-300 shadow-[0_4px_18px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col transition-[filter,opacity]",
              fillViewport ? "h-full" : "min-h-[700px]",
              isPaused && "blur-[3px] opacity-60 pointer-events-none select-none",
            )}
            aria-hidden={isPaused ? "true" : undefined}
          >
            {children}
          </div>
        </div>

        {/* Docked Notes panel (Smart Drill). md+: pushes the card; mobile: overlay drawer. */}
        {notesPanelEnabled && (
          <>
            {/* md+ push column */}
            <div
              className={cn(
                "hidden md:block shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
                notesPanelOpen ? "w-[380px] pl-2 sm:pl-4" : "w-0",
              )}
            >
              {notesPanelOpen && (
                <DrillNotesPanel
                  onClose={onNotesPanelClose}
                  meta={notesPanelMeta}
                  activeTab={notesPanelTab}
                  onTabChange={onNotesPanelTabChange}
                  explanation={notesPanelExplanation}
                  similar={notesPanelSimilar}
                />
              )}
            </div>

            {/* mobile scrim + overlay drawer */}
            {notesPanelOpen && (
              <button
                type="button"
                aria-label="Close notes"
                onClick={onNotesPanelClose}
                className="md:hidden absolute inset-0 z-30 bg-black/20"
              />
            )}
            <div
              className={cn(
                "md:hidden absolute inset-y-0 right-0 z-40 max-w-[100vw] transition-transform duration-300 ease-out",
                notesPanelOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
              )}
            >
              <DrillNotesPanel
                onClose={onNotesPanelClose}
                meta={notesPanelMeta}
                activeTab={notesPanelTab}
                onTabChange={onNotesPanelTabChange}
                explanation={notesPanelExplanation}
                similar={notesPanelSimilar}
              />
            </div>
          </>
        )}

        {isPaused && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${pauseNoun} paused`}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-md shadow-2xl border border-slate-200 px-10 py-8 max-w-md w-[92%] text-center">
              <h2 className="text-[20px] font-semibold text-slate-900 mb-2">{pauseNoun} Paused</h2>
              <p className="text-[14px] text-slate-600 mb-6">
                The timer is paused. Click Resume to continue your {pauseNoun.toLowerCase()}.
              </p>
              <button
                type="button"
                onClick={onResume}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#7f1d1d] hover:bg-[#991b1b] text-white px-6 py-2.5 text-[14px] font-semibold min-w-[160px] transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            </div>
          </div>
        )}
      </main>
      {!isPaused && !notesPanelEnabled && notepadEnabled && <DrillNotepad />}
    </div>
  );
}
