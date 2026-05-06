import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startJoshuaConversation } from "@/lib/joshuaThread";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user) {
      toast.error("Please sign in to send a help request");
      return;
    }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const conversationId = await startJoshuaConversation();
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: `[Help request]\n\n${text}`,
      });
      if (error) throw error;
      toast.success("Sent — Joshua will get back to you in your inbox");
      setBody("");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not send your message. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Need help?</DialogTitle>
          <DialogDescription>
            Describe the issue you're running into. This goes straight to Joshua and you'll see the reply in your Inbox.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's not working? Be as specific as you can…"
          className="min-h-[140px]"
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || !body.trim()}>
            {sending ? "Sending…" : "Send to Joshua"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
