import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from './supabase';
import { useAuth } from './auth';
import { idSchema } from '../domain/schemas';
import { memorySchema, photoDate, boundedMap } from '../domain/memories';
export type UploadItem = {
  id: string;
  asset: ImagePicker.ImagePickerAsset;
  state: 'waiting' | 'processing' | 'uploading' | 'saved' | 'failed';
  takenAt?: string;
  path?: string;
};
export async function pickMemories(maximum = 50): Promise<UploadItem[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maximum,
    exif: true,
    quality: 1,
  });
  if (result.canceled) return [];
  if (result.assets.length > maximum) throw new Error(`Choose up to ${maximum} photos at a time.`);
  return result.assets.map((asset) => ({ id: Crypto.randomUUID(), asset, state: 'waiting' }));
}
export async function compressPhoto(asset: ImagePicker.ImagePickerAsset) {
  const parsed = z
    .object({ uri: z.string(), width: z.number().positive(), height: z.number().positive() })
    .parse(asset);
  const resize =
    parsed.width >= parsed.height
      ? { width: Math.min(2048, parsed.width) }
      : { height: Math.min(2048, parsed.height) };
  for (const compress of [0.78, 0.6, 0.4, 0.2]) {
    const result = await ImageManipulator.manipulateAsync(parsed.uri, [{ resize }], {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    const encoded = z.string().parse(result.base64);
    if (encoded.length * 0.75 <= 2 * 1024 * 1024)
      return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  }
  throw new Error('image_too_large');
}
async function takenAt(asset: ImagePicker.ImagePickerAsset) {
  let value: unknown = asset.exif?.DateTimeOriginal;
  if (Platform.OS === 'web' && asset.file) {
    try {
      const exifr = await import('exifr');
      const tags = await exifr.parse(asset.file, { pick: ['DateTimeOriginal'], gps: false });
      value = tags?.DateTimeOriginal;
    } catch {
      /* Missing EXIF uses upload time. */
    }
  }
  return photoDate(value);
}
export async function uploadMemories(
  items: UploadItem[],
  childId: string,
  userId: string,
  onChange: (item: UploadItem) => void,
) {
  idSchema.parse(childId);
  idSchema.parse(userId);
  await boundedMap(
    items.filter((i) => i.state !== 'saved'),
    3,
    async (item) => {
      const current = { ...item };
      try {
        current.state = 'processing';
        onChange({ ...current });
        current.takenAt ??= await takenAt(item.asset);
        current.path ??= `${childId}/${userId}/${item.id}.jpg`;
        const bytes = await compressPhoto(item.asset);
        current.state = 'uploading';
        onChange({ ...current });
        const uploaded = await db().storage.from('child-photos').upload(current.path, bytes, {
          contentType: 'image/jpeg',
          cacheControl: '0',
          upsert: false,
        });
        // The stable path and memory id make a retry safe after a lost response.
        if (
          uploaded.error &&
          uploaded.error.message !== 'The resource already exists' &&
          String(uploaded.error.statusCode) !== '409'
        )
          throw uploaded.error;
        const recorded = await db().rpc('record_memory', {
          mid: item.id,
          cid: childId,
          object_path: current.path,
          photo_date: current.takenAt,
        });
        if (recorded.error) throw recorded.error;
        current.state = 'saved';
        onChange({ ...current });
      } catch {
        current.state = 'failed';
        onChange({ ...current });
      }
    },
  );
}
export function useMemories(childId: string, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['memories', childId, session?.user.id],
    enabled: !!session && enabled && idSchema.safeParse(childId).success,
    queryFn: async () => {
      const rows: z.infer<typeof memorySchema>[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await db()
          .from('memories')
          .select('*')
          .eq('child_id', childId)
          .order('taken_at', { ascending: false })
          .order('id')
          .range(offset, offset + 499);
        if (result.error) throw result.error;
        const page = z.array(memorySchema).parse(result.data);
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    },
  });
}
const photosSchema = z.object({
  photos: z.array(z.object({ path: z.string(), url: z.url(), expiresAt: z.number() })),
});
export function useMemoryPhotos(paths: string[], enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['memory-photos', paths, session?.user.id],
    enabled: !!session && enabled && paths.length > 0,
    staleTime: 600000,
    gcTime: 60000,
    refetchInterval: 600000,
    queryFn: async () => {
      const photos: Record<string, string> = {};
      for (let i = 0; i < paths.length; i += 50) {
        const result = await db().functions.invoke('signed-memories', {
          body: { paths: paths.slice(i, i + 50) },
        });
        if (result.error) throw result.error;
        for (const p of photosSchema.parse(result.data).photos) photos[p.path] = p.url;
      }
      return photos;
    },
  });
}
