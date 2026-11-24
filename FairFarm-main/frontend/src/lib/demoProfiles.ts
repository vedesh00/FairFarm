import type { AppRole, UserProfile } from '../types';

/**
 * Demo profiles used ONLY when Supabase is not configured (local exploration /
 * hackathon judging). They are never available when live auth is configured.
 */
export const DEMO_PROFILES: Record<AppRole, UserProfile> = {
  farmer: {
    id: 'farmer-101',
    role: 'farmer',
    full_name: 'Rameshwar Patil (Farmer)',
    phone: '+91 98220 12345',
    business_name: 'Patil Organic Farms',
    location: 'Narayangaon, Junnar, Pune',
    latitude: 19.1235,
    longitude: 73.9782,
    preferred_language: 'en',
  },
  buyer: {
    id: 'buyer-201',
    role: 'buyer',
    full_name: 'Sandeep Khurana (Buyer)',
    phone: '+91 98110 54321',
    business_name: 'FreshBite Retailers',
    business_type: 'retailer',
    location: 'Shivajinagar, Pune',
    latitude: 18.5314,
    longitude: 73.8446,
    preferred_language: 'en',
  },
  warehouse: {
    id: 'warehouse-301',
    role: 'warehouse',
    full_name: 'Meera Kulkarni (Warehouse)',
    phone: '+91 99230 45678',
    business_name: 'Sahyadri Cold Storage',
    location: 'Chakan MIDC, Pune',
    latitude: 18.7606,
    longitude: 73.8636,
    preferred_language: 'en',
  },
};

export const DEMO_TOKENS: Record<AppRole, string> = {
  farmer: 'token-patil',
  buyer: 'token-khurana',
  warehouse: 'token-kulkarni',
};

export const isDemoProfileId = (id: string): boolean =>
  Object.values(DEMO_PROFILES).some((p) => p.id === id);

