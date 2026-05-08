import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, PencilRuler, Loader2 } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import {
  useSaveSmartboardSession,
  useSmartboardSessions,
} from '@/hooks/useSmartboardSessions';

// Excalidraw is heavy; load only when this route mounts.
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })),
);

export default function TeacherSmartboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const sessionParam = searchParams.get('session');

  const { data: sessions = [] } = useSmartboardSessions(studentId);
  const save = useSaveSmartboardSession();

  type ExcalidrawScene = { elements?: unknown[]; appState?: unknown; files?: unknown } | null;
  type ExcalidrawApi = {
    getSceneElements: () => unknown[];
    getAppState: () => unknown;
    getFiles?: () => unknown;
  } | null;

  const [title, setTitle] = useState('Smartboard session');
  const [scene, setScene] = useState<ExcalidrawScene>(null);
  const [api, setApi] = useState<ExcalidrawApi>(null);

  // When loading a previous session, prefill scene + title.
  useEffect(() => {
    if (!sessionParam) return;
    const found = sessions.find((s) => s.id === sessionParam);
    if (found) {
      setTitle(found.title);
      setScene((found.excalidraw_scene_json ?? null) as ExcalidrawScene);
    }
  }, [sessionParam, sessions]);

  const handleSave = async () => {
    if (!studentId) {
      toast.error('Pick a student first');
      return;
    }
    try {
      const sceneJson = api?.getSceneElements
        ? {
            elements: api.getSceneElements(),
            appState: api.getAppState(),
            files: api.getFiles?.() ?? null,
          }
        : scene;
      const result = await save.mutateAsync({
        id: sessionParam ?? undefined,
        studentId,
        title,
        sceneJson,
      });
      setSearchParams((p) => {
        const c = new URLSearchParams(p);
        c.set('session', result.id);
        return c;
      });
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const initialData = useMemo(() => {
    if (!scene) return undefined;
    // Excalidraw types are not exported from the lazy import; cast at the boundary.
    return {
      elements: (scene.elements ?? []) as never,
      appState: (scene.appState ?? {}) as never,
    };
  }, [scene]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto max-h-[40vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
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
          <div className="px-3 py-3 border-t border-zinc-800 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-1">
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
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900')
                }
              >
                <div className="truncate">{s.title}</div>
                <div className="text-[10px] text-zinc-500">{s.session_date}</div>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="flex flex-col min-h-0">
        <div className="px-3 sm:px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <Label className="text-xs text-zinc-400 shrink-0">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm flex-1 sm:max-w-md min-w-0"
          />
          <Button
            size="sm"
            className="ml-auto shrink-0"
            onClick={handleSave}
            disabled={!studentId || save.isPending}
          >
            {save.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          {studentId ? (
            <Suspense fallback={<div className="h-full flex items-center justify-center text-zinc-500">Loading board…</div>}>
              <Excalidraw
                excalidrawAPI={(a: unknown) => setApi(a as ExcalidrawApi)}
                initialData={initialData}
              />
            </Suspense>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
              Pick a student to start a board.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
