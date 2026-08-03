import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, PencilRuler, Loader2, CheckCircle2, Maximize2, Minimize2 } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import { useSmartboardSessions } from '@/hooks/useSmartboardSessions';
import {
  useSmartboardAutosave,
  type ExcalidrawSceneJson,
} from '@/hooks/useSmartboardAutosave';
import { TemplatePalette, type ExcalidrawTemplateApi } from '@/components/whiteboard/TemplatePalette';
import { formatDistanceToNowStrict } from 'date-fns';

// Excalidraw is heavy; load only when this route mounts.
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })),
);

export default function TeacherSmartboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const sessionParam = searchParams.get('session');

  const { data: sessions = [] } = useSmartboardSessions(studentId);

  type ExcalidrawApi = {
    getSceneElements: () => unknown[];
    getAppState: () => unknown;
    getFiles?: () => unknown;
    updateScene?: (data: { elements: unknown[] }) => void;
  } | null;

  const [title, setTitle] = useState('Smartboard session');
  const [scene, setScene] = useState<ExcalidrawSceneJson | null>(null);
  const apiRef = useRef<ExcalidrawApi>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  // When loading a previous session, prefill scene + title.
  useEffect(() => {
    if (!sessionParam) return;
    const found = sessions.find((s) => s.id === sessionParam);
    if (found) {
      setTitle(found.title);
      setScene((found.excalidraw_scene_json ?? null) as ExcalidrawSceneJson);
    }
  }, [sessionParam, sessions]);

  const getScene = useCallback((): ExcalidrawSceneJson | null => {
    const api = apiRef.current;
    if (!api?.getSceneElements) return scene;
    return {
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles?.() ?? null,
    };
  }, [scene]);

  const autosave = useSmartboardAutosave({
    studentId,
    sessionId: sessionParam,
    title,
    enabled: !!studentId,
    getScene,
    onSaved: (id) => {
      if (id !== sessionParam) {
        setSearchParams((p) => {
          const c = new URLSearchParams(p);
          c.set('session', id);
          return c;
        });
      }
    },
  });

  const handleManualSave = async () => {
    if (!studentId) {
      toast.error('Pick a student first');
      return;
    }
    try {
      await autosave.saveNow();
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const initialData = useMemo(() => {
    if (!scene) return undefined;
    return {
      elements: (scene.elements ?? []) as never,
      appState: (scene.appState ?? {}) as never,
    };
  }, [scene]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full bg-white"
    >
      <aside className="border-b lg:border-b-0 lg:border-r border-black/12 overflow-y-auto max-h-[40vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-black/12 flex items-center gap-2 text-black/55">
          <PencilRuler className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList
          selectedId={studentId}
          onSelect={(id) =>
            setSearchParams((p) => {
              const c = new URLSearchParams(p);
              c.set('student', id);
              c.delete('session');
              return c;
            })
          }
        />
        {studentId && sessions.length > 0 && (
          <div className="px-3 py-3 border-t border-black/12 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-black/45 font-semibold px-1">
              Previous boards
            </div>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  setSearchParams((p) => {
                    const c = new URLSearchParams(p);
                    c.set('session', s.id);
                    return c;
                  })
                }
                className={
                  'w-full text-left px-2 py-1.5 rounded text-xs ' +
                  (s.id === sessionParam
                    ? 'bg-white/40 text-[#11181c]'
                    : 'text-black/55 hover:text-black hover:bg-white/50')
                }
              >
                <div className="truncate">{s.title}</div>
                <div className="text-[10px] text-black/45">{s.session_date}</div>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="flex flex-col min-h-0">
        <div className="px-3 sm:px-4 py-3 border-b border-black/12 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <Label className="text-xs text-black/55 shrink-0">Title</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              autosave.bumpChange();
            }}
            className="h-8 text-sm flex-1 sm:max-w-md min-w-0"
          />
          <AutosaveBadge status={autosave.status} lastSavedAt={autosave.lastSavedAt} />
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 mr-2" />
            ) : (
              <Maximize2 className="w-4 h-4 mr-2" />
            )}
            {isFullscreen ? 'Exit full screen' : 'Full screen'}
          </Button>
          <Button
            size="sm"
            className="shrink-0"
            onClick={handleManualSave}
            disabled={!studentId}
          >
            <Save className="w-4 h-4 mr-2" />
            Save now
          </Button>
        </div>
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-black/45">Loading board…</div>}>
              <Excalidraw
                excalidrawAPI={(a: unknown) => {
                  apiRef.current = a as ExcalidrawApi;
                }}
                initialData={initialData}
                onChange={() => autosave.bumpChange()}
              />
            </Suspense>
          </div>
          <TemplatePalette
            getApi={() => apiRef.current as ExcalidrawTemplateApi | null}
          />
        </div>
      </section>
    </div>
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
      <span className="inline-flex items-center gap-1.5 text-[11px] text-black/55">
        <Loader2 className="w-3 h-3 animate-spin" />
        {status === 'saving' ? 'Saving…' : 'Edits pending'}
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-[11px] text-rose-300">Save failed — try Save now</span>
    );
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400/80">
        <CheckCircle2 className="w-3 h-3" />
        Saved {formatDistanceToNowStrict(lastSavedAt)} ago
      </span>
    );
  }
  return null;
}
