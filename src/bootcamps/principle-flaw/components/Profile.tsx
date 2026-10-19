import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Download, Calendar, FileText, BookOpen, Zap, ListChecks, Film, Printer, Archive } from 'lucide-react';
import {
  downloadSchedule,
  downloadQuestionList,
  downloadFlawNotes,
  downloadPrincipleNotes,
  downloadFlashcards,
  downloadModuleOverview,
  downloadAllAsZip,
} from '../lib/downloads';

export default function Profile({ 
  currentName, 
  onUpdateName, 
  onReset 
}: { 
  currentName: string;
  onUpdateName: (name: string) => void;
  onReset: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  const handleSave = () => {
    if (name.trim()) {
      onUpdateName(name.trim());
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h1 className="text-5xl font-serif italic text-zinc-50 tracking-tight">Profile & Settings</h1>
        <p className="text-zinc-500 mt-2 font-light max-w-2xl leading-relaxed">
          Manage your personal details, exports, and app data.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <CardHeader>
          <CardTitle>Your Name</CardTitle>
          <CardDescription className="text-zinc-400">
            This is stored locally in your browser to personalize your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-sm block"
          />
          <Button onClick={handleSave} disabled={!name.trim() || name.trim() === currentName}>
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 max-w-3xl">
        <CardHeader>
          <CardTitle>Downloads</CardTitle>
          <CardDescription className="text-zinc-400">
            Export your study materials. Files are plain text generated from the app's content; open in any editor or print to PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DownloadRow icon={<Calendar size={16} />} title="Schedule" hint="14-day plan with daily goals." onClick={downloadSchedule} />
            <DownloadRow icon={<ListChecks size={16} />} title="Question List" hint="Every assigned PT, Section, and Q." onClick={downloadQuestionList} />
            <DownloadRow icon={<FileText size={16} />} title="Flaw Notes" hint="Method, styles, famous flaws, traps." onClick={downloadFlawNotes} />
            <DownloadRow icon={<BookOpen size={16} />} title="Principle Notes" hint="Four pillars, varieties, types." onClick={downloadPrincipleNotes} />
            <DownloadRow icon={<Zap size={16} />} title="Flashcards" hint="The full deck as text." onClick={downloadFlashcards} />
            <DownloadRow icon={<Film size={16} />} title="Module Overview" hint="The study walkthrough script." onClick={downloadModuleOverview} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={downloadAllAsZip} className="rounded-xl">
              <Archive size={14} className="mr-2" /> Download Everything
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl border-zinc-800 text-zinc-300">
              <Printer size={14} className="mr-2" /> Print / Save PDF
            </Button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">
            Note: the Question List references PT, Section, and Question only. Open the actual PrepTest PDF to read each question. The app does not reproduce LSAT question text.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-rose-900/30 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-rose-400">Danger Zone</CardTitle>
          <CardDescription className="text-zinc-400">
            Resetting your progress will delete all checklist completions and your review log. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isResetConfirming ? (
            <Button variant="outline" className="text-rose-400 border-rose-900/50 hover:bg-rose-950/50" onClick={() => setIsResetConfirming(true)}>
              Reset All Progress
            </Button>
          ) : (
            <div className="space-y-4 bg-rose-950/20 p-4 rounded-lg border border-rose-900/50">
              <p className="text-sm text-zinc-300">Are you absolutely sure you want to delete all saved data?</p>
              <div className="flex gap-3">
                <Button variant="outline" className="text-rose-400 border-rose-900/50 hover:bg-rose-900/50" onClick={() => {
                  onReset();
                  setIsResetConfirming(false);
                }}>
                  Yes, Delete Everything
                </Button>
                <Button variant="secondary" onClick={() => setIsResetConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DownloadRow({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 hover:border-zinc-700 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-emerald-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-100 font-medium">{title}</span>
          <Download size={12} className="text-zinc-500" />
        </div>
        <span className="text-[11px] text-zinc-500 italic block mt-0.5">{hint}</span>
      </div>
    </button>
  );
}
