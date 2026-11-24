import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return (
    Boolean(import.meta.env.VITE_SUPABASE_URL) &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co' &&
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key-here'
  );
};

/* ------------------------------------------------------------------ */
/* "Remember me" aware session storage                                  */
/* When remember-me is on (default) the Supabase session lives in       */
/* localStorage and survives browser restarts. When off, it lives in    */
/* sessionStorage and is cleared when the tab/browser closes.           */
/* ------------------------------------------------------------------ */
const REMEMBER_KEY = 'fairfarm_remember_me';

const safeStorage = (kind: 'local' | 'session'): Storage | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export const getRememberMe = (): boolean => safeStorage('local')?.getItem(REMEMBER_KEY) !== '0';

export const setRememberMe = (remember: boolean): void => {
  safeStorage('local')?.setItem(REMEMBER_KEY, remember ? '1' : '0');
};

const rememberAwareStorage: SupportedStorage = {
  getItem: (key) => safeStorage('local')?.getItem(key) ?? safeStorage('session')?.getItem(key) ?? null,
  setItem: (key, value) => {
    const remember = getRememberMe();
    const target = safeStorage(remember ? 'local' : 'session');
    const other = safeStorage(remember ? 'session' : 'local');
    target?.setItem(key, value);
    other?.removeItem(key);
  },
  removeItem: (key) => {
    safeStorage('local')?.removeItem(key);
    safeStorage('session')?.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: rememberAwareStorage,
  },
});
