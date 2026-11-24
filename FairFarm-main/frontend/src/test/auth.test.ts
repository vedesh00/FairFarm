import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateOtp,
  validatePasswordConfirmation,
  validatePhone,
  passwordStrength,
} from '../lib/authValidation';
import { classifyOtpError, toAuthFlowError } from '../lib/authErrors';
import { getRoleHome, isAppRole, resolvePostAuthPath } from '../lib/authRoles';
import {
  clearPendingVerification,
  loadPendingVerification,
  savePendingVerification,
} from '../lib/pendingVerification';

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };
};

describe('FairFarm Auth Validation & Role Security', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('validates emails, names, Indian/E.164 phones, passwords and 6-digit OTPs', () => {
    expect(validateEmail('farmer@fairfarm.in')).toBeNull();
    expect(validateEmail('bad-email')).toBeTruthy();

    expect(validateFullName('Rameshwar Patil')).toBeNull();
    expect(validateFullName('A')).toBeTruthy();

    expect(validatePhone('+91 98220 12345')).toBeNull();
    expect(validatePhone('9822012345')).toBeNull();
    expect(validatePhone('123')).toBeTruthy();

    expect(validateNewPassword('Harvest2026')).toBeNull();
    expect(validateNewPassword('short')).toBeTruthy();
    expect(validateNewPassword('onlyletters')).toBeTruthy();
    expect(validatePasswordConfirmation('Harvest2026', 'Harvest2026')).toBeNull();
    expect(validatePasswordConfirmation('Harvest2026', 'Mismatch1')).toBeTruthy();

    expect(passwordStrength('Harvest2026!')).toBe(4);
    expect(validateOtp('482910')).toBeNull();
    expect(validateOtp('12ab56')).toBeTruthy();
  });

  it('maps three public roles and prevents cross-role redirect leaks', () => {
    expect(isAppRole('farmer')).toBe(true);
    expect(isAppRole('buyer')).toBe(true);
    expect(isAppRole('warehouse')).toBe(true);
    expect(isAppRole('admin')).toBe(false);

    expect(getRoleHome('farmer')).toBe('/farmer/dashboard');
    expect(getRoleHome('buyer')).toBe('/buyer/dashboard');
    expect(getRoleHome('warehouse')).toBe('/warehouse/dashboard');

    expect(resolvePostAuthPath('warehouse', '/farmer/listings')).toBe('/warehouse/dashboard');
    expect(resolvePostAuthPath('farmer', '/farmer/listings')).toBe('/farmer/listings');
    expect(resolvePostAuthPath('buyer', '//evil.com')).toBe('/buyer/dashboard');
  });

  it('classifies GoTrue OTP errors into invalid vs expired without leaking internals', () => {
    const recentSentAt = Date.now() - 15_000;
    const oldSentAt = Date.now() - 4000_000;

    expect(classifyOtpError({ code: 'otp_expired' }, recentSentAt, 3600).code).toBe('otp_invalid');
    expect(classifyOtpError({ code: 'otp_expired' }, oldSentAt, 3600).code).toBe('otp_expired');
    expect(toAuthFlowError({ code: 'email_not_confirmed' }).code).toBe('email_not_confirmed');
    expect(toAuthFlowError({ code: 'over_email_send_rate_limit' }).code).toBe('rate_limited');
  });

  it('persists and clears pending verification state without storing any OTP', () => {
    savePendingVerification({
      email: 'meera@sahyadri.in',
      purpose: 'signup',
      role: 'warehouse',
      sentAt: Date.now(),
      resendCount: 1,
    });

    const loaded = loadPendingVerification('signup');
    expect(loaded?.email).toBe('meera@sahyadri.in');
    expect(loaded?.role).toBe('warehouse');
    expect(loaded?.resendCount).toBe(1);

    clearPendingVerification();
    expect(loadPendingVerification('signup')).toBeNull();
  });
});

