-- FairFarm Migration 004: Warehouse Holder role + authentication hardening
-- Run this AFTER 001_schema.sql, 002_rls_policies.sql and 003_functions.sql.
--
-- What this migration does (non-destructive, idempotent):
--   1. Adds the 'warehouse' role to public.profiles (farmer / buyer remain unchanged).
--   2. Makes the signup trigger whitelist roles and persist optional profile fields
--      (business / farm / warehouse name and location) captured at registration.
--   3. Prevents privilege escalation: a signed-in user can no longer change their own
--      profile role (previously the "Users can update own profile" policy allowed it).
--   4. Adds an is_email_verified() helper that RLS / RPCs can use.

-- ============================================================
-- 1. ALLOW THE WAREHOUSE ROLE
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('farmer', 'buyer', 'warehouse'));

-- ============================================================
-- 2. SAFER PROFILE CREATION ON SIGNUP
-- The role comes from signUp() user metadata. Only the three public roles are
-- accepted; anything else (e.g. 'admin') falls back to 'buyer'. Free-text fields
-- are trimmed and length-limited.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    requested_role TEXT := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'));
    requested_lang TEXT := COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en');
BEGIN
    IF requested_role NOT IN ('farmer', 'buyer', 'warehouse') THEN
        requested_role := 'buyer';
    END IF;
    IF requested_lang NOT IN ('en', 'hi', 'kn') THEN
        requested_lang := 'en';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, phone, business_name, location, preferred_language)
    VALUES (
        NEW.id,
        requested_role,
        left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'User'), 120),
        left(NULLIF(trim(NEW.raw_user_meta_data->>'phone'), ''), 20),
        left(NULLIF(trim(NEW.raw_user_meta_data->>'business_name'), ''), 160),
        left(NULLIF(trim(NEW.raw_user_meta_data->>'location'), ''), 200),
        requested_lang
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger already exists from 001; recreate defensively so it points at the new function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. ROLE IMMUTABILITY (PRIVILEGE-ESCALATION GUARD)
-- Authenticated / anon API callers cannot change profiles.role. Only the
-- service role (backend admin) or a direct database session can.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND COALESCE(auth.role(), 'service_role') NOT IN ('service_role') THEN
        RAISE EXCEPTION 'Changing the account role is not permitted.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- Manual self-insert (fallback when the trigger did not run) may only use a public role.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role IN ('farmer', 'buyer', 'warehouse'));

-- ============================================================
-- 4. EMAIL VERIFICATION HELPER
-- With "Confirm email" enabled Supabase never issues a session to an unverified
-- user. This helper lets policies / RPCs assert it explicitly as defence in depth.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated;

