import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ClassroomSection, EmptyHint } from './ClassroomSection';
import {
  useStudentExternalUploads,
  type UploadType,
} from '@/hooks/useExternalWorkUploads';
import { format } from 'date-fns';

const TYPES: { value: UploadType; label: string }[] = [
  { value: '7sage_analytics', label: '7Sage analytics' },
  { value: 'pt_result', label: 'PT result' },
  { value: 'lr_section', label: 'LR section' },
  { value: 'rc_section', label: 'RC section' },
  { value: 'drill_result', label: 'Drill result' },
  { value: 'score_report', label: 'Score report' },
  { value: 'other', label: 'Other' },
];

export function UploadWorkSection() {
  const [uploadType, setUploadType] = useState<UploadType>('7sage_analytics');
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: uploads, submit, submitting } = useStudentExternalUploads();
  const recent = uploads?.slice(0, 3) ?? [];

  const onPick = async (file: File | null) => {
    if (!file) return;
    try {
      await submit(file, uploadType);
      toast.success('Upload received. Joshua will review this if needed.');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    }
  };

  return (
    <ClassroomSection
      title="Upload work"
      hint="Send a screenshot or PDF of work done outside LSAT U."
    >
      <div className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">What kind of work?</label>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as UploadType)}
            className="text-xs rounded-md border border-border bg-background px-2 py-1"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={submitting}
            variant="outline"
            size="sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Choose file
              </>
            )}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            PDF or image, up to 25MB.
          </span>
        </div>
      </div>

      {recent.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Recent uploads
          </div>
          <ul className="space-y-1">
            {recent.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card/40 border border-border/40 text-xs"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{u.file_name}</span>
                <span className="text-muted-foreground shrink-0">
                  {format(new Date(u.created_at), 'MMM d')}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Received
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Nothing uploaded yet.
        </p>
      )}
    </ClassroomSection>
  );
}
