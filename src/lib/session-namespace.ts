type TabStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** Keep Supabase's BroadcastChannel in the same scope as its session storage. */
export function tabSessionKey(url: string, storage: TabStorage, makeId: () => string) {
  const project = new URL(url).hostname;
  const namespaceKey = `parvarish.${project}.tab`;
  let tabId = storage.getItem(namespaceKey);
  if (!tabId) {
    tabId = makeId();
    storage.setItem(namespaceKey, tabId);
  }
  const key = `parvarish.${project}.${tabId}.auth`;
  // Preserve an existing foundation session in this same tab during the upgrade.
  const legacyKey = `sb-${project.split('.')[0]}-auth-token`;
  const legacy = storage.getItem(legacyKey);
  if (legacy && !storage.getItem(key)) storage.setItem(key, legacy);
  if (legacy) storage.removeItem(legacyKey);
  return key;
}
