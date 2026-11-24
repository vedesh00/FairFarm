import React, { useMemo } from 'react';

interface AmbientParticlesProps {
  count?: number;
  className?: string;
}

/** Deterministic pseudo-random so SSR/hydration and re-renders are stable. */
const seeded = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** Very subtle floating pollen / dust motes rendered with CSS only. */
export const AmbientParticles: React.FC<AmbientParticlesProps> = ({ count = 22, className = '' }) => {
  const motes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n: number) => seeded(i * 7 + n);
        return {
          left: `${(r(1) * 100).toFixed(2)}%`,
          top: `${(35 + r(2) * 60).toFixed(2)}%`,
          size: 1.5 + r(3) * 2.8,
          style: {
            '--ff-pollen-duration': `${11 + r(4) * 12}s`,
            '--ff-pollen-delay': `${-r(5) * 20}s`,
            '--ff-pollen-x': `${(r(6) - 0.3) * 120}px`,
            '--ff-pollen-opacity': `${0.35 + r(7) * 0.5}`,
          } as React.CSSProperties,
        };
      }),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="ff-pollen absolute rounded-full bg-[#fff6d6] shadow-[0_0_6px_1px_rgba(255,230,160,0.55)]"
          style={{ left: m.left, top: m.top, width: m.size, height: m.size, ...m.style }}
        />
      ))}
    </div>
  );
};

