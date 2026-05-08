import * as React from "react";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  header?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Official LawHub-style shell:
 * - Tall white global header with two zones:
 *     • top row: right-aligned help icon, divider, "Welcome, {name}"
 *     • bottom row: caller-provided breadcrumb + action pills
 * - Deep purple-navy body underneath
 * - Centered white "paper" card with visible dark gaps above and below
 */
export default function OfficialDrillFrame({ header, children }: Props) {
  const { user } = useAuth();
  const rawName = (user?.user_metadata?.display_name as string | undefined)?.trim();
  // Per spec: never render bare "Welcome". Fall back to "Joshua".
  const welcomeName = rawName && rawName.length > 0 ? rawName.split(/\s+/)[0] : "Joshua";

  return (
    <div
      className="min-h-screen bg-[#1A1635] flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      <header className="bg-white border-b border-slate-200">
        {/* Top row: right-aligned help icon + Welcome */}
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
        {/* Bottom row: breadcrumb + pill buttons */}
        {header && (
          <div className="px-4 sm:px-6 pb-2 pt-0.5">
            {header}
          </div>
        )}
      </header>
      <main className="flex-1 px-2 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-5 flex">
        <div className="mx-auto w-full max-w-[1400px] flex-1 min-h-[680px] bg-white text-black rounded-md border border-slate-300 shadow-[0_4px_18px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
