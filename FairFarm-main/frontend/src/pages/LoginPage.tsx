import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types';
import { getRoleHome, resolvePostAuthPath } from '../lib/authRoles';
import { toAuthFlowError } from '../lib/authErrors';
import {
  normalizeEmail,
  validateEmail,
  validateLoginPassword,
  type FieldErrors,
} from '../lib/authValidation';
import { savePendingVerification } from '../lib/pendingVerification';
import { AuthAlert } from '../components/auth/AuthAlert';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RoleSelector } from '../components/auth/RoleSelector';
import { getRememberMe } from '../lib/supabase';

type LoginField = 'email' | 'password';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, resendVerification, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const [selectedRole, setSelectedRole] = useState<AppRole>('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRemember] = useState(() => getRememberMe());
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittingRef = useRef(false);

  const validateAll = (): boolean => {
    const next: FieldErrors<LoginField> = {
      email: validateEmail(email) ?? undefined,
      password: validateLoginPassword(password) ?? undefined,
    };
    setErrors(next);
    return !next.email && !next.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) return;
    setFormError(null);
    setUnconfirmedEmail(null);

    if (!validateAll()) return;

    const cleanEmail = normalizeEmail(email);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const profile = await login(cleanEmail, password, { remember: rememberMe });
      navigate(resolvePostAuthPath(profile.role, requestedPath), { replace: true });
    } catch (err) {
      const mapped = toAuthFlowError(err);
      setFormError(mapped.message);
      if (mapped.code === 'email_not_confirmed') {
        setUnconfirmedEmail(cleanEmail);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleVerifyNow = async () => {
    if (!unconfirmedEmail) return;
    try {
      await resendVerification(unconfirmedEmail);
    } catch {
      /* proceed to verification screen even if rate-limited so user can enter existing code */
    }
    savePendingVerification({
      email: unconfirmedEmail,
      purpose: 'signup',
      sentAt: Date.now(),
      resendCount: 0,
    });
    navigate('/verify-email');
  };

  const handleDemoAccess = () => {
    quickLogin(selectedRole);
    navigate(getRoleHome(selectedRole), { replace: true });
  };

  return (
    <AuthLayout selectedRole={selectedRole}>
      <div className="space-y-5">
        <AuthHeader
          eyebrow="Welcome back"
          title="Sign in to FairFarm"
          subtitle="Access your direct marketplace, fair-price analytics, and verified trade network."
        />

        <RoleSelector
          value={selectedRole}
          onChange={setSelectedRole}
          label="Select your role"
          disabled={isSubmitting}
        />

        {isDemoMode && (
          <div className="rounded-2xl border border-ff-leaf/30 bg-[#f2f6eb] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ff-forest">
                  <Sparkles className="h-3.5 w-3.5 text-ff-leaf" aria-hidden="true" />
                  <span>Preview Mode Active</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-ff-forest/70">
                  Supabase keys are not set. Explore the selected role with a sample profile.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDemoAccess}
                className="shrink-0 rounded-xl bg-ff-forest px-3.5 py-2 text-[12px] font-semibold text-ff-cream shadow-xs transition hover:bg-ff-deep active:scale-95"
              >
                Explore
              </button>
            </div>
          </div>
        )}

        <AuthAlert
          tone="error"
          show={Boolean(formError)}
          action={
            unconfirmedEmail ? (
              <button
                type="button"
                onClick={() => void handleVerifyNow()}
                className="inline-flex items-center rounded-lg bg-rose-700 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-rose-800"
              >
                Verify email with OTP
              </button>
            ) : undefined
          }
        >
          {formError}
        </AuthAlert>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            label="Email address"
            type="email"
            autoComplete="email"
            icon={Mail}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              if (formError) setFormError(null);
            }}
            placeholder="you@example.com"
            error={errors.email}
            disabled={isSubmitting}
          />

          <AuthInput
            label="Password"
            passwordToggle
            autoComplete="current-password"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (formError) setFormError(null);
            }}
            placeholder="Enter your password"
            error={errors.password}
            disabled={isSubmitting}
            trailing={
              <Link
                to="/forgot-password"
                className="text-[12px] font-medium text-ff-leaf transition hover:text-ff-forest hover:underline"
              >
                Forgot password?
              </Link>
            }
          />

          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-ff-sand text-ff-forest focus:ring-ff-leaf"
            />
            <span className="text-[12.5px] text-ff-forest/75">Keep me signed in on this device</span>
          </label>

          <AuthButton
            type="submit"
            loading={isSubmitting}
            loadingText="Signing in…"
            showArrow
          >
            Sign in
          </AuthButton>
        </form>

        <p className="border-t border-ff-sand pt-4 text-center text-[13px] text-ff-forest/75">
          New to FairFarm?{' '}
          <Link
            to="/register"
            state={{ role: selectedRole }}
            className="font-semibold text-ff-forest underline-offset-4 transition hover:text-ff-leaf hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
