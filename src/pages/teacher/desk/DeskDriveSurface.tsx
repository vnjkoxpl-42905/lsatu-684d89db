import { DrivePanel } from '@/components/inbox/DrivePanel';

/**
 * Drive inside the Teacher Desk. A thin full-height container around the shared
 * DrivePanel, matching the desk's light surface conventions.
 */
export function DeskDriveSurface() {
  return (
    <section aria-label="Drive" className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-white text-foreground">
      <DrivePanel />
    </section>
  );
}

export default DeskDriveSurface;
