import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

interface AuthButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  showArrow?: boolean;
}

/** Animated primary CTA with press/hover physics, shimmer and loading state. */
export const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  loading = false,
  loadingText,
  variant = 'primary',
  showArrow = false,
  disabled,
  className = '',
  type = 'button',
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const styles = {
    primary:
      'ff-shimmer bg-ff-forest text-ff-cream shadow-[0_14px_30px_-14px_rgba(11,40,30,0.75)] hover:bg-ff-deep',
    secondary: 'border border-ff-sand bg-white/80 text-ff-deep hover:border-ff-sage hover:bg-white',
    ghost: 'text-ff-forest hover:bg-ff-sand/50',
  }[variant];

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      whileHover={isDisabled ? undefined : { y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.985, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-[14px] font-semibold tracking-[0.01em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ff-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-ff-cream disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{loadingText ?? 'Please wait…'}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {showArrow && (
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </motion.button>
  );
};

