import React from 'react';
import { Link } from 'react-router-dom';
import {
  Warehouse,
  MapPin,
  Phone,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Protected workspace for Warehouse Holder accounts.
 * Displays verified profile details and links to existing market intelligence
 * and marketplace routes without inventing unsupported storage backend APIs.
 */
export const WarehouseDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-forest-900 via-forest-800 to-forest-700 p-6 sm:p-8 text-cream-50 shadow-lg border border-forest-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-950/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-300 border border-forest-600">
              <Warehouse className="h-3.5 w-3.5" aria-hidden="true" />
              Warehouse Holder Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome, {user?.full_name || 'Warehouse Partner'}
            </h1>
            <p className="text-sm text-cream-200 max-w-2xl">
              {user?.business_name
                ? `${user.business_name} — supporting post-harvest preservation and direct farm-to-market logistics.`
                : 'Supporting post-harvest preservation and direct farm-to-market logistics.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-forest-950 hover:bg-gold-400 transition shadow-sm"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Browse Marketplace
            </Link>
            <Link
              to="/prices/current"
              className="inline-flex items-center gap-2 rounded-xl bg-forest-950/60 px-4 py-2.5 text-xs font-bold text-cream-100 border border-forest-600 hover:bg-forest-900 transition"
            >
              <TrendingUp className="h-4 w-4 text-gold-300" aria-hidden="true" />
              Mandi Prices
            </Link>
          </div>
        </div>
      </div>

      {/* Verified Account Details & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white p-6 border border-cream-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-forest-950">Facility Profile</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-700 border border-forest-200">
              <ShieldCheck className="h-3.5 w-3.5 text-forest-600" aria-hidden="true" />
              Verified Account
            </span>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Building2 className="h-4 w-4 text-forest-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-forest-500">
                  Warehouse Name
                </dt>
                <dd className="font-semibold text-forest-950">
                  {user?.business_name || 'Not specified yet'}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-forest-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-forest-500">
                  Location
                </dt>
                <dd className="font-semibold text-forest-950">
                  {user?.location || 'Not specified yet'}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-forest-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-forest-500">
                  Contact Phone
                </dt>
                <dd className="font-semibold text-forest-950">
                  {user?.phone || 'Not provided'}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <Link
          to="/prices/current"
          className="group rounded-2xl bg-white p-6 border border-cream-200 shadow-xs hover:border-forest-300 hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-700 border border-forest-100 group-hover:bg-forest-700 group-hover:text-gold-300 transition">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-forest-950">Current Mandi Benchmarks</h3>
            <p className="text-xs text-forest-700 leading-relaxed">
              Track live regional commodity arrivals and modal prices to help growers decide when
              to store vs. sell.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-forest-700 group-hover:underline">
            View Live Prices →
          </span>
        </Link>

        <Link
          to="/prices/future"
          className="group rounded-2xl bg-white p-6 border border-cream-200 shadow-xs hover:border-forest-300 hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-700 border border-forest-100 group-hover:bg-forest-700 group-hover:text-gold-300 transition">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-forest-950">Estimated Future Prices</h3>
            <p className="text-xs text-forest-700 leading-relaxed">
              Inspect 7–60 day harvest price forecasts and seasonal storage windows across major
              produce categories.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-forest-700 group-hover:underline">
            Open Price Forecasts →
          </span>
        </Link>
      </div>
    </div>
  );
};

