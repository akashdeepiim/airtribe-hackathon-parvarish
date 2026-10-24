import { z } from 'zod';
import { idSchema } from './schemas';
export const memorySchema = z.object({
  id: idSchema,
  child_id: idSchema,
  uploaded_by: idSchema,
  storage_path: z.string(),
  taken_at: z.string().refine((s) => Number.isFinite(Date.parse(s))),
  caption: z.string().max(2000),
  milestone_id: idSchema.nullable(),
  people_tags: z.array(z.string()),
  created_at: z.string(),
});
export type Memory = z.infer<typeof memorySchema>;
export const memoryEditSchema = z.object({
  caption: z.string().max(2000),
  taken_at: z.iso.datetime({ offset: true }),
  people_tags: z.array(z.string().trim().min(1).max(60)).max(10),
});
export function ageMonths(dob: string, taken: string): number {
  const birth = new Date(`${dob}T00:00:00Z`);
  const date = new Date(taken);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const years = part('year') - birth.getUTCFullYear();
  const months = part('month') - 1 - birth.getUTCMonth();
  return (
    years * 12 +
    months -
    (part('day') <
    Math.min(birth.getUTCDate(), new Date(Date.UTC(part('year'), part('month'), 0)).getUTCDate())
      ? 1
      : 0)
  );
}
export function groupMemories(memories: Memory[], dob: string) {
  const groups = new Map<number, Memory[]>();
  for (const m of [...memories].sort(
    (a, b) => Date.parse(b.taken_at) - Date.parse(a.taken_at) || b.id.localeCompare(a.id),
  )) {
    const age = Math.max(-1, ageMonths(dob, m.taken_at));
    groups.set(age, [...(groups.get(age) ?? []), m]);
  }
  return [...groups].map(([months, items]) => ({ months, items }));
}
export function photoDate(value: unknown, fallback = new Date()): string {
  if (value instanceof Date && Number.isFinite(value.valueOf()) && value <= fallback)
    return value.toISOString();
  if (typeof value === 'string') {
    const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
    const date = new Date(normalized);
    if (Number.isFinite(date.valueOf()) && date <= fallback) return date.toISOString();
  }
  return fallback.toISOString();
}
export async function boundedMap<T>(
  items: T[],
  concurrency: number,
  run: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await run(items[index]!, index);
      }
    }),
  );
}
