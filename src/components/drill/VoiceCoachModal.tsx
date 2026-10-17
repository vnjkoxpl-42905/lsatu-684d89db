import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { questionBank, shuffleArray } from '@/lib/questionLoader';

interface VoiceCoachModalProps {
  open: boolean;
  question: any;
  selectedAnswer: string;
  onTryAgain: () => void;
  onMicroDrill: (questions: any[]) => void;
  onSaveToJournal: () => void;
  onClose: () => void;
  showContrast?: boolean;
}

type Phase = 'idle' | 'recording' | 'processing' | 'coach-response';

export function VoiceCoachModal({
  open,
  question,
  selectedAnswer,
  onTryAgain,
  onMicroDrill,
  onSaveToJournal,
  onClose,
  showContrast = false
}: VoiceCoachModalProps) {
  const { user } = useAuth();
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [transcript, setTranscript] = React.useState('');
  const [coachReply, setCoachReply] = React.useState('');
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [error, setError] = React.useState('');
  
  const recognitionRef = React.useRef<any>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef<number>(0);
  // Keep the live transcript in a ref so the mount-time onerror handler and the
  // 20s auto-stop interval read the current value instead of a stale closure.
  const transcriptRef = React.useRef('');
  // Route the interval/onerror through a stable ref so they always call the
  // latest stopRecording (which itself reads transcriptRef).
  const stopRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const next = finalTranscript || interimTranscript;
        transcriptRef.current = next;
        setTranscript(next);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setError('No speech detected. Please speak clearly and try again.');
        } else if (event.error === 'audio-capture') {
          setError('Microphone access denied. Please allow microphone access.');
        } else {
          setError('Voice recognition error. Please try again.');
        }
        stopRef.current();
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      // getUserMedia is only a permission probe here; SpeechRecognition manages
      // its own capture. Stop the probe tracks immediately so the mic indicator
      // does not stay lit for the rest of the session.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());

      setPhase('recording');
      transcriptRef.current = '';
      setTranscript('');
      setError('');
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDuration(Math.floor(elapsed / 1000));

        if (elapsed >= 20000) {
          stopRef.current();
        }
      }, 100);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const duration = Date.now() - startTimeRef.current;

    if (duration < 2000) {
      setError('Recording too short. Please speak for at least 2 seconds.');
      setPhase('idle');
      return;
    }

    const liveTranscript = transcriptRef.current;
    if (!liveTranscript || liveTranscript.trim().split(/\s+/).length < 3) {
      setError('Could not understand speech. Please speak more clearly.');
      setPhase('idle');
      return;
    }

    processTranscript(liveTranscript, duration);
  };

  // Always point stopRef at the latest stopRecording closure.
  stopRef.current = stopRecording;

  const processTranscript = async (text: string, durationMs: number) => {
    setPhase('processing');

    let data: any;
    try {
      const result = await supabase.functions.invoke('voice-coach-respond', {
        body: {
          transcript: text,
          question,
          selectedAnswer,
          showContrast
        }
      });

      if (result.error) throw result.error;
      data = result.data;
    } catch (err) {
      // Never show fabricated feedback: surface a real error and let the
      // student retry rather than presenting a canned reply as analysis.
      console.error('Error processing transcript:', err);
      setError('Could not process your explanation. Please try again.');
      setPhase('idle');
      return;
    }

    setCoachReply(data.coachReply);
    setPhase('coach-response');

    // Logging is separate: a failed insert must not clobber the real reply the
    // student already sees. Check the returned error and toast on failure.
    const classId = user?.user_metadata?.class_id;
    if (classId) {
      const { error: logError } = await supabase.from('voice_coaching_sessions').insert({
        class_id: classId,
        qid: question.qid,
        voice_duration_ms: durationMs,
        spoken_words: text,
        transcript_full: text,
        coach_reply_id: data.replyId,
        coach_reply_text: data.coachReply,
        action_taken: null
      } as any);
      if (logError) {
        console.error('Error saving voice coaching session:', logError);
        toast.error("Couldn't save this coaching session.");
      }
    }
  };

  const handleAction = async (action: 'try_again' | 'micro_drill' | 'save_journal') => {
    const classId = user?.user_metadata?.class_id;
    if (classId) {
      // PostgREST does not honor .order().limit() on UPDATE as "newest row";
      // select the newest session id first, then update it by id.
      const { data: latest, error: selError } = await supabase
        .from('voice_coaching_sessions')
        .select('id')
        .eq('class_id', classId)
        .eq('qid', question.qid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selError) {
        console.error('Error finding voice coaching session:', selError);
      } else if (latest?.id) {
        const { error: updError } = await supabase
          .from('voice_coaching_sessions')
          .update({ action_taken: action })
          .eq('id', latest.id);
        if (updError) {
          console.error('Error recording voice coaching action:', updError);
        }
      }
    }

    if (action === 'try_again') {
      onTryAgain();
    } else if (action === 'micro_drill') {
      // Real bank lookup, done client-side: the question bank is static JSON loaded
      // in the browser (there is no questions table to query from an edge function),
      // so selection happens here. Pick up to 2 real questions matching this
      // question's type + difficulty, excluding the one just attempted.
      if (!questionBank.isReady()) {
        try {
          await questionBank.load();
        } catch (loadErr) {
          console.error('Micro-drill: question bank failed to load:', loadErr);
        }
      }
      const candidates = questionBank
        .getQuestionsByFilter({ qtypes: [question.qtype], difficulties: [question.difficulty] })
        .filter((q) => q.qid !== question.qid);
      if (candidates.length === 0) {
        toast.error("No similar questions available for a mini drill right now.");
        return;
      }
      onMicroDrill(shuffleArray(candidates).slice(0, 2));
    } else if (action === 'save_journal') {
      onSaveToJournal();
    }
    
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 space-y-6 bg-card border-border">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {phase === 'idle' && 'Explain your reasoning'}
            {phase === 'recording' && 'Listening...'}
            {phase === 'processing' && 'Processing...'}
            {phase === 'coach-response' && 'Coach feedback'}
          </h3>
        </div>

        {(phase === 'idle' || phase === 'recording') && (
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={phase === 'idle' ? startRecording : stopRecording}
              className={cn(
                "w-20 h-20 rounded-full",
                "bg-muted-foreground hover:bg-muted-foreground/90"
              )}
            >
              {phase === 'recording' ? (
                <Square className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
            
            {phase === 'recording' && (
              <div className="text-center">
                <div className="text-2xl font-mono text-foreground">
                  {recordingDuration}s / 20s
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Speak naturally. Click to stop.
                </p>
              </div>
            )}
            
            {phase === 'idle' && (
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Click to start recording. Explain why you chose your answer.
              </p>
            )}
            
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing your reasoning...</p>
          </div>
        )}

        {phase === 'coach-response' && (
          <div className="space-y-6">
            <div className="p-4 bg-muted border border-border rounded-lg">
              <p className="text-base text-foreground leading-relaxed">
                {coachReply}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleAction('try_again')}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Try again
              </Button>
              <Button
                onClick={() => handleAction('micro_drill')}
                variant="outline"
                className="flex-1"
              >
                1-min drill (2 Qs)
              </Button>
              <Button
                onClick={() => handleAction('save_journal')}
                variant="outline"
                className="flex-1"
              >
                Save to journal
              </Button>
            </div>
          </div>
        )}

        {phase !== 'processing' && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        )}
      </Card>
    </div>
  );
}
