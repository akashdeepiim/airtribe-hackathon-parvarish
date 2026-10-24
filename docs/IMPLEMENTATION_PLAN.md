# Complete web release: P0, P1 and sourced health education

Founder approval, 24 October 2026: implement every P0 and P1 item plus general educational health content from WHO, CDC and India's MoHFW. Public source verification must be distinguished from clinical review. Diagnosis, dosing and personalised medical advice remain excluded. Web is the first release; native device delivery follows web review.

## Delivery batches

- [x] Foundation, email OTP, consent, family permissions and hosted deployment.
- [x] Memories: up to 50 photos, EXIF dates, compression, progress/retry, age timeline, captions, people tags, private image access and storage-aware deletion.
- [x] Milestones: official-source catalogue with honest review status, confirmed photo tagging, tracker, gentle in-app nudges, re-ask timing and privacy preferences.
- [x] Sharing: 8 data-driven templates, crop/zoom/pan, themes, text, removable watermark, story/post export, first-share privacy reminder and web share/download.
- [x] Health: audited allergies and vaccination records/card photos, sourced education, parent-selected vaccination schedule reminders, WHO growth charts.
- [x] Activities: structured Edge Function generation, versioned prompt, safety validator, two retries and curated fallback, feedback and activity-to-memory, fortnightly profile questions.
- [x] Community: verified external directory, city filtering and moderated suggestion queue.
- [ ] P1: monthly recap, two-week memory reminders, Hindi interface.
- [ ] Hardening: real data export/deletion with receipt and storage cleanup, empty/error states, accessibility, PII-free metrics and end-to-end acceptance.

## Release gates

Each new child-scoped table/operation is protected and tested for owner, co-parent, contributor, viewer and non-member before its UI ships. No secret enters the frontend. Health access is audited. Source links and verification dates accompany health education; no invented clinician approval. Production migrations and storage operations are incremental. Existing concurrent chat work is preserved separately.

Cloud deployment is an early preview until these checks are complete. Device/network performance targets require measurement on the specified Android hardware and 4G; desktop browser testing cannot establish those targets.
