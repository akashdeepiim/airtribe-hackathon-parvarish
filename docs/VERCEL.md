# Vercel deployment

The web preview is deployed at **https://parvarish.akash-deep.com**. Vercel project `parvarish` is connected to the private GitHub repository `akashdeepiim/airtribe-hackathon-parvarish`; pushes to `main` deploy to production. The default Vercel alias is `parvarish-mu.vercel.app`.

Cloudflare has one new DNS-only CNAME: `parvarish` → `7c3d8b0ff5f82e54.vercel-dns-017.com`. Vercel verified the domain. HTTPS certificate validation and 15 public/private/404 route checks passed. Existing domain records were left unchanged.

## Build settings

The project uses **Other** as the framework preset and Node 22.x. The checked-in `vercel.json` sets:

| Setting          | Value               |
| ---------------- | ------------------- |
| Install command  | `npm ci`            |
| Build command    | `npm run build:web` |
| Output directory | `dist`              |
| Clean URLs       | Enabled             |
| Root directory   | Repository root     |

The public landing page, five-stage selector, three journal articles, privacy/about pages and brand assets work without Supabase credentials. Sign-in displays a disconnected state until configured. Do not copy local Supabase URLs or keys to a Vercel deployment.

The deployment has these public environment variables:

```dotenv
EXPO_PUBLIC_SITE_URL=https://parvarish.akash-deep.com
EXPO_PUBLIC_APP_URL=https://parvarish.akash-deep.com
EXPO_PUBLIC_LAUNCH_READY=false
```

For a future domain change, use the exact target supplied in Vercel's Domains settings and verify DNS/TLS again. No native app-store work is part of this web preview.

## Connect the working app

The Mumbai Supabase project and Resend SMTP are configured as described in [HOSTED_SETUP.md](HOSTED_SETUP.md). Vercel also has these public backend settings:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://xibtcrszszpxiuqgmpbb.supabase.co
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

The design preview is live. Full product launch still needs the previously planned features and hardening, particularly real export/deletion and approved clinical content. Dependency advisories and acceptance results are listed in [VERIFICATION.md](VERIFICATION.md). `EXPO_PUBLIC_LAUNCH_READY` controls indexing and minimum configuration validation; it does not certify product or compliance readiness.

The founder still needs to supply `EXPO_PUBLIC_SUPPORT_EMAIL` and `EXPO_PUBLIC_OPERATOR_NAME`. These render the public contact details once valid. Complete the final privacy notice/retention details and review content before enabling search indexing. When the service is ready, set `EXPO_PUBLIC_LAUNCH_READY=true` and rebuild. This validates hosted URLs and contact settings, generates a public sitemap/robots file and allows indexing only for public pages.

Validate on the deployed preview: refresh every public article; open a child deep link; verify a nonexistent route returns 404; complete real email OTP and an invitation; confirm private photos, expiry and revocation; inspect mobile layout and motion controls. Local exports cannot verify Vercel's live routing, TLS, email delivery or DNS.

References: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Expo web publishing](https://docs.expo.dev/guides/publishing-websites/).
