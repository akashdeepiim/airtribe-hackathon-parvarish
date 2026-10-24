# Parvarish — Product Requirements Document (v1)

**Status:** Draft for review · **Owner:** Akash · **Last updated:** 24 Oct 2026
**Launch scope:** Bangalore, English, children aged 0–5, iOS + Android + web (single codebase)

---

## 1. Problem Statement

Parents of young children in urban India capture thousands of photos but have no structured record of their child's growth. Those photos end up scattered across Google Photos and family WhatsApp groups. Parents also get very little guidance on what development looks like at each age or what to do with their child this week. Developmental information mostly arrives as anxiety from relatives, forwarded messages, or a five-minute paediatrician visit.

Parvarish turns the photos parents already take into a living record of their child's growth. It uses that record to nudge parents gently through milestones and suggest age-appropriate activities, so parents learn as their child grows.

**Why memories is the wedge:** Uploading photos is a behaviour parents already have, and it delivers value in the first session. Every photo tagged with a milestone (for example, "first steps") also becomes structured developmental data without the parent filling in a form. **Memories → milestones → activities** is the core loop. Without this link, Parvarish is just a weaker Google Photos.

---

## 2. Goals

**User goals**
1. Within their first session, a parent can create a child profile and see a beautiful timeline of at least 5 memories.
2. A parent can turn a memory into a shareable, branded image in under 60 seconds.
3. A parent understands where their child sits within normal developmental windows, without being alarmed.

**Business goals**
4. Prove week-4 retention among Bangalore parents before expanding to other cities.
5. Build an organic acquisition loop through shared templates posted to WhatsApp and Instagram.

---

## 3. Non-Goals (v1)

| Non-goal | Why it's out |
|---|---|
| Native Reddit-style community forum | An empty forum signals a dead product, and moderating child-related content (health misinformation, child photos) is expensive. Ship the curated directory now and add threads once Bangalore has enough active users. |
| Marketplace | Needs supply-side partnerships and payments. Unrelated to proving the core loop. |
| Health advisories / ailment search | Medical-advice liability. Requires clinical partners and review workflows. |
| Self-learning recommendation model | No training data exists at launch. V1 uses rules plus an LLM with the child's profile in context. A learning loop becomes viable after ~10k activity feedback events. |
| Freeform photo editor (Canva-style) | Months of work for a solo builder. Fixed templates deliver 90% of the value. |
| Diagnosis, screening scores, or "delay" labels | Regulatory and ethical risk. Parvarish informs; paediatricians assess. |
| Languages other than English | Revisit after product–market fit. Hindi and Kannada are the likely next languages. |
| Printed photobooks | First monetisation hypothesis to test after retention is proven. |

---

## 4. Personas

- **Primary parent (Owner):** Usually the mother, 26–38, urban Bangalore, smartphone-native, an active WhatsApp user. Creates the child profile and gives legal consent.
- **Co-parent:** Full access to the child profile, with the same rights as the Owner except deleting the child or removing the Owner.
- **Family member (grandparent, aunt, etc.):** Wants to see photos and occasionally contribute them. Is often less tech-comfortable, and is often the person who receives shared templates on WhatsApp.

---

## 5. Core User Flow

1. **Sign up** with a phone number and OTP (the expected default in India). An email login option is available for web.
2. **Consent and verification.** The parent confirms they are the parent or lawful guardian and are an adult. They accept plain-language notices that name each purpose separately (memories, milestones, health, personalisation, notifications).
3. **Create child profile:** name, date of birth, photo, optional sex, city/area, interests, known allergies.
4. **First value moment:** bulk-upload photos, which land on an auto-sorted timeline by photo date. Parvarish then prompts: "Is any of these a first? Tag it."
5. **Invite family** through a WhatsApp link, each invite with a role.
6. **Ongoing loop:** milestone nudges, weekly activity suggestions, and template sharing.

---

## 6. Requirements

### P0 — Must-have for launch

**P0.1 Accounts, consent and compliance**
- Phone + OTP authentication. Optional email/password on web.
- A consent record for each user, each child, and each purpose: notice version, timestamp, verification method, and withdrawal timestamp.
- Verifiable parental consent mechanism. **Blocking legal question, see §10.** Build the consent table and flow so the verification method can be swapped (self-declaration now, DigiLocker or token-based verification later) without a schema change.
- Withdrawing consent for a purpose stops that processing. Example: withdrawing personalisation consent turns off activity suggestions.
- Data export (ZIP of photos plus JSON) and full deletion, including storage objects, within 30 days.
- All child data stored in an India region. Photos served only through short-lived signed URLs, never public links.
- Audit log of who viewed or edited health data.

*Acceptance criteria*
- Given a new user, when they try to create a child profile, then they cannot continue without completing the consent step.
- Given an Owner deletes a child profile, then all memories, milestones, health records and storage objects for that child are gone within 30 days, and a deletion receipt is logged.
- Given any photo URL is shared outside the app, when it is opened after expiry (≤1 hour), then access is denied.

