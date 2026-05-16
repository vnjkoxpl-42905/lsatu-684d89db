import React, { useState, useEffect, useMemo } from 'react';
import { MODULES, Module } from '@/data/fallacyFlaw/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FFDashboardProps {
  onStartDrill: (module: Module) => void;
}

const FFDashboard: React.FC<FFDashboardProps> = ({ onStartDrill }) => {
  const [savedDrillModuleId, setSavedDrillModuleId] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedModuleForAction, setSelectedModuleForAction] = useState<Module | null>(null);

  const checkSavedProgress = () => {
    try {
      const savedProgressRaw = localStorage.getItem('ff:drillProgress');
      if (savedProgressRaw) {
        const savedProgress = JSON.parse(savedProgressRaw);
        if (savedProgress.moduleId) {
          setSavedDrillModuleId(savedProgress.moduleId);
        } else {
          setSavedDrillModuleId(null);
        }
      } else {
        setSavedDrillModuleId(null);
      }
    } catch (error) {
      console.error('Failed to parse saved drill progress:', error);
      localStorage.removeItem('ff:drillProgress');
      setSavedDrillModuleId(null);
    }
  };

  useEffect(() => {
    checkSavedProgress();
  }, []);

  const handleDrillButtonClick = (module: Module) => {
    setSelectedModuleForAction(module);
    if (savedDrillModuleId) {
      if (module.id === savedDrillModuleId) {
        setIsResumeModalOpen(true);
      } else {
        setIsOverwriteModalOpen(true);
      }
    } else {
      onStartDrill(module);
    }
  };

  const handleResume = () => {
    if (selectedModuleForAction) {
      onStartDrill(selectedModuleForAction);
    }
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleStartNew = () => {
    if (selectedModuleForAction) {
      localStorage.removeItem('ff:drillProgress');
      setSavedDrillModuleId(null);
      onStartDrill(selectedModuleForAction);
    }
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleCloseResumeModal = () => {
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleConfirmOverwrite = () => {
    if (selectedModuleForAction) {
      localStorage.removeItem('ff:drillProgress');
      setSavedDrillModuleId(null);
      onStartDrill(selectedModuleForAction);
    }
    setIsOverwriteModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleCancelOverwrite = () => {
    setIsOverwriteModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleResetClick = (module: Module) => {
    setSelectedModuleForAction(module);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    if (selectedModuleForAction) {
      const usedIdsKey = `ff:usedIds_${selectedModuleForAction.id}`;
      localStorage.removeItem(usedIdsKey);

      if (savedDrillModuleId === selectedModuleForAction.id) {
        localStorage.removeItem('ff:drillProgress');
        setSavedDrillModuleId(null);
      }
    }
    setIsResetModalOpen(false);
    setSelectedModuleForAction(null);
    checkSavedProgress();
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const savedModuleInProgress = useMemo(() => {
    if (!savedDrillModuleId) return null;
    return MODULES.find(m => m.id === savedDrillModuleId);
  }, [savedDrillModuleId]);

  return (
    <div>
      <div className="rounded-xl bg-card border border-border shadow-sm p-8 mb-8 text-center">
        <p className="text-foreground text-sm font-medium">No data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start a module to generate your first stats.
        </p>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Skill Drills</h3>
        <div className="space-y-6">
          {MODULES.map(mod => {
            const isResume = mod.id === savedDrillModuleId;

            return (
              <div key={mod.id} className="rounded-xl bg-card border border-border shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-grow w-full flex flex-col">
                  <h4 className="text-sm font-semibold text-foreground">{mod.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0 self-center">
                  {isResume ? (
                    <button
                      onClick={() => handleDrillButtonClick(mod)}
                      className="rounded-lg border border-border text-foreground text-sm font-medium px-4 py-2 hover:bg-accent transition-colors duration-150"
                    >
                      Resume Drill
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDrillButtonClick(mod)}
                      className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
                    >
                      Start Drill
                    </button>
                  )}
                  <button
                    onClick={() => handleResetClick(mod)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Reset Module
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resume Modal */}
      <AlertDialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drill in Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unfinished drill for "{selectedModuleForAction?.name}". Would you like to resume where you left off or start a new one? Starting a new drill will erase your previous progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartNew}>Start New</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume}>Resume Drill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overwrite Modal */}
      <AlertDialog open={isOverwriteModalOpen} onOpenChange={setIsOverwriteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Existing Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unfinished drill for "{savedModuleInProgress?.name}". Starting a new drill for "{selectedModuleForAction?.name}" will erase your previous progress. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverwrite}>Discard & Start</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Modal */}
      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Module Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the question bank for "{selectedModuleForAction?.name}". You will start seeing questions you've already answered again. If you have an active drill for this module, it will also be erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseResetModal}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FFDashboard;
