import * as React from "react";

interface Props {
  header?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Official LSAT testing-format shell. Mirrors the LawHub layout: a deep navy
 * backdrop framing a centered white "paper" surface that fills the viewport
 * vertically so the toolbar pins to the top and the navigator pins to the
 * bottom — no dark void below the question.
 */
export default function OfficialDrillFrame({ header, children }: Props) {
  return (
    <div
      className="min-h-screen bg-[#0B1F3A] py-3 sm:py-5 px-2 sm:px-4 flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {header}
      <div className="mx-auto w-full max-w-[1280px] flex-1 bg-white text-black rounded-sm border border-slate-300 overflow-hidden flex flex-col min-h-[calc(100vh-72px)]">
        {children}
      </div>
    </div>
  );
}
