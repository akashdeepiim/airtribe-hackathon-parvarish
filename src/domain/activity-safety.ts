import { z } from 'zod';
export const activitySchema = z
  .object({
    title: z.string().min(1).max(100),
    domain: z.enum(['motor', 'language', 'social', 'cognitive']),
    why: z.string().max(300),
    steps: z.array(z.string().max(300)).min(1).max(5),
    materials: z
      .array(
        z
          .object({
            name: z.string().max(100),
            minimum_size_cm: z.number().nullable(),
            loose_parts: z.boolean(),
          })
          .strict(),
      )
      .max(8),
    minutes: z.number().int().min(1).max(30),
    setting: z.enum(['indoors', 'outdoors']),
    cost: z.enum(['free', 'low']),
    safety_note: z.string().min(15).max(500),
    hazards: z.array(z.enum(['water', 'height', 'heat', 'small_parts'])),
    ingredients: z.array(z.string().max(80)),
  })
  .strict();
export const activitiesSchema = z.object({ items: z.array(activitySchema).length(3) }).strict();
export type Activity = z.infer<typeof activitySchema>;
export type SafetyContext = {
  age_months: number;
  allergens: string[];
  allergy_screened: boolean;
  constraints: { minutes: number; location: string; budget: string };
};
const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ');
const aliases: Record<string, string[]> = {
  peanut: ['groundnut', 'arachis', 'moongfali'],
  milk: ['dairy', 'cheese', 'yoghurt', 'yogurt', 'butter', 'ghee', 'paneer', 'casein', 'whey'],
  egg: ['albumen', 'mayonnaise'],
  wheat: ['flour', 'atta', 'semolina', 'bread', 'pasta'],
  soy: ['soya', 'tofu'],
  sesame: ['til', 'tahini'],
  nut: ['almond', 'cashew', 'walnut', 'pistachio'],
  latex: ['rubber', 'balloon'],
};
export function validateActivities(value: unknown, context: SafetyContext): Activity[] | null {
  const parsed = activitiesSchema.safeParse(value);
  if (!parsed.success) return null;
  for (const a of parsed.data.items) {
    const text = normalize(JSON.stringify(a));
    if (
      context.allergens.some((allergen) => {
        const terms = [normalize(allergen)];
        for (const [key, words] of Object.entries(aliases)) {
          if (terms[0]!.includes(key) || words.some((w) => terms[0]!.includes(w)))
            terms.push(key, ...words);
        }
        return terms.some(
          (t) =>
            t.length > 1 &&
            new RegExp('(?:^| )' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?(?= |$)').test(
              text,
            ),
        );
      })
    )
      return null;
    if (
      /\b(cure\w*|treat\w*|heal\w*|symptom\w*|disease\w*|diagnos\w*|therap\w*|prevent\w*|immunity|iq|autism|adhd|medical|dosage|medicine|supplement)\b/.test(
        text,
      )
    )
      return null;
    if (
      /\b(fire|flame|knife|sharp|toxic|bleach|detergent|battery|batteries|magnet|strangl\w*|cord|rope|blindfold)\b/.test(
        text,
      )
    )
      return null;
    // No food activities: avoids cross-contact and product-ingredient uncertainty.
    if (
      a.ingredients.length ||
      /\b(food|eat|taste|snack|cook|bake|flour|dough|rice|bean|pea|nut|seed|grape|popcorn)\w*\b/.test(
        text,
      )
    )
      return null;
    if (
      context.age_months < 36 &&
      (a.hazards.includes('small_parts') ||
        a.materials.some(
          (m) => m.loose_parts || m.minimum_size_cm === null || m.minimum_size_cm < 3,
        ) ||
        /\b(bead|button|coin|marble|balloon|pompom|pom pom|confetti|pebble|small part)\w*\b/.test(
          text,
        ))
    )
      return null;
    const hazards = [
      ...a.hazards,
      ...(/\b(water|bath|pool|splash)\b/.test(text) ? ['water'] : []),
      ...(/\b(climb|height|stair|ladder|step stool)\b/.test(text) ? ['height'] : []),
      ...(/\b(heat|hot|warm liquid)\b/.test(text) ? ['heat'] : []),
    ];
    if (
      hazards.some((h) => ['water', 'height', 'heat'].includes(h)) &&
      !/adult.*(within arm.s reach|hands.on|constant supervision|handles.*heat)/i.test(
        a.safety_note,
      )
    )
      return null;
    if (!context.allergy_screened && (a.materials.length || a.setting === 'outdoors')) return null;
    if (
      a.minutes > context.constraints.minutes ||
      (context.constraints.location !== 'either' && a.setting !== context.constraints.location) ||
      (context.constraints.budget === 'free' && a.cost !== 'free')
    )
      return null;
  }
  return parsed.data.items;
}
export function curatedActivities(c: SafetyContext): Activity[] {
  const common = {
    materials: [],
    minutes: Math.min(5, c.constraints.minutes),
    setting: 'indoors' as const,
    cost: 'free' as const,
    safety_note:
      'Stay with your child throughout. Follow their cues and stop when they want a break.',
    hazards: [],
    ingredients: [],
  };
  // No materials, food or physical challenges. These remain usable when health consent is off.
  return [
    {
      ...common,
      title: c.age_months < 12 ? 'A little back-and-forth' : 'Tell me about your day',
      domain: 'language',
      why: 'A few moments to listen and respond to each other.',
      steps: [
        c.age_months < 12
          ? 'Talk softly about what you are doing. Pause to listen to your child’s sounds.'
          : 'Invite your child to tell you or show you one thing from the day. Take turns responding.',
        'Follow their interest; there is no right answer.',
      ],
    },
    {
      ...common,
      title: 'Your familiar song',
      domain: 'social',
      why: 'Make room for a shared moment with a voice they know.',
      steps: [
        'Sing a familiar song together at a comfortable volume.',
        'Pause sometimes and let your child respond in their own way.',
      ],
    },
    {
      ...common,
      title: c.age_months < 12 ? 'Faces and feelings' : 'Make up a little story',
      domain: 'cognitive',
      why: 'Notice each other and enjoy a playful exchange.',
      steps: [
        c.age_months < 12
          ? 'While your child is comfortable and awake, smile and talk face to face.'
          : 'Make up a short story together using familiar people or places. Invite your child to choose what comes next.',
        'Let your child lead the pace.',
      ],
    },
  ];
}
export async function generateWithFallback(c: SafetyContext, generate: () => Promise<unknown>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const items = validateActivities(await generate(), c);
      if (items) return { items, fallback: false };
    } catch {
      /* Retry without logging child context or model output. */
    }
  }
  const items = validateActivities(
    { items: curatedActivities(c) },
    { ...c, constraints: { ...c.constraints, location: 'indoors' } },
  );
  if (!items) throw new Error('No safe activity set available');
  return { items, fallback: true };
}
