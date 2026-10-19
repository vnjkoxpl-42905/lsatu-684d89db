import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { safeLazy } from '@/lib/safeLazy';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, PencilRuler, Loader2, CheckCircle2, Maximize2, Minimize2, PanelRight } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHubStudents } from '@/hooks/useHubStudents';
import { useSmartboardSessions } from '@/hooks/useSmartboardSessions';
import {
  useSmartboardAutosave,
  type ExcalidrawSceneJson,
} from '@/hooks/useSmartboardAutosave';
import { TemplatePalette, type ExcalidrawTemplateApi } from '@/components/whiteboard/TemplatePalette';
import { formatDistanceToNowStrict } from 'date-fns';

// Excalidraw is heavy; load only when this route mounts.
const Excalidraw = safeLazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })),
);

// Shared with FloatingWhiteboard so the show/hide preference is consistent
// across both whiteboard surfaces.
const TEMPLATES_STORAGE_KEY = 'lsatu.whiteboard.showTemplates';

export default function TeacherSmartboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get('student');
  const sessionParam = searchParams.get('session');

  const { data: sessions = [] } = useSmartboardSessions(studentId);
  const { rows: students = [] } = useHubStudents();

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
      className="flex flex-col h-screen w-screen bg-white"
    >
      <section className="flex flex-col flex-1 min-h-0">
        <div className="px-3 sm:px-4 py-3 border-b border-black/12 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {/* No rail on this route — the board owns the viewport — so this is
              the only way back to the workspace. */}
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 px-2"
            onClick={() => navigate('/teacher/today')}
            aria-label="Back to Teacher Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <PencilRuler className="w-4 h-4 text-black/45 shrink-0" />
          <Input
            value={title}
            aria-label="Board title"
            onChange={(e) => {
              setTitle(e.target.value);
              autosave.bumpChange();
            }}
            className="h-8 text-sm flex-1 sm:max-w-xs min-w-0"
          />
          <Label className="text-xs text-black/55 shrink-0">Save to</Label>
          <Select
            value={studentId ?? undefined}
            onValueChange={(id) =>
              setSearchParams((p) => {
                const c = new URLSearchParams(p);
                c.set('student', id);
                c.delete('session');
                return c;
              })
            }
          >
            <SelectTrigger className="h-8 w-[180px] text-sm shrink-0">
              <SelectValue placeholder="Pick a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.class_id} value={s.class_id}>
                  {s.display_name ?? s.email ?? 'Student'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {studentId && sessions.length > 0 && (
            <Select
              value={sessionParam ?? undefined}
              onValueChange={(id) =>
                setSearchParams((p) => {
                  const c = new URLSearchParams(p);
                  c.set('session', id);
                  return c;
                })
              }
            >
              <SelectTrigger className="h-8 w-[170px] text-sm shrink-0">
                <SelectValue placeholder="Previous boards" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} · {s.session_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <AutosaveBadge status={autosave.status} lastSavedAt={autosave.lastSavedAt} />
          <Button
            size="sm"
            variant={showTemplates ? 'secondary' : 'outline'}
            className="shrink-0"
            onClick={() => setShowTemplates((v) => !v)}
          >
            <PanelRight className="w-4 h-4 mr-2" />
            Templates
          </Button>
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
          {showTemplates && (
            <TemplatePalette
              getApi={() => apiRef.current as ExcalidrawTemplateApi | null}
            />
          )}
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
