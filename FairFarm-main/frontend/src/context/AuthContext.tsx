import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { AppRole, BusinessType, Language, UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured, setRememberMe } from '../lib/supabase';
import { AuthFlowError, toAuthFlowError } from '../lib/authErrors';
import { isAppRole } from '../lib/authRoles';
import { DEMO_PROFILES, DEMO_TOKENS, isDemoProfileId } from '../lib/demoProfiles';
import { clearPendingVerification } from '../lib/pendingVerification';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface RegisterInput {
  email: string;
  password: string;
  role: AppRole;
  fullName: string;
  phone?: string;
  location?: string;
  businessName?: string;
  preferredLanguage?: Language;
}

export type RegisterResult =
  | { status: 'verification_required'; email: string }
  | { status: 'signed_in'; profile: UserProfile };

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when Supabase is not configured and only demo profiles are available. */
  isDemoMode: boolean;
  /** True after a password-recovery code/link was verified and a new password is pending. */
  passwordRecoveryActive: boolean;
  login: (email: string, password: string, options?: { remember?: boolean }) => Promise<UserProfile>;
  register: (data: RegisterInput) => Promise<RegisterResult>;
  verifyEmailOtp: (email: string, token: string) => Promise<UserProfile>;
  resendVerification: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<UserProfile | null>;
  quickLogin: (role: AppRole) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = 'fairfarm_user';
const TOKEN_KEY = 'fairfarm_token';
const DEMO_FLAG_KEY = 'fairfarm_demo_session';

const authRedirect = (path: string) =>
  typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined;

/* ------------------------------------------------------------------ */
/* Profile parsing (Supabase client is untyped, so validate the row)    */
/* ------------------------------------------------------------------ */

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const BUSINESS_TYPES: readonly BusinessType[] = ['retailer', 'hotel', 'restaurant', 'wholesaler', 'individual'];
const LANGUAGES: readonly Language[] = ['en', 'hi', 'kn'];

function parseProfileRow(row: unknown, authUser: User): UserProfile | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  if (r.id !== authUser.id || !isAppRole(r.role)) return null;
  const businessType = str(r.business_type);
  const lang = str(r.preferred_language);
  return {
    id: authUser.id,
    role: r.role,
    full_name: str(r.full_name) ?? 'FairFarm member',
    email: authUser.email ?? undefined,
    phone: str(r.phone),
    business_name: str(r.business_name),
    business_type: businessType && (BUSINESS_TYPES as readonly string[]).includes(businessType)
      ? (businessType as BusinessType)
      : undefined,
    location: str(r.location),
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    preferred_language: lang && (LANGUAGES as readonly string[]).includes(lang) ? (lang as Language) : undefined,
    created_at: str(r.created_at),
  };
}

