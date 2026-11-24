import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toAuthFlowError } from '../lib/authErrors';
import { normalizeEmail, validateEmail } from '../lib/authValidation';
import { clearPendingVerification, savePendingVerification } from '../lib/pendingVerification';
import { AuthAlert } from '../components/auth/AuthAlert';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthLayout } from '../components/auth/AuthLayout';
import { EmailOtpVerification } from '../components/auth/EmailOtpVerification';

type Step = { kind: 'request' } | { kind: 'otp'; email: string; sentAt: number };

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset, verifyRecoveryOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>({ kind: 'request' });
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    const clean = normalizeEmail(email);
    setIsSending(true);
    try {
      await requestPasswordReset(clean);
      const now = Date.now();
      savePendingVerification({
        email: clean,
        purpose: 'recovery',
        sentAt: now,
        resendCount: 0,
      });
      setStep({ kind: 'otp', email: clean, sentAt: now });
    } catch (reqErr) {
      setFormError(toAuthFlowError(reqErr).message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step.kind === 'request' ? (
          <motion.div
            key="forgot-request"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <AuthHeader
              icon={
                <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ff-forest text-ff-lime shadow-sm">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </div>
              }
              eyebrow="Password recovery"
              title="Reset your password"
              subtitle="Enter your registered email address and we will send you a 6-digit recovery code."
            />

            <AuthAlert tone="error" show={Boolean(formError)}>
              {formError}
            </AuthAlert>

            <form onSubmit={handleRequest} className="space-y-4" noValidate>
              <AuthInput
                label="Email address"
                type="email"
                autoComplete="email"
                icon={Mail}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  if (formError) setFormError(null);
                }}
                placeholder="you@example.com"
                error={emailError}
                disabled={isSending}
              />

              <AuthButton type="submit" loading={isSending} loadingText="Sending recovery code…" showArrow>
                Send recovery code
              </AuthButton>
            </form>

            <p className="border-t border-ff-sand pt-4 text-center text-[13px] text-ff-forest/75">
              Remembered your password?{' '}
              <Link to="/login" className="font-semibold text-ff-forest hover:underline">
                Back to sign in
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="forgot-otp"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
          >
            <EmailOtpVerification
              email={step.email}
              purpose="recovery"
              sentAt={step.sentAt}
              onVerify={async (code) => {
                await verifyRecoveryOtp(step.email, code);
                navigate('/reset-password', { replace: true });
              }}
              onResend={() => requestPasswordReset(step.email)}
              onChangeEmail={() => {
                clearPendingVerification();
                setStep({ kind: 'request' });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

