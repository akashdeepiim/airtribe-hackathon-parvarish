# Parvarish

Private family memories → milestones → activities, for children aged 0–5. Phase 1 foundation built with Expo Router, strict TypeScript, NativeWind, Supabase, TanStack Query and Zod.

The current review focuses on the **web experience**: an original illustrated landing page, interactive public journeys from planning through age five, a three-story journal and the working private family foundation. Native design work follows founder approval of the web flow.

The web preview is live at **https://parvarish.akash-deep.com**, backed by Supabase in Mumbai. Vercel deploys `main` from the connected private GitHub repository. See [deployment details](docs/VERCEL.md). `npm run build:web` exports static pages, prepares SEO assets and verifies public metadata/private-page indexing rules. Search indexing remains disabled while the early product is reviewed.

Read [the PRD](docs/PRD.md) and [approved decisions](docs/DECISIONS.md) first. The original PRD is preserved; the founder approved email OTP, optional purpose consent, relationship-specific permissions and deferred allergy collection.

## Run locally

Use Node 22.13 or newer and a running Docker engine.

```sh
npm ci
npm run db:start
npx supabase status -o env
```

Copy `.env.example` to `.env.local`. Use only the local API URL and anon/publishable key in the Expo variables. Keep service-role, database and SMTP credentials out of all `EXPO_PUBLIC_*` variables.

```sh
mkdir -p .local
npx supabase status -o env > .local/supabase.env
```

Create `.local/functions.env`:

```dotenv
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
APP_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

In separate terminals:

```sh
npx supabase functions serve signed-photo --env-file .local/functions.env
npm run web -- --port 8081
```

Open http://localhost:8081 for the public landing page, `/stories` for the journal and `/family` for the signed-in experience. Local OTP emails are captured at http://localhost:54324; they are not sent externally. Use a synthetic address such as `parent@example.test`, request a code, and retrieve it from the local mail viewer.

For Android emulators, use `10.0.2.2` instead of `127.0.0.1` for the API and signed-photo public origin. Physical devices need an accessible development host or the connected hosted project. Keep `EXPO_PUBLIC_APP_URL` aligned with the URL invitees can actually open; localhost links are for local testing only.

## What works in Phase 1

- Email OTP, session restoration, sign-out and protected routes.
- One consent screen per purpose. Memories required at creation; the other four can be declined. Adult/guardian attestation for owners, adult attestation for invitees.
- Atomic child creation, multiple children, profile editing, optional sex/interests/city and private compressed profile photos.
- Family invites bound to verified email, single-use token, seven-day expiry, own notices, WhatsApp composer link and revocation.
- Four role presets with child-specific capability overrides. Relationship names never imply permissions.
- Consent history and withdrawal. Processing requires both the owner's current grant and the current user's grant.
- Private buckets, server-only photo signing with a fixed 15-minute expiry, RLS on every application table and audit-only health access.
- Sensitive-information callouts in profile, consent and access screens.

Feature tables for later phases are present with policies, but memory timelines, health forms, milestone catalogue, templates, activities and deletion/export jobs are not Phase 1 UI. There is no child-delete button until real storage cleanup and receipts exist. No clinical catalogue content is seeded.

## Verification

The signed-in web experience includes **Ask Parvarish**, with three conversation starters and an authenticated server connection to AgenticOrg. Run `npm run preview:web` to build and serve the website with its real chat endpoint at `http://127.0.0.1:8082`, using the server-only credentials in `.env.local`. See [chat setup and API contract](docs/CHAT.md).

```sh
npm run check
npm run test:db
npm run test:api
npm run export:web
npm run build:web
npx expo install --check
```

The API script refuses non-local URLs, creates synthetic users/data, tests actual Auth/Storage/Edge/RPC responses, and removes only its own fixtures. It requires the signed-photo function and `.local/supabase.env`. SQL test fixtures are rolled back.

See [verification notes](docs/VERIFICATION.md), [access policy](docs/ACCESS.md), [hosted setup](docs/HOSTED_SETUP.md), [web art direction](docs/design/WEB_DIRECTION.md) and [Vercel setup](docs/VERCEL.md). Editable brand marks, the social preview and three social-story graphics are in `public/brand/`.

## Review batches

1. Tooling, design tokens, source documents and environment examples.
2. Database migrations, role/consent/storage policies, operations and SQL tests.
3. Email/consent/profile/family UI, signed-photo function, integration checks and setup documentation.

The foundation and marketing site are published. GitHub CI passes, including strict TypeScript, 17 logic tests, 273 SQL assertions and 19 local API checks; the hosted API passed another 19 acceptance checks. Stop for founder review before Phase 2.
