import { z } from 'zod';
import source from '../content/vaccination-schedules.json';
export const scheduleSchema = z.object({
  id: z.string(),
  plan: z.enum(['UIP', 'IAP']),
  visit: z.string(),
  vaccine_name: z.string(),
  age_start: z.number().int().nonnegative(),
  age_end: z.number().int(),
  age_unit: z.enum(['days', 'months']),
  notes: z.string(),
  requires_confirmed_date: z.boolean(),
  source_url: z.url(),
  source_name: z.string(),
  verified_on: z.iso.date(),
  clinical_review_status: z.enum(['not_individually_reviewed', 'approved']),
});
export const schedules = z.array(scheduleSchema).parse(source);
export type Schedule = z.infer<typeof scheduleSchema>;
export const reminderSchema = z.object({
  item_id: z.string(),
  excluded: z.boolean(),
  appointment_on: z.iso.date().nullable(),
  vaccination_log_id: z.uuid().nullable(),
});
export const planSchema = z.object({
  preferences: z
    .object({ plan: z.enum(['UIP', 'IAP']), reminders_enabled: z.boolean() })
    .nullable(),
  reminders: z.array(reminderSchema),
});
export type Reminder = z.infer<typeof reminderSchema>;
export function scheduledDate(dob: string, value: number, unit: 'days' | 'months') {
  const d = new Date(dob + 'T00:00:00Z');
  if (unit === 'days') d.setUTCDate(d.getUTCDate() + value);
  else {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + value);
    d.setUTCDate(
      Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()),
    );
  }
  return d.toISOString().slice(0, 10);
}
export function reminderDate(item: Schedule, dob: string, r?: Reminder) {
  if (r?.excluded || r?.vaccination_log_id) return null;
  return (
    r?.appointment_on ??
    (item.requires_confirmed_date ? null : scheduledDate(dob, item.age_start, item.age_unit))
  );
}
