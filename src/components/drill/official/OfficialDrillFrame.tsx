import * as React from "react";

interface Props {
  children: React.ReactNode;
}

/**
 * Official LSAT testing-format shell. Pixel-flat container — no breadcrumb,
 * no card chrome, no navy outer. Matches the real LawHub testing surface.
 *
 * The toolbar inside `children` now owns the section title, pause icon,
 * and Finish button — they used to live here.
 */
export default function OfficialDrillFrame({ children }: Props) {
  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {children}
    </div>
  );
}
