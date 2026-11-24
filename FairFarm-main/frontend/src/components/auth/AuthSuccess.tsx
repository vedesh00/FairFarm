import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { AuthButton } from './AuthButton';

interface AuthSuccessProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Smooth verification-success state with animated green checkmark. */
export const AuthSuccess: React.FC<AuthSuccessProps> = ({
  title,
  description,
  actionLabel = 'Continue to dashboard',
  onAction,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    className="flex flex-col items-center py-4 text-center"
  >
    <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.35, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full bg-ff-leaf/30"
        aria-hidden="true"
      />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-ff-leaf text-white shadow-[0_14px_30px_-10px_rgba(77,139,80,0.65)]"
      >
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.14, type: 'spring', stiffness: 420, damping: 20 }}
        >
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
        </motion.div>
      </motion.div>
    </div>

    <h2 className="font-display text-[26px] font-medium leading-tight text-ff-deep">{title}</h2>
    <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-ff-forest/70">{description}</p>

    {onAction && (
      <div className="mt-6 w-full">
        <AuthButton onClick={onAction} showArrow>
          {actionLabel}
        </AuthButton>
      </div>
    )}
  </motion.div>
);

