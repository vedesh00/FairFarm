import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { classifyOtpError, toAuthFlowError } from '../../lib/authErrors';
import { validateOtp } from '../../lib/authValidation';
import {
  MAX_RESENDS,
  OTP_EXPIRY_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  savePendingVerification,
  type VerificationPurpose,
} from '../../lib/pendingVerification';
import { AuthAlert } from './AuthAlert';
import { AuthButton } from './AuthButton';
import { AuthHeader } from './AuthHeader';
import { OtpInput } from './OtpInput';

interface EmailOtpVerificationProps {
  email: string;
  purpose: VerificationPurpose;
  sentAt: number;
  initialResendCount?: number;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail?: () => void;
  changeEmailLabel?: string;
}

const formatCountdown = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
};

export const EmailOtpVerification: React.FC<EmailOtpVerificationProps> = ({
  email,
  purpose,
  sentAt: initialSentAt,
  initialResendCount = 0,
  onVerify,
  onResend,
  onChangeEmail,
  changeEmailLabel = 'Use a different email',
}) => {
  const [otp, setOtp] = useState('');
  const [sentAt, setSentAt] = useState(initialSentAt);
  const [resendCount, setResendCount] = useState(initialResendCount);
  const [cooldown, setCooldown] = useState(() =>
    Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - initialSentAt) / 1000)),
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [otpErrorFlag, setOtpErrorFlag] = useState(false);

  const submittingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - sentAt) / 1000));
      setCooldown(remaining);
    }, 500);
    return () => window.clearInterval(timer);
  }, [cooldown, sentAt]);

  const submitCode = async (codeToVerify: string) => {
    if (submittingRef.current || isVerifying) return;
    const validationError = validateOtp(codeToVerify);
    if (validationError) {
      setErrorMsg(validationError);
      setOtpErrorFlag(true);
      return;
    }

    submittingRef.current = true;
    setIsVerifying(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setOtpErrorFlag(false);

    try {
      await onVerify(codeToVerify);
    } catch (err) {
      const classified = classifyOtpError(err, sentAt, OTP_EXPIRY_SECONDS);
      setErrorMsg(classified.message);
      setOtpErrorFlag(true);
    } finally {
      submittingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCode(otp);
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || resendCount >= MAX_RESENDS) return;
    setIsResending(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setOtpErrorFlag(false);

    try {
      await onResend();
      const now = Date.now();
      const nextCount = resendCount + 1;
      setSentAt(now);
      setResendCount(nextCount);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp('');
      savePendingVerification({ email, purpose, sentAt: now, resendCount: nextCount });
      setInfoMsg('A fresh 6-digit verification code has been sent to your inbox.');
    } catch (err) {
      setErrorMsg(toAuthFlowError(err).message);
    } finally {
      setIsResending(false);
    }
  };

  const resendLimitReached = resendCount >= MAX_RESENDS;

  return (
    <div className="space-y-5">
      <AuthHeader
        icon={
          <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ff-forest text-ff-lime shadow-sm">
            <MailCheck className="h-5 w-5" aria-hidden="true" />
          </div>
        }
        eyebrow={purpose === 'signup' ? 'Email verification' : 'Password recovery'}
        title="Check your inbox"
        subtitle={
          <>
            We&apos;ve sent a verification code to{' '}
            <span className="font-semibold text-ff-deep break-all">{email}</span>.
          </>
        }
      />

      <AuthAlert tone="error" show={Boolean(errorMsg)}>
        {errorMsg}
      </AuthAlert>

      <AuthAlert tone="success" show={Boolean(infoMsg)}>
        {infoMsg}
      </AuthAlert>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-ff-earth">
            6-digit verification code
          </label>
          <OtpInput
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (otpErrorFlag) setOtpErrorFlag(false);
              if (errorMsg) setErrorMsg(null);
            }}
            onComplete={(code) => void submitCode(code)}
            disabled={isVerifying}
            error={otpErrorFlag}
          />
          <p className="mt-2.5 text-[11.5px] text-ff-forest/60">
            Tip: You can paste the 6-digit code directly into the first box.
          </p>
        </div>

        <AuthButton
          type="submit"
          loading={isVerifying}
          loadingText="Verifying code…"
          disabled={otp.length !== 6}
          showArrow
        >
          Verify &amp; Continue
        </AuthButton>
      </form>

      {/* Resend + Countdown + Change Email */}
      <div className="space-y-3 border-t border-ff-sand pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          {resendLimitReached ? (
            <span className="text-rose-700 font-medium">
              Maximum resend attempts reached. Wait a few minutes or check spam.
            </span>
          ) : cooldown > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-ff-forest/65">
              <Clock className="h-3.5 w-3.5 text-ff-earth" aria-hidden="true" />
              Resend available in{' '}
              <span className="font-semibold tabular-nums text-ff-deep">
                {formatCountdown(cooldown)}
              </span>
            </span>
          ) : (
            <motion.button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 font-semibold text-ff-forest transition hover:text-ff-leaf disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isResending ? 'Sending new code…' : 'Resend verification code'}</span>
            </motion.button>
          )}

          {onChangeEmail && (
            <button
              type="button"
              onClick={onChangeEmail}
              disabled={isVerifying}
              className="inline-flex items-center gap-1 font-medium text-ff-forest/70 transition hover:text-ff-deep disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{changeEmailLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

