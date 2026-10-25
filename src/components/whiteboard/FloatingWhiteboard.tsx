import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { PencilRuler, X, Loader2, CheckCircle2, Save, PanelRight } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { subscribeWhiteboard, type WhiteboardOpenArgs } from './whiteboardBus';
import {
  useSmartboardAutosave,
  type ExcalidrawSceneJson,
} from '@/hooks/useSmartboardAutosave';
import { useSmartboardSessions } from '@/hooks/useSmartboardSessions';
import { TemplatePalette, type ExcalidrawTemplateApi } from '@/components/whiteboard/TemplatePalette';
import '@excalidraw/excalidraw/index.css';

const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })),
);

// FAB is hidden on these routes — drill rendering page is off-limits,
// and student-facing surfaces don't need an admin whiteboard launcher.
const HIDDEN_ROUTES = ['/auth', '/onboarding', '/reset-password', '/classroom/drill', '/drill', '/inbox'];

// Shared with TeacherSmartboard so the show/hide preference is consistent
// across both whiteboard surfaces.
const TEMPLATES_STORAGE_KEY = 'lsatu.whiteboard.showTemplates';

type ExcalidrawApi = {
  getSceneElements: () => unknown[];
  getAppState: () => unknown;
  getFiles?: () => unknown;
  updateScene?: (data: { elements: unknown[] }) => void;
} | null;

export function FloatingWhiteboard() {
  const { is_admin } = useUserPermissions();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<WhiteboardOpenArgs | null>(null);
  const apiRef = useRef<ExcalidrawApi>(null);
  const [showTemplates, setShowTemplates] = useState(() => {
    try {
      return localStorage.getItem(TEMPLATES_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, String(showTemplates));
    } catch {
      // Quota exceeded or storage disabled. Silent fail; in-memory state still works.
    }
  }, [showTemplates]);

  // Item B — bind to a session payload when the bus opens us with one;
  // start unbound when there's no payload (the current floating shortcut).
  const studentId = args?.studentId ?? null;
  const initialSessionId = args?.sessionId ?? null;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState('Floating session');

  useEffect(() => {
    return subscribeWhiteboard((next) => {
      setArgs(next ?? null);
      setSessionId(next?.sessionId ?? null);
      if (next?.title) setTitle(next.title);
      setOpen(true);
    });
  }, []);

  // If we open into a session id, hydrate the scene from the DB once.
  const { data: sessions = [] } = useSmartboardSessions(studentId);
  const [hydrated, setHydrated] = useState<ExcalidrawSceneJson | null>(null);
  useEffect(() => {
    const target = initialSessionId ?? sessionId;
    if (!target || hydrated) return;
    const found = sessions.find((s) => s.id === target);
    if (found) {
      setHydrated((found.excalidraw_scene_json ?? null) as ExcalidrawSceneJson);
      setTitle(found.title);
    }
  }, [initialSessionId, sessionId, sessions, hydrated]);

  const getScene = useCallback((): ExcalidrawSceneJson | null => {
    const api = apiRef.current;
    if (!api?.getSceneElements) return hydrated;
    return {
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles?.() ?? null,
    };
  }, [hydrated]);

  const autosave = useSmartboardAutosave({
    studentId,
    sessionId,
    title,
    enabled: !!studentId,
    getScene,
    onSaved: (id) => setSessionId(id),
  });

  const close = () => {
    void autosave.saveNow();
    setOpen(false);
    setArgs(null);
    setSessionId(null);
    setHydrated(null);
  };

  const hidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );

  if (!is_admin) return null;

  const bound = !!studentId;

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
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0 gap-3">
            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium min-w-0">
              <PencilRuler className="w-4 h-4 shrink-0" />
              <span className="truncate">{bound ? title : 'Whiteboard'}</span>
              {bound && (
                <AutosaveBadge status={autosave.status} lastSavedAt={autosave.lastSavedAt} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!bound && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Quick path: prompt for studentId via the existing
                    // search dropdown. v1 fallback: alert.
                    const id = window.prompt(
                      'Save this board to a student. Paste a student id from the Hub.',
                    );
                    if (!id) return;
                    setArgs({ studentId: id });
                  }}
                  className="h-7 px-2 text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save to session
                </Button>
              )}
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className={`p-1.5 rounded-md transition-colors ${
                  showTemplates
                    ? 'text-zinc-100 bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
                aria-label={showTemplates ? 'Hide templates panel' : 'Show templates panel'}
                title="Templates"
              >
                <PanelRight className="w-4 h-4" />
              </button>
              <button
                onClick={close}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                aria-label="Close whiteboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 min-w-0">
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading board…
                  </div>
                }
              >
                <Excalidraw
                  excalidrawAPI={(a: unknown) => {
                    apiRef.current = a as ExcalidrawApi;
                  }}
                  initialData={
                    hydrated
                      ? {
                          elements: (hydrated.elements ?? []) as never,
                          appState: (hydrated.appState ?? {}) as never,
                        }
                      : undefined
                  }
                  onChange={() => autosave.bumpChange()}
                />
              </Suspense>
            </div>
            {showTemplates && (
              <TemplatePalette
                getApi={() => apiRef.current as ExcalidrawTemplateApi | null}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AutosaveBadge({
  status,
  lastSavedAt,
}: {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
}) {
  if (status === 'saving' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 ml-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        {status === 'saving' ? 'Saving…' : 'Edits pending'}
      </span>
    );
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400/80 ml-2">
        <CheckCircle2 className="w-3 h-3" />
        Saved {formatDistanceToNowStrict(lastSavedAt)} ago
      </span>
    );
  }
  if (status === 'error') {
    return <span className="text-[11px] text-rose-300 ml-2">Save failed</span>;
  }
  return null;
}
