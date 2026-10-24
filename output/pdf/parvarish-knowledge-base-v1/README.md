# Parvarish chatbot knowledge base

Version 1.0 | Prepared 24 October 2026 | English

Eight documents covering platform help and gentle, non-clinical parenting guidance. The platform content reflects the reviewed local web implementation, including the signed-in chatbot. It does not certify the deployed release. Parenting content is source-informed editorial guidance, not a clinically approved milestone catalogue.

## What to upload

Unzip the bundle first. Upload the eight files from **one** of these folders, according to the formats your knowledge-base service accepts:

- `upload/txt/`: UTF-8 plain text, with question headings and complete source URLs.
- `upload/pdf/`: searchable, single-column PDFs containing the same text.

Do not upload both formats or the editable Markdown copies: they duplicate the same knowledge. The service's accepted formats, file limits and ingestion controls have not been supplied, so this pack does not claim provider-specific compatibility. Prefer the text version if PDF extraction loses headings or source URLs.

## Document map

| ID | Document | Main questions |
| --- | --- | --- |
| PAR-KB-01 | Parvarish overview | What is available? What is still planned? |
| PAR-KB-02 | Sign-in and child profiles | Email codes, profile creation, editing and photographs |
| PAR-KB-03 | Family invitations and access | Inviting, joining, roles, permissions and removal |
| PAR-KB-04 | Privacy and data choices | Consent, photos, withdrawal, deletion and chat data |
| PAR-KB-05 | Ask Parvarish and troubleshooting | First prompts, controls, errors, history and limits |
| PAR-KB-06 | Connection, routines and feelings | Everyday listening, transitions and calm limits |
| PAR-KB-07 | Simple play ideas | Child-led, low-equipment play through age five |
| PAR-KB-08 | Memory prompts and caregiver support | Caption ideas, family stories and asking for help |

## Upload and check

1. Compare PAR-KB-01 with the release your users will see. The current source still marks memory timelines, milestone tracking, health forms and the personalised activity feed as unfinished. If a newer release differs, update these documents before ingestion.
2. Review the editable `.md` files if you want to change voice or content. Keep feature limitations alongside instructions. Rebuild exports after edits.
3. Replace earlier versions of these document IDs instead of accumulating contradictory copies. Upload one format only. Add document ID, version, review date, topic and language as metadata if the service supports it.
4. Check the extracted text for at least one platform document and one parenting document. Keep each question heading with its answer. Preserve nearby caveats and source references when configuring splitting.
5. Ingest/index the documents, then run `admin/RETRIEVAL_CHECKS.md` against the connected agent. Record answers and retrieved sources. Ingestion and live retrieval testing have not been performed by creating this pack.
6. Review results before relying on the chatbot's answers. Fix conflicting or missing content and rerun the affected questions after updates.

The three opening chat suggestions are covered by PAR-KB-06, PAR-KB-07 and PAR-KB-08. A useful answer can start with one idea and ask a brief optional follow-up; it need not demand a child's identity.

## Keep these files out of the knowledge corpus

- `admin/AGENT_INSTRUCTIONS.md`: proposed behaviour settings for the agent's instruction field, not a document to retrieve as factual knowledge. They have not been applied to the live agent.
- `admin/RETRIEVAL_CHECKS.md`: evaluation prompts and expected answers. Uploading them would contaminate the evaluation.
- `admin/SOURCES_AND_REVIEW.md` and `admin/source-snapshot.json`: maintainer provenance and open decisions.
- `admin/manifest.json`: artifact checksums and counts.
- `editable/`: Markdown source copies for maintenance.
- `maintainer/`: local build and validation tools.

This pack contains no credentials, environment-file contents or real family records. Examples are invented and labelled where appropriate. No source organisation endorses Parvarish or has clinically approved these documents.

## Maintenance

Recheck platform documents whenever a feature, permission, consent flow or chat data flow changes. Recheck external guidance when revising parenting content, and keep its source URLs. Change the version and review date when content changes. Remove superseded documents from the knowledge base.

The editable Markdown is the source of truth for these exports. `maintainer/build.py` regenerates PDF and TXT copies, snapshots referenced source-file hashes and writes a manifest. It needs Python with reportlab and pypdf. Read the script before running it in another environment; no external calls or credentials are required.

## Not yet confirmed

Leave these values blank until the operator supplies them. The chatbot should explain that a value is unconfirmed rather than fill it in.

| Item | Confirmed value |
| --- | --- |
| Final operator name | |
| Support and privacy email | |
| Service support hours or response time | |
| Provider chat retention, training use and storage location | |
| Service-side chat deletion process | |
| Final account-data retention schedule | |
| Pricing | |
| Future feature release dates | |
| Knowledge-base service format and ingestion limits | |
| Human review or clinician handoff workflow | |
