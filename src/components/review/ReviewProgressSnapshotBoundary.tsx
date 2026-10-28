import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useAuth } from '@/contexts/AuthContext';

const SnapshotContext = createContext<ReturnType<typeof useFirstAnswerProgress> | null>(null);
export const useReviewProgressSnapshot = () => useContext(SnapshotContext);

function Snapshot() {
  const data = useFirstAnswerProgress(30, undefined, { revalidateOnMount: true });
  return <SnapshotContext.Provider value={data}><Outlet /></SnapshotContext.Provider>;
}

/** Mounted below the analytics gate; sibling view switches reuse one owner-bound read. */
export default function ReviewProgressSnapshotBoundary() {
  const { user } = useAuth();
  return <Snapshot key={user?.id ?? 'pending'} />;
}
