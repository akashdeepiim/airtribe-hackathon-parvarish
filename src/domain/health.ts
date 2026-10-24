import { z } from 'zod';
const date = z.iso
  .date()
  .refine(
    (d) => d <= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    'Choose today or an earlier date.',
  );
export const allergyInput = z.object({
  type: z.enum(['food', 'medicine', 'other']),
  allergen: z.string().trim().min(1).max(200),
  severity: z.enum(['Not specified', 'Mild', 'Moderate', 'Severe']),
  notes: z.string().max(2000),
});
export const vaccinationInput = z.object({
  vaccine_name: z.string().trim().min(1).max(200),
  given_on: date,
  notes: z.string().max(2000),
});
export const growthInput = z
  .object({
    measured_on: date,
    weight_kg: z.number().positive().max(100).nullable(),
    height_cm: z.number().min(20).max(160).nullable(),
    head_cm: z.number().min(10).max(70).nullable(),
    height_method: z.enum(['length', 'height']),
    notes: z.string().max(2000),
  })
  .refine(
    (v) => v.weight_kg !== null || v.height_cm !== null || v.head_cm !== null,
    'Add at least one measurement.',
  );
const ids = { id: z.uuid(), child_id: z.uuid() };
export const allergySchema = z.object({
  ...ids,
  type: z.enum(['food', 'medicine', 'other']),
  allergen: z.string(),
  severity: z.string(),
  notes: z.string(),
});
export const vaccinationSchema = vaccinationInput.extend({
  ...ids,
  card_photo_path: z.string().nullable(),
});
export const growthSchema = growthInput.safeExtend({
  ...ids,
  recorded_by: z.uuid(),
  created_at: z.string(),
});
export const healthSchema = z.object({
  allergies: z.array(allergySchema),
  vaccinations: z.array(vaccinationSchema),
});
export type Growth = z.infer<typeof growthSchema>;
export type Allergy = z.infer<typeof allergySchema>;
export type Vaccination = z.infer<typeof vaccinationSchema>;
