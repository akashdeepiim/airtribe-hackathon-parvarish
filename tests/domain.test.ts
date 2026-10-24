import { describe, it, expect } from 'vitest';
import { choicesSchema } from '../src/domain/consent';
import { defaultPermissions, parentOnly } from '../src/domain/access';
import { extractInviteToken, inviteUrl, whatsappInvite } from '../src/domain/invites';
import { profileSchema, parseInterests, otpSchema } from '../src/domain/schemas';
import { friendlyError } from '../src/lib/errors';

describe('purpose decisions', () => {
  const choices = {
    memories: true,
    milestones: false,
    health: false,
    personalisation: false,
    notifications: false,
  };
  it('allows every optional purpose to be declined', () =>
    expect(choicesSchema.safeParse(choices).success).toBe(true));
  it('requires a recorded choice for each purpose', () => {
    const { health, ...missing } = choices;
    expect(choicesSchema.safeParse(missing).success).toBe(false);
  });
  it('does not mistake missing or string choices for consent', () => {
    expect(choicesSchema.safeParse({ ...choices, health: 'true' }).success).toBe(false);
    expect(choicesSchema.safeParse({ ...choices, memories: false }).success).toBe(false);
  });
});
describe('relationship presets', () => {
  it('keeps viewer uploads and health off', () => {
    const p = defaultPermissions('family_viewer');
    expect(p['memories.read']).toBe(true);
    expect(p['memories.add']).toBe(false);
    expect(p['health.read']).toBe(false);
  });
  it('limits contributor defaults to their own memories', () => {
    const p = defaultPermissions('family_contributor');
    expect(p['memories.add']).toBe(true);
    expect(p['memories.delete_own']).toBe(true);
    expect(p['memories.delete_all']).toBe(false);
    expect(p['health.write']).toBe(false);
  });
  it('recognises permissions that cannot be delegated to family', () =>
    expect([...parentOnly]).toEqual(
      expect.arrayContaining(['health.write', 'family.manage', 'memories.delete_all']),
    ));
});
describe('private invitation links', () => {
  const token = 'a'.repeat(64);
  it('keeps bearer token out of URL query strings', () => {
    const link = inviteUrl('https://app.example.test', token);
    expect(new URL(link).search).toBe('');
    expect(extractInviteToken(link)).toBe(token);
  });
  it('rejects incomplete and malformed tokens', () => {
    expect(extractInviteToken('https://app.example.test/invite#token=abc')).toBe(null);
    expect(extractInviteToken('not a link')).toBe(null);
    expect(() => inviteUrl('https://app.example.test', 'x')).toThrow();
  });
  it('encodes WhatsApp text and includes no child details', () => {
    const link = inviteUrl('https://app.example.test', token);
    const text = new URL(whatsappInvite(link)).searchParams.get('text');
    expect(text).toContain(link);
    expect(text).toContain('email');
  });
});
describe('boundary validation', () => {
  it('rejects impossible dates, blank names and future birth dates', () => {
    const p = { name: 'Test', dob: '2025-01-01', sex: null, city: 'Bangalore', interests: [] };
    expect(profileSchema.safeParse(p).success).toBe(true);
    for (const dob of ['2025-02-30', '2999-01-01', 'yesterday'])
      expect(profileSchema.safeParse({ ...p, dob }).success).toBe(false);
    expect(profileSchema.safeParse({ ...p, name: ' ' }).success).toBe(false);
  });
  it('normalises interests without empty or duplicate entries', () =>
    expect(parseInterests('music, books, ,music')).toEqual(['music', 'books']));
  it('requires six digits for OTP', () => {
    expect(otpSchema.safeParse('012345').success).toBe(true);
    expect(otpSchema.safeParse('12345a').success).toBe(false);
  });
  it('never exposes raw database messages or submitted health details', () => {
    const raw = { code: 'PT400', message: 'private child name and health details' };
    expect(friendlyError(raw)).not.toContain(raw.message);
    expect(friendlyError({ code: 'PT403' })).toContain('permission');
  });
});
