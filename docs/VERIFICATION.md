# Phase 1 verification

Verified on 24 October 2026 against local services and the hosted Mumbai Supabase project. Child profiles, health fixtures and images used for testing are synthetic. Real mobile devices have not been verified.

## Automated checks

| Check                      | Result                                                   | What it establishes                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`            | Passed; strict TypeScript, 17 Vitest tests, content lint | Profile/consent validation, permission presets, safe invite links, error redaction and rejection of all six prohibited milestone terms                                                                  |
| `npm run test:db`          | Passed; 273 pgTAP assertions                             | Owner, co-parent, contributor, viewer and non-member access; cross-child isolation; consent gating; audited health access; role escalation, invite replay/expiry/revocation and protected-owner denials |
| `npm run test:api`         | Passed; 19 checks                                        | Actual local Auth, PostgREST, Storage and Edge Function responses, including missing/invalid tokens, fixed photo expiry, private images, health audit records and revoked access                        |
| Hosted API acceptance      | Passed; 19 checks                                       | Same boundary checks against the deployed Mumbai project and function; owner-scoped audit verification; synthetic fixtures removed |
| Hosted database inspection | Passed; 19/19 public tables use RLS                      | Both storage buckets are private; no broad service-role table grant was added |
| Live HTTPS acceptance      | Passed; 15 routes                                       | Public/article deep links, private child-route rewrites, security/privacy headers and a real HTTP 404; valid TLS using the newly published DNS address |
| Expo export                | Web, iOS and Android bundles generated                   | Metro production bundling for all three platforms; this is not device execution                                                                                                                         |
| `npx expo install --check` | Passed                                                   | Dependencies match the selected Expo SDK                                                                                                                                                                |
| Source/secret review       | Passed                                                   | Original PRD matches the attachment; local credentials are ignored; no service key in client source or tracked files; no application logging of child, photo or health payloads                         |

GitHub Actions passed both app and database jobs for commit `95aeb30`: [run 40090840532](https://github.com/akashdeepiim/airtribe-hackathon-parvarish/actions/runs/40090840532). The repository is published at `akashdeepiim/airtribe-hackathon-parvarish`. Native bundles passed before the web redesign; further native work is deferred at the founder's request.

The SQL tests run inside rolled-back transactions. The API script refuses hosted URLs and removes only the users, child and image created by that run. A separate synthetic browser demonstration remains available locally.

## Browser checks

### Web design update

- Fixed document scrolling by removing the web Stack viewport constraint and overriding Expo's document reset. Actual wheel scrolling was verified on the landing page, an article and a phone-sized privacy page; the 390-pixel layout has no horizontal overflow.
- Stage changes now use directional depth, scale, rotation and opacity transitions with layered scenery, chapter controls and keyboard navigation. Page/section entrances, photo stacks and journal cards have coordinated motion; the pause control disables animation and transitions.
- Re-tested email-code sign-in, adult attestation, required memories consent, all four optional declines and persisted child/profile privacy choices. Shared web buttons now use native HTML button semantics.

- The public landing page renders an original dimensional vector scene. Stage selection and keyboard arrows change the chapter and reflection; planning/pregnancy remain public and ephemeral.
- Public journal navigation was exercised, including the direct `before-we-meet` article. About/privacy pages and each article are exported as static HTML with page-specific metadata.
- At 390 × 844, the page width remains 390, the mobile menu works, and the stage row is contained within its own horizontal scroller. The fixed header remains at viewport top.
- The motion toggle sets decorative animations to paused and reveals all content. Reduced-motion behavior is also implemented in CSS and the preference listener; no OS-level preference change was made during QA.
- `npm run build:web` passed with 17 exported routes locally, in GitHub CI and on Vercel. Post-export checks verify public headings/descriptions/canonicals, private-page noindex and 404 output. Live Vercel routing, DNS and TLS passed the 15-route acceptance check.
- Email OTP was re-tested through the redesigned form, including session restoration after a full reload. A cross-tab auth broadcast mismatch was fixed with a stable, tab-specific session namespace, legacy session migration and three regression tests. A separate signed-out tab remains signed out when the authenticated tab reloads.
- The final TypeScript, 17 logic tests and content lint pass. The 273 SQL and 19 local API checks passed again in GitHub CI, and 19 hosted API checks passed against Mumbai.
- A 1200×630 social preview, three 1080×1920 story graphics and favicon/app icons were generated from editable SVG sources. Fonts are self-hosted with licences.

Screenshots: [web landing](qa/landing-desktop.jpg), [full phone landing](qa/landing-phone.jpg). The new design is awaiting founder review. The earlier screenshots below document the original foundation, before the web redesign.

Exercised against the real local Supabase stack in the in-app browser:

- Request and enter an email OTP from the local mail viewer; restore a session; enforce the signed-out route guard.
- Complete adult/guardian attestation and all five purpose screens, decline optional purposes, create a child and verify persisted choices.
- Edit the profile and upload a generated image. The 3000 × 2000 fixture became 2048 × 1365 and 29,192 bytes, within the required limits.
- Create an email-bound family invite; sign in separately as the recipient; accept after their own notices. Confirm a viewer lacks profile editing by default.
- Grant that synthetic viewer profile-edit access as the owner, then verify the viewer can edit and the change persists. SQL/API tests separately cover denial, withdrawal and revocation.
- Inspect desktop and 390 × 844 layouts. No horizontal overflow was observed at the phone width. The temporary viewport override was reset.

Screenshots: [desktop](qa/profile-desktop.jpg), [phone](qa/profile-phone.jpg). The avatar is generated artwork, not a child's photograph. No WhatsApp message or external email was sent; the composer link and its privacy properties were checked locally.

## Dependency advisories

The final `npm audit` reports **13 affected packages: five high and eight moderate**, including packages reported through dependency chains. These remain unresolved in the deployed early preview and require a compatibility review before a full public launch:

| Underlying advisory                                                                      | Dependency path / consideration                                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv)   | Expo tooling; the installed 1.4.0 is affected and the registry check found no newer release             |
| [Zod oversized collection validation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Expo CLI's transitive Zod 3 is affected; application and Edge Function validation use patched Zod 4.6.7 |
| [Malformed URI decoding](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)              | Expo Router → query-string → decode-uri-component; the newer decoder changes module format              |
| [Selector parsing complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)         | Tailwind/PostCSS build dependencies                                                                     |

No forced major-version overrides were applied. Expo 57 with NativeWind 4 was selected for documented compatibility. The audit's suggested framework changes require a separate compatibility pass; passing tests does not resolve these advisories.

## Remaining verification and review

- Confirm live email delivery and the deployed web flow; hosted policies, function deployment and Mumbai region are verified in [hosted setup](HOSTED_SETUP.md).
- Run on actual iOS and Android devices. Native bundles passed, but native secure storage, picker behavior and device navigation remain untested. Maestro flows are planned in Phase 6.
- Review the capability model: owner-only permission changes; explicit family health grants allow reads, while health writes remain parent-only. Existing signed image URLs can remain usable for their 15-minute lifetime after access changes.
- Review the implementation choices in [DECISIONS.md](DECISIONS.md). Phase 2 is not started. Bulk-upload speed, rendering/export speed, deletion jobs and later-phase clinical/activity behavior are not claimed as complete.

## Repeat the review

Follow the README to start Supabase, the signed-photo function and Expo. Open `http://localhost:8081`, request a code using a synthetic email, and retrieve it at `http://localhost:54324`. Then create a profile with optional purposes declined and use a separate browser tab to exercise a family invitation.

Run `npm run check`, `npm run test:db` and `npm run test:api` for regression checks. The API test requires the local function server and ignored `.local/supabase.env` credentials. Do not point it at a hosted project.

## Parent journey release, 24 October 2026

- Combined code: 74 Vitest checks, strict TypeScript and milestone content lint pass.
- Local database: 554 pgTAP assertions across nine suites cover all five roles, health audits, schedules, activities, background jobs and receipts.
- Actual local API: 35 checks pass, including private photo expiry and byte deletion, validated weekly activity fallback, feedback, ZIP download/content and background child deletion with receipt.
- Production web export: 24 routes; public metadata, private noindex and 404 checks pass.
- Browser evidence: 20 synthetic photos uploaded and sorted by age; caption editing; vaccination plan selection; Skia square PNG exported and confirmed 1080 x 1080.
- Native device/4G timing, native push delivery and full Hindi localisation remain separate acceptance work. The release does not claim those checks passed. Live weather is unavailable; generated activities use indoor alternatives.
