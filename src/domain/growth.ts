import { z } from 'zod';
import source from '../content/who-growth.json';
export const metrics = ['weight', 'length', 'height', 'head'] as const;
export type GrowthMetric = (typeof metrics)[number];
export const growthLabels: Record<GrowthMetric, string> = {
  weight: 'Weight',
  length: 'Length (lying down)',
  height: 'Height (standing)',
  head: 'Head circumference',
};
const referenceSchema = z.array(
  z.object({
    metric: z.enum(metrics),
    sex: z.enum(['girls', 'boys']),
    url: z.url(),
    sha256: z.string().length(64),
    verified_on: z.iso.date(),
    rows: z.array(
      z.object({
        Month: z.number().int().min(0).max(60),
        L: z.number(),
        M: z.number().positive(),
        S: z.number().positive(),
        P3: z.number(),
        P15: z.number(),
        P50: z.number(),
        P85: z.number(),
        P97: z.number(),
      }),
    ),
  }),
);
export const growthReference = referenceSchema.parse(source);
export function ageInReferenceMonths(dob: string, date: string) {
  return (Date.parse(date) - Date.parse(dob)) / 86400000 / 30.4375;
}
export function referenceFor(metric: GrowthMetric, sex: string | null) {
  return growthReference.find(
    (r) =>
      r.metric === metric &&
      r.sex === (sex === 'female' ? 'girls' : sex === 'male' ? 'boys' : null),
  );
}
