import type { AppRole, UserRole } from '../types';

export const APP_ROLES: readonly AppRole[] = ['farmer', 'buyer', 'warehouse'] as const;

export const isAppRole = (value: unknown): value is AppRole =>
  typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);

/** Display names. Internal role ids are never renamed (buyer stays 'buyer'). */
export const ROLE_LABELS: Record<UserRole, string> = {
  farmer: 'Farmer',
  buyer: 'Client / Buyer',
  warehouse: 'Warehouse Holder',
  admin: 'Administrator',
};

export const ROLE_HOME: Record<UserRole, string> = {
  farmer: '/farmer/dashboard',
  buyer: '/buyer/dashboard',
  warehouse: '/warehouse/dashboard',
  admin: '/',
};

export const getRoleHome = (role: UserRole | null | undefined): string =>
  role ? ROLE_HOME[role] ?? '/' : '/login';

const AUTH_PATHS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

/**
 * Decide where to send a user after signing in. A previously requested
 * protected path is honoured only when it is an in-app path; role guards
 * still validate it against the trusted profile role.
 */
export const resolvePostAuthPath = (role: UserRole, requested?: string | null): string => {
  if (
    requested &&
    requested.startsWith('/') &&
    !requested.startsWith('//') &&
    !AUTH_PATHS.some((p) => requested.startsWith(p)) &&
    requested !== '/'
  ) {
    const ownPrefix = `/${role}/`;
    const isOtherRoleArea = APP_ROLES.some((r) => r !== role && requested.startsWith(`/${r}/`));
    if (requested.startsWith(ownPrefix) || !isOtherRoleArea) return requested;
  }
  return getRoleHome(role);
};

