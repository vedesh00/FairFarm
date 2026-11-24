import React from 'react';
import { motion } from 'framer-motion';

interface AuthHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
} as const;

export const AuthHeader: React.FC<AuthHeaderProps> = ({ eyebrow, title, subtitle, icon }) => (
  <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-2">
    {icon && <motion.div variants={item}>{icon}</motion.div>}
    {eyebrow && (
      <motion.p variants={item} className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ff-leaf">
        {eyebrow}
      </motion.p>
    )}
    <motion.h1
      variants={item}
      className="font-display text-[28px] font-medium leading-[1.12] tracking-[-0.01em] text-ff-deep sm:text-[32px]"
    >
      {title}
    </motion.h1>
    {subtitle && (
      <motion.div variants={item} className="text-[13.5px] leading-relaxed text-ff-forest/70">
        {subtitle}
      </motion.div>
    )}
  </motion.div>
);

