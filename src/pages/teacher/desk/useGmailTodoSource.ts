import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseAddress } from '@/features/admin-inbox/gmail/api';
import type { GmailThreadSummary } from '@/features/admin-inbox/gmail/api';
import { useGmailProfile, useGmailThreads } from '@/features/admin-inbox/gmail/hooks';
import type { GmailTodoItem } from './teacherTodoTypes';

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function latestSenderIsAdmin(thread: GmailThreadSummary, adminEmail: string | null) {
  if (!adminEmail) return false;
  const parsed = parseAddress(thread.from || '');
  return normalizedEmail(parsed.email) === normalizedEmail(adminEmail);
}

function gmailTiming(internalDate: string | number | undefined) {
  const ms = Number(internalDate ?? 0);
  if (!Number.isFinite(ms) || ms <= 0) return 'Email';
  const diff = Date.now() - ms;
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m waiting`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h waiting`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function gmailThreadToTodo(thread: GmailThreadSummary, adminEmail: string | null): GmailTodoItem | null {
  if (latestSenderIsAdmin(thread, adminEmail)) return null;
  const parsed = parseAddress(thread.from || '');
  const internalDate = Number(thread.internalDate ?? 0);
  return {
    id: `gmail:${thread.id}`,
    sourceKind: 'gmail',
    sourceId: thread.id,
    threadId: thread.id,
    priorityBand: 'email',
    label: 'Email',
    subject: parsed.name || parsed.email || 'Email sender',
    title: thread.subject || '(no subject)',
    preview: thread.snippet || 'Student email is waiting for a reply.',
    timing: gmailTiming(thread.internalDate),
    sortScore: 3_000 + Math.max(0, internalDate / 1_000_000_000),
    from: thread.from,
    fromName: parsed.name || parsed.email,
    fromEmail: parsed.email,
    subjectLine: thread.subject || '',
    snippet: thread.snippet || '',
    internalDate,
    openPath: `/inbox?pane=gmail&t=${encodeURIComponent(thread.id)}`,
    dismissExpiresAt: null,
  };
}

export function useGmailTodoSource(enabled = true) {
  const profileQuery = useGmailProfile({ enabled });
  const threadsQuery = useGmailThreads({
    labelIds: ['INBOX'],
    q: 'in:inbox newer_than:30d',
    maxResults: 25,
    enabled,
  });
  const qc = useQueryClient();

  const items = useMemo(() => {
    const adminEmail = profileQuery.data?.emailAddress ?? null;
    return (threadsQuery.data?.threads ?? [])
      .map((thread) => gmailThreadToTodo(thread, adminEmail))
      .filter((item): item is GmailTodoItem => Boolean(item));
  }, [profileQuery.data?.emailAddress, threadsQuery.data?.threads]);

  return {
    items,
    isLoading: profileQuery.isLoading || threadsQuery.isLoading,
    error: profileQuery.error ?? threadsQuery.error,
    refresh: () => qc.invalidateQueries({ queryKey: ['gmail', 'threads'] }),
  };
}
