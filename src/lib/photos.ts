import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { db } from './supabase';
import { idSchema } from '../domain/schemas';
export async function uploadAvatar(childId: string, userId: string): Promise<boolean> {
  idSchema.parse(childId);
  idSchema.parse(userId);
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (picked.canceled) return false;
  const asset = z
    .object({ uri: z.string(), width: z.number().positive(), height: z.number().positive() })
    .parse(picked.assets[0]);
  const size =
    asset.width >= asset.height
      ? { width: Math.min(2048, asset.width) }
      : { height: Math.min(2048, asset.height) };
  let bytes: Uint8Array | undefined;
  for (const quality of [0.8, 0.6, 0.4, 0.2]) {
    const result = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: size }], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    const base64 = z.string().parse(result.base64);
    if (base64.length * 0.75 <= 2 * 1024 * 1024) {
      bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      break;
    }
  }
  if (!bytes) throw new Error('image_too_large');
  const path = `${childId}/${userId}/${Crypto.randomUUID()}.jpg`;
  const upload = await db()
    .storage.from('child-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '0', upsert: false });
  if (upload.error) throw upload.error;
  const update = await db().rpc('set_child_avatar', { cid: childId, object_path: path });
  if (update.error) throw update.error;
  return true;
}
