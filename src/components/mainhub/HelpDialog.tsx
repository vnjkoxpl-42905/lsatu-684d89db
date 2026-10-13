import HelpSheet from '@/components/help/HelpSheet';

// Backwards-compatible shim. The dialog has been upgraded into the
// HelpSheet (right-side Sheet with screenshot + context + live thread).
// Existing callers (MainhubQuickDock) keep working without changes.

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpDialog(props: HelpDialogProps) {
  return <HelpSheet {...props} />;
}
