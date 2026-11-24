import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Lock, Mail, MapPin, Phone, User, Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types';
import { getRoleHome, isAppRole } from '../lib/authRoles';
import { toAuthFlowError } from '../lib/authErrors';
import {
  LIMITS,
  normalizeEmail,
  normalizePhone,
  passwordStrength,
  sanitizeText,
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateOptionalText,
  validatePasswordConfirmation,
  validatePhone,
  type FieldErrors,
} from '../lib/authValidation';
import { clearPendingVerification, savePendingVerification } from '../lib/pendingVerification';
import { AuthAlert } from '../components/auth/AuthAlert';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthSuccess } from '../components/auth/AuthSuccess';
import { EmailOtpVerification } from '../components/auth/EmailOtpVerification';
import { RoleSelector } from '../components/auth/RoleSelector';

type RegisterField =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'password'
  | 'confirmPassword'
  | 'businessName'
  | 'location'
  | 'terms';

type RegisterStep =
  | { kind: 'form' }
  | { kind: 'otp'; email: string; sentAt: number }
  | { kind: 'success'; role: AppRole; fullName: string };

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;
const STRENGTH_COLORS = ['', 'bg-rose-400', 'bg-amber-400', 'bg-ff-leaf', 'bg-ff-forest'] as const;

export const RegisterPage: React.FC = () => {
  const { register, verifyEmailOtp, resendVerification } = useAuth();
  const navigate = useNavigate();
  const locationState = useLocation().state as { role?: unknown } | null;

  const [role, setRole] = useState<AppRole>(() =>
    isAppRole(locationState?.role) ? locationState.role : 'farmer',
  );
  const [step, setStep] = useState<RegisterStep>({ kind: 'form' });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [locationText, setLocationText] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const strength = passwordStrength(password);

  const clearFieldError = (field: RegisterField) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError(null);
  };

  const validateAll = (): boolean => {
    const next: FieldErrors<RegisterField> = {
      fullName: validateFullName(fullName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      phone: validatePhone(phone) ?? undefined,
      businessName: validateOptionalText(businessName, LIMITS.businessName, 'Organization name') ?? undefined,
      location: validateOptionalText(locationText, LIMITS.location, 'Location') ?? undefined,
      password: validateNewPassword(password) ?? undefined,
      confirmPassword: validatePasswordConfirmation(password, confirmPassword) ?? undefined,
      terms: acceptedTerms ? undefined : 'Please accept the terms to create an account.',
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) return;
    setFormError(null);

    if (!validateAll()) return;

    const cleanEmail = normalizeEmail(email);
    const cleanName = sanitizeText(fullName);
    const cleanPhone = normalizePhone(phone);
    const cleanBusiness = sanitizeText(businessName) || undefined;
    const cleanLocation = sanitizeText(locationText) || undefined;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await register({
        email: cleanEmail,
        password,
        role,
        fullName: cleanName,
        phone: cleanPhone,
        businessName: cleanBusiness,
        location: cleanLocation,
      });

      if (result.status === 'verification_required') {
        const now = Date.now();
        savePendingVerification({
          email: cleanEmail,
          purpose: 'signup',
          role,
          sentAt: now,
          resendCount: 0,
        });
        setStep({ kind: 'otp', email: cleanEmail, sentAt: now });
      } else {
        clearPendingVerification();
        const verifiedRole = isAppRole(result.profile.role) ? result.profile.role : role;
        setStep({ kind: 'success', role: verifiedRole, fullName: result.profile.full_name });
      }
    } catch (err) {
      setFormError(toAuthFlowError(err).message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const roleSpecificMeta = {
    farmer: {
      orgLabel: 'Farm / Village Name',
      orgPlaceholder: 'e.g. Patil Organic Farms',
      orgIcon: Building2,
      locLabel: 'District / Village',
      locPlaceholder: 'e.g. Narayangaon, Pune',
    },
    buyer: {
      orgLabel: 'Business / Store Name',
      orgPlaceholder: 'e.g. FreshBite Retailers',
      orgIcon: Building2,
      locLabel: 'City / Market Area',
      locPlaceholder: 'e.g. Shivajinagar, Pune',
    },
    warehouse: {
      orgLabel: 'Warehouse / Storage Name',
      orgPlaceholder: 'e.g. Sahyadri Cold Storage',
      orgIcon: Warehouse,
      locLabel: 'Warehouse Location',
      locPlaceholder: 'e.g. Chakan MIDC, Pune',
    },
  }[role];

  return (
    <AuthLayout selectedRole={role}>
      <AnimatePresence mode="wait">
        {step.kind === 'form' && (
          <motion.div
            key="register-form"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <AuthHeader
              eyebrow="Join FairFarm"
              title="Create your account"
              subtitle="Choose your role and verify your email to start trading directly."
            />

            <RoleSelector
              value={role}
              onChange={(nextRole) => {
                setRole(nextRole);
                setFormError(null);
              }}
              label="I am registering as"
              disabled={isSubmitting}
            />

            <AuthAlert tone="error" show={Boolean(formError)}>
              {formError}
            </AuthAlert>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <AuthInput
                label="Full name"
                type="text"
                autoComplete="name"
                icon={User}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError('fullName');
                }}
                placeholder="e.g. Rameshwar Patil"
                error={errors.fullName}
                disabled={isSubmitting}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AuthInput
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  icon={Mail}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  placeholder="you@example.com"
                  error={errors.email}
                  disabled={isSubmitting}
                />

                <AuthInput
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  icon={Phone}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError('phone');
                  }}
                  placeholder="+91 98220 12345"
                  error={errors.phone}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AuthInput
                  label={roleSpecificMeta.orgLabel}
                  optional
                  type="text"
                  icon={roleSpecificMeta.orgIcon}
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    clearFieldError('businessName');
                  }}
                  placeholder={roleSpecificMeta.orgPlaceholder}
                  error={errors.businessName}
                  disabled={isSubmitting}
                />

                <AuthInput
                  label={roleSpecificMeta.locLabel}
                  optional
                  type="text"
                  icon={MapPin}
                  value={locationText}
                  onChange={(e) => {
                    setLocationText(e.target.value);
                    clearFieldError('location');
                  }}
                  placeholder={roleSpecificMeta.locPlaceholder}
                  error={errors.location}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AuthInput
                  label="Password"
                  passwordToggle
                  autoComplete="new-password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  placeholder="8+ chars, letters & numbers"
                  error={errors.password}
                  disabled={isSubmitting}
                />

                <AuthInput
                  label="Confirm password"
                  passwordToggle
                  autoComplete="new-password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirmPassword');
                  }}
                  placeholder="Re-enter password"
                  error={errors.confirmPassword}
                  disabled={isSubmitting}
                />
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className={`h-1 rounded-full transition-colors duration-300 ${
                          strength >= bar ? STRENGTH_COLORS[strength] : 'bg-ff-sand'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-ff-forest/65">
                    Strength: <span className="font-semibold text-ff-deep">{STRENGTH_LABELS[strength]}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="flex cursor-pointer items-start gap-2.5 select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      clearFieldError('terms');
                    }}
                    disabled={isSubmitting}
                    className="mt-0.5 h-4 w-4 rounded border-ff-sand text-ff-forest focus:ring-ff-leaf"
                  />
                  <span className="text-[12px] leading-snug text-ff-forest/75">
                    I agree to FairFarm&apos;s transparent trade guidelines and{' '}
                    <span className="font-medium text-ff-forest">terms of service</span>.
                  </span>
                </label>
                {errors.terms && (
                  <p role="alert" className="mt-1 text-[11.5px] font-medium text-rose-600">
                    {errors.terms}
                  </p>
                )}
              </div>

              <AuthButton
                type="submit"
                loading={isSubmitting}
                loadingText="Creating account…"
                showArrow
              >
                Create account &amp; verify email
              </AuthButton>
            </form>

            <p className="border-t border-ff-sand pt-3.5 text-center text-[13px] text-ff-forest/75">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-ff-forest underline-offset-4 transition hover:text-ff-leaf hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        )}

        {step.kind === 'otp' && (
          <motion.div
            key="register-otp"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <EmailOtpVerification
              email={step.email}
              purpose="signup"
              sentAt={step.sentAt}
              onVerify={async (code) => {
                const profile = await verifyEmailOtp(step.email, code);
                const verifiedRole = isAppRole(profile.role) ? profile.role : role;
                setStep({ kind: 'success', role: verifiedRole, fullName: profile.full_name });
              }}
              onResend={() => resendVerification(step.email)}
              onChangeEmail={() => {
                clearPendingVerification();
                setStep({ kind: 'form' });
              }}
              changeEmailLabel="Edit registration details"
            />
          </motion.div>
        )}

        {step.kind === 'success' && (
          <motion.div
            key="register-success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <AuthSuccess
              title="Email verified!"
              description={`Welcome to FairFarm, ${step.fullName}. Your account is ready.`}
              actionLabel="Go to your dashboard"
              onAction={() => navigate(getRoleHome(step.role), { replace: true })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};
