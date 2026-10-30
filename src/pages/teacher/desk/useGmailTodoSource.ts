import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseAddress } from '@/features/admin-inbox/gmail/api';
import type { GmailThreadSummary } from '@/features/admin-inbox/gmail/api';
import { useGmailProfile, useGmailThreads } from '@/features/admin-inbox/gmail/hooks';
import { todoScore } from './teacherTodoScore';
import type { GmailTodoItem } from './teacherTodoTypes';

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function latestSenderIsAdmin(thread: GmailThreadSummary, adminEmail: string | null) {
  if (!adminEmail) return false;
  const parsed = parseAddress(thread.from || '');
  return normalizedEmail(parsed.email) === normalizedEmail(adminEmail);
}

const automatedLocalParts = [
  'automated',
  'bounce',
  'daemon',
  'digest',
  'do-not-reply',
  'donotreply',
  'mailer-daemon',
  'newsletter',
  'no-reply',
  'noreply',
  'notification',
  'notifications',
  'postmaster',
  'updates',
];

const automatedSenderNames = [
  'github',
  'doodle',
  'mailchimp',
  'mailer daemon',
  'newsletter',
  'notifications',
  'substack',
];

const automatedDomains = [
  'github.com',
  'doodle.com',
  'mailchimp.com',
  'sendgrid.net',
  'substack.com',
];

const automatedCategoryLabels = new Set(['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS']);

function domainMatches(domain: string, blockedDomain: string) {
  return domain === blockedDomain || domain.endsWith(`.${blockedDomain}`);
}

/**
 * Split an address local part or display name into words. Substring matching
 * silently dropped real people: `updates` is inside `sarah.updegraff`, `daemon`
 * inside `daemonte`, `github` inside a surname. A word-boundary match keeps
 * `no-reply@`, `mailer-daemon@` and `Notifications` out while letting people in.
 */
function words(value: string): string[] {
  return value.split(/[^a-z0-9]+/i).filter(Boolean);
}

function matchesAnyWord(value: string, blocked: string[]): boolean {
  const tokens = new Set(words(value));
  // A blocked term can itself be multi-word ("mailer daemon"), so compare the
  // whole normalized value too.
  return blocked.some((term) => value === term || words(term).every((t) => tokens.has(t)));
}

export function isLikelyHumanGmailSender(thread: GmailThreadSummary) {
  const parsed = parseAddress(thread.from || '');
  const email = normalizedEmail(parsed.email);
  const [localPart = '', domain = ''] = email.split('@');
  const senderName = (parsed.name || '').trim().toLowerCase();
  const labelIds = thread.labelIds ?? [];

  if (!email || !domain) return false;
  if (labelIds.some((label) => automatedCategoryLabels.has(label))) return false;
  if (matchesAnyWord(localPart, automatedLocalParts)) return false;
  if (automatedDomains.some((blockedDomain) => domainMatches(domain, blockedDomain))) return false;
  if (matchesAnyWord(senderName, automatedSenderNames)) return false;

  return true;
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
  if (!isLikelyHumanGmailSender(thread)) return null;
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
    sortScore: todoScore({ band: 'email', timestamp: internalDate }),
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
    q: 'in:inbox newer_than:30d -category:promotions -category:social -category:updates -category:forums',
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
