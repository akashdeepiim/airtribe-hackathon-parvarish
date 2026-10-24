import { z } from 'zod';
export const NOTICE_VERSION = '2026-10-24.v2';
export const purposes = [
  'memories',
  'milestones',
  'health',
  'personalisation',
  'notifications',
] as const;
export type Purpose = (typeof purposes)[number];
export const choicesSchema = z
  .object({
    memories: z.literal(true),
    milestones: z.boolean(),
    health: z.boolean(),
    personalisation: z.boolean(),
    notifications: z.boolean(),
  })
  .strict();
export type ConsentChoices = z.infer<typeof choicesSchema>;
export const notices: Record<
  Purpose,
  { title: string; eyebrow: string; copy: string; detail: string }
> = {
  memories: {
    title: 'A home for little moments.',
    eyebrow: 'Memories',
    copy: 'Let Parvarish store and organise your child’s photos and profile in a private family space.',
    detail:
      'People you invite can see or add memories according to the access you give them. This purpose is needed to create a profile. You can withdraw it later to stop access to memories.',
  },
  milestones: {
    title: 'Celebrate their firsts.',
    eyebrow: 'Milestones',
    copy: 'Let Parvarish connect memories to milestones and offer gentle reminders based on your child’s age.',
    detail:
      'Entries are clinically approved or clearly labelled as official-source content not individually reviewed by a paediatrician. This is optional. Choosing “Not now” keeps milestone tracking and reminders off.',
  },
  health: {
    title: 'Keep important details together.',
    eyebrow: 'Health records',
    copy: 'Let Parvarish store allergy details, vaccination notes and growth measurements when you choose to add them.',
    detail:
      'Health records are sensitive. Parents have access by default. The owner can grant family members read access. Every view and change is recorded.',
  },
  personalisation: {
    title: 'Ideas that fit your family.',
    eyebrow: 'Personalisation',
    copy: 'Let Parvarish use your child’s profile and permitted milestone and allergy information to suggest activities.',
    detail:
      'Suggestions use OpenAI with safety checks. Age in months, city, interests, milestones, constraints and allergy names (only with health access) may be sent; names and photos are not sent. This is optional. Choosing “Not now” keeps personalised activity suggestions off.',
  },
  notifications: {
    title: 'A gentle tap on the shoulder.',
    eyebrow: 'Notifications',
    copy: 'Let Parvarish send occasional reminders to your mobile device.',
    detail:
      'You control quiet hours and whether a child’s name appears on your lock screen. Device permission will be requested separately when reminders become available. Web notifications stay off.',
  },
};
