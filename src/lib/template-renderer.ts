import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import type { SkImage, SkTypeface } from '@shopify/react-native-skia';
import { themes, cropRect, type RenderInput } from '../domain/templates';
let ready: Promise<void> | undefined;
async function init() {
  if (Platform.OS === 'web') {
    ready ??= import('@shopify/react-native-skia/lib/module/web').then((m) =>
      m.LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' }),
    );
    await ready;
  }
  return import('@shopify/react-native-skia');
}
let fonts: Promise<[SkTypeface, SkTypeface]> | undefined;
async function loadFonts(Skia: (typeof import('@shopify/react-native-skia'))['Skia']) {
  fonts ??= (async () => {
    const assets = [
      Asset.fromModule(require('@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf')),
      Asset.fromModule(require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf')),
    ];
    const values = await Promise.all(
      assets.map(async (a) => {
        await a.downloadAsync();
        const data = await Skia.Data.fromURI(a.localUri ?? a.uri);
        const face = Skia.Typeface.MakeFreeTypeFaceFromData(data);
        if (!face) throw new Error('font_unavailable');
        return face;
      }),
    );
    return values as [SkTypeface, SkTypeface];
  })();
  return fonts;
}
export async function renderTemplate(input: RenderInput, preview = false): Promise<string> {
  const { Skia, ImageFormat, ClipOp } = await init().catch(() => {
    throw new Error('engine_init');
  });
  const [serif, sans] = await loadFonts(Skia).catch(() => {
    throw new Error('font_load');
  });
  const factor = preview ? 0.5 : 1,
    width = 1080 * factor,
    height = (input.size === 'story' ? 1920 : 1080) * factor;
  const surface =
    Platform.OS === 'web'
      ? Skia.Surface.Make(width, height)
      : Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('renderer_unavailable');
  const canvas = surface.getCanvas(),
    theme = themes[input.theme],
    paint = Skia.Paint(),
    images: SkImage[] = [];
  const color = (c: string) => {
    paint.setColor(Skia.Color(c));
    return paint;
  };
  const rect = (x: number, y: number, w: number, h: number) => Skia.XYWHRect(x, y, w, h);
  const rounded = (x: number, y: number, w: number, h: number, r: number) =>
    Skia.RRectXY(rect(x, y, w, h), r, r);
  try {
    canvas.drawColor(Skia.Color(theme.paper));
    // Layered paper shapes provide depth without obscuring the photos.
    canvas.drawCircle(width * 0.96, height * 0.05, width * 0.26, color(theme.secondary));
    canvas.drawCircle(width * 0.04, height * 0.9, width * 0.17, color(theme.accent));
    canvas.drawCircle(width * 0.02, height * 0.91, width * 0.12, color(theme.paper));
    for (let i = 0; i < 7; i++)
      canvas.drawCircle(
        width * (0.78 + i * 0.026),
        height * 0.943,
        width * 0.004,
        color(theme.ink),
      );
    const text = (
      value: string,
      y: number,
      size: number,
      face: SkTypeface,
      maxWidth = width * 0.86,
    ) => {
      const font = Skia.Font(face, size * factor),
        lines: string[] = [];
      const measure = (t: string) =>
        font.getGlyphWidths(font.getGlyphIDs(t)).reduce((a, b) => a + b, 0);
      let line = '';
      for (const word of value.trim().split(/\s+/)) {
        const next = (line ? line + ' ' : '') + word;
        if (measure(next) > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      for (const [i, t] of lines.slice(0, 2).entries()) {
        let shown = t;
        while (measure(shown) > maxWidth && shown.length > 1) shown = shown.slice(0, -1);
        canvas.drawText(
          shown,
          (width - measure(shown)) / 2,
          y + i * size * factor * 1.12,
          color(theme.ink),
          font,
        );
      }
      font.dispose();
    };
    text(input.template.kicker, height * 0.093, 22, sans);
    for (let i = 0; i < input.template.slots.length; i++) {
      const s = input.template.slots[i]!,
        x = s.x * width,
        y = s.y * height,
        w = s.width * width,
        h = s.height * height,
        r = s.radius * width;
      canvas.drawRRect(rounded(x + 7 * factor, y + 10 * factor, w, h, r), color(theme.accent));
      canvas.drawRRect(
        rounded(x - 5 * factor, y - 5 * factor, w + 10 * factor, h + 10 * factor, r),
        color('#FFFFFF'),
      );
      canvas.save();
      canvas.clipRRect(rounded(x, y, w, h, r), ClipOp.Intersect, true);
      const photo = input.photos[i];
      if (photo) {
        const data = await Skia.Data.fromURI(photo.url);
        const img = Skia.Image.MakeImageFromEncoded(data);
        data.dispose();
        if (!img) throw new Error('photo_unavailable');
        images.push(img);
        const c = cropRect(img.width(), img.height(), w, h, photo.crop);
        canvas.drawImageRectCubic(
          img,
          rect(c.x, c.y, c.width, c.height),
          rect(x, y, w, h),
          1 / 3,
          1 / 3,
          paint,
        );
      } else canvas.drawRect(rect(x, y, w, h), color(theme.secondary));
      canvas.restore();
    }
    text(input.title, height * input.template.title_y, 62, serif);
    text(input.subtitle, height * (input.template.title_y + 0.091), 25, sans);
    if (input.watermark) text('parvarish · with love, as you grow', height * 0.971, 19, sans);
    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    const encoded = snapshot.encodeToBase64(ImageFormat.PNG);
    snapshot.dispose();
    return 'data:image/png;base64,' + encoded;
  } finally {
    for (const image of images) image.dispose();
    paint.dispose();
    surface.dispose();
  }
}
