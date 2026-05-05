import { useNavigate } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Messages tab: deep-links into the existing /inbox admin view rather
 * than duplicating the messenger here. Inbox already has admin search,
 * filter tabs, and the full conversation surface.
 */
export default function TeacherMessages() {
  const navigate = useNavigate();
  return (
    <div className="px-6 py-8 max-w-3xl space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-zinc-400">
          <MessagesSquare className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Messages
          </span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Inbox</h2>
        <p className="text-sm text-zinc-400 max-w-xl">
          Real human messages between you and your students live in the
          existing Inbox. This keeps Classroom announcements and one-to-one
          conversations clearly separate.
        </p>
      </div>
      <Button onClick={() => navigate('/inbox')}>Open Inbox</Button>
    </div>
  );
}
