# Connect Supabase and Resend

No hosted project has been connected yet. Local validation does not prove hosted email delivery or regional configuration.

1. Create or connect the Supabase project in **South Asia (Mumbai), `ap-south-1`**, using the specific region rather than the broad APAC group. Match its Postgres major version with local config before applying migrations.
2. Link the CLI to that project and review the migrations before pushing. Do not reset a hosted database.
3. Enable email authentication and confirmations. Use six-digit OTPs, a 600-second expiry and a resend interval of at least 60 seconds. Apply the supplied `supabase/templates/otp.html` template to both confirmation and magic-link emails. Phone sign-in is deferred.
4. In Supabase Auth SMTP settings, configure Resend: host `smtp.resend.com`, port `465`, username `resend`, password set to the Resend API key. Use a sender on a verified Resend domain. The key belongs in server-side SMTP configuration, never the Expo environment, source control or a chat message.
5. Set the hosted Auth site URL and allowed redirect URLs to the real app origin. The chosen OTP flow itself does not depend on an email redirect.
6. Deploy `signed-photo`. Its gateway JWT check is disabled because the function explicitly verifies the bearer token with Auth `getUser` and performs a user-scoped authorisation RPC before using the service client. Do not remove either check.
7. Set `APP_ORIGINS` to the exact allowed web origins. `PUBLIC_SUPABASE_URL` should be the project's public API URL if the internal function URL differs. Run data-handling functions in Mumbai where supported; review provider data location before using real child data.
8. Put only `EXPO_PUBLIC_SUPABASE_URL`, the public anon/publishable key in `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and the real `EXPO_PUBLIC_APP_URL` into the app environment. Restart Expo after environment changes.
9. Verify a real email OTP on web, iOS and Android, the sender identity, a family invite, revocation, health 403s, private-image expiry and purpose withdrawal against the hosted environment using disposable test data.

Hosted inputs still needed: project URL/reference, public key, verified sender address/domain and server-side configuration access. No Resend secret is needed in the client.

Official references: [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Resend SMTP with Supabase](https://resend.com/docs/send-with-supabase-smtp), [Supabase regions](https://supabase.com/docs/guides/platform/regions).

## Platform boundaries

- Web auth uses tab-scoped session storage; native auth uses Expo SecureStore. Child data is not persisted by TanStack Query.
- Local development hosts in app/invite/photo URLs must be reachable from the device. Android emulator localhost is not the host computer.
- Web push remains off per the PRD.
- Phase 2 requires browser EXIF parsing because ImagePicker's EXIF fields are native-only.
- Phase 3 needs a web sharing/download path because `expo-sharing` cannot share local file URIs on web. Confirm the renderer's web path before choosing Skia versus the native fallback.

References: [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
