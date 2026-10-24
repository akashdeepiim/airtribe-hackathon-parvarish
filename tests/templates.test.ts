import { describe, it, expect } from 'vitest';
import { cropRect, templates } from '../src/domain/templates';
describe('keepsake layouts', () => {
  it('has eight bounded layouts', () => {
    expect(templates).toHaveLength(8);
    for (const t of templates)
      for (const s of t.slots) {
        expect(s.x + s.width).toBeLessThanOrEqual(1);
        expect(s.y + s.height).toBeLessThanOrEqual(1);
      }
  });
  it('covers a portrait slot without stretching a landscape photo', () => {
    const r = cropRect(2000, 1000, 500, 1000, { zoom: 1, x: 0, y: 0 });
    expect(r).toEqual({ x: 750, y: 0, width: 500, height: 1000 });
  });
  it('clamps zoom and pan inside the source image', () => {
    const r = cropRect(1000, 2000, 1000, 1000, { zoom: 100, x: 10, y: -10 });
    expect(r.x + r.width).toBeCloseTo(1000);
    expect(r.y).toBe(0);
    expect(r.width).toBeCloseTo(1000 / 3);
  });
});
