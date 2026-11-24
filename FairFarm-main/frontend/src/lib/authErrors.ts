/**
 * Maps Supabase Auth (GoTrue) errors to stable, user-friendly codes and
 * messages without leaking provider internals.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'otp_invalid'
  | 'otp_expired'
  | 'rate_limited'
  | 'weak_password'
  | 'same_password'
  | 'invalid_email'
  | 'signup_disabled'
  | 'session_missing'
  | 'network'
  | 'not_configured'
  | 'profile_missing'
  | 'profile_unavailable'
  | 'unknown';

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Incorrect email or password. Please try again.',
  email_not_confirmed: 'Please verify your email address before signing in.',
  user_already_exists: 'An account with this email already exists. Sign in or reset your password.',
  otp_invalid: "That code doesn't match. Check the latest email and try again.",
  otp_expired: 'This code has expired. Request a new one to continue.',
  rate_limited: 'Too many attempts. Please wait a minute before trying again.',
  weak_password: 'This password is too weak. Use at least 8 characters with letters and numbers.',
  same_password: 'Your new password must be different from your current password.',
  invalid_email: 'Enter a valid email address.',
  signup_disabled: 'New registrations are temporarily disabled.',
  session_missing: 'Your secure session has ended. Please start again.',
  network: 'We could not reach FairFarm. Check your connection and try again.',
  not_configured:
    'Live authentication is not configured for this environment. Add your Supabase keys (see README) or explore with a demo profile.',
  profile_missing: 'We could not find your FairFarm profile. Please contact support.',
  profile_unavailable: 'We could not load your profile right now. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

export class AuthFlowError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? AUTH_ERROR_MESSAGES[code]);
    this.name = 'AuthFlowError';
    this.code = code;
  }
}

const readString = (obj: unknown, key: string): string | undefined => {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const v = (obj as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
};

const readNumber = (obj: unknown, key: string): number | undefined => {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const v = (obj as Record<string, unknown>)[key];
    return typeof v === 'number' ? v : undefined;
  }
  return undefined;
};

export function toAuthFlowError(err: unknown): AuthFlowError {
  if (err instanceof AuthFlowError) return err;

  const code = readString(err, 'code');
  const name = readString(err, 'name') ?? '';
  const status = readNumber(err, 'status');
  const message = (readString(err, 'message') ?? '').toLowerCase();

  switch (code) {
    case 'invalid_credentials':
      return new AuthFlowError('invalid_credentials');
    case 'email_not_confirmed':
      return new AuthFlowError('email_not_confirmed');
    case 'user_already_exists':
    case 'email_exists':
    case 'identity_already_exists':
      return new AuthFlowError('user_already_exists');
    case 'otp_expired':
      return new AuthFlowError('otp_expired');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return new AuthFlowError('rate_limited');
    case 'weak_password':
      return new AuthFlowError('weak_password');
    case 'same_password':
      return new AuthFlowError('same_password');
    case 'email_address_invalid':
    case 'email_address_not_authorized':
      return new AuthFlowError('invalid_email');
    case 'signup_disabled':
    case 'email_provider_disabled':
      return new AuthFlowError('signup_disabled');
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found':
      return new AuthFlowError('session_missing');
    default:
      break;
  }

  if (name === 'AuthRetryableFetchError' || status === 0 || message.includes('failed to fetch') || message.includes('network')) {
    return new AuthFlowError('network');
  }
  if (status === 429 || message.includes('rate limit') || message.includes('security purposes')) {
    return new AuthFlowError('rate_limited');
  }
  if (message.includes('invalid login credentials')) return new AuthFlowError('invalid_credentials');
  if (message.includes('email not confirmed')) return new AuthFlowError('email_not_confirmed');
  if (message.includes('already registered') || message.includes('already exists')) {
    return new AuthFlowError('user_already_exists');
  }
  if (message.includes('expired') || message.includes('invalid') && message.includes('token')) {
    return new AuthFlowError('otp_expired');
  }
  if (message.includes('auth session missing')) return new AuthFlowError('session_missing');
  if (message.includes('database error saving new user')) {
    if (import.meta.env.DEV) {
      console.warn(
        '[FairFarm] Supabase could not create the profile row. Ensure supabase/migrations/004_warehouse_role_and_auth_hardening.sql has been applied.',
      );
    }
    return new AuthFlowError('unknown', 'We could not create your account right now. Please try again shortly.');
  }
  return new AuthFlowError('unknown');
}

/**
 * GoTrue answers both "wrong code" and "expired code" with `otp_expired`.
 * We disambiguate using when the code was sent versus the configured expiry.
 */
export function classifyOtpError(err: unknown, sentAt: number | null, expirySeconds: number): AuthFlowError {
  const mapped = toAuthFlowError(err);
  if (mapped.code !== 'otp_expired' && mapped.code !== 'otp_invalid') return mapped;
  const elapsed = sentAt ? (Date.now() - sentAt) / 1000 : 0;
  return new AuthFlowError(sentAt && elapsed >= expirySeconds ? 'otp_expired' : 'otp_invalid');
}

