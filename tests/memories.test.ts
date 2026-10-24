import { describe, it, expect } from 'vitest';
import {
  ageMonths,
  photoDate,
  boundedMap,
  groupMemories,
  type Memory,
} from '../src/domain/memories';
describe('memory dates and upload queue', () => {
  it('uses completed calendar months and India photo date', () => {
    expect(ageMonths('2025-01-15', '2025-02-14T12:00:00Z')).toBe(0);
    expect(ageMonths('2025-01-15', '2025-02-14T19:00:00Z')).toBe(1);
    expect(ageMonths('2025-01-15', '2024-12-15T12:00:00Z')).toBe(-1);
    expect(ageMonths('2025-01-31', '2025-02-28T12:00:00Z')).toBe(1);
    expect(ageMonths('2024-02-29', '2025-02-28T12:00:00Z')).toBe(12);
  });
  it('falls back for missing, invalid and future EXIF', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    for (const value of [null, 'not a date', '2099:01:01 00:00:00'])
      expect(photoDate(value, now)).toBe(now.toISOString());
    expect(photoDate(new Date('2025-01-01T00:00:00Z'), now)).toBe('2025-01-01T00:00:00.000Z');
  });
  it('groups chronologically without mutating the source', () => {
    const source = [
      { id: 'a', taken_at: '2025-01-15T12:00:00Z' },
      { id: 'b', taken_at: '2025-03-15T12:00:00Z' },
      { id: 'c', taken_at: '2024-01-01T12:00:00Z' },
    ] as Memory[];
    expect(groupMemories(source, '2025-01-15').map((g) => g.months)).toEqual([2, 0, -1]);
    expect(source[0]?.id).toBe('a');
  });
  it('bounds concurrent processing and visits every item once', async () => {
    let active = 0,
      max = 0;
    const seen: number[] = [];
    await boundedMap([0, 1, 2, 3, 4], 2, async (n) => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 2));
      seen.push(n);
      active--;
    });
    expect(max).toBe(2);
    expect(seen.sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
