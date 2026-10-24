import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';

// A self-contained social artwork, using the existing Parvarish identity.
// Run with PLAYWRIGHT_MODULE_PATH pointing to Playwright if it is not installed locally.
const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const output = new URL('outputs/social/', root);
await mkdir(output, { recursive: true });
const illustrationSource = await readFile(
  new URL('src/components/marketing/Illustrations.web.tsx', root),
  'utf8',
);
const { code } = transformSync(illustrationSource, {
  filename: 'Illustrations.tsx',
  babelrc: false,
  configFile: false,
  presets: ['@babel/preset-typescript'],
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    '@babel/plugin-transform-modules-commonjs',
  ],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', code)(require, module, module.exports);
const { Person, SproutMark, GrowthBranch } = module.exports;
function illustration(Component, props, x, y, width, height) {
  return renderToStaticMarkup(React.createElement(Component, props)).replace(
    '<svg ',
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" `,
  );
}
const fonts = await Promise.all(
  ['dm-sans-latin.woff2', 'fraunces-latin.woff2', 'fraunces-latin-italic.woff2'].map(
    async (name) => (await readFile(new URL(`public/fonts/${name}`, root))).toString('base64'),
  ),
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" role="img" aria-labelledby="title description">
  <title id="title">Parvarish — They grow. You grow, too.</title>
  <desc id="description">A warm cream story with forest-green lettering, a smiling illustrated child in golden dungarees, a sun, clouds and a small sprout. From the first what if to the fifth birthday. No perfect parents. Just your kind of family. Find your chapter at parvarish.akash-deep.com.</desc>
  <defs>
    <style>
      @font-face { font-family: DM Sans; src: url(data:font/woff2;base64,${fonts[0]}) format('woff2'); font-weight: 100 900; }
      @font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${fonts[1]}) format('woff2'); font-weight: 100 900; }
      @font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${fonts[2]}) format('woff2'); font-weight: 100 900; font-style: italic; }
      text { fill: #263c32; font-family: 'DM Sans', sans-serif; }
      .serif { font-family: Fraunces, Georgia, serif; font-weight: 450; }
      .italic { font-family: Fraunces, Georgia, serif; font-style: italic; font-weight: 450; fill: #b76144; }
    </style>
    <linearGradient id="world" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#f8efcc"/><stop offset=".52" stop-color="#e9e8cd"/><stop offset="1" stop-color="#c9d6b9"/>
    </linearGradient>
    <radialGradient id="light" cx=".34" cy=".25" r=".85">
      <stop stop-color="#fff5cd"/><stop offset=".45" stop-color="#f2d48a"/><stop offset="1" stop-color="#d7ad54"/>
    </radialGradient>
    <linearGradient id="cloud" x2="0" y2="1"><stop stop-color="#fffdf7"/><stop offset="1" stop-color="#e9e5d6"/></linearGradient>
    <linearGradient id="ground" x2="0" y2="1"><stop stop-color="#dce4c7"/><stop offset="1" stop-color="#b7c39e"/></linearGradient>
    <filter id="soft-shadow" x="-.3" y="-.5" width="1.6" height="2"><feDropShadow dx="0" dy="10" stdDeviation="11" flood-color="#3a4932" flood-opacity=".12"/></filter>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
    <path id="spark" d="M0-25C3-7 7-3 25 0 7 3 3 7 0 25-3 7-7 3-25 0-7-3-3-7 0-25Z"/>
  </defs>

  <!-- Background and quiet outer frame. -->
  <rect width="1080" height="1920" fill="#faf8f1"/>
  <rect x="30" y="30" width="1020" height="1860" rx="32" fill="none" stroke="#dedfd3" stroke-width="1.5"/>
  <path d="M80 290H1000" stroke="#dedfd3" stroke-width="1.5"/>

  <!-- Existing brand mark and typography. -->
  <g color="#294735">${illustration(SproutMark, {}, 79, 200, 67, 67)}</g>
  <text x="162" y="251" font-size="49" font-weight="760" letter-spacing="-2.4">parvarish<tspan fill="#c3603e">.</tspan></text>
  <g font-size="16" letter-spacing="2.2" font-weight="650" text-anchor="end">
    <text x="992" y="224">GROWING UP,</text><text x="992" y="248">TOGETHER.</text>
  </g>
  <circle cx="89" cy="347" r="5" fill="#c3603e"/>
  <text x="110" y="354" font-size="20" font-weight="650" letter-spacing="3">FOR EVERY KIND OF FAMILY</text>

  <!-- Live editable text, with embedded licensed brand fonts. -->
  <text class="serif" x="76" y="489" font-size="126" letter-spacing="-6">They grow.</text>
  <text class="serif" x="76" y="622" font-size="120" letter-spacing="-5.7">You grow, <tspan class="italic">too.</tspan></text>
  <path d="M509 650Q579 635 643 643M524 659Q580 647 630 651" fill="none" stroke="#b76144" stroke-width="2.4" stroke-linecap="round"/>
  <text x="82" y="715" font-size="31" fill="#667066" style="fill:#667066">From the first “what if” to the fifth birthday.</text>

  <!-- The website's original little world, composed for a vertical story. -->
  <ellipse cx="545" cy="1110" rx="424" ry="315" transform="rotate(-17 545 1110)" fill="none" stroke="#a2ac91" stroke-width="1.3" stroke-dasharray="3 5" opacity=".65"/>
  <path d="M185 1344V1129C185 933 342 807 540 807S895 933 895 1129V1344Z" fill="url(#world)"/>
  <path d="M202 1344V1129C202 938 350 824 540 824" fill="none" stroke="#fffbe5" stroke-width="8" opacity=".5"/>
  <ellipse cx="540" cy="1371" rx="367" ry="60" fill="#afbc98"/>
  <ellipse cx="540" cy="1355" rx="367" ry="53" fill="url(#ground)"/>
  <ellipse cx="540" cy="1348" rx="333" ry="37" fill="#e5e9d2" opacity=".62"/>
  <circle cx="843" cy="859" r="95" fill="none" stroke="#e1d5b2" stroke-width="1.2"/>
  <circle cx="843" cy="859" r="85" fill="none" stroke="#e1d5b2" stroke-width="1.1" stroke-dasharray="3 5"/>
  <circle cx="843" cy="859" r="73" fill="url(#light)" filter="url(#soft-shadow)"/>
  <g transform="translate(98 956)" fill="url(#cloud)" filter="url(#soft-shadow)">
    <path d="M18 38C-6 34-5 7 17 5 20-23 58-31 77-9 99-16 119-3 119 16 144 13 153 44 129 51H22Z"/>
  </g>
  <g transform="translate(862 1082) scale(.78)" fill="url(#cloud)" filter="url(#soft-shadow)">
    <path d="M18 38C-6 34-5 7 17 5 20-23 58-31 77-9 99-16 119-3 119 16 144 13 153 44 129 51H22Z"/>
  </g>
  <use href="#spark" transform="translate(193 842) scale(.72)" fill="#bb795b"/>
  <use href="#spark" transform="translate(939 1246) scale(.43)" fill="#bb795b"/>
  ${illustration(GrowthBranch, {}, 175, 1200, 181, 158)}
  ${illustration(Person, { stage: 'toddler' }, 280, 817, 510, 612)}

  <!-- A small paper note adds warmth without product promises. -->
  <g transform="rotate(-8 240 1120)">
    <rect x="85" y="1050" width="278" height="143" rx="9" fill="#fffdf7" stroke="#e2e0d4" filter="url(#soft-shadow)"/>
    <rect x="177" y="1036" width="89" height="30" fill="#e9dfbf" opacity=".75" transform="rotate(3 220 1051)"/>
    <path d="M130 1107C116 1093 106 1115 133 1134 160 1112 145 1091 130 1107Z" fill="none" stroke="#bd7d60" stroke-width="2.5" stroke-linecap="round"/>
    <text x="171" y="1110" font-size="22" font-weight="500">Small moments.</text>
    <text x="171" y="1143" font-size="22" font-weight="650">Big feelings.</text>
  </g>
  <g transform="translate(809 1265) rotate(12)" filter="url(#soft-shadow)">
    <rect width="78" height="78" rx="13" fill="#d6a76d"/>
    <rect x="-4" y="-5" width="76" height="75" rx="13" fill="#f2cf91"/>
    <text class="serif" x="34" y="50" text-anchor="middle" font-size="55" style="fill:#a57340">a</text>
  </g>
  <g transform="translate(758 1323) rotate(-10)" filter="url(#soft-shadow)">
    <rect width="67" height="67" rx="12" fill="#b88770"/>
    <rect x="-4" y="-5" width="65" height="64" rx="12" fill="#dab09b"/>
    <text class="serif" x="28" y="45" text-anchor="middle" font-size="46" style="fill:#8b5b45">b</text>
  </g>

  <text class="serif" x="540" y="1480" text-anchor="middle" font-size="39" letter-spacing="-.6">No perfect parents.</text>
  <text class="italic" x="540" y="1530" text-anchor="middle" font-size="39" letter-spacing="-.6">Just your kind of family.</text>
  <rect x="294" y="1576" width="492" height="90" rx="45" fill="#263c32"/>
  <text x="342" y="1633" font-size="31" font-weight="600" style="fill:#fffdf6">Find your chapter</text>
  <path d="M711 1621h29m-12-12 12 12-12 12" fill="none" stroke="#fffdf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="540" y="1720" text-anchor="middle" font-size="25" font-weight="500" letter-spacing=".4" style="fill:#667066">parvarish.akash-deep.com</text>
  <rect width="1080" height="1920" fill="transparent" filter="url(#paper)" pointer-events="none"/>
</svg>`;

await writeFile(new URL('parvarish-story.svg', output), svg);
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Parvarish social story</title><style>html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#faf8f1}body>svg{display:block}</style>${svg}</html>`;
await writeFile(new URL('parvarish-story.html', output), html);

const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(new URL('parvarish-story.html', output).href);
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.evaluate(() => [...document.querySelectorAll('text')].map((node) => {
    const box = node.getBoundingClientRect();
    return { text: node.textContent, x: box.x, y: box.y, right: box.right, bottom: box.bottom };
  }));
  if (bounds.some((box) => box.x < 60 || box.right > 1020 || box.y < 180 || box.bottom > 1750)) {
    throw new Error(`Story text exceeded its safe bounds: ${JSON.stringify(bounds)}`);
  }
  await page.screenshot({ path: fileURLToPath(new URL('parvarish-story.png', output)), animations: 'disabled' });
  const metadata = await sharp(fileURLToPath(new URL('parvarish-story.png', output))).metadata();
  if (metadata.width !== 1080 || metadata.height !== 1920) throw new Error('Unexpected export dimensions');
  await writeFile(new URL('parvarish-story-layout.json', output), JSON.stringify({ width: metadata.width, height: metadata.height, text: bounds }, null, 2));
  console.log('Created 1080 × 1920 PNG, editable SVG and self-contained HTML in outputs/social/.');
} finally {
  await browser.close();
}
