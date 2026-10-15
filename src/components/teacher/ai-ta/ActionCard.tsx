import { CheckCircle2, AlertCircle, FileText, Send, Search, Users, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OperatorToolResult } from '@/hooks/useOperatorChat';

const ICONS: Record<string, LucideIcon> = {
  find_students: Search,
  list_recent_students: Users,
  create_draft: FileText,
  send_message: Send,
  summarize_student: Sparkles,
};

const LABELS: Record<string, string> = {
  find_students: 'Looked up students',
  list_recent_students: 'Pulled recent students',
  create_draft: 'Drafted',
  send_message: 'Sent message',
  summarize_student: 'Summarized student',
};

interface ToolStudent {
  id?: string;
  name?: string | null;
  email?: string | null;
}

function formatStudentList(students: ToolStudent[]) {
  if (!students?.length) return 'no matches';
  return students
    .slice(0, 5)
    .map((s) => s.name || s.email || s.id)
    .join(', ') + (students.length > 5 ? `, +${students.length - 5} more` : '');
}

export function ActionCard({ tr }: { tr: OperatorToolResult }) {
  const Icon = ICONS[tr.name] ?? Sparkles;
  const ok = tr.result?.ok;
  const label = LABELS[tr.name] ?? tr.name;
  const data = (tr.result?.data ?? {}) as {
    students?: ToolStudent[];
    draft?: { draft_type?: string };
    student?: { display_name?: string };
  };

  let summary: React.ReactNode = null;
  let actionLink: { to: string; label: string } | null = null;

  if (tr.name === 'find_students' || tr.name === 'list_recent_students') {
    summary = (
      <span className="text-zinc-300">{formatStudentList(data.students ?? [])}</span>
    );
  } else if (tr.name === 'create_draft') {
    const dType = data.draft?.draft_type;
    summary = (
      <span className="text-zinc-300">
        a <span className="text-amber-300">{dType?.replace('_', ' ') ?? 'draft'}</span>{' '}
        — pending your approval
      </span>
    );
    actionLink = { to: '/teacher/command?tab=drafts', label: 'Review' };
  } else if (tr.name === 'send_message') {
    summary = <span className="text-zinc-300">delivered to the student's inbox</span>;
    actionLink = { to: '/teacher/conversations', label: 'Open thread' };
  } else if (tr.name === 'summarize_student') {
    const name = data.student?.display_name ?? 'student';
    summary = <span className="text-zinc-300">pulled signals for {name}</span>;
  } else {
    summary = <span className="text-zinc-400 text-xs">{JSON.stringify(data)}</span>;
  }

  if (!ok) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-red-200 font-medium">{label} failed</div>
          <div className="text-red-300/80 text-xs mt-0.5">
            {tr.result?.error ?? 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-900/30 bg-gradient-to-br from-amber-950/20 to-zinc-900/40 px-3 py-2 text-sm">
      <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-1.5 shrink-0">
        <Icon className="w-3.5 h-3.5 text-amber-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-zinc-100 font-medium text-xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {label}
        </div>
        <div className="text-xs mt-0.5">{summary}</div>
      </div>
      {actionLink && (
        <Link
          to={actionLink.to}
          className="text-[11px] font-medium text-amber-300 hover:text-amber-200 shrink-0 underline-offset-2 hover:underline"
        >
          {actionLink.label}
        </Link>
      )}
    </div>
  );
}
