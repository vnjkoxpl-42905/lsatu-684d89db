import { createContext, useContext, type ReactNode } from 'react';
import { useOperatorChat } from '@/hooks/useOperatorChat';

type OperatorChatValue = ReturnType<typeof useOperatorChat>;

const OperatorChatContext = createContext<OperatorChatValue | null>(null);

/**
 * Shares a single `useOperatorChat()` instance across the Teacher Desk's
 * saved-chats rail and the center transcript/composer so they read the same
 * conversation + messages state. Without it each consumer spins up its own
 * session and they fall out of sync.
 */
export function OperatorChatProvider({ children }: { children: ReactNode }) {
  const value = useOperatorChat();
  return <OperatorChatContext.Provider value={value}>{children}</OperatorChatContext.Provider>;
}

export function useOperatorChatContext(): OperatorChatValue {
  const value = useContext(OperatorChatContext);
  if (!value) throw new Error('useOperatorChatContext must be used within an OperatorChatProvider');
  return value;
}
