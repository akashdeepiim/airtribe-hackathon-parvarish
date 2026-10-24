import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
const key = 'parvarish.first-share-notice.v1';
export async function hasShareNotice() {
  return Platform.OS === 'web'
    ? localStorage.getItem(key) === 'seen'
    : (await SecureStore.getItemAsync(key)) === 'seen';
}
export async function markShareNotice() {
  if (Platform.OS === 'web') localStorage.setItem(key, 'seen');
  else await SecureStore.setItemAsync(key, 'seen');
}
export async function shareImage(data: string, download = false) {
  const bytes = Uint8Array.from(atob(data.split(',')[1]!), (c) => c.charCodeAt(0));
  if (Platform.OS === 'web') {
    const file = new globalThis.File([bytes], 'parvarish-memory.png', { type: 'image/png' });
    if (!download && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'A little memory' });
      return;
    }
    const url = URL.createObjectURL(file),
      a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const file = new File(Paths.cache, `parvarish-${Date.now()}.png`);
    file.write(bytes);
    try {
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png' });
    } finally {
      file.delete();
    }
  }
}
