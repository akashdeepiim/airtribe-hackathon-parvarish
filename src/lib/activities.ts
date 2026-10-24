import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from './supabase';
import { useAuth } from './auth';
import { activitySchema } from '../domain/activity-safety';
export { activitySchema };
export const batchSchema = z.object({
  id: z.uuid(),
  child_id: z.uuid(),
  week_start: z.iso.date(),
  items: z.array(activitySchema).length(3),
  model: z.string(),
  prompt_version: z.string(),
});
export const preferencesSchema = z.object({
  minutes: z.number(),
  location: z.enum(['indoors', 'outdoors', 'either']),
  budget: z.enum(['free', 'low']),
  latest_answer: z.string(),
  answered_at: z.string().nullable(),
});
export function useActivities(childId: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['activities', childId, session?.user.id],
    enabled,
    queryFn: async () => {
      const r = await db()
        .from('activity_batches')
        .select('*')
        .eq('child_id', childId)
        .order('week_start', { ascending: false })
        .limit(8);
      if (r.error) throw r.error;
      return z.array(batchSchema).parse(r.data);
    },
  });
}
export function useActivityPreferences(childId: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['activity-preferences', childId, session?.user.id],
    enabled,
    queryFn: async () => {
      const r = await db()
        .from('activity_preferences')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();
      if (r.error) throw r.error;
      return r.data ? preferencesSchema.parse(r.data) : null;
    },
  });
}
