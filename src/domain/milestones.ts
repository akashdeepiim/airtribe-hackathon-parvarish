import { z } from 'zod';
export const milestoneSchema = z.object({
  id: z.uuid(),
  domain: z.enum(['motor', 'language', 'social', 'cognitive']),
  title: z.string(),
  prompt_question: z.string(),
  window_start_months: z.number(),
  typical_months: z.number().nullable(),
  consult_by_months: z.number(),
  source: z.url(),
  reassurance_copy: z.string(),
  consult_copy: z.string(),
  clinical_review_status: z.enum(['draft', 'approved', 'rejected']),
  source_review_status: z.enum(['unverified', 'verified']),
  source_verified_at: z.iso.date().nullable(),
  age_basis: z.enum(['clinical_window', 'cdc_checkpoint', 'who_window']),
  did_you_know: z.string(),
});
export const childMilestoneSchema = z.object({
  child_id: z.uuid(),
  milestone_id: z.uuid(),
  status: z.enum(['achieved', 'not_yet', 'skipped']),
  achieved_on: z.iso.date().nullable(),
  memory_id: z.uuid().nullable(),
  recorded_by: z.uuid(),
  last_prompted_at: z.string().nullable(),
  next_prompt_at: z.string().nullable(),
  nudges_enabled: z.boolean(),
  consult_card_shown_at: z.string().nullable(),
});
export type Milestone = z.infer<typeof milestoneSchema>;
export type ChildMilestone = z.infer<typeof childMilestoneSchema>;
export function milestonePrompt(
  m: Milestone,
  record: ChildMilestone | undefined,
  age: number,
  now = new Date(),
): 'question' | 'conversation' | null {
  if (
    record?.status === 'achieved' ||
    record?.status === 'skipped' ||
    record?.nudges_enabled === false ||
    age < m.window_start_months
  )
    return null;
  if (age > m.consult_by_months) return record?.consult_card_shown_at ? null : 'conversation';
  if (record?.next_prompt_at && Date.parse(record.next_prompt_at) > now.getTime()) return null;
  return 'question';
}
