import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import type { AppRole } from '../../types';
import heroFieldsImg from '../../assets/auth/fairfarm-fields.jpg';
import { BrandMark } from './BrandMark';
import { AmbientParticles } from './AmbientParticles';
import { getRoleOption } from './roleOptions';

interface AuthHeroProps {
  selectedRole?: AppRole;
}

const BENEFITS = [
  { icon: TrendingUp, label: 'Fair Market Prices' },
  { icon: ShieldCheck, label: 'Trusted Trade Network' },
  { icon: Sprout, label: 'Smarter Farm Economics' },
] as const;

export const AuthHero: React.FC<AuthHeroProps> = ({ selectedRole }) => {
  const [reducedMotion, setReducedMotion] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 24 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 24 });

  const imgX = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
  const imgY = useTransform(smoothY, [-0.5, 0.5], [-8, 8]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const roleContext = selectedRole ? getRoleOption(selectedRole) : null;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-ff-deep p-8 text-ff-cream lg:p-11 xl:p-14"
    >
      {/* Parallax photographic backdrop */}
      <motion.div
        style={reducedMotion ? undefined : { x: imgX, y: imgY, scale: 1.05 }}
        className="pointer-events-none absolute -inset-4 will-change-transform"
        aria-hidden="true"
      >
        <img
          src={heroFieldsImg}
          alt=""
          className="h-full w-full object-cover object-center brightness-[0.88] contrast-[1.04]"
        />
      </motion.div>

      {/* Deep agricultural gradient scrims for contrast & warmth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B281E]/95 via-[#0B281E]/45 to-[#0B281E]/35"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B281E]/80 via-transparent to-[#123D2C]/30"
        aria-hidden="true"
      />

      {/* Slowly moving golden-hour sunlight & atmospheric layers */}
      <div
        className="ff-sun pointer-events-none absolute -top-24 -left-16 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(243,206,89,0.28)_0%,rgba(185,217,108,0.08)_45%,transparent_72%)] blur-2xl"
        aria-hidden="true"
      />
      <div
        className="ff-sweep pointer-events-none absolute -top-1/3 left-1/4 h-[160%] w-64 bg-gradient-to-b from-transparent via-[#fceeb7]/10 to-transparent blur-2xl"
        aria-hidden="true"
      />

      {/* Soft organic background shape */}
      <div
        className="ff-blob pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 bg-[#4D8B50]/20 blur-3xl"
        aria-hidden="true"
      />

      {/* Subtle floating pollen / dust motes */}
      <AmbientParticles count={22} />

      {/* Film grain overlay */}
      <div className="ff-grain pointer-events-none absolute inset-0 opacity-[0.045]" aria-hidden="true" />

      {/* Top: Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex items-center justify-between"
      >
        <BrandMark tone="light" />
        <span className="rounded-full border border-ff-cream/20 bg-ff-deep/50 px-3.5 py-1 text-[11px] font-medium tracking-wide text-ff-lime backdrop-blur-xs">
          Direct Agri-Trade
        </span>
      </motion.div>

      {/* Bottom: Editorial mission headline & benefit indicators */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-xl space-y-6"
      >
        <div className="space-y-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ff-lime">
            Fair prices. Direct connections. Stronger farmers.
          </p>
          <h2 className="font-display text-3xl font-medium leading-[1.12] tracking-[-0.015em] text-ff-cream xl:text-[42px]">
            Your harvest deserves a better market.
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-ff-cream/85">
            Connect directly. Trade transparently. Grow sustainably.
          </p>
        </div>

        {/* Dynamic role highlight when selecting a role */}
        {roleContext && (
          <motion.div
            key={roleContext.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-ff-cream/15 bg-ff-deep/55 px-4 py-3 backdrop-blur-xs"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ff-lime">
              {roleContext.label}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-ff-cream/85">{roleContext.heroLine}</p>
          </motion.div>
        )}

        {/* Three small visual benefit indicators */}
        <div className="grid grid-cols-3 gap-3 border-t border-ff-cream/15 pt-5">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-ff-lime/25 bg-ff-forest/70 text-ff-lime">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[12px] font-medium leading-tight text-ff-cream/90">{b.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

