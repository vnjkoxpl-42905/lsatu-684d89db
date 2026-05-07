import { lazy, Suspense, useEffect, useState } from 'react';
import { PencilRuler, X, Loader2 } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useLocation } from 'react-router-dom';
import { subscribeWhiteboard } from './whiteboardBus';
import '@excalidraw/excalidraw/index.css';

const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })),
);

const HIDDEN_ROUTES = ['/auth', '/onboarding', '/reset-password', '/foyer', '/drill'];

export function FloatingWhiteboard() {
  const { is_admin } = useUserPermissions();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeWhiteboard(() => setOpen(true)), []);

  const hidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );

  if (!is_admin) return null;

  return (
    <>
      {!hidden && (
        <button
          onClick={() => setOpen(true)}
          title="Open whiteboard"
          className="fixed bottom-6 right-20 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 shadow-lg hover:bg-zinc-700 transition-colors"
          aria-label="Open whiteboard"
        >
          <PencilRuler className="w-5 h-5 text-zinc-200" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
              <PencilRuler className="w-4 h-4" />
              Whiteboard
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Close whiteboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading board…
                </div>
              }
            >
              <Excalidraw />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
