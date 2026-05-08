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
      className="min-h-screen bg-[#0F2747] py-4 sm:py-6 px-4 sm:px-8 flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {header}
      <div className="mx-auto w-full max-w-[1280px] bg-white text-black rounded-md border border-slate-300 shadow-[0_4px_24px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
