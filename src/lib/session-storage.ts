import { tabSessionKey } from './session-namespace';
// Browser sessions are scoped to this tab. No child data is persisted in browser storage.
const transient = new Map<string, string>();
export function authStorageKey(url: string) {
  if (typeof window === 'undefined') return undefined;
  try {
    return tabSessionKey(url, window.sessionStorage, () => crypto.randomUUID());
  } catch {
    return `parvarish.transient.${crypto.randomUUID()}`;
  }
}
export const sessionStorageAdapter = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(key) ?? transient.get(key) ?? null;
    } catch {
      return transient.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        transient.set(key, value);
      }
    }
  },
  async removeItem(key: string) {
    transient.delete(key);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* Memory-only session. */
      }
    }
  },
};
