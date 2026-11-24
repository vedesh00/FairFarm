import type { AppRole } from '../types';
import { isAppRole } from './authRoles';

/**
 * Tracks an in-progress email verification / password recovery so the flow
 * survives refreshes, tab closes and interruptions. The OTP itself is NEVER
 * stored — only the email address, purpose and resend bookkeeping.
 */
export type VerificationPurpose = 'signup' | 'recovery';

export interface PendingVerification {
  email: string;
  purpose: VerificationPurpose;
  role?: AppRole;
  sentAt: number;
  resendCount: number;
}

const KEY = 'fairfarm_pending_verification';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const envNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Should match Supabase Auth > Rate Limits / Email OTP settings. */
export const RESEND_COOLDOWN_SECONDS = envNumber(import.meta.env.VITE_OTP_RESEND_COOLDOWN_SECONDS, 60);
/** Should match Supabase Auth > Email > "Email OTP Expiration". */
export const OTP_EXPIRY_SECONDS = envNumber(import.meta.env.VITE_OTP_EXPIRY_SECONDS, 3600);
export const MAX_RESENDS = 5;

export function loadPendingVerification(purpose?: VerificationPurpose): PendingVerification | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    if (typeof p.email !== 'string' || (p.purpose !== 'signup' && p.purpose !== 'recovery')) return null;
    if (typeof p.sentAt !== 'number' || Date.now() - p.sentAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    if (purpose && p.purpose !== purpose) return null;
    return {
      email: p.email,
      purpose: p.purpose,
      role: isAppRole(p.role) ? p.role : undefined,
      sentAt: p.sentAt,
      resendCount: typeof p.resendCount === 'number' ? p.resendCount : 0,
    };
  } catch {
    return null;
  }
}

export function savePendingVerification(pending: PendingVerification): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* storage unavailable — flow still works within this page */
  }
}

export function clearPendingVerification(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

