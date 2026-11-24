import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

/**
 * Six-digit OTP input with individual digit boxes, auto-advance, backspace,
 * arrow navigation, full-code paste and shake feedback on invalid code.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, idx) => value[idx] ?? '');

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const focusBox = (idx: number) => {
    const clamped = Math.max(0, Math.min(length - 1, idx));
    const el = inputRefs.current[clamped];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const commitDigits = (nextDigits: string[], nextFocusIdx?: number) => {
    const joined = nextDigits.join('').slice(0, length);
    onChange(joined);
    if (typeof nextFocusIdx === 'number') {
      focusBox(nextFocusIdx);
    }
    if (joined.length === length && /^\d+$/.test(joined) && onComplete) {
      onComplete(joined);
    }
  };

  const handleChange = (idx: number, raw: string) => {
    const onlyNums = raw.replace(/\D/g, '');
    if (!onlyNums) {
      const next = [...digits];
      next[idx] = '';
      commitDigits(next);
      return;
    }

    // Handle multi-digit input (e.g. mobile OS autofill or paste via onChange)
    if (onlyNums.length > 1) {
      const next = [...digits];
      for (let i = 0; i < onlyNums.length && idx + i < length; i++) {
        next[idx + i] = onlyNums[i];
      }
      const nextIdx = Math.min(length - 1, idx + onlyNums.length);
      commitDigits(next, nextIdx);
      return;
    }

    const next = [...digits];
    next[idx] = onlyNums;
    commitDigits(next, idx < length - 1 ? idx + 1 : idx);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = '';
        commitDigits(next, idx);
      } else if (idx > 0) {
        next[idx - 1] = '';
        commitDigits(next, idx - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(idx - 1);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(idx + 1);
      return;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      const next = [...digits];
      next[idx] = '';
      commitDigits(next, idx);
    }
  };

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    const startIdx = pasted.length >= length ? 0 : idx;
    const next = [...digits];
    for (let i = 0; i < pasted.length && startIdx + i < length; i++) {
      next[startIdx + i] = pasted[i];
    }
    const targetFocus = Math.min(length - 1, startIdx + pasted.length);
    commitDigits(next, targetFocus);
  };

  return (
    <div
      role="group"
      aria-label="6-digit verification code"
      className={`grid grid-cols-6 gap-2 sm:gap-2.5 ${error ? 'ff-shake' : ''}`}
    >
      {digits.map((digit, idx) => {
        const filled = Boolean(digit);
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              pattern="\d*"
              maxLength={length}
              disabled={disabled}
              value={digit}
              aria-label={`Digit ${idx + 1} of ${length}`}
              aria-invalid={error}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={(e) => handlePaste(idx, e)}
              onFocus={(e) => e.currentTarget.select()}
              className={`h-12 w-full rounded-xl border text-center font-sans text-xl font-bold tracking-tight outline-none transition-all duration-200 sm:h-14 sm:text-2xl ${
                error
                  ? 'border-rose-400 bg-rose-50/70 text-rose-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                  : filled
                    ? 'border-ff-leaf bg-white text-ff-deep shadow-[0_6px_18px_-10px_rgba(18,61,44,0.35)] focus:border-ff-forest focus:ring-4 focus:ring-ff-leaf/20'
                    : 'border-ff-sand bg-white/80 text-ff-deep hover:border-ff-sage focus:border-ff-leaf focus:bg-white focus:ring-4 focus:ring-ff-leaf/20'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

