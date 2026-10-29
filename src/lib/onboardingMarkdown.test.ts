import { describe, expect, it } from 'vitest';
import {
  buildOnboardingMarkdown,
  studentSlug,
  type OnboardingProfile,
} from '../../supabase/functions/_shared/onboardingMarkdown';

const PROFILE: OnboardingProfile = {
  class_id: 'student-1',
  display_name: 'Sofia Minassian',
  email: 'sofia@example.com',
  onboarding_completed_at: '2026-08-29T14:03:00.000Z',
  onboarding: {
    last_score_band: '156_160',
    target_score_band: '171_175',
    test_date: '2026-11-14',
    life_stage: 'working',
    schools: ['Georgetown', 'Fordham'],
    experience_text: 'Timing on RC is the wall.',
    study_time: { sun: 'none', mon: '1_2', tue: 'none', wed: '3_plus', thu: 'none', fri: 'none', sat: 'lt_1' },
  },
};

describe('buildOnboardingMarkdown', () => {
  it('renders every answer with the words the student saw', () => {
    const md = buildOnboardingMarkdown(PROFILE);

    expect(md).toContain('student: Sofia Minassian');
    expect(md).toContain('completed: 2026-08-29');
    expect(md).toContain('- Last LSAT: 156-160');
    expect(md).toContain('- Target score: 171-175');
    expect(md).toContain('- Test date: 2026-11-14');
    expect(md).toContain('- Life stage: Working');
    expect(md).toContain('- Georgetown');
    expect(md).toContain('- Wed: 3+ hrs');
    expect(md).toContain('Timing on RC is the wall.');
  });

  it('says so plainly when optional steps were skipped', () => {
    const md = buildOnboardingMarkdown({
      ...PROFILE,
      onboarding: {
        has_taken_lsat: false,
        test_date: 'undecided',
        study_time: { sun: 'none', mon: 'none', tue: 'none', wed: 'none', thu: 'none', fri: 'none', sat: 'none' },
      },
    });

    expect(md).toContain('- Last LSAT: Has not taken the LSAT yet');
    expect(md).toContain('- Test date: No date registered yet');
    expect(md).toContain('- Target score: Not answered');
    expect(md).toContain('- No study time set on any day');
    expect(md).toContain('Not answered');
  });

  it('never renders an empty document for a profile with no answers', () => {
    const md = buildOnboardingMarkdown({ ...PROFILE, onboarding: null, onboarding_completed_at: null });
    expect(md).toContain('# Onboarding intake - Sofia Minassian');
    expect(md).toContain('completed: unknown');
  });
});

describe('studentSlug', () => {
  it('matches the student folder naming', () => {
    expect(studentSlug('Sofia Minassian', 'sofia@example.com')).toBe('sofia-minassian');
    expect(studentSlug("Fernande Charleus'", null)).toBe('fernande-charleus');
  });

  it('falls back to the email local part, then to unknown', () => {
    expect(studentSlug(null, 'meglizzy912@gmail.com')).toBe('meglizzy912');
    expect(studentSlug(null, null)).toBe('unknown');
  });
});
