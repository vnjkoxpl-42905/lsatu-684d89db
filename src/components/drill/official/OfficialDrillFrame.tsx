import * as React from "react";
import { HelpCircle, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DrillNotepad from "@/components/drill/DrillNotepad";

interface Props {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** When true, dim+blur the runner and show a centered Resume modal. */
  isPaused?: boolean;
  /** Resume handler invoked from the overlay button. */
  onResume?: () => void;
}

/**
 * Official LawHub-style shell: white global header, dark body, centered
 * white "paper" card. When `isPaused` is true, the card is blurred/dimmed
 * and a centered modal blocks all interaction until Resume is clicked.
 */
export default function OfficialDrillFrame({ header, children, isPaused, onResume }: Props) {
  const { user } = useAuth();
  const rawName = (user?.user_metadata?.display_name as string | undefined)?.trim();
  const welcomeName = rawName && rawName.length > 0 ? rawName.split(/\s+/)[0] : "Joshua";

  return (
    <div
      className="min-h-screen bg-[#1A1635] flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      <header className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 pt-2 pb-1.5 flex items-center justify-end gap-3 text-[13px] text-slate-700">
          <button
            type="button"
            aria-label="Help"
            tabIndex={-1}
            className="text-[#b91c1c] hover:text-[#7f1d1d] transition-colors cursor-default"
          >
            <HelpCircle className="w-[20px] h-[20px]" strokeWidth={2} />
          </button>
          <span aria-hidden className="w-px h-5 bg-slate-300" />
          <span className="font-medium">Welcome, {welcomeName}</span>
        </div>
        {header && (
          <div className="px-4 sm:px-6 pb-2 pt-0.5">
            {header}
          </div>
        )}
      </header>
      <main className="flex-1 px-2 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-5 flex relative">
        <div
          className={
            "mx-auto w-full max-w-[1400px] flex-1 min-h-[700px] bg-white text-black rounded-md border border-slate-300 shadow-[0_4px_18px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col transition-[filter,opacity] " +
            (isPaused ? "blur-[3px] opacity-60 pointer-events-none select-none" : "")
          }
          aria-hidden={isPaused ? "true" : undefined}
        >
          {children}
        </div>

        {isPaused && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Section paused"
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-md shadow-2xl border border-slate-200 px-10 py-8 max-w-md w-[92%] text-center">
              <h2 className="text-[20px] font-semibold text-slate-900 mb-2">Section Paused</h2>
              <p className="text-[14px] text-slate-600 mb-6">
                The timer is paused. Click Resume to continue your section.
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
      {!isPaused && <DrillNotepad />}
    </div>
  );
}
