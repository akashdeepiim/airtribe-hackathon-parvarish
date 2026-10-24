import { describe, it, expect } from 'vitest';
import { schedules, scheduledDate, reminderDate } from '../src/domain/vaccinations';
describe('source schedule planning', () => {
  it('handles weeks, leap birthdays and month-end birthdays without overflowing', () => {
    expect(scheduledDate('2024-01-31', 1, 'months')).toBe('2024-02-29');
    expect(scheduledDate('2024-02-29', 12, 'months')).toBe('2025-02-28');
    expect(scheduledDate('2025-01-01', 42, 'days')).toBe('2025-02-12');
  });
  it('never infers conditional follow-up dates from birth', () => {
    const item = schedules.find((s) => s.vaccine_name === 'Influenza second')!;
    expect(reminderDate(item, '2025-01-01')).toBeNull();
    expect(
      reminderDate(item, '2025-01-01', {
        item_id: item.id,
        excluded: false,
        appointment_on: '2025-10-02',
        vaccination_log_id: null,
      }),
    ).toBe('2025-10-02');
  });
  it('retains fIPV3 and product-dependent notes with honest review status', () => {
    expect(schedules.some((s) => s.plan === 'UIP' && s.vaccine_name === 'fIPV 3')).toBe(true);
    expect(schedules.every((s) => s.clinical_review_status === 'not_individually_reviewed')).toBe(
      true,
    );
    expect(
      schedules.filter((s) => s.requires_confirmed_date).every((s) => s.notes.length > 20),
    ).toBe(true);
    expect(new Set(schedules.map((s) => s.id)).size).toBe(schedules.length);
  });
});
