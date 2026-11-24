/**
 * Client-side validation for FairFarm auth forms.
 * Server-side (Supabase Auth + Postgres constraints) remains authoritative.
 */

export const LIMITS = {
  email: 254,
  fullName: 80,
  businessName: 120,
  location: 120,
  passwordMin: 8,
  passwordMax: 72, // bcrypt limit used by Supabase Auth
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

/** Trim, collapse internal whitespace and strip angle brackets / control chars. */
export const sanitizeText = (value: string): string =>
  value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const normalizePhone = (value: string): string => {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
};

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Email address is required.';
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validateLoginPassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length > LIMITS.passwordMax) return 'Password is too long.';
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length < LIMITS.passwordMin) return `Use at least ${LIMITS.passwordMin} characters.`;
  if (value.length > LIMITS.passwordMax) return `Use at most ${LIMITS.passwordMax} characters.`;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Include at least one letter and one number.';
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}

export function validateFullName(value: string): string | null {
  const name = sanitizeText(value);
  if (!name) return 'Full name is required.';
  if (name.length < 2) return 'Name looks too short.';
  if (name.length > LIMITS.fullName) return `Use at most ${LIMITS.fullName} characters.`;
  if (!NAME_RE.test(name)) return 'Use letters, spaces, dots, apostrophes or hyphens only.';
  return null;
}

/** Accepts Indian 10-digit mobiles (optionally +91 / 0 prefixed) or E.164 international numbers. */
export function validatePhone(value: string): string | null {
  if (!value.trim()) return 'Phone number is required.';
  const phone = normalizePhone(value);
  const digits = phone.replace(/\D/g, '');
  if (/[^\d\s()+-]/.test(value.trim())) return 'Use digits only (spaces and + are fine).';
  const indianLocal = /^(?:0|91)?[6-9]\d{9}$/.test(digits) && !phone.startsWith('+');
  const international = phone.startsWith('+') && digits.length >= 8 && digits.length <= 15;
  if (!indianLocal && !international) return 'Enter a valid mobile number, e.g. +91 98220 12345.';
  return null;
}

export function validateOptionalText(value: string, max: number, label: string): string | null {
  const text = sanitizeText(value);
  if (text.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

export function validateOtp(value: string): string | null {
  if (!/^\d{6}$/.test(value)) return 'Enter the 6-digit code from your email.';
  return null;
}

/** 0 (empty) to 4 (strong). Purely advisory. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= LIMITS.passwordMin) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const hasErrors = <K extends string>(errors: FieldErrors<K>): boolean =>
  Object.values(errors).some(Boolean);

