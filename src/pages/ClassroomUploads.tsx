import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useStudentExternalUploads } from '@/hooks/useExternalWorkUploads';

export default function ClassroomUploads() {
  const navigate = useNavigate();
  const { data: uploads = [], isLoading } = useStudentExternalUploads();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/classroom')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Classroom
          </Button>
          <div className="flex items-center gap-2 ml-auto text-foreground">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight">Your uploads</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : uploads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            You haven't uploaded any work yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {uploads.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30"
              >
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.file_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {u.upload_type.replace('_', ' ')} · {format(new Date(u.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  {u.processing_status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
