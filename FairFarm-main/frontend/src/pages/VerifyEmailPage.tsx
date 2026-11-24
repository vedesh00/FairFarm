import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getRoleHome, isAppRole } from '../lib/authRoles';
import { toAuthFlowError } from '../lib/authErrors';
import { normalizeEmail, validateEmail } from '../lib/authValidation';
import {
  clearPendingVerification,
  loadPendingVerification,
  savePendingVerification,
} from '../lib/pendingVerification';
import { AuthAlert } from '../components/auth/AuthAlert';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthSuccess } from '../components/auth/AuthSuccess';
import { EmailOtpVerification } from '../components/auth/EmailOtpVerification';
import type { AppRole } from '../types';

/**
 * Standalone email verification page (/verify-email):
 * - Resumes an interrupted signup OTP flow from localStorage.
 * - Handles token_hash confirmation links if the user clicked an email link.
 * - Lets a user manually enter their email to send/enter a verification code.
 */
export const VerifyEmailPage: React.FC = () => {
  const { verifyEmailOtp, resendVerification, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pending, setPending] = useState(() => loadPendingVerification('signup'));
  const [emailInput, setEmailInput] = useState(() => searchParams.get('email') ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<AppRole | null>(null);

  // Support Supabase email confirmation links containing ?token_hash=...&type=signup|email
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const typeParam = searchParams.get('type');
    if (!tokenHash || !isSupabaseConfigured()) return;

    const otpType = typeParam === 'email' || typeParam === 'signup' ? typeParam : 'signup';
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (cancelled) return;
        if (error) {
          setLinkError(toAuthFlowError(error).message);
          return;
        }
        clearPendingVerification();
        const metaRole = data.user?.user_metadata?.role;
        setVerifiedRole(isAppRole(metaRole) ? metaRole : 'buyer');
      } catch (err) {
        if (!cancelled) setLinkError(toAuthFlowError(err).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(emailInput);
    if (err) {
      setEmailError(err);
      return;
    }
    const clean = normalizeEmail(emailInput);
    setIsSending(true);
    setEmailError(null);
    setLinkError(null);
    try {
      await resendVerification(clean);
      const next = {
        email: clean,
        purpose: 'signup' as const,
        sentAt: Date.now(),
        resendCount: 0,
      };
      savePendingVerification(next);
      setPending(next);
    } catch (sendErr) {
      setLinkError(toAuthFlowError(sendErr).message);
    } finally {
      setIsSending(false);
    }
  };

  if (verifiedRole || user) {
    const targetRole = verifiedRole ?? (isAppRole(user?.role) ? user.role : 'buyer');
    return (
      <AuthLayout>
        <AuthSuccess
          title="Email verified!"
          description="Your FairFarm account is now verified and active."
          actionLabel="Continue to dashboard"
          onAction={() => navigate(getRoleHome(targetRole), { replace: true })}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {pending ? (
        <EmailOtpVerification
          email={pending.email}
          purpose="signup"
          sentAt={pending.sentAt}
          initialResendCount={pending.resendCount}
          onVerify={async (code) => {
            const profile = await verifyEmailOtp(pending.email, code);
            setVerifiedRole(isAppRole(profile.role) ? profile.role : 'buyer');
          }}
          onResend={() => resendVerification(pending.email)}
          onChangeEmail={() => {
            clearPendingVerification();
            setPending(null);
          }}
        />
      ) : (
        <div className="space-y-5">
          <AuthHeader
            eyebrow="Account verification"
            title="Verify your email"
            subtitle="Enter the email address you registered with to receive a fresh 6-digit verification code."
          />

          <AuthAlert tone="error" show={Boolean(linkError)}>
            {linkError}
          </AuthAlert>

          <form onSubmit={handleStartVerification} className="space-y-4" noValidate>
            <AuthInput
              label="Email address"
              type="email"
              icon={Mail}
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="you@example.com"
              error={emailError}
              disabled={isSending}
            />

            <AuthButton type="submit" loading={isSending} loadingText="Sending code…" showArrow>
              Send verification code
            </AuthButton>
          </form>

          <p className="border-t border-ff-sand pt-4 text-center text-[13px] text-ff-forest/75">
            Already verified?{' '}
            <Link to="/login" className="font-semibold text-ff-forest hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
};

