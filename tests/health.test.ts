import { describe, it, expect } from 'vitest';
import { growthInput, allergyInput } from '../src/domain/health';
import { growthReference, referenceFor, ageInReferenceMonths } from '../src/domain/growth';
import education from '../src/content/education.json';
describe('health boundaries', () => {
  it('requires measurements with explicit units and rejects future dates', () => {
    const base = {
      measured_on: '2025-01-01',
      weight_kg: null,
      height_cm: null,
      head_cm: null,
      height_method: 'length',
      notes: '',
    };
    expect(growthInput.safeParse(base).success).toBe(false);
    expect(growthInput.safeParse({ ...base, weight_kg: 10 }).success).toBe(true);
    expect(growthInput.safeParse({ ...base, weight_kg: 1000 }).success).toBe(false);
    expect(growthInput.safeParse({ ...base, head_cm: 45, measured_on: '2099-01-01' }).success).toBe(
      false,
    );
    expect(
      allergyInput.safeParse({ type: 'food', allergen: '', severity: 'Mild', notes: '' }).success,
    ).toBe(false);
  });
  it('preserves official reference coverage and values without inferring sex', () => {
    expect(growthReference).toHaveLength(8);
    expect(referenceFor('weight', null)).toBeUndefined();
    expect(referenceFor('weight', 'intersex')).toBeUndefined();
    expect(referenceFor('weight', 'female')?.rows[0]?.P50).toBe(3.2);
    expect(referenceFor('weight', 'male')?.rows.at(-1)?.Month).toBe(60);
    expect(referenceFor('length', 'female')?.rows.at(-1)?.Month).toBe(24);
    expect(referenceFor('height', 'female')?.rows[0]?.Month).toBe(24);
    for (const r of growthReference)
      for (const v of r.rows)
        expect(v.P3 < v.P15 && v.P15 < v.P50 && v.P50 < v.P85 && v.P85 < v.P97).toBe(true);
    expect(ageInReferenceMonths('2025-01-01', '2025-01-01')).toBe(0);
  });
  it('keeps public-source verification separate from clinician review', () => {
    for (const e of education) {
      expect(e.clinical_review_status).toBe('not_individually_reviewed');
      expect(e.source_review_status).toBe('verified');
      expect(new URL(e.source_url).protocol).toBe('https:');
    }
  });
});
