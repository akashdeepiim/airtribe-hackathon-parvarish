import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from './supabase';
import { useAuth } from './auth';
import { idSchema } from '../domain/schemas';
import { milestoneSchema, childMilestoneSchema } from '../domain/milestones';
export function useMilestoneCatalogue(enabled = true) {
  return useQuery({
    queryKey: ['milestone-catalogue-full'],
    enabled,
    queryFn: async () => {
      const r = await db().from('milestone_catalog').select('*').order('window_start_months');
      if (r.error) throw r.error;
      return z.array(milestoneSchema).parse(r.data);
    },
  });
}
export function useChildMilestones(cid: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['child-milestones', cid, session?.user.id],
    enabled: !!session && enabled && idSchema.safeParse(cid).success,
    queryFn: async () => {
      const r = await db().from('child_milestones').select('*').eq('child_id', cid);
      if (r.error) throw r.error;
      return z.array(childMilestoneSchema).parse(r.data);
    },
  });
}
