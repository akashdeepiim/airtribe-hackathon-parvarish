# Vercel handoff

The founder will deploy this repository. The chosen domain is **parvarish.akash-deep.com**. No deployment, account connection or DNS change has been made by this task.

## Publish a design preview

Import the repository into Vercel and select **Other** as the framework preset. Use Node 22.13 or newer (Node 22.x in project settings). The checked-in `vercel.json` sets:

| Setting          | Value               |
| ---------------- | ------------------- |
| Install command  | `npm ci`            |
| Build command    | `npm run build:web` |
| Output directory | `dist`              |
| Clean URLs       | Enabled             |
| Root directory   | Repository root     |

The public landing page, five-stage selector, three journal articles, privacy/about pages and brand assets work without Supabase credentials. Sign-in displays a disconnected state until configured. Do not copy local Supabase URLs or keys to a Vercel deployment.

Set these public environment variables for the preview:

```dotenv
EXPO_PUBLIC_SITE_URL=https://parvarish.akash-deep.com
EXPO_PUBLIC_APP_URL=https://parvarish.akash-deep.com
EXPO_PUBLIC_LAUNCH_READY=false
```

Add the custom domain in the Vercel project's Domains settings. Apply the exact DNS record Vercel supplies at the current DNS provider; an account-specific target has not been guessed. Wait for domain and TLS verification. No native app-store work is needed for this web preview.

## Connect the working app

Follow [HOSTED_SETUP.md](HOSTED_SETUP.md) to provision Supabase in Mumbai and configure email OTP delivery through Resend SMTP. Then add the hosted project's public URL and public key to Vercel:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

The Resend API key, Supabase service-role key and database credentials must stay out of Vercel's public frontend environment. Resend is configured in Supabase Auth SMTP; Edge Function secrets remain in Supabase.

Set the signed-photo function's `APP_ORIGINS` to the exact production origin, and separately list any preview origins used for testing. Configure Auth's site URL to the same origin. Invite URLs use `EXPO_PUBLIC_APP_URL`; use a stable hosted origin when testing invitations. Redeploy after changing any `EXPO_PUBLIC_*` variable because Expo embeds these at build time.

## Routes and headers

- Public pages are pre-rendered HTML, including each journal article. They have page-specific titles/descriptions, canonical URLs and Open Graph preview metadata.
- Child routes rewrite UUID-shaped paths to the exported dynamic shells. `/children/new` remains its own page. There is no blanket rewrite that converts missing public pages into HTTP 200.
- `404.html` is created from the app's not-found page. Private page HTML contains no family data and is marked `noindex,nofollow`; sensitive route responses use `Cache-Control: private, no-store`.
- Security headers include frame denial, content-type sniffing protection, no-referrer and disabled camera/microphone/location permissions. File selection remains available.
- Fonts are self-hosted. No third-party analytics, advertising pixel, public stage persistence or client-side API secret is included.

## Before opening to real families

The design preview is deployable now. Full product launch still needs the previously planned features and hardening, particularly real export/deletion, approved clinical content and hosted acceptance testing. Dependency advisories are listed in [VERIFICATION.md](VERIFICATION.md). `EXPO_PUBLIC_LAUNCH_READY` controls indexing and minimum configuration validation; it does not certify product or compliance readiness.

The founder still needs to supply `EXPO_PUBLIC_SUPPORT_EMAIL` and `EXPO_PUBLIC_OPERATOR_NAME`. These render the public contact details once valid. Complete the final privacy notice/retention details and review content before enabling search indexing. When the service is ready, set `EXPO_PUBLIC_LAUNCH_READY=true` and rebuild. This validates hosted URLs and contact settings, generates a public sitemap/robots file and allows indexing only for public pages.

Validate on the deployed preview: refresh every public article; open a child deep link; verify a nonexistent route returns 404; complete real email OTP and an invitation; confirm private photos, expiry and revocation; inspect mobile layout and motion controls. Local exports cannot verify Vercel's live routing, TLS, email delivery or DNS.

References: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Expo web publishing](https://docs.expo.dev/guides/publishing-websites/).
