import { supabase } from '@/integrations/supabase/client';

export const ASSIGNMENT_WRITE_TIMEOUT_MS = 120_000;
export function assignmentWriteSignal() {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ASSIGNMENT_WRITE_TIMEOUT_MS);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Assignment write timed out.', 'TimeoutError')), ASSIGNMENT_WRITE_TIMEOUT_MS);
  return controller.signal;
}

export type AssignmentNotificationPolicy = 'auto' | 'managed' | 'suppressed' | 'message';
export function classroomNotificationPolicy(type: string): AssignmentNotificationPolicy {
  return ['note', 'homework', 'drill', 'activity', 'bootcamp_module', 'practice_test', 'link'].includes(type) ? 'auto' : 'suppressed';
}

export interface AssignmentDelivery {
  notificationPolicy: AssignmentNotificationPolicy;
  notificationGroupId?: string;
}

export function newAssignmentDelivery(notify = true): AssignmentDelivery {
  return { notificationPolicy: notify ? 'managed' : 'suppressed', notificationGroupId: crypto.randomUUID() };
}

export function assignmentDeliveryColumns(delivery: AssignmentDelivery) {
  return { notification_policy: delivery.notificationPolicy, notification_group_id: delivery.notificationGroupId ?? null };
}

export async function finalizeAssignmentDelivery(groupId: string, title: string, description: string | undefined, route: string) {
  const { data, error } = await supabase.rpc('finalize_assignment_notification_group' as never, {
    p_group_id: groupId, p_title: title, p_message: description ?? null, p_link: route,
  } as never);
  if (error) throw new Error(error.message);
  return data;
}

export async function publishPlanNotification(groupId: string, studentId: string) {
  const { error } = await supabase.rpc('publish_assignment_plan_notification' as never, {
    p_group_id: groupId, p_student_id: studentId, p_link: `/my-work/to-do?workGroup=${encodeURIComponent(groupId)}`,
  } as never);
  if (error) throw new Error(error.message);
}

/** One owner-authorized attempt at optional Inbox/email channels per durable group. */
export async function claimAssignmentNotificationChannels(groupId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_assignment_notification_channels' as never, { p_group_id: groupId } as never);
  if (error) throw new Error(error.message);
  if (typeof data !== 'boolean') throw new Error('The notification channel claim could not be verified.');
  return data;
}
