import React, { forwardRef, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  hint?: React.ReactNode;
  optional?: boolean;
  /** Renders a show/hide toggle and manages the input type. */
  passwordToggle?: boolean;
  trailing?: React.ReactNode;
}

/** Elegant labelled input with icon, inline error, hint and password visibility control. */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon: Icon, error, hint, optional, passwordToggle, trailing, type = 'text', className = '', id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? `ff-${autoId}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const [visible, setVisible] = useState(false);
    const effectiveType = passwordToggle ? (visible ? 'text' : 'password') : type;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    return (
      <div className={className}>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={inputId} className="text-[12.5px] font-semibold text-ff-deep">
            {label}
            {optional && <span className="ml-1 font-normal text-ff-forest/50">(optional)</span>}
          </label>
          {trailing}
        </div>
        <div
          className={`group relative flex items-center rounded-xl border bg-white/80 transition-all duration-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(77,139,80,0.14)] ${
            error
              ? 'border-rose-400/80 focus-within:border-rose-500 focus-within:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
              : 'border-ff-sand hover:border-ff-sage focus-within:border-ff-leaf'
          }`}
        >
          {Icon && (
            <Icon
              className={`pointer-events-none absolute left-3.5 h-4 w-4 transition-colors duration-300 ${
                error ? 'text-rose-500' : 'text-ff-forest/45 group-focus-within:text-ff-leaf'
              }`}
              aria-hidden="true"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`w-full rounded-xl bg-transparent py-2.5 text-[14px] text-ff-deep placeholder:text-ff-forest/35 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
              Icon ? 'pl-10' : 'pl-3.5'
            } ${passwordToggle ? 'pr-11' : 'pr-3.5'}`}
            {...rest}
          />
          {passwordToggle && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ff-forest/50 transition hover:bg-ff-sand/60 hover:text-ff-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ff-leaf"
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              aria-controls={inputId}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={visible ? 'hide' : 'show'}
                  initial={{ opacity: 0, rotate: -20, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 20, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              id={errorId}
              role="alert"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="mt-1.5 text-[11.5px] font-medium text-rose-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        {hint && !error && (
          <div id={hintId} className="mt-1.5 text-[11.5px] text-ff-forest/55">
            {hint}
          </div>
        )}
      </div>
    );
  },
);
AuthInput.displayName = 'AuthInput';

