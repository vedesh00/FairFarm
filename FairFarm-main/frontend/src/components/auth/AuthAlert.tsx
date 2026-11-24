import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AuthAlertProps {
  tone?: 'error' | 'info' | 'success';
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  show?: boolean;
}

const TONES = {
  error: { wrap: 'border-rose-200 bg-rose-50/90 text-rose-900', icon: AlertCircle, iconCls: 'text-rose-500' },
  info: { wrap: 'border-ff-sage/60 bg-white/70 text-ff-deep', icon: Info, iconCls: 'text-ff-leaf' },
  success: { wrap: 'border-ff-leaf/30 bg-[#eef5e4] text-ff-deep', icon: CheckCircle2, iconCls: 'text-ff-leaf' },
} as const;

/** Inline, animated status banner for auth error / info / success states. */
export const AuthAlert: React.FC<AuthAlertProps> = ({ tone = 'error', title, children, action, show = true }) => {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          role={tone === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-[12.5px] leading-relaxed ${t.wrap}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.iconCls}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {title && <p className="font-semibold">{title}</p>}
              {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
              {action && <div className="mt-2">{action}</div>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

