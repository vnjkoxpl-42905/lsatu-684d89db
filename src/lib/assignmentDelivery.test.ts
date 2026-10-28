import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { classroomNotificationPolicy } from './assignmentDelivery';
describe('Classroom assignment delivery allowlist', () => {
  it.each(['note', 'homework', 'drill', 'activity', 'bootcamp_module', 'practice_test', 'link'])('automatically delivers %s', (type) => expect(classroomNotificationPolicy(type)).toBe('auto'));
  it.each(['session_recap', 'smartboard_recap', 'announcement', 'weekly_plan_task', 'unknown'])('does not add an assignment alert for %s', (type) => expect(classroomNotificationPolicy(type)).toBe('suppressed'));
});
