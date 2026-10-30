import React from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  listGuidedDrills,
  resolveGuidedDrillPool,
  type GuidedDrill,
} from '@/lib/guidedDrills';
import { assignWork, describeAssignResult } from '@/lib/assignWork';
import { useHubStudents } from '@/hooks/useHubStudents';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { TEACHER_GUIDED_DRILLS_RETURN_TO } from '@/lib/guidedDrillNavigation';

const REASONING_TYPES = ['Conditional Reasoning', 'Causation', 'Comparative Reasoning'];

export default function AdminGuidedDrills() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isLoading: qbLoading } = useQuestionBank();
  const { rows: students } = useHubStudents();
  const [drills, setDrills] = React.useState<GuidedDrill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [weekFilter, setWeekFilter] = React.useState<number | 'all'>('all');
  const [rtFilter, setRtFilter] = React.useState<string | 'all'>('all');
  const [previewDrill, setPreviewDrill] = React.useState<GuidedDrill | null>(null);
  const [assignDrill, setAssignDrill] = React.useState<GuidedDrill | null>(null);
  const [selectedStudents, setSelectedStudents] = React.useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = React.useState<string>('');

  React.useEffect(() => {
    listGuidedDrills().then((d) => { setDrills(d); setLoading(false); }).catch((e) => {
      toast.error('Failed to load guided drills');
      console.error(e);
      setLoading(false);
    });
  }, []);

  const weeks = React.useMemo(() => Array.from(new Set(drills.map((d) => d.week))).sort((a, b) => a - b), [drills]);
  const filtered = drills.filter((d) => {
    if (weekFilter !== 'all' && d.week !== weekFilter) return false;
    if (rtFilter !== 'all' && !d.reasoning_types.includes(rtFilter)) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const poolSize = (d: GuidedDrill) => qbLoading ? null : resolveGuidedDrillPool(d.bank_filter).length;

  const handleAssign = async () => {
    if (!assignDrill || !user || selectedStudents.size === 0) return;
    const result = await assignWork({
      teacherId: user.id,
      studentIds: [...selectedStudents],
      item: { kind: 'guided_drill', drillId: assignDrill.id },
      scheduledForLocalDate: scheduledFor || undefined,
    });

    queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
    queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

    const { level, message } = describeAssignResult(result, assignDrill.title);
    toast[level](message);
    if (result.ok.length === 0) return;

    setAssignDrill(null);
    setSelectedStudents(new Set());
    setScheduledFor('');
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif">Guided Drills</h1>
          <p className="text-sm text-muted-foreground">Admin-only catalog · {drills.length} drills across {weeks.length} weeks</p>
        </div>
        <Link to="/admin"><Button variant="outline">← Back to Admin</Button></Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select className="bg-card border border-border rounded px-3 py-2 text-sm"
                value={weekFilter} onChange={(e) => setWeekFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}>
          <option value="all">All weeks</option>
          {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <select className="bg-card border border-border rounded px-3 py-2 text-sm"
                value={rtFilter} onChange={(e) => setRtFilter(e.target.value)}>
          <option value="all">All reasoning types</option>
          {REASONING_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading drills…</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2">Wk</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Q-Types</th>
                <th className="px-3 py-2">Reasoning</th>
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Pool</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const ps = poolSize(d);
                const need = d.question_count ?? 0;
                const poolBad = ps != null && need > 0 && ps < need;
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">W{d.week}.{d.order_in_week}</td>
                    <td className="px-3 py-2 font-medium">{d.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.category || '—'}</td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{d.question_types.map((q) => <Badge key={q} variant="secondary" className="text-[10px]">{q}</Badge>)}</div></td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{d.reasoning_types.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}</div></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{d.question_features.join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-center">{d.question_count ?? '—'}</td>
                    <td className={`px-3 py-2 text-center ${poolBad ? 'text-amber-500' : 'text-muted-foreground'}`}>{ps ?? '…'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Link to={`/guided-drills/${d.slug}?returnTo=${encodeURIComponent(TEACHER_GUIDED_DRILLS_RETURN_TO)}`}>
                          <Button size="sm" variant="outline">Open HTML</Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => setPreviewDrill(d)}>Markdown Preview</Button>
                        <Button size="sm" onClick={() => setAssignDrill(d)}>Assign</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview sheet */}
      <Sheet open={!!previewDrill} onOpenChange={(o) => !o && setPreviewDrill(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{previewDrill?.title}</SheetTitle></SheetHeader>
          {previewDrill && (
            <div className="mt-4 space-y-6">
              <div className="text-sm text-muted-foreground">
                Week {previewDrill.week} · {previewDrill.category} · {previewDrill.estimated_minutes ? `${previewDrill.estimated_minutes} min` : 'untimed'} · {previewDrill.question_count ?? '?'} questions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="prose prose-sm dark:prose-invert max-w-none border border-border rounded p-3 bg-card">
                  <h4>Left column</h4>
                  <ReactMarkdown>{previewDrill.instruction_card.left_md || '_(no content)_'}</ReactMarkdown>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none border border-border rounded p-3 bg-card">
                  <h4>Right column</h4>
                  <ReactMarkdown>{previewDrill.instruction_card.right_md || '_(no content)_'}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign sheet */}
      <Sheet open={!!assignDrill} onOpenChange={(o) => { if (!o) { setAssignDrill(null); setSelectedStudents(new Set()); }}}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Assign: {assignDrill?.title}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Schedule for (optional)</label>
              <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Students ({selectedStudents.size} selected)</label>
              <ScrollArea className="h-80 mt-2 border border-border rounded">
                <div className="p-2 space-y-1">
                  {students.map((s) => (
                    <label key={s.class_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedStudents.has(s.class_id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedStudents);
                          if (checked) next.add(s.class_id); else next.delete(s.class_id);
                          setSelectedStudents(next);
                        }}
                      />
                      <span className="text-sm">{s.display_name || s.email || s.class_id.slice(0, 8)}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <Button className="w-full" disabled={selectedStudents.size === 0} onClick={handleAssign}>
              Assign to {selectedStudents.size} student(s)
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
