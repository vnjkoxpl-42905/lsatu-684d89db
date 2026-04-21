import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClassId } from '@/hooks/useClassId';
import { cn } from '@/lib/utils';

interface SectionRecord {
  id: string;
  pt: number;
  section: number;
  initial_score: number;
  initial_total: number;
  initial_percent: number;
  br_score: number | null;
  br_percent: number | null;
  created_at: string;
  total_time_ms: number;
}

export function RecentPerformanceWidget() {
  const { user } = useAuth();
  const { classId, loading: classIdLoading } = useClassId();
  const [records, setRecords] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classIdLoading) return;
    fetchRecentPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, classId, classIdLoading]);

  const fetchRecentPerformance = async () => {
    if (!user || !classId) return;

    try {
      const { data, error } = await supabase
        .from('section_history')
        .select('id, pt, section, initial_score, initial_total, initial_percent, br_score, br_percent, created_at, total_time_ms')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching recent performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const cardClasses = "relative overflow-hidden rounded-xl bg-neutral-900/70 backdrop-blur-xl border border-white/[0.06] p-6";
  const headerEl = (
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp className="w-4 h-4 text-neutral-400" />
      <h3 className="text-sm font-semibold text-white">Recent Performance</h3>
    </div>
  );

  if (loading) {
    return (
      <div className={cardClasses}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        {headerEl}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className={cardClasses}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        {headerEl}
        <div className="text-center py-8 text-neutral-500 text-sm">
          No practice sessions yet. Start drilling to see your performance!
        </div>
      </div>
    );
  }

  return (
    <div className={cn(cardClasses, "hover:border-white/[0.12] transition-all duration-200")}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-white">Recent Performance</h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-white/[0.08] text-neutral-500 bg-transparent">
          Last {records.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {records.map((record, idx) => {
          const finalScore = record.br_score !== null ? record.br_score : record.initial_score;
          const finalPercent = record.br_percent !== null ? record.br_percent : record.initial_percent;
          const improved = record.br_score !== null && record.br_score > record.initial_score;

          return (
            <div
              key={record.id}
              className={cn(
                "group relative p-3 rounded-lg border transition-all duration-150",
                idx === 0
                  ? "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.14]"
                  : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {idx === 0 && (
                    <Trophy className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white font-mono">
                        PT{record.pt}-S{record.section}
                      </span>
                      {improved && (
                        <Badge variant="default" className="text-xs px-1.5 py-0 h-5 bg-white/10 text-white border-0">
                          +{record.br_score! - record.initial_score}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(record.total_time_ms)}
                      <span className="text-neutral-600">·</span>
                      <span>{formatDate(record.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-white font-mono">
                      {finalScore}/{record.initial_total}
                    </div>
                    <div className={cn(
                      "text-xs font-medium",
                      finalPercent >= 70 ? "text-emerald-400" :
                      finalPercent >= 50 ? "text-amber-400" :
                      "text-rose-400"
                    )}>
                      {finalPercent}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
