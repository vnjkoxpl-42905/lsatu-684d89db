import * as React from "react";

interface Props {
  /**
   * Optional content rendered on the navy backdrop, ABOVE the white "paper".
   * Used for session-level chrome (Exit / pause / Finish / section title) so
   * the testing surface itself stays faithful to the LawHub layout.
   */
  header?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Official LSAT testing-format shell. Mirrors the LawHub layout: a dark
 * navy backdrop framing a centered white "paper" surface that holds the
 * toolbar, question pane, and bottom navigator.
 *
 * The font-family is scoped to this frame so the testing surface uses
 * Helvetica/Arial (matching the real test) while the rest of the app
 * keeps its sans default.
 */
export default function OfficialDrillFrame({ header, children }: Props) {
  return (
    <div
      className="min-h-screen bg-[#0f172a] py-3 sm:py-6 px-2 sm:px-4"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {header}
      <div className="mx-auto max-w-[1180px] bg-white text-black rounded-md shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
