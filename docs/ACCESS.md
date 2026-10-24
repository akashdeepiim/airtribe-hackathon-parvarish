# Access model

Every application table has RLS. Child access is resolved from active `child_members`, child status, role presets and owner-authored capability overrides. The client reads effective permissions for presentation; the database independently checks each request. Neither relationship labels nor user-editable JWT metadata grant access.

| Default access                             | Owner      | Co-parent  | Contributor | Viewer | Non-member |
| ------------------------------------------ | ---------- | ---------- | ----------- | ------ | ---------- |
| View profile/memories                      | Yes        | Yes        | Yes         | Yes    | No         |
| Edit profile                               | Yes        | Yes        | No          | No     | No         |
| Add memories                               | Yes        | Yes        | Yes         | No     | No         |
| Edit own memories                          | Yes        | Yes        | Yes         | No     | No         |
| Edit another uploader's memories           | Yes        | Yes        | No          | No     | No         |
| Milestones and activities                  | Yes        | Yes        | No          | No     | No         |
| Health through audited operations          | Read/write | Read/write | No          | No     | No         |
| Invite/remove family                       | Yes        | Yes        | No          | No     | No         |
| Invite/remove co-parent                    | Yes        | No         | No          | No     | No         |
| Change capability overrides / grant health | Yes        | No         | No          | No     | No         |
| Remove the owner                           | No         | No         | No          | No     | No         |

Permissions describe eligibility; the relevant purpose must also be enabled by both owner and acting member. The owner can explicitly grant family health **read** access. Health writes, family administration and deleting other people's memories cannot be granted to non-parent roles. The owner cannot be changed through the member editor.

## Mutation boundaries

- Users may update only their own display name/city. Auth owns verified email/phone.
- Profile creation, consent changes, invites, membership changes and access grants use validated database operations. Direct table mutations have no permissive policy.
- Membership revocation blocks new reads/writes and new signed URLs immediately. Already issued URLs expire in 15 minutes; downloaded copies cannot be recalled.
- Invite tokens are random, stored only as hashes and sent in URL fragments. Their recipient must authenticate with the bound verified email. Tokens cannot be retrieved through table SELECT.
- Memory metadata writes protect child/uploader identity. Tagging and deletion remain closed until Phase 2 supplies atomic milestone updates and storage-aware deletion.
- Catalogue reads expose approved rows only. Clinical copy is additionally checked by CI and a database constraint before approval.
- Activity batches, notifications and directory publication are server-only writes. Feedback and suggestions retain their authenticated actor; suggestions enter only the pending queue.
- Child-scoped foreign keys prevent connecting another child's memory to a milestone or activity feedback.

## Health and photo access

Direct `allergies` and `vaccination_logs` reads return no rows under client roles, including parents. `read_health` and `write_health` enforce capability plus consent, write `audit_log` and return within a single transaction. Denied health operations use HTTP 403 through PostgREST. Audit records contain actor/child/entity IDs and actions, never health payloads. No client may insert, edit or delete audit events.

`child-photos` and `health-photos` are private. Clients have no Storage SELECT policy, which also prevents bypassing the signed-photo endpoint to request longer-lived URLs. The signed-photo Edge Function verifies the Supabase user, checks live membership/purpose/photo association, and signs for exactly 900 seconds. Its service key stays server-side. Requests and signed URLs are never explicitly logged.

Health photo access is closed in Phase 1. Phase 4 must provide an audited byte-serving endpoint and storage-aware card deletion, rather than reuse ordinary signed-photo access. Future service-role jobs must use audited health operations too; service-role credentials are administrative and bypass RLS by design.

## Consent

Each choice is an append-only event, including decline and withdrawal, with notice version and verification method. The latest choice controls access. Self-declaration is used under the founder's current instruction. The enum already contains `self_declaration`, `digilocker`, and `token` so enabling another listed method does not require a migration.

Withdrawing memories stops photo/memory access, but keeps administrative profile/family/privacy controls available. Withdrawal does not silently delete data. Actual export/deletion and receipts are Phase 6.
