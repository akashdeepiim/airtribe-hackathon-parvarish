import { describe, it, expect } from 'vitest';
import { tabSessionKey } from '../src/lib/session-namespace';
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
describe('tab-scoped authentication', () => {
  it('separates broadcast channels for tabs with separate sessions, but survives a reload', () => {
    const a = storage(),
      b = storage();
    const first = tabSessionKey('https://project.supabase.co', a, () => 'tab-a');
    expect(tabSessionKey('https://project.supabase.co', b, () => 'tab-b')).not.toBe(first);
    expect(tabSessionKey('https://project.supabase.co', a, () => 'unused-after-reload')).toBe(
      first,
    );
  });
  it('migrates only the legacy session from the same tab and never overwrites a newer session', () => {
    const a = storage();
    a.setItem('sb-project-auth-token', 'synthetic-old-session');
    const key = tabSessionKey('https://project.supabase.co', a, () => 'tab-a');
    expect(a.getItem(key)).toBe('synthetic-old-session');
    expect(a.getItem('sb-project-auth-token')).toBeNull();
    a.setItem('sb-project-auth-token', 'synthetic-stale-session');
    expect(tabSessionKey('https://project.supabase.co', a, () => 'unused')).toBe(key);
    expect(a.getItem(key)).toBe('synthetic-old-session');
  });
  it('does not share namespaces or sessions across Supabase projects', () => {
    const a = storage();
    const first = tabSessionKey('https://one.supabase.co', a, () => 'tab');
    a.setItem(first, 'synthetic-session');
    const second = tabSessionKey('https://two.supabase.co', a, () => 'tab');
    expect(second).not.toBe(first);
    expect(a.getItem(second)).toBeNull();
  });
});