function parseCachedDemoUser(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const id = (parsed as Record<string, unknown>).id;
    if (typeof id !== 'string' || !isDemoProfileId(id)) return null;
    return Object.values(DEMO_PROFILES).find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Loads the trusted profile for a verified Supabase user. The role ALWAYS comes
 * from public.profiles (written by the signup trigger, immutable afterwards).
 */
async function fetchTrustedProfile(authUser: User): Promise<UserProfile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (error) throw new AuthFlowError('profile_unavailable');

  const meta: Record<string, unknown> = authUser.user_metadata ?? {};

  if (!data) {
    // Fallback for projects where the signup trigger is missing: create the
    // profile from signup metadata. RLS only allows the user's own id and one
    // of the three public roles; the role cannot be changed afterwards.
    if (!isAppRole(meta.role)) throw new AuthFlowError('profile_missing');
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        role: meta.role,
        full_name: str(meta.full_name) ?? 'FairFarm member',
        phone: str(meta.phone) ?? null,
        business_name: str(meta.business_name) ?? null,
        location: str(meta.location) ?? null,
      })
      .select('*')
      .single();
    const parsedCreated = insertError ? null : parseProfileRow(created, authUser);
    if (!parsedCreated) throw new AuthFlowError('profile_missing');
    return parsedCreated;
  }

  const profile = parseProfileRow(data, authUser);
  if (!profile) throw new AuthFlowError('profile_missing');

  // Complete optional fields captured at registration if an older trigger
  // version did not persist them (role is never touched here).
  const patch: Record<string, string> = {};
  const metaBusiness = str(meta.business_name);
  const metaLocation = str(meta.location);
  if (!profile.business_name && metaBusiness) patch.business_name = metaBusiness;
  if (!profile.location && metaLocation) patch.location = metaLocation;
  if (Object.keys(patch).length > 0) {
    const { data: updated } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', authUser.id)
      .select('*')
      .maybeSingle();
    return parseProfileRow(updated, authUser) ?? { ...profile, ...patch };
  }
  return profile;
}

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemoMode = !isSupabaseConfigured();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);

  const userRef = useRef<UserProfile | null>(null);
  const inflight = useRef(new Map<string, Promise<UserProfile>>());

  const commitUser = useCallback((profile: UserProfile | null, accessToken: string | null) => {
    userRef.current = profile;
    setUser(profile);
    setToken(accessToken);
    try {
      if (profile) {
        // Non-sensitive profile cache used by offline/demo data fallbacks in api/client.ts.
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  /** Deduplicates concurrent profile loads (auth event + explicit call). */
  const loadProfile = useCallback((authUser: User): Promise<UserProfile> => {
    const existing = inflight.current.get(authUser.id);
    if (existing) return existing;
    const promise = fetchTrustedProfile(authUser).finally(() => {
      inflight.current.delete(authUser.id);
    });
    inflight.current.set(authUser.id, promise);
    return promise;
  }, []);

  /** Establish app state from a Supabase session, enforcing verified email. */
  const applySession = useCallback(
    async (session: Session | null): Promise<UserProfile | null> => {
      if (!session?.user) {
        commitUser(null, null);
        return null;
      }
      if (!session.user.email_confirmed_at) {
        // Never grant app access to an unverified account.
        await supabase.auth.signOut().catch(() => undefined);
        commitUser(null, null);
        return null;
      }
      if (userRef.current?.id === session.user.id) {
        setToken(session.access_token);
        return userRef.current;
      }
      try {
        const profile = await loadProfile(session.user);
        commitUser(profile, session.access_token);
        return profile;
      } catch (err) {
        commitUser(null, null);
        throw toAuthFlowError(err);
      }
    },
    [commitUser, loadProfile],
  );

  /* ---------------------------- init ---------------------------- */
  useEffect(() => {
    if (isDemoMode) {
      let cached: UserProfile | null = null;
      try {
        cached = localStorage.getItem(DEMO_FLAG_KEY) === '1'
          ? parseCachedDemoUser(localStorage.getItem(USER_CACHE_KEY))
          : null;
        if (cached) {
          userRef.current = cached;
          setUser(cached);
          setToken(localStorage.getItem(TOKEN_KEY));
        }
      } catch {
        /* ignore */
      }
      setIsLoading(false);
      return;
    }

    // Live mode: drop any stale demo session from earlier exploration.
    try {
      if (localStorage.getItem(DEMO_FLAG_KEY) === '1') {
        localStorage.removeItem(DEMO_FLAG_KEY);
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* ignore */
    }

    let active = true;
    const handle = async (event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;
      try {
        if (event === 'SIGNED_OUT') {
          commitUser(null, null);
          setPasswordRecoveryActive(false);
        } else if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryActive(true);
          await applySession(session);
        } else if (event === 'TOKEN_REFRESHED') {
          if (session) setToken(session.access_token);
        } else {
          await applySession(session);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[FairFarm] auth state error:', toAuthFlowError(err).code);
      } finally {
        if (active && (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT')) setIsLoading(false);
      }
    };

    // supabase-js warns against awaiting Supabase calls inside this callback; defer.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => void handle(event, session), 0);
    });
    // Safety net in case INITIAL_SESSION is never delivered (network failure).
    const fallback = setTimeout(() => active && setIsLoading(false), 8000);

    return () => {
      active = false;
      clearTimeout(fallback);
      data.subscription.unsubscribe();
    };
  }, [isDemoMode, applySession, commitUser]);

  /* --------------------------- actions --------------------------- */
  const requireLive = useCallback(() => {
    if (isDemoMode) throw new AuthFlowError('not_configured');
  }, [isDemoMode]);

  const login = useCallback<AuthContextType['login']>(
    async (email, password, options) => {
      requireLive();
      setRememberMe(options?.remember ?? true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw toAuthFlowError(error);
      if (!data.session || !data.user?.email_confirmed_at) {
        await supabase.auth.signOut().catch(() => undefined);
        throw new AuthFlowError('email_not_confirmed');
      }
      try {
        const profile = await applySession(data.session);
        if (!profile) throw new AuthFlowError('profile_missing');
        clearPendingVerification();
        return profile;
      } catch (err) {
        await supabase.auth.signOut().catch(() => undefined);
        throw toAuthFlowError(err);
      }
    },
    [requireLive, applySession],
  );

  const register = useCallback<AuthContextType['register']>(
    async (input) => {
      requireLive();
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: authRedirect('/verify-email'),
          data: {
            role: input.role,
            full_name: input.fullName,
            phone: input.phone || null,
            business_name: input.businessName || null,
            location: input.location || null,
            preferred_language: input.preferredLanguage ?? 'en',
          },
        },
      });
      if (error) throw toAuthFlowError(error);

      // With email confirmation on, Supabase hides existing accounts by returning
      // a user with no identities instead of an error.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new AuthFlowError('user_already_exists');
      }

      if (data.session && data.user?.email_confirmed_at) {
        // Project has "Confirm email" disabled (auto-confirm). See README.
        const profile = await applySession(data.session);
        if (profile) return { status: 'signed_in', profile };
      }
      return { status: 'verification_required', email: input.email };
    },
    [requireLive, applySession],
  );

  const verifyEmailOtp = useCallback<AuthContextType['verifyEmailOtp']>(
    async (email, otp) => {
      requireLive();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw toAuthFlowError(error);
      if (!data.session) throw new AuthFlowError('session_missing');
      const profile = await applySession(data.session);
      if (!profile) throw new AuthFlowError('profile_missing');
      clearPendingVerification();
      return profile;
    },
    [requireLive, applySession],
  );

  const resendVerification = useCallback<AuthContextType['resendVerification']>(
    async (email) => {
      requireLive();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: authRedirect('/verify-email') },
      });
      if (error) throw toAuthFlowError(error);
    },
    [requireLive],
  );

  const requestPasswordReset = useCallback<AuthContextType['requestPasswordReset']>(
    async (email) => {
      requireLive();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirect('/reset-password'),
      });
      if (error) throw toAuthFlowError(error);
    },
    [requireLive],
  );

  const verifyRecoveryOtp = useCallback<AuthContextType['verifyRecoveryOtp']>(
    async (email, otp) => {
      requireLive();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
      if (error) throw toAuthFlowError(error);
      if (!data.session) throw new AuthFlowError('session_missing');
      setPasswordRecoveryActive(true);
    },
    [requireLive],
  );

  const updatePassword = useCallback<AuthContextType['updatePassword']>(
    async (newPassword) => {
      requireLive();
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw toAuthFlowError(error);
      setPasswordRecoveryActive(false);
      clearPendingVerification();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!data.user || !sessionData.session) return null;
      try {
        return await applySession(sessionData.session);
      } catch {
        return null;
      }
    },
    [requireLive, applySession],
  );

  const quickLogin = useCallback<AuthContextType['quickLogin']>(
    (targetRole) => {
      if (!isDemoMode) {
        if (import.meta.env.DEV) console.warn('[FairFarm] Demo profiles are disabled when Supabase is configured.');
        return;
      }
      const profile = DEMO_PROFILES[targetRole];
      commitUser(profile, DEMO_TOKENS[targetRole]);
      try {
        localStorage.setItem(TOKEN_KEY, DEMO_TOKENS[targetRole]);
        localStorage.setItem(DEMO_FLAG_KEY, '1');
      } catch {
        /* ignore */
      }
    },
    [isDemoMode, commitUser],
  );

  const logout = useCallback<AuthContextType['logout']>(async () => {
    if (!isDemoMode) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    try {
      localStorage.removeItem(DEMO_FLAG_KEY);
    } catch {
      /* ignore */
    }
    setPasswordRecoveryActive(false);
    commitUser(null, null);
  }, [isDemoMode, commitUser]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isLoading,
      isDemoMode,
      passwordRecoveryActive,
      login,
      register,
      verifyEmailOtp,
      resendVerification,
      requestPasswordReset,
      verifyRecoveryOtp,
      updatePassword,
      quickLogin,
      logout,
    }),
    [
      user, token, isLoading, isDemoMode, passwordRecoveryActive, login, register, verifyEmailOtp,
      resendVerification, requestPasswordReset, verifyRecoveryOtp, updatePassword, quickLogin, logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
