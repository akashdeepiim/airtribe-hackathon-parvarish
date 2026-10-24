import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from './supabase';
import { useAuth } from './auth';
import { accessSchema } from '../domain/access';
import {
  childSchema,
  memberSchema,
  permissionSchema,
  consentSchema,
  inviteSchema,
  idSchema,
  signedPhotoSchema,
} from '../domain/schemas';
import { queryClient } from './query';
export function useChildren() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['children', session?.user.id],
    enabled: !!session,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db().from('children').select('*').order('created_at');
      if (error) throw error;
      return z.array(childSchema).parse(data);
    },
  });
}
export function useChild(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['child', id, session?.user.id],
    enabled: !!session && idSchema.safeParse(id).success,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db().from('children').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return childSchema.nullable().parse(data);
    },
  });
}
export function useAccess(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['access', id, session?.user.id],
    enabled: !!session && idSchema.safeParse(id).success,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await db().rpc('get_my_access', { cid: idSchema.parse(id) });
      if (error) throw error;
      return accessSchema.parse(data);
    },
  });
}
export function useMembers(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['members', id, session?.user.id],
    enabled: !!session && idSchema.safeParse(id).success,
    queryFn: async () => {
      const { data, error } = await db()
        .from('child_members')
        .select('*')
        .eq('child_id', id)
        .eq('status', 'active')
        .order('created_at');
      if (error) throw error;
      return z.array(memberSchema).parse(data);
    },
  });
}
export function usePermissions(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['permissions', id, session?.user.id],
    enabled: !!session && idSchema.safeParse(id).success,
    queryFn: async () => {
      const { data, error } = await db()
        .from('child_member_permissions')
        .select('child_id,user_id,capability,allowed')
        .eq('child_id', id);
      if (error) throw error;
      return z.array(permissionSchema).parse(data);
    },
  });
}
export function useConsents(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['consents', id, session?.user.id],
    enabled: !!session && idSchema.safeParse(id).success,
    queryFn: async () => {
      const { data, error } = await db()
        .from('consents')
        .select('*')
        .eq('child_id', id)
        .order('decided_at', { ascending: false });
      if (error) throw error;
      return z.array(consentSchema).parse(data);
    },
  });
}
export function useInvites(id: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['invites', id, session?.user.id],
    enabled: !!session && enabled && idSchema.safeParse(id).success,
    queryFn: async () => {
      const { data, error } = await db().rpc('list_invites', { cid: id });
      if (error) throw error;
      return z.array(inviteSchema).parse(data);
    },
  });
}
export function usePhoto(path: string | null, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['photo', path, session?.user.id],
    enabled: !!session && !!path && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 60_000,
    refetchInterval: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db().functions.invoke('signed-photo', { body: { path } });
      if (error) throw error;
      return signedPhotoSchema.parse(data);
    },
  });
}
export async function refreshFamily() {
  await queryClient.cancelQueries();
  queryClient.removeQueries({ queryKey: ['photo'] });
  await queryClient.invalidateQueries();
}
