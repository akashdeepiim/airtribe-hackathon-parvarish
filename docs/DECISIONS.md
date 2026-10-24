# Phase 1 implementation decisions

The original supplied PRD is preserved in PRD.md. Explicit founder decisions below take precedence over conflicting original requirements.

## Approved 24 October 2026

- Use the supplied PRD as the canonical product document.
- Defer allergy collection to Phase 4; harden before the closed beta.
- Use email authentication initially instead of phone OTP. Resend will be configured as Supabase Auth's SMTP provider; its API key stays server-side.
- Treat legal concerns as approved for current implementation planning, per the founder. This records the instruction, not an independently verified legal opinion. Retain purpose-specific consent, withdrawal, privacy, clinical approval gates and health auditing.
- Show a plain-language sensitive-data callout wherever child details, consent or access permissions are handled.
- Support configurable access per family relationship, implemented as role presets plus child-specific capability overrides. Relationship labels never grant permission by themselves.

- Email OTP is the chosen sign-in experience.
- Memories consent is required to create a profile; milestones, health, personalisation and notifications are optional. Each purpose requires an explicit recorded choice.

## Technical decisions for review

- Owner-only health grants and owner protection remain hard constraints. Family health grants are read-only initially; health writes stay with parents.
- Capabilities are evaluated in Postgres for every request, never trusted from client state or JWT role metadata.
- Invite links are single-use, expire after seven days, and bind to the verified recipient email. No child name or email appears in the URL or WhatsApp message.
- No health payload in the general child profile. Health reads/writes use audited server operations; direct client reads are denied.
- Photo URLs expire after 15 minutes (below the one-hour maximum). Health photo bytes require an audited endpoint rather than an untracked direct Storage read.
- Phase 1 does not expose child deletion until Phase 6 implements the real storage cleanup job and deletion receipt.
- Future feature schemas and RLS exist in Phase 1; their product UI is built in the relevant phase.

## Review gate

### Web design update, approved 24 October 2026

- Prioritise web design and flow before further iOS/Android development. Preserve the Expo/React Native stack and platform-specific components.
- Add public journeys from planning a family through pregnancy to age five. Planning/pregnancy selections are ephemeral, require no account and collect no reproductive information. Child profiles begin after birth.
- Build an original illustrated identity with dimensional vector scenes, transitions and optional decorative motion. The Airtribe reference informs interaction and depth, not copied assets or branding.
- Add the public landing page, an original editorial journal, about/privacy explanations and social story assets. Do not invent testimonials, clinical guidance or availability claims for unfinished features.
- Use `parvarish.akash-deep.com` as the public domain. The founder will deploy using Vercel. Operator and support/privacy email remain unspecified.
- Configure Vercel static hosting, SEO and a deployable design preview. Hosted Supabase/Resend, later-phase functionality and launch acceptance remain separate unfinished work.

Stop after Phase 1 and report verified checks, limitations, and these decisions. Do not start Phase 2 without founder review.

## Expanded release, approved 24 October 2026

- The founder explicitly approved completing **all P0 and P1 features**, rather than stopping at the Phase 1 foundation.
- The founder approved adding **general educational health content from WHO, CDC and India's MoHFW**, with source links and an honest review status. This supersedes the advisory non-goal and CSV-only sourcing restriction for that educational content. Public-source verification is not clinical approval; do not label source-verified material as paediatrician-reviewed.
- Diagnosis, dosing and personalised medical advice remain excluded.
- Continue web first. Preserve the original PRD as historical source and record these amendments here. The earlier stop-before-Phase-2 instruction is superseded by this explicit implementation request.

### Official-source milestone and vaccination release
The founder explicitly approved official-source milestone prompts and vaccination reminders labelled “Source verified; not individually reviewed by a paediatrician” on 24 October 2026. This replaces the original clinical-approval-only publication gate for this first release. Source verification and paediatric approval remain separate fields; no clinician approval is inferred. Thresholds must come from the cited source and cannot be invented from general knowledge.

- 24 October 2026: operator confirmed as Akash Deep; support and privacy contact info@akash-deep.com. OpenAI selected for weekly activity generation; API key saved by founder in Supabase secrets.

- Release integration: founder requested merging all completed local work. The authenticated Ask Parvarish UI/API and social/knowledge-base artifacts are included. AgenticOrg settings are server-only Vercel variables entered by the founder; OpenAI activities remain Supabase Edge-only.
- Public operator is Akash Deep and support/privacy email is info@akash-deep.com.
- Large data exports are numbered ZIP volumes of at most 20 photos, with complete JSON in the first volume, private storage, five-minute download links and 24-hour archive expiry. Deletion immediately hides the family space and continues server-side.
