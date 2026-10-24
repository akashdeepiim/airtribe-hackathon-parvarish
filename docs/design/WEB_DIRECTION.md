# Growing up, together

Parvarish's web identity centres on a small world that changes as a family grows. The visual reference was [Airtribe's AI Builders Day](https://airtribe.live/ai-builders-day): tactile objects, depth and interactive storytelling informed the approach. All Parvarish vectors, layouts, copy and assets are original.

The foundation is warm paper, forest ink, terracotta accents and soft stage colours. Fraunces gives the editorial voice its warmth; DM Sans keeps forms and navigation clear. Both are self-hosted, with their licences included. Palette, radii and spacing tokens live in `src/design/web-tokens.css`; the native design tokens remain separate until the native review.

The hero uses original SVG characters with gradients/shadows, CSS perspective and pointer-responsive tilt. Clouds, paper notes, a sun and small ornaments move gently. Stage changes animate the character and reflections; cards have hover/press transitions and sections enter on scroll. Motion can be paused in the header and respects the system's reduced-motion preference. There is no autoplay sound, forced scroll, video download or WebGL requirement.

Five public chapters: Dreaming, Expecting, Birth–1 year, 1–3 years and 3–5 years. Selecting a chapter changes only in-memory UI state. It does not write pregnancy, fertility or age data to storage, URLs or analytics. Keyboard arrows, Home and End operate the selector; the phone layout provides a scrollable row of large stage cards.

The journal is original reflective writing, not clinical guidance or parent testimonials. The current/future feature distinction is explicit. Existing consent, authentication and database permissions remain authoritative beneath the refreshed app shell.

Marketing assets are in `public/brand/`: an editable SVG mark, favicon/app icons, a 1200×630 social preview and three 1080×1920 social-story graphics, each with editable SVG and PNG. They deliberately contain no unconfirmed contact information or testimonials. Add the appropriate link sticker when publishing a story. Regenerate with `npm run build:brand`.

Review the landing, stage interactions, journal and sign-in in the browser before extending this design to native. Phase 2 functionality has not begun.
