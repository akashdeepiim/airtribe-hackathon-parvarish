# Sources and review record

Prepared on 24 October 2026 from the current local Parvarish checkout and the primary sources below. The source tree contains uncommitted application work; a Git revision alone does not fully identify the reviewed implementation. `source-snapshot.json` records the revision and hashes of the particular files used. No environment files or secrets are included.

## Product evidence and precedence

| Documents | Evidence inspected | Decision made for the corpus |
| --- | --- | --- |
| 01 | `docs/DECISIONS.md`, `src/screens/Information.web.tsx`, `app/children/[id]/index.tsx`, `docs/CHAT.md` | Current screens and implementation take precedence over future PRD scope. |
| 02 | `app/sign-in.tsx`, `app/family.tsx`, `app/children/new.tsx`, `src/components/ProfileForm.tsx`, `src/domain/schemas.ts`, `src/components/ConsentFlow.tsx`, `src/lib/photos.ts` | Email OTP; City required; optional sex/interests/photo; profile photo only. |
| 03 | `docs/ACCESS.md`, `app/children/[id]/family.tsx`, `app/invite.tsx`, `src/domain/invites.ts`, `supabase/migrations/202610240002_operations.sql` | Email-bound single-use seven-day invitations; explicit user sending; roles and child-specific access. |
| 04 | `app/children/[id]/privacy.tsx`, `src/domain/consent.ts`, `docs/ACCESS.md`, `src/screens/Information.web.tsx`, chat files | Withdrawal is not deletion; temporary photo links; chat text travels to an external agent. |
| 05 | `src/components/chat/ChatWidget.web.tsx`, `src/lib/chat.ts`, `api/chat.ts`, `docs/CHAT.md`, `src/lib/errors.ts` | Signed-in web only; no profile fetching or mutation tools; local history is not provider deletion. |
| 06-08 | The primary sources below; original prompts and scripts | Gentle editorial suggestions, not a developmental or clinical protocol. |

Do not infer functionality from database schemas, future capability switches, consent copy or a screenshot filename. In particular, the current child page says memories, milestones and activities are coming next. The original PRD is product direction, not proof of available UI. A co-parent invitation note mentioning deletion does not create a deletion workflow.

The profile schema currently requires City even though an older summary called it optional. The corpus follows the actual form/schema. Support/operator fields are configurable but no real confirmed values were supplied for the corpus.

## External source register

Sources were accessed on 24 October 2026. Article URLs and short source references are present in the upload documents. There are no reproduced source images, long quotations or licensed clinical catalogues. The corpus uses concise paraphrases and clearly identified original examples. External publishers have not reviewed or endorsed the pack.

| ID | Primary source | Use in this pack |
| --- | --- | --- |
| S1 | Harvard Center on the Developing Child, [5 Steps for Brain-Building Serve and Return](https://developingchild.harvard.edu/resources/briefs/5-steps-for-brain-building-serve-and-return/) and its linked [caregiver handout](https://developingchild.harvard.edu/wp-content/uploads/2024/10/HCDC_ServeReturn_for_Parents_Caregivers_2019.pdf) | Notice, respond, wait and follow the child's interest. No quantified brain-development claim. |
| S2 | UNICEF, [How to communicate effectively with your young child](https://www.unicef.org/parenting/child-care/9-tips-for-better-communication) | Kind, specific language and reflective listening. |
| S3 | CDC, [Tips for Connecting and Communicating](https://www.cdc.gov/parenting-toddlers/communication/index.html), updated 30 April 2026 | Listening, emotion naming, touch preferences and describing play. Apply within toddler/preschool context. |
| S4 | CDC, [Tips for Relying on Routines and Rules](https://www.cdc.gov/parenting-toddlers/structure-rules/), updated 30 April 2026 | Simple predictable routines and explaining changes. No fixed schedule, sleep prescription or punishment protocol copied. |
| S5 | UNICEF, [How to discipline your child the smart and healthy way](https://www.unicef.org/parenting/child-care/how-discipline-your-child-smart-and-healthy-way) | Calm expectations and positive discipline; no hitting or humiliation. |
| S6 | US Consumer Product Safety Commission, [Toys](https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Toys) | General toy age guidance, abilities, small parts and packaging. Not an Indian legal compliance claim or product certification. |
| S7 | UNICEF, [21 learning activities for babies and toddlers](https://www.unicef.org/parenting/child-care/21-learning-activities-babies-and-toddlers) | Imitation play only. No milestone ages, blanket rides or other physical activities imported. |
| S8 | American Academy of Pediatrics / HealthyChildren.org, [Is Your Child Ready to Read?](https://www.healthychildren.org/English/ages-stages/preschool/Pages/Is-Your-Child-Ready-to-Read.aspx), updated 5 September 2024 | Enjoy books without early-reading pressure. No diagnostic threshold or educational performance claim. |
| S9 | UNICEF, [Self-care for parents](https://www.unicef.org/parenting/mental-health/parent-self-care-tips) | Small opportunities for caregiver care and practical/professional support. No mental health diagnosis or treatment. |

## Review boundaries

- Platform statements were checked against source code and explicit product decisions. The pack does not certify a production deployment.
- Parenting passages were checked against the cited material and kept within the user's requested non-clinical scope. This is not a professional clinical review.
- Memory prompts, captions, the imaginary-pet game and family discussion examples are original editorial ideas. They are not claimed to be evidence-tested interventions.
- Emergency wording defines chat's limits and directs people to real-world help. It is not a triage protocol, verified emergency directory or service integration.
- PDF/TXT extraction and artifact integrity are validated by the build process. Live knowledge-base ingestion and agent answer tests remain to be run by the operator.

## Update triggers

Revisit 01-05 when memory timelines, health records, milestone content, personalised activities, native chat, notifications, export/deletion, data access or provider retention are released or changed. Revisit all support/contact claims when operator details are confirmed. Update the document version/date and replace old ingested copies. Retest the corresponding retrieval cases after each change.
