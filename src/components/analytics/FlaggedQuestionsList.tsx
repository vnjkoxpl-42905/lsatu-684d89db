import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, Trash2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { questionBank } from '@/lib/questionLoader';

interface FlaggedQuestion {
  id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  note?: string;
  flagged_at: string;
}

export default function FlaggedQuestionsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = React.useState<FlaggedQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('flagged_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('flagged_at', { ascending: false });
      if (!error) setItems(data || []);
      setLoading(false);
    })();
  }, [user]);

  const handleUnflag = async (id: string) => {
    const { error } = await supabase.from('flagged_questions').delete().eq('id', id);
    if (!error) setItems((prev) => prev.filter((q) => q.id !== id));
  };

  const handlePractice = (qid: string) => {
    const question = questionBank.getQuestion(qid);
    if (!question) return;
    navigate('/drill?returnTo=/flagged', {
      state: {
        mode: 'type-drill',
        config: {
          qtypes: [question.qtype],
          difficulties: [question.difficulty],
          pts: [question.pt],
          count: 1,
          selectedQids: [qid],
        },
      },
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading flagged questions…</p>;
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Flag className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No flagged questions yet. Flag questions during practice to review them here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((flagged) => {
        const question = questionBank.getQuestion(flagged.qid);
        return (
          <Card key={flagged.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    PT{flagged.pt}-S{flagged.section}-Q{flagged.qnum}
                  </Badge>
                  {question && (
                    <>
                      <Badge variant="secondary">{question.qtype}</Badge>
                      <Badge>Difficulty {question.difficulty}</Badge>
                    </>
                  )}
                </div>
                {question && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {question.questionStem}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Flagged {new Date(flagged.flagged_at).toLocaleDateString()}
                </p>
                {flagged.note && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-md">
                    <p className="text-sm">{flagged.note}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button size="sm" onClick={() => handlePractice(flagged.qid)}>
                  <Play className="w-4 h-4 mr-2" />
                  Practice
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleUnflag(flagged.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Unflag
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
