import { z } from 'zod';
import data from '../content/templates.json';
const fraction = z.number().min(0).max(1);
export const layoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  kicker: z.string(),
  title_y: fraction,
  slots: z
    .array(
      z.object({ x: fraction, y: fraction, width: fraction, height: fraction, radius: fraction }),
    )
    .min(1)
    .max(6),
});
export const templates = z.array(layoutSchema).length(8).parse(data);
export type Template = z.infer<typeof layoutSchema>;
export const themes = {
  sage: { paper: '#F4F5E8', ink: '#283E36', accent: '#B6CCA3', secondary: '#DFE9CF' },
  peach: { paper: '#F9EBE2', ink: '#653E34', accent: '#D9A184', secondary: '#EED1C0' },
  lavender: { paper: '#F0ECF7', ink: '#493C63', accent: '#BBA8D4', secondary: '#E0D5EF' },
  sky: { paper: '#EAF2F5', ink: '#2D4C5C', accent: '#97BCCA', secondary: '#CDDFE7' },
} as const;
export type Crop = { zoom: number; x: number; y: number };
export function cropRect(iw: number, ih: number, w: number, h: number, c: Crop) {
  const zoom = Math.min(3, Math.max(1, c.zoom));
  const scale = Math.max(w / iw, h / ih) * zoom;
  const width = w / scale,
    height = h / scale;
  return {
    x: ((iw - width) * (Math.max(-1, Math.min(1, c.x)) + 1)) / 2,
    y: ((ih - height) * (Math.max(-1, Math.min(1, c.y)) + 1)) / 2,
    width,
    height,
  };
}
export type RenderInput = {
  template: Template;
  theme: keyof typeof themes;
  title: string;
  subtitle: string;
  watermark: boolean;
  size: 'story' | 'square';
  photos: ({ url: string; crop: Crop } | null)[];
};
