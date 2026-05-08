import * as React from "react";

interface Props {
  header?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Official LawHub-style shell: a full-width white global header band on top,
 * a deep purple-navy body underneath, and a centered white "paper" card with
 * visible dark gaps above and below.
 */
export default function OfficialDrillFrame({ header, children }: Props) {
  return (
    <div
      className="min-h-screen bg-[#1A1635] flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {header && (
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          {header}
        </header>
      )}
      <main className="flex-1 px-4 sm:px-10 pt-8 sm:pt-12 pb-8 sm:pb-10">
        <div className="mx-auto w-full max-w-[1200px] bg-white text-black rounded-md border border-slate-300 shadow-[0_4px_18px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
