import React from 'react';

interface BrandMarkProps {
  className?: string;
  /** Show the FAIRFARM wordmark next to the symbol. */
  withWordmark?: boolean;
  tone?: 'light' | 'dark';
}

/** FairFarm mark: a sprouting leaf rising out of ascending market bars. */
export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', withWordmark = true, tone = 'light' }) => {
  const text = tone === 'light' ? 'text-ff-cream' : 'text-ff-forest';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill={tone === 'light' ? 'rgba(245,242,232,0.12)' : '#123D2C'} />
        <rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="none" stroke="rgba(185,217,108,0.45)" />
        <rect x="9" y="25" width="4.2" height="7" rx="1.4" fill="#A7B9A0" />
        <rect x="15.4" y="21" width="4.2" height="11" rx="1.4" fill="#4D8B50" />
        <path d="M24.6 32V20.5" stroke="#B9D96C" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M24.6 21.5c0-5.6 3.6-9.2 8.4-9.6-.3 5.2-3.6 8.9-8.4 9.6Z" fill="#B9D96C" />
        <path d="M24.4 24.5c-.4-3.9-3-6.4-6.6-6.7.2 3.7 2.8 6.3 6.6 6.7Z" fill="#4D8B50" />
      </svg>
      {withWordmark && (
        <span className={`font-sans text-[15px] font-extrabold tracking-[0.28em] ${text}`}>FAIRFARM</span>
      )}
    </span>
  );
};