**P0.2 Child profile and family access**
- Multiple children per account.
- Roles: **Owner** (consenting parent), **Co-parent**, **Family Contributor** (can view and upload memories), **Family Viewer** (view only).
- Health data (allergies, vaccinations) visible to Owner and Co-parent only by default. The Owner can choose to grant it to others.
- Invite by WhatsApp deep link. Invitees create their own account and accept their own notice.

*Acceptance criteria*
- Given a Family Viewer, when they open the child profile, then the health tab is not visible and the API returns 403 for health endpoints.
- Given an Owner revokes a member, then that member loses access immediately, including any cached signed URLs once they expire.

**P0.3 Memories timeline (the wedge)**
- Bulk upload of up to 50 photos at once. Photo date is read from EXIF, with upload date as fallback. Client-side compression keeps each photo under 2 MB at 2048 px on the long edge.
- Vertical timeline grouped by month of the child's age ("Ananya · 7 months").
- Each memory can have a caption, an optional milestone tag, and optional "who's in it" tags.
- Tagging a memory with a milestone marks that milestone as achieved on the photo date, after the parent confirms.
- Edit and delete memories. Contributors can delete only what they uploaded.

*Acceptance criteria*
- Given a parent uploads 20 photos with EXIF dates, then they appear in correct chronological order under the correct age-month header within 10 s on 4G.
- Given a photo is tagged "First steps," then the milestone tracker shows "Walking — achieved on [date]" and links back to the photo.

**P0.4 Templates and sharing**
- 8–12 fixed templates: monthly milestone card ("Ananya is 6 months!"), "First ___" card, monthly collage (4–6 photos), birthday card, before/after growth comparison.
- Editable fields: photo slots (with crop, zoom and pan), text, and a choice of 3–4 colour themes. No freeform layout.
- Export as a 1080×1920 (story) or 1080×1080 (post) PNG with a small, removable Parvarish watermark.
- Share through the native share sheet (WhatsApp, Instagram Stories, save to gallery).
- A privacy reminder before the first-ever share: "This image will be visible to anyone you share it with."

*Acceptance criteria*
- Given a parent selects a template and a photo, then they can export it in ≤4 taps after editing text.
- Given the export runs on a mid-range Android device (4 GB RAM), then rendering completes in under 3 s.

**P0.5 Milestone tracker and nudges**
- A milestone catalogue covering 0–5 years across four domains: motor, language, social-emotional, and cognitive. Each entry has a **window start**, a **typical age**, a **"talk to your doctor if not by"** age, its source, and a clinical review status.
- Source content from WHO Motor Development Study windows and CDC "Learn the Signs. Act Early." (2022). **Every entry must be reviewed by a paediatrician before launch.** Entries not yet reviewed stay hidden from users.
- Nudge logic:
  - Once the child reaches a milestone's window start, send at most one push per week across all milestones: "Has Ananya started walking yet? 🎉 Tap to add a memory." Answers: *Yes (add photo/date)*, *Not yet*, *Skip*.
  - After "Not yet": reassuring context only. Example: "Most babies walk somewhere between 8 and 18 months. Every child has their own pace." Ask again in 4–6 weeks.
  - If the child passes the "talk to your doctor if not by" age without the milestone: a single calm in-app card (never a push notification): "It may be worth mentioning [milestone] at Ananya's next check-up." No red colours, no "delayed" wording, no repeated nagging.
- "Did you know?" learning cards tied to the child's current age.
- Notification privacy setting: show the child's name on the lock screen, or a generic message instead.
- Quiet hours (9 pm–8 am default), and nudges can be switched off for each milestone.

*Acceptance criteria*
- Given a child is 7 months old, then no walking nudge has been sent. The window start is ~8 months, subject to clinical review.
- Given no catalogue entry has `clinical_review_status = approved`, then that milestone never appears to users.
- The words "delay," "abnormal," "behind," and "should have" do not appear in any user-facing milestone copy. A content lint check enforces this.

**P0.6 Basic health record**
- Allergies (food, medicine, other), each with a severity level and notes.
- Manual vaccination log: vaccine name, date, and an optional photo of the card.
- No dose recommendations and no schedule-driven medical advice in P0.

**P0.7 Activity suggestions (v1, rules + LLM)**
- Every Monday, three suggested activities per child, generated from: age in months, recently achieved milestones and those currently in window, interests, allergies (as a hard filter), city, season and weather, and the parent's stated constraints (time available, indoor/outdoor, budget).
- Each activity includes a title, why it helps (linked to a developmental domain), materials, time needed, and a safety note when relevant.
- Feedback options: 👍 / 👎 / "We did it" (optionally with a photo, which becomes a memory). This feedback is the training data for the future learning model.
- Guardrails: a system prompt plus a post-generation check that blocks choking hazards for under-3s, anything containing a listed allergen, water activities without supervision notes, and any medical claims.
- Every two weeks, ask one profile-deepening question ("What does Ananya love right now?") to improve personalisation.

*Acceptance criteria*
- Given a child has a peanut allergy, then no generated activity includes peanuts or peanut products. A post-generation check verifies this, and failures are regenerated.
- Given a child is 14 months old, then no activity involves small parts under 3 cm.

