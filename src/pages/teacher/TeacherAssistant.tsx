import { Sparkles } from 'lucide-react';
import TAChatView from '@/components/ta/TAChatView';

/**
 * Teaching Assistant — the full-page assistant room in the teacher workspace.
 *
 * It runs the action agent (`ta-agent`, Gemini 3.8 Flash on the project's
 * GEMINI_API_KEY), so it can propose real platform actions: assigning guided
 * drills, homework sets, bootcamp modules, activities, drafting a note, or
 * emailing a student. Every action arrives as a card that Joshua confirms
 * before anything reaches a student.
 */
export default function TeacherAssistant() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#c3cace]">
      <div className="shrink-0 border-b border-black/10 px-5 py-4 sm:px-6">
        <div className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-black/45">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
          Teaching Assistant
        </div>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-black/60">
          Ask for anything on the platform: assign a guided drill, activity, homework set or
          bootcamp module, draft and send a note, email a student, or pull messages and progress.
          Every action is proposed first and only happens once you confirm it.
        </p>
      </div>

      {/* The chat itself is the dark surface it was designed for, framed by the
          workspace's pale room so it reads as one stage, not a floating card. */}
      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <div className="h-full min-h-0 overflow-hidden rounded-lg border border-black/15 bg-zinc-950">
          <TAChatView studentId={null} backend="ta-agent" />
        </div>
      </div>
    </div>
  );
}
