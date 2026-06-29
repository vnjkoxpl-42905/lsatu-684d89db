import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, LineChart, Save, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import {
  useAnalyticsSources,
  useUpsertAnalyticsSource,
} from '@/hooks/useAnalyticsSources';
import { useStudentExternalUploadsForStudent } from '@/hooks/useExternalWorkUploads';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherAnalyticsBridge() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const setStudentId = (id: string) =>
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });
  const { data: sources = [] } = useAnalyticsSources(studentId);
  const { data: uploads = [] } = useStudentExternalUploadsForStudent(studentId);
  const upsert = useUpsertAnalyticsSource();
  const sevenSage = sources.find((s) => s.source_name === '7sage');

  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [embedOpen, setEmbedOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setUrl(sevenSage?.source_url ?? '');
    setEmbedOpen(false);
  }, [sevenSage?.source_url, studentId]);

  const saveUrl = async () => {
    if (!studentId) return;
    try {
      await upsert.mutateAsync({
        student_id: studentId,
        source_name: '7sage',
        source_url: url || null,
      });
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  };

  const importPaste = async () => {
    if (!studentId || !user || !pasted.trim()) return;
    setPosting(true);
    try {
      const blob = new Blob([pasted], { type: 'text/plain' });
      const path = `${studentId}/${Date.now()}-7sage-paste.txt`;
      const { error: upErr } = await supabase.storage
        .from('external-work-uploads')
        .upload(path, blob, { contentType: 'text/plain', upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from('external_work_uploads').insert({
        student_id: studentId,
        uploaded_by: user.id,
        file_name: '7sage analytics paste',
        file_type: 'text/plain',
        storage_path: path,
        upload_type: '7sage_analytics',
        source_platform: '7sage',
        processing_status: 'needs_review',
        extracted_text: pasted,
      } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['external-uploads-by-student', studentId] });
      qc.invalidateQueries({ queryKey: ['external-uploads-queue'] });
      setPasted('');
      toast.success('Saved for review');
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <LineChart className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>

      <section className="p-6 space-y-6 overflow-y-auto">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">7Sage analytics bridge</h2>
          <p className="text-sm text-zinc-400 max-w-xl">
            Save the student's 7Sage URL, attempt embedded view, or paste analytics
            text for AI parsing. No scraping. No assumed API access.
          </p>
        </div>

        {!studentId ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            Select a student.
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <Label className="text-xs">Saved 7Sage URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://7sage.com/..."
                  className="text-sm"
                />
                <Button onClick={saveUrl} size="sm" disabled={upsert.isPending}>
                  {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                {url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open
                  </Button>
                )}
              </div>
            </section>

            {url && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Embed</Label>
                  <div className="flex items-center gap-2">
                    {embedOpen && (
                      <button
                        type="button"
                        className="text-[11px] text-zinc-500 hover:text-zinc-100"
                        onClick={() => setEmbedOpen(false)}
                      >
                        Hide embed
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-[11px] text-zinc-500 hover:text-zinc-100"
                      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                    >
                      Open in new tab
                    </button>
                  </div>
                </div>
                {!embedOpen ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-6 flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-zinc-100 font-medium">7Sage usually blocks embedding</div>
                      <div className="text-zinc-400 mt-1">
                        Open in a new tab is the reliable path. You can still try
                        embedding inline; if 7Sage blocks it the panel will be
                        blank.
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setEmbedOpen(true)}
                      >
                        Try embed
                      </Button>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={url}
                    title="7Sage analytics"
                    className="w-full h-[420px] rounded-lg border border-zinc-800 bg-white"
                  />
                )}
              </section>
            )}

            <section className="space-y-2">
              <Label className="text-xs">Paste analytics text</Label>
              <Textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                placeholder="Paste 7Sage analytics block here for review and AI parsing later."
                className="text-sm"
              />
              <div className="flex justify-end">
                <Button onClick={importPaste} size="sm" disabled={posting || !pasted.trim()}>
                  {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Save for review
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                Recent uploads from this student
              </h3>
              {uploads.length === 0 ? (
                <div className="text-xs text-zinc-500 italic">None.</div>
              ) : (
                <ul className="space-y-1">
                  {uploads.slice(0, 6).map((u) => (
                    <li
                      key={u.id}
                      className="px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900/30 text-xs flex items-center gap-2"
                    >
                      <span className="text-zinc-500 uppercase tracking-wider w-32 shrink-0">
                        {u.upload_type.replace('_', ' ')}
                      </span>
                      <span className="truncate flex-1">{u.file_name}</span>
                      <span className="text-zinc-500 shrink-0">
                        {u.processing_status.replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}
