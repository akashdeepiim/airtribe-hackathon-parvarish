import { z } from 'zod';
import { capabilities, roles } from './access';
import { purposes } from './consent';
export const idSchema = z.uuid();
export const emailSchema = z
  .email()
  .max(254)
  .transform((s) => s.trim().toLowerCase());
export const otpSchema = z.string().regex(/^\d{6}$/, 'Enter the six-digit code.');
export const profileSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter your child’s name.').max(80),
    dob: z.iso
      .date('Use YYYY-MM-DD for the date of birth.')
      .refine(
        (s) => s <= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        'Date of birth cannot be in the future.',
      ),
    sex: z.enum(['female', 'male', 'intersex']).nullable(),
    city: z.string().trim().min(1).max(100),
    interests: z.array(z.string().trim().min(1).max(60)).max(20),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export const childSchema = profileSchema.extend({
  id: idSchema,
  avatar_path: z.string().nullable(),
  created_by: idSchema,
  created_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type Child = z.infer<typeof childSchema>;
export const memberSchema = z.object({
  child_id: idSchema,
  user_id: idSchema,
  role: z.enum(roles),
  relationship: z.string(),
  status: z.enum(['active', 'revoked']),
  invited_by: idSchema.nullable(),
  created_at: z.string(),
});
export type Member = z.infer<typeof memberSchema>;
export const permissionSchema = z.object({
  child_id: idSchema,
  user_id: idSchema,
  capability: z.enum(capabilities),
  allowed: z.boolean(),
});
export const consentSchema = z.object({
  id: idSchema,
  child_id: idSchema,
  user_id: idSchema,
  purpose: z.enum(purposes),
  decision: z.enum(['granted', 'declined', 'withdrawn']),
  decided_at: z.string(),
  notice_version: z.string(),
});
export const inviteSchema = z.object({
  id: idSchema,
  role: z.enum(roles),
  relationship: z.string(),
  expires_at: z.string(),
  accepted_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
});
export const createdInviteSchema = z.object({
  id: idSchema,
  token: z.string().regex(/^[a-f0-9]{64}$/),
  expires_at: z.string(),
});
export const inviteInputSchema = z.object({
  email: emailSchema,
  role: z.enum(['co_parent', 'family_contributor', 'family_viewer']),
  relationship: z.string().trim().min(1).max(60),
});
export const signedPhotoSchema = z.object({ url: z.url(), expiresAt: z.number() });
export function parseInterests(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
