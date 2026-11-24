import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleHome } from '../lib/authRoles';
import { toAuthFlowError } from '../lib/authErrors';
import {
  passwordStrength,
  validateNewPassword,
  validatePasswordConfirmation,
  type FieldErrors,
} from '../lib/authValidation';
import { AuthAlert } from '../components/auth/AuthAlert';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthSuccess } from '../components/auth/AuthSuccess';

type ResetField = 'password' | 'confirmPassword';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, passwordRecoveryActive, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<ResetField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneRoute, setDoneRoute] = useState<string | null>(null);

  const canReset = passwordRecoveryActive || isAuthenticated;
  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: FieldErrors<ResetField> = {
      password: validateNewPassword(password) ?? undefined,
      confirmPassword: validatePasswordConfirmation(password, confirmPassword) ?? undefined,
    };
    setErrors(next);
    if (next.password || next.confirmPassword) return;

    setIsSubmitting(true);
    try {
      const profile = await updatePassword(password);
      const target = profile ? getRoleHome(profile.role) : user ? getRoleHome(user.role) : '/login';
      setDoneRoute(target);
    } catch (err) {
      setFormError(toAuthFlowError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (doneRoute) {
    return (
      <AuthLayout>
        <AuthSuccess
          title="Password updated"
          description="Your new password is active. You can continue directly to your FairFarm workspace."
          actionLabel={doneRoute === '/login' ? 'Sign in now' : 'Open dashboard'}
          onAction={() => navigate(doneRoute, { replace: true })}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-5">
        <AuthHeader
          icon={
            <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ff-forest text-ff-lime shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
          }
          eyebrow="Secure update"
          title="Choose a new password"
          subtitle="Use at least 8 characters with a mix of letters and numbers."
        />

        {!canReset && (
          <AuthAlert
            tone="info"
            title="Recovery session required"
            action={
              <Link
                to="/forgot-password"
                className="inline-flex rounded-lg bg-ff-forest px-3 py-1.5 text-[12px] font-semibold text-ff-cream hover:bg-ff-deep"
              >
                Request recovery code
              </Link>
            }
          >
            Open the password reset link from your email or request a 6-digit recovery code first.
          </AuthAlert>
        )}

        <AuthAlert tone="error" show={Boolean(formError)}>
          {formError}
        </AuthAlert>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            label="New password"
            passwordToggle
            autoComplete="new-password"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              if (formError) setFormError(null);
            }}
            placeholder="8+ characters with letters & numbers"
            error={errors.password}
            disabled={isSubmitting || !canReset}
          />

          {password.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className={`h-1 rounded-full transition-colors ${
                    strength >= bar ? 'bg-ff-leaf' : 'bg-ff-sand'
                  }`}
                />
              ))}
            </div>
          )}

          <AuthInput
            label="Confirm new password"
            passwordToggle
            autoComplete="new-password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
              if (formError) setFormError(null);
            }}
            placeholder="Re-enter your new password"
            error={errors.confirmPassword}
            disabled={isSubmitting || !canReset}
          />

          <AuthButton
            type="submit"
            loading={isSubmitting}
            loadingText="Updating password…"
            disabled={!canReset}
            showArrow
          >
            Update password
          </AuthButton>
        </form>
      </div>
    </AuthLayout>
  );
};

