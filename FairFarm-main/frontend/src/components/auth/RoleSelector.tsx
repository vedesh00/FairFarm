import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { AppRole } from '../../types';
import { ROLE_OPTIONS, getRoleOption } from './roleOptions';

interface RoleSelectorProps {
  value: AppRole;
  onChange: (role: AppRole) => void;
  label?: string;
  disabled?: boolean;
}

/** Premium three-way role selector, implemented as an accessible radio group. */
export const RoleSelector: React.FC<RoleSelectorProps> = ({ value, onChange, label = 'I am a', disabled }) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = getRoleOption(value);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;
    onChange(ROLE_OPTIONS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <p id="ff-role-label" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ff-earth">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby="ff-role-label" className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {ROLE_OPTIONS.map((option, index) => {
          const isActive = option.id === value;
          const Icon = option.icon;
          return (
            <motion.button
              key={option.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${option.label}: ${option.description}`}
              tabIndex={isActive ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              whileHover={disabled ? undefined : { y: -2 }}
              whileTap={disabled ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`group relative flex min-w-0 flex-col items-start rounded-2xl border p-2.5 text-left outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ff-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-ff-cream sm:p-3 ${
                isActive
                  ? 'border-ff-forest/70 bg-white shadow-[0_10px_30px_-18px_rgba(11,40,30,0.55)]'
                  : 'border-ff-sand bg-white/50 hover:border-ff-sage hover:bg-white/80'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isActive && (
                <motion.span
                  layoutId="ff-role-active"
                  className="absolute inset-0 rounded-2xl ring-[1.5px] ring-ff-forest"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  aria-hidden="true"
                />
              )}
              <span className="flex w-full items-center justify-between">
                <motion.span
                  animate={isActive ? { rotate: [0, -8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-300 sm:h-9 sm:w-9 ${
                    isActive ? 'bg-ff-forest text-ff-lime' : 'bg-ff-sand/70 text-ff-forest group-hover:bg-ff-sand'
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden="true" />
                </motion.span>
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-ff-leaf text-white"
                      aria-hidden="true"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="mt-2 block w-full truncate text-[12.5px] font-semibold text-ff-deep sm:text-[13px]">
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </span>
              <span className="mt-0.5 hidden text-[11px] leading-snug text-ff-forest/65 sm:line-clamp-2">
                {option.description}
              </span>
            </motion.button>
          );
        })}
      </div>
      {/* On small screens, describe the active role beneath the compact cards. */}
      <div className="relative mt-2 h-4 overflow-hidden sm:hidden" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={selected.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="truncate text-[11px] text-ff-forest/70"
          >
            {selected.description}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

