import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const root = new URL('../public/brand/', import.meta.url);
await mkdir(root, { recursive: true });
const sprout =
  '<g fill="none" stroke="#294735" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"><path d="M128 211V118M128 146C58 146 37 96 46 48c65 0 91 37 82 98ZM128 118c-4-59 30-91 81-81 0 57-29 88-81 81Z"/><path d="M79 216c25-20 76-20 102 0"/></g>';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="64" fill="#E5EBD8"/>${sprout}</svg>`;
await writeFile(new URL('mark.svg', root), icon);
for (const [name, size] of [
  ['favicon.png', 64],
  ['apple-touch-icon.png', 180],
  ['icon-512.png', 512],
])
  await sharp(Buffer.from(icon)).resize(size, size).png().toFile(new URL(name, root).pathname);
const branch =
  '<path d="M0 180C-8 90 10 0 0-90" fill="none" stroke="#45664e" stroke-width="10" stroke-linecap="round"/><path d="M0 100C-89 110-152 65-144-6-60-12-5 34 0 100Z" fill="#8ca783"/><path d="M0 38C87 40 150-11 139-81 53-80 3-31 0 38Z" fill="#abc19c"/><path d="M0-31c-48-13-70-62-49-102C3-126 18-81 0-31Z" fill="#d0dcc1"/>';
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="arch" x2=".8" y2="1"><stop stop-color="#f9edcf"/><stop offset="1" stop-color="#c9d8b9"/></linearGradient></defs><rect width="1200" height="630" fill="#faf8f1"/><g transform="translate(57 30) scale(.18)">${sprout}</g><text x="117" y="74" font-family="Arial" font-size="31" font-weight="600" fill="#263c32">parvarish.</text><text x="65" y="178" font-family="Arial" font-size="13" letter-spacing="3" fill="#667066">A LITTLE SPACE FOR THE BIGGEST JOURNEY</text><g font-family="Georgia" font-size="91" fill="#263c32"><text x="62" y="295">They grow.</text><text x="62" y="394">You grow, <tspan font-style="italic" fill="#c3603e">too.</tspan></text></g><text x="66" y="462" font-family="Arial" font-size="22" fill="#667066">From the first “what if” to the fifth birthday.</text><rect x="65" y="514" width="242" height="54" rx="27" fill="#263c32"/><text x="94" y="548" font-family="Arial" font-size="17" fill="#fffdf6">Growing up, together. ↗</text><rect x="797" y="129" width="320" height="385" rx="156" fill="url(#arch)"/><ellipse cx="959" cy="500" rx="168" ry="30" fill="#bbc8a5"/><g transform="translate(954 325) scale(.86)">${branch}</g><circle cx="1070" cy="133" r="47" fill="#edc578"/><path d="m776 176 6 21 21 6-21 6-6 21-6-21-21-6 21-6Z" fill="#c17b53"/><text x="866" y="569" font-family="Georgia" font-size="21" font-style="italic" fill="#637557">your kind of family.</text></svg>`;
await writeFile(new URL('social-preview.svg', root), cover);
await sharp(Buffer.from(cover)).png().toFile(new URL('social-preview.png', root).pathname);
const storyCards = [
  {
    slug: 'growing-together',
    color: '#ead7c2',
    title: ['They grow.', 'You grow, too.'],
    line: 'Find your chapter. From dreaming to five.',
    label: 'THE PARVARISH JOURNEY',
  },
  {
    slug: 'the-little-years',
    color: '#e2e8d6',
    title: ['Keep the little', 'things close.'],
    line: 'A journal for the parent in the picture.',
    label: 'LETTERS FROM THE LITTLE YEARS',
  },
  {
    slug: 'your-little-world',
    color: '#e8dfed',
    title: ['Your people.', 'Your little world.'],
    line: 'A private family space, on your terms.',
    label: 'GROWING UP, TOGETHER',
  },
];
for (const card of storyCards) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#faf8f1"/><g transform="translate(75 130) scale(.26)">${sprout}</g><text x="160" y="190" font-family="Arial" font-size="43" font-weight="600" fill="#263c32">parvarish.</text><text x="80" y="315" font-family="Arial" font-size="20" letter-spacing="3" fill="#667066">${card.label}</text><text x="75" y="475" font-family="Georgia" font-size="105" fill="#263c32">${card.title[0]}</text><text x="75" y="590" font-family="Georgia" font-size="105" font-style="italic" fill="#a15e42">${card.title[1]}</text><rect x="190" y="755" width="700" height="670" rx="340" fill="${card.color}"/><ellipse cx="540" cy="1402" rx="347" ry="60" fill="#bbc8a5"/><g transform="translate(540 1100) scale(1.55)">${branch}</g><circle cx="838" cy="792" r="73" fill="#edc578"/><text x="80" y="1595" font-family="Arial" font-size="32" fill="#667066">${card.line}</text><rect x="80" y="1660" width="390" height="90" rx="45" fill="#263c32"/><text x="121" y="1717" font-family="Arial" font-size="28" fill="#fffdf6">Come grow with us. ↗</text><text x="80" y="1843" font-family="Arial" font-size="20" letter-spacing="2" fill="#667066">YOUR PACE. YOUR PEOPLE. YOUR PARVARISH.</text></svg>`;
  await writeFile(new URL(`${card.slug}-story.svg`, root), svg);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(new URL(`${card.slug}-story.png`, root).pathname);
}
console.log('Brand mark, social preview and three 1080×1920 story assets generated.');
