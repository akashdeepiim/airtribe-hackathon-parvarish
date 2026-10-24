import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { db } from './supabase';
import { useAuth } from './auth';
import { compressPhoto } from './memories';
import { healthSchema, growthSchema } from '../domain/health';
import { idSchema, signedPhotoSchema } from '../domain/schemas';
export function useHealth(cid: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['health', cid, session?.user.id],
    enabled: !!session && enabled && idSchema.safeParse(cid).success,
    gcTime: 0,
    queryFn: async () => {
      const r = await db().rpc('read_health', { cid });
      if (r.error) throw r.error;
      return healthSchema.parse(r.data);
    },
  });
}
export function useGrowth(cid: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['growth', cid, session?.user.id],
    enabled: !!session && enabled && idSchema.safeParse(cid).success,
    gcTime: 0,
    queryFn: async () => {
      const r = await db().rpc('read_growth', { cid });
      if (r.error) throw r.error;
      return z.array(growthSchema).parse(r.data);
    },
  });
}
export async function openCard(childId: string, recordId: string) {
  const r = await db().functions.invoke('health-actions', {
    body: { action: 'photo', childId: idSchema.parse(childId), recordId: idSchema.parse(recordId) },
  });
  if (r.error) throw r.error;
  return signedPhotoSchema.parse(r.data);
}
export async function uploadCard(cid: string, recordId: string, userId: string) {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (picked.canceled) return;
  const bytes = await compressPhoto(picked.assets[0]!);
  const path = `${idSchema.parse(cid)}/${idSchema.parse(userId)}/${Crypto.randomUUID()}.jpg`;
  const uploaded = await db()
    .storage.from('health-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '0', upsert: false });
  if (uploaded.error) throw uploaded.error;
  const attached = await db().rpc('set_vaccination_card', {
    cid,
    record_id: idSchema.parse(recordId),
    object_path: path,
  });
  if (attached.error) throw attached.error;
}
export async function removeHealth(
  childId: string,
  entity: 'allergies' | 'vaccination_logs' | 'growth_measurements',
  recordId: string,
) {
  const r = await db().functions.invoke('health-actions', {
    body: {
      action: 'remove',
      childId: idSchema.parse(childId),
      entity,
      recordId: idSchema.parse(recordId),
    },
  });
  if (r.error) throw r.error;
  z.object({ removed: z.literal(true) }).parse(r.data);
}
