import { Sprout, Store, Warehouse, type LucideIcon } from 'lucide-react';
import type { AppRole } from '../../types';

export interface RoleOption {
  id: AppRole;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** Copy used in the hero to reflect the selected context. */
  heroLine: string;
}

export const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    id: 'farmer',
    label: 'Farmer',
    shortLabel: 'Farmer',
    description: 'Sell your produce directly and discover fair market prices.',
    icon: Sprout,
    heroLine: 'List your harvest, compare real take-home offers and sell without middlemen.',
  },
  {
    id: 'buyer',
    label: 'Client / Buyer',
    shortLabel: 'Client',
    description: 'Discover fresh produce and connect directly with growers.',
    icon: Store,
    heroLine: 'Source traceable produce straight from verified growers at transparent prices.',
  },
  {
    id: 'warehouse',
    label: 'Warehouse Holder',
    shortLabel: 'Warehouse',
    description: 'Offer storage capacity and connect with farmers and buyers.',
    icon: Warehouse,
    heroLine: 'Put your storage capacity to work for the farmers and buyers around you.',
  },
] as const;

export const getRoleOption = (role: AppRole): RoleOption =>
  ROLE_OPTIONS.find((r) => r.id === role) ?? ROLE_OPTIONS[0];

