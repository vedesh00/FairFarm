import React from 'react';
import { Link } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { AppRole } from '../../types';
import heroFieldsImg from '../../assets/auth/fairfarm-fields.jpg';
import { AuthHero } from './AuthHero';
import { BrandMark } from './BrandMark';

interface AuthLayoutProps {
  children: React.ReactNode;
  selectedRole?: AppRole;
  /** Optional subtle link back to marketplace/home. */
  backTo?: { label: string; to: string };
}

/**
 * Full-screen immersive authentication layout:
 * - Desktop: 55-60% cinematic agricultural hero on the left, 40-45% auth panel on the right.
 * - Mobile: Compact agricultural header banner + prominent auth card, zero horizontal overflow.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  selectedRole,
  backTo = { label: 'Back to FairFarm', to: '/' },
}) => {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen w-full overflow-x-hidden bg-ff-cream text-ff-deep lg:grid lg:h-screen lg:grid-cols-[minmax(0,57fr)_minmax(0,43fr)] lg:overflow-hidden">
        {/* Desktop Left Panel: Cinematic Agricultural Hero (~57%) */}
        <section className="relative hidden h-full lg:block" aria-label="FairFarm agricultural showcase">
          <AuthHero selectedRole={selectedRole} />
        </section>

        {/* Mobile Compact Agricultural Brand Header */}
        <div className="relative overflow-hidden bg-ff-deep px-5 pb-6 pt-5 text-ff-cream lg:hidden">
          <img
            src={heroFieldsImg}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-45"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B281E]/85 via-[#0B281E]/75 to-[#0B281E]/95"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" aria-label="FairFarm Home">
              <BrandMark tone="light" />
            </Link>
            <Link
              to={backTo.to}
              className="inline-flex items-center gap-1 rounded-full border border-ff-cream/20 bg-ff-deep/60 px-3 py-1.5 text-[11.5px] font-medium text-ff-cream/90 transition hover:bg-ff-forest"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Home</span>
            </Link>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ff-lime">
              Fair prices. Direct connections.
            </p>
            <h2 className="mt-1 font-display text-[22px] font-medium leading-snug text-ff-cream">
              Your harvest deserves a better market.
            </h2>
          </div>
        </div>

        {/* Right Panel: Elegant Authentication Panel (~43%) */}
        <section
          aria-label="Authentication"
          className="ff-scroll relative flex min-h-[calc(100vh-148px)] flex-col justify-between bg-ff-cream px-4 py-6 sm:px-8 sm:py-8 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-8 xl:px-14"
        >
          {/* Subtle top bar on desktop */}
          <div className="hidden items-center justify-between lg:flex">
            <Link
              to={backTo.to}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ff-forest/70 transition hover:text-ff-forest"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{backTo.label}</span>
            </Link>
            <span className="text-[11px] font-medium tracking-wider text-ff-earth/80">
              Verified Agri-Network
            </span>
          </div>

          {/* Centered Auth Card / Form Container */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto my-auto w-full max-w-[440px] py-2 lg:py-4"
          >
            <div className="rounded-3xl border border-ff-sand/90 bg-white/75 p-5 shadow-[0_24px_60px_-30px_rgba(11,40,30,0.22)] backdrop-blur-xs sm:p-7">
              {children}
            </div>
          </motion.div>

          {/* Subtle footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ff-forest/55">
            <span>FairFarm Direct Trade</span>
            <span>Secured by Supabase Auth</span>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
};

