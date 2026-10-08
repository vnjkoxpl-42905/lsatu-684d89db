import React from 'react';
import { Timer as TimerIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TIMER_PRESETS = [15, 25, 45, 60];

const CSStudyTimer: React.FC = () => {
  const [duration, setDuration] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [isActive, setIsActive] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isTimeUpOpen, setIsTimeUpOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isActive || isPaused) return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          setDuration(0);
          setIsTimeUpOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const startTimer = (seconds: number) => {
    setDuration(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
    setIsPaused(false);
    setIsSettingsOpen(false);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
    setIsSettingsOpen(false);
  };

  const addTime = () => {
    setTimeLeft((prev) => prev + 300);
    setDuration((prev) => prev + 300);
    setIsSettingsOpen(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setDuration(0);
    setTimeLeft(0);
    setIsSettingsOpen(false);
  };

  const isDanger = isActive && timeLeft < 30;

  return (
    <div className="relative">
      {isActive ? (
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`flex items-center gap-1.5 font-mono text-sm ${
            isDanger ? 'text-punk-magenta' : 'text-punk-cyan drop-shadow-neon-cyan'
          }`}
        >
          <TimerIcon className="w-3.5 h-3.5" />
          {formatTime(timeLeft)}
        </button>
      ) : (
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1.5 text-sm text-punk-sub hover:text-punk-text transition-colors"
        >
          <TimerIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Set Timer</span>
        </button>
      )}

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-punk-panel border-punk-sub/20 shadow-neon-cyan text-punk-text">
          <DialogHeader>
            <DialogTitle className="text-punk-cyan">{isActive ? `Timer: ${formatTime(timeLeft)}` : 'Set Study Timer'}</DialogTitle>
            {!isActive && (
              <DialogDescription className="text-punk-sub">Choose a duration for your study session.</DialogDescription>
            )}
          </DialogHeader>
          {isActive ? (
            <div className="flex flex-col gap-2">
              <Button onClick={togglePause} className="bg-punk-cyan text-punk-base hover:bg-white hover:shadow-neon-cyan">{isPaused ? 'Resume' : 'Pause'}</Button>
              <Button onClick={addTime} variant="ghost" className="text-punk-sub hover:text-punk-text hover:bg-punk-base">Add 5 minutes</Button>
              <Button onClick={resetTimer} variant="secondary" className="bg-punk-base text-punk-sub hover:text-punk-text border border-punk-sub/30">Reset &amp; Stop</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {TIMER_PRESETS.map((minutes) => (
                <Button key={minutes} onClick={() => startTimer(minutes * 60)} className="bg-punk-cyan text-punk-base hover:bg-white hover:shadow-neon-cyan">
                  {minutes} minutes
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTimeUpOpen} onOpenChange={setIsTimeUpOpen}>
        <DialogContent className="bg-punk-panel border-punk-sub/20 shadow-neon-cyan text-punk-text">
          <DialogHeader>
            <DialogTitle className="text-punk-cyan">Time's Up!</DialogTitle>
            <DialogDescription className="text-punk-sub">Your study session has ended. Great work.</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setIsTimeUpOpen(false)} className="bg-punk-cyan text-punk-base hover:bg-white hover:shadow-neon-cyan">OK</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CSStudyTimer;
