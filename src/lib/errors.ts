import { ZodError } from 'zod';
// Never render raw database/auth/storage errors: they can contain submitted sensitive values.
export function friendlyError(error: unknown): string {
  if (error instanceof ZodError) return 'Please check the highlighted details and try again.';
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (['PT401', 'PGRST301', 'otp_expired'].includes(code))
      return 'Your code or session has expired. Please sign in again.';
    if (['PT403', '42501'].includes(code))
      return 'You no longer have permission for this action. Ask the profile owner to check your access.';
    if (code === 'PT409')
      return 'This action is no longer available. Refresh the page and try again.';
    if (code === 'over_email_send_rate_limit')
      return 'Please wait a minute before requesting another code.';
  }
  return 'We couldn’t complete that just now. Check your connection and try again.';
}
