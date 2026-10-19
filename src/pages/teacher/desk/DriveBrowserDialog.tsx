import { toast } from 'sonner';
import { GoogleDrivePicker } from '@/components/drive/GoogleDrivePicker';
import type { DriveFileRef } from './AssistantComposer';

/**
 * In-app Drive browser styled as the native Google "Select files" picker.
 * Wraps the shared GoogleDrivePicker, which calls the `gdrive` edge function
 * (workspace Google Drive connector) so we don't trigger Google's client-side
 * OAuth picker — that can be blocked by managed-account policies
 * (ERR_BLOCKED_BY_RESPONSE). Returns lightweight file references (no download).
 */
export function DriveBrowserDialog({
  open,
  onOpenChange,
  onAttach,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (files: DriveFileRef[]) => void;
}) {
  return (
    <GoogleDrivePicker
      open={open}
      onClose={() => onOpenChange(false)}
      title="Attach from Google Drive"
      confirmLabel="Attach"
      onConfirm={(files) => {
        const picks: DriveFileRef[] = files.map((f) => ({
          fileId: f.id,
          name: f.name,
          mimeType: f.mimeType ?? '',
          url: f.webViewLink ?? '',
        }));
        if (picks.length === 0) return;
        onAttach(picks);
        toast.success(`Attached ${picks.length} file${picks.length === 1 ? '' : 's'}`);
      }}
    />
  );
}
