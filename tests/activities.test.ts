import { describe, it, expect } from 'vitest';
import {
  curatedActivities,
  validateActivities,
  generateWithFallback,
  type SafetyContext,
} from '../src/domain/activity-safety';
const c: SafetyContext = {
  age_months: 14,
  allergens: ['peanut'],
  allergy_screened: true,
  constraints: { minutes: 10, location: 'indoors', budget: 'free' },
};
const value = () => ({ items: curatedActivities(c) });
describe('activity safety pipeline', () => {
  it('accepts no-material curated activities across ages', () => {
    for (const age of [0, 6, 14, 35, 36, 60])
      expect(
        validateActivities(
          { items: curatedActivities({ ...c, age_months: age }) },
          { ...c, age_months: age },
        ),
      ).not.toBeNull();
  });
  it('blocks allergen aliases in any field', () => {
    const a = value();
    a.items[0]!.steps = ['Play with groundnut shells'];
    expect(validateActivities(a, c)).toBeNull();
  });
  it('blocks small parts and falsely labelled choking hazards', () => {
    for (const name of ['Large beads', 'Coins', 'Balloons']) {
      const a = value();
      a.items[0]!.materials = [{ name, minimum_size_cm: 10, loose_parts: false }];
      expect(validateActivities(a, c)).toBeNull();
    }
  });
  it('requires explicit supervision for undeclared water hazards', () => {
    const a = value();
    a.items[0]!.steps = ['Splash water'];
    expect(validateActivities(a, c)).toBeNull();
    a.items[0]!.safety_note = 'An adult stays within arm’s reach with constant supervision.';
    expect(validateActivities(a, c)).not.toBeNull();
  });
  it('blocks medical claims, allergens, too much time, and unscreened materials', () => {
    for (const field of ['Cures a cough', 'Improves immunity']) {
      const a = value();
      a.items[0]!.why = field;
      expect(validateActivities(a, c)).toBeNull();
    }
    const a = value();
    a.items[0]!.minutes = 30;
    expect(validateActivities(a, c)).toBeNull();
    a.items[0]!.minutes = 5;
    a.items[0]!.materials = [{ name: 'Book', minimum_size_cm: 20, loose_parts: false }];
    expect(validateActivities(a, { ...c, allergy_screened: false })).toBeNull();
  });
  it('regenerates twice then falls back, including malformed output', async () => {
    let calls = 0;
    const result = await generateWithFallback(c, async () => {
      calls++;
      return { unsafe: true };
    });
    expect(calls).toBe(3);
    expect(result.fallback).toBe(true);
    expect(result.items).toHaveLength(3);
  });
  it('stops as soon as a safe generation succeeds', async () => {
    let calls = 0;
    const result = await generateWithFallback(c, async () => {
      calls++;
      return value();
    });
    expect(calls).toBe(1);
    expect(result.fallback).toBe(false);
  });
});