**P0.8 Community directory (external)**
- A hand-curated list of Bangalore parent communities (WhatsApp groups, Facebook groups, meetups) plus 5–10 global ones. Each entry has a name, platform, description, age focus, and the date it was last verified.
- Users can suggest a community, which goes into a moderation queue.
- Entries are shown based on the city on the user's profile, not GPS.

### P1 — Fast follows (within 6–8 weeks of launch)
- Vaccination schedule reminders based on the IAP or national UIP schedule, chosen by the parent. Requires clinical review.
- Growth tracking (height, weight, head circumference) with WHO percentile charts.
- Auto-generated monthly recap ("Ananya's 9th month") as a shareable collage.
- Memory suggestions: "You haven't added a memory in 2 weeks."
- Hindi UI.

### P2 — Future (design for, don't build)
- Native community threads, which need moderation tooling, reporting and blocking.
- Printed photobooks (first monetisation test).
- Marketplace, health advisories, and ailment search.
- A learning recommender that ranks activities on feedback signals.
- Expansion to other cities. Keep the community directory and activities data model city-agnostic.

---

## 7. Key Product Decisions

1. **Sex/gender is optional and is not used to choose activity types.** Activities are personalised on interests and developmental stage. Gender-based suggestions are a weak signal and risk reinforcing stereotypes ("dolls for girls, cars for boys"). Sex is kept only for future growth charts, which differ by sex.
2. **Web has the same features as mobile, but no push notifications.** One Expo codebase. Web serves grandparents and desktop bulk uploads.
3. **The tone is that of a friend who's a paediatric nurse, not a doctor.** Warm, specific, never alarming.
4. **The UI is minimal and parent-centric**, with a soft, playful palette and rounded shapes, but the information is clean and adult-level.

---

## 8. Success Metrics

*Targets are hypotheses for a Bangalore beta. Revise them after the first 200 users.*

**Leading indicators (first 30 days)**
| Metric | Definition | Target |
|---|---|---|
| Activation | % of signups who create a child and upload ≥5 photos within 24 h | ≥50% |
| Milestone capture | % of active children with ≥1 milestone tagged via a memory in week 1 | ≥30% |
| Share rate | Template exports ÷ weekly active users | ≥0.5 |
| Nudge response | % of milestone pushes answered (yes / not yet / skip) | ≥35% |
| Family invites | % of Owners who invite ≥1 family member | ≥40% |

**Lagging indicators (60–90 days)**
| Metric | Target |
|---|---|
| Week-4 retention | ≥25% |
| Activity "we did it" rate | ≥15% of suggested activities |
| Organic signups attributed to shared templates or invites | ≥30% |

---

## 9. Data Model (summary)

`users` · `children` · `child_members (role)` · `consents (purpose, version, verification_method, granted_at, withdrawn_at)` · `memories` · `milestone_catalog (window_start, typical, consult_by, source, review_status)` · `child_milestones (status, achieved_on, memory_id)` · `allergies` · `vaccination_logs` · `activity_batches` · `activity_feedback` · `community_directory` · `notifications_log` · `audit_log`

Every child-scoped table is protected by row-level security based on `child_members`.

---

## 10. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | Do milestone tracking and personalised activities count as "behavioural monitoring of children" under DPDP Section 9(3)? If so, does an exemption apply? This could reshape P0.5 and P0.7. | Legal (DPDP counsel) | **Yes** |
| 2 | Which verifiable parental consent method is required for an app where the parent (not the child) is the user, and by what date? | Legal | **Yes** before public launch |
| 3 | Which paediatrician reviews the milestone catalogue and activity guardrails, and on what terms? | Founder | **Yes** |
| 4 | Do family members uploading photos of the child need separate consent, or is the Owner's consent enough? | Legal | Yes |
| 5 | LLM provider data processing agreement: is any child data retained or used for training? | Engineering / Legal | Yes |
| 6 | Watermark on exports: on by default, or opt-in? This is a trade-off between the acquisition loop and user goodwill. | Design | No |
| 7 | Storage cost ceiling per user before photobooks or a paid tier are needed | Founder | No |

---

## 11. Timeline (solo builder + AI coding tool)

*Estimates are guesses. Sequence matters more than dates.*

| Phase | Scope | Est. |
|---|---|---|
| 0 | Legal consult (Q1, Q2), paediatrician lined up, milestone catalogue drafted | Weeks 1–2, in parallel with Phase 1 |
| 1 | Auth, consent, child profile, family roles, RLS | Weeks 1–3 |
| 2 | Memories upload and timeline, milestone tagging | Weeks 3–5 |
| 3 | Templates and export/share | Weeks 5–7 |
| 4 | Milestone nudges, push notifications, health record | Weeks 7–9 |
| 5 | Activity suggestions and guardrails, community directory | Weeks 9–10 |
| 6 | Closed beta with 30–50 Bangalore parents | Weeks 11–12 |

**Hard gate:** no public launch until Open Questions 1–3 are resolved.
