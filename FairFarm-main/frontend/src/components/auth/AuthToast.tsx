import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface AuthToastProps {
  toast: ToastItem | null;
  onDismiss: () => void;
}

export const AuthToast: React.FC<AuthToastProps> = ({ toast, onDismiss }) => (
  <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2">
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-ff-sand bg-ff-deep px-4 py-3 text-[13px] font-medium text-ff-cream shadow-xl"
        >
          {toast.tone === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-ff-lime" aria-hidden="true" />}
          {toast.tone === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />}
          {toast.tone === 'info' && <Info className="h-4 w-4 shrink-0 text-ff-lime" aria-hidden="true" />}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 text-ff-cream/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

